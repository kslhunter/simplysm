#!/usr/bin/env python3
"""Claude Code statusline: folder | model | context% | 5h%(time) | 7d%(time)"""

import json
import os
import re
import subprocess
import sys
import tempfile
import time
from contextlib import contextmanager

_IS_WINDOWS = os.name == "nt"
if _IS_WINDOWS:
    import msvcrt
else:
    import fcntl

CACHE_FILE = os.path.expanduser("~/.claude/statusline-cache.json")
CACHE_DIR = os.path.dirname(CACHE_FILE)
LOCK_FILE = os.path.expanduser("~/.claude/statusline-cache.lock")
CREDS_FILE = os.path.expanduser("~/.claude/.credentials.json")
FETCH_INTERVAL = 180  # 3 minutes


def format_model(model_id: str) -> str:
    m = re.match(r"claude-(\w+)-(\d+)-(\d+)", model_id)
    if m:
        name = m.group(1).capitalize()
        ver = f"{m.group(2)}.{m.group(3)}"
        return f"{name} {ver}"
    return model_id


def format_remaining(reset_epoch: int) -> str:
    delta = reset_epoch - time.time()
    if delta <= 0:
        return "0m"
    total_min = int(delta / 60)
    days = total_min // (24 * 60)
    hours = (total_min % (24 * 60)) // 60
    minutes = total_min % 60
    if days > 0:
        return f"{days}d{hours}h"
    elif hours > 0:
        return f"{hours}h{minutes}m"
    else:
        return f"{minutes}m"


def read_cache():
    try:
        with open(CACHE_FILE) as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


def should_fetch(cache):
    if cache is None:
        return True
    last_ts = cache.get("last_fetch_ts", 0)
    return (time.time() - last_ts) > FETCH_INTERVAL


@contextmanager
def _exclusive_lock():
    fd = os.open(LOCK_FILE, os.O_CREAT | os.O_WRONLY, 0o600)
    try:
        if _IS_WINDOWS:
            msvcrt.locking(fd, msvcrt.LK_NBLCK, 1)
        else:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield True
    except (BlockingIOError, OSError):
        yield False
    finally:
        if _IS_WINDOWS:
            try:
                msvcrt.locking(fd, msvcrt.LK_UNLCK, 1)
            except OSError:
                pass
        os.close(fd)


def _make_bucket(util, reset):
    return {
        "used_pct": round(float(util) * 100) if util is not None else None,
        "reset_epoch": int(reset) if reset is not None else None,
    }


def try_spawn_fetch():
    try:
        with _exclusive_lock() as locked:
            if locked:
                subprocess.Popen(
                    [sys.executable, os.path.abspath(__file__), "--fetch"],
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    start_new_session=True,
                )
    except OSError:
        pass


def do_fetch():
    try:
        with _exclusive_lock() as locked:
            if not locked:
                return
            _do_fetch_locked()
    except OSError:
        pass


def _do_fetch_locked():
    cache = read_cache()
    if cache and not should_fetch(cache):
        return

    import urllib.request

    try:
        with open(CREDS_FILE) as f:
            creds = json.load(f)
        oauth = creds["claudeAiOauth"]
        token = oauth["accessToken"]
        expires_at = oauth.get("expiresAt", 0)

        if expires_at < time.time() * 1000:
            write_cache(cache, error="token_expired")
            return

        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=json.dumps({
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 1,
                "messages": [{"role": "user", "content": "quota"}],
            }).encode(),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01",
                "anthropic-beta": "oauth-2025-04-20",
                "x-app": "cli",
                "User-Agent": "claude-code/2.1.72",
            },
            method="POST",
        )

        resp = urllib.request.urlopen(req, timeout=15)
        headers = resp.headers
        resp.read()

        buckets = {}
        for key, prefix in (("five_hour", "5h"), ("seven_day", "7d")):
            util = headers.get(f"anthropic-ratelimit-unified-{prefix}-utilization")
            reset = headers.get(f"anthropic-ratelimit-unified-{prefix}-reset")
            buckets[key] = _make_bucket(util, reset)

        new_cache = {
            "last_fetch_ts": time.time(),
            **buckets,
            "error": None,
        }

        write_cache_atomic(new_cache)
    except Exception as e:
        write_cache(cache, error=str(e))


def write_cache(old_cache, error=None):
    data = dict(old_cache) if old_cache else {}
    data["last_fetch_ts"] = time.time()
    data["error"] = error
    write_cache_atomic(data)


def write_cache_atomic(data):
    fd, tmp_path = tempfile.mkstemp(dir=CACHE_DIR, suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(data, f)
        os.replace(tmp_path, CACHE_FILE)
    except Exception:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def format_usage(bucket: dict) -> str:
    pct = bucket.get("used_pct")
    reset = bucket.get("reset_epoch")
    if pct is not None and reset is not None:
        return f"{pct}%({format_remaining(reset)})"
    elif pct is not None:
        return f"{pct}%"
    return "?"


def main():
    # Read stdin JSON
    try:
        stdin_data = json.load(sys.stdin)
    except Exception:
        stdin_data = {}

    # Extract folder
    cwd = stdin_data.get("workspace", {}).get("current_dir") or stdin_data.get("cwd", "")
    folder = os.path.basename(cwd) if cwd else "?"

    # Extract model
    model_id = stdin_data.get("model", {}).get("id", "")
    model = format_model(model_id) if model_id else "?"

    # Extract context %
    ctx_window = stdin_data.get("context_window")
    if ctx_window is not None:
        ctx_str = f"{ctx_window.get('used_percentage') or 0}%"
    else:
        ctx_str = "?"

    # Read cached usage data
    cache = read_cache()

    if cache and not cache.get("error"):
        h5_str = format_usage(cache.get("five_hour", {}))
        d7_str = format_usage(cache.get("seven_day", {}))
    else:
        h5_str = "?"
        d7_str = "?"

    # Spawn background fetch if needed
    if should_fetch(cache):
        try_spawn_fetch()

    # Output
    print(f"{folder} | {model} | {ctx_str} | {h5_str} | {d7_str}")


if __name__ == "__main__":
    try:
        if "--fetch" in sys.argv:
            do_fetch()
        else:
            main()
    except Exception:
        pass  # statusline should never crash Claude Code
