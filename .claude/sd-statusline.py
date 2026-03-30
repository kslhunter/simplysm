#!/usr/bin/env python3
"""Claude Code statusline: folder | model | context% | 5h%(time) | 7d%(time) | $extra"""

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


def try_spawn_fetch(version: str):
    try:
        with _exclusive_lock() as locked:
            if locked:
                subprocess.Popen(
                    [sys.executable, os.path.abspath(__file__), "--fetch", version],
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    start_new_session=True,
                )
    except OSError:
        pass


def do_fetch(version: str):
    try:
        with _exclusive_lock() as locked:
            if not locked:
                return
            _do_fetch_locked(version)
    except OSError:
        pass


def _do_fetch_locked(version: str):
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
            "https://api.anthropic.com/api/oauth/usage",
            headers={
                "Authorization": f"Bearer {token}",
                "anthropic-beta": "oauth-2025-04-20",
                "User-Agent": f"claude-code/{version}",
            },
        )

        resp = urllib.request.urlopen(req, timeout=15)
        data = json.loads(resp.read())

        extra_usage = data.get("extra_usage", {})
        new_cache = {
            "last_fetch_ts": time.time(),
            "extra_usage": {
                "is_enabled": extra_usage.get("is_enabled", False),
                "used_credits": extra_usage.get("used_credits"),
            },
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


def format_rate_limit(rate_limit: dict) -> str:
    pct = rate_limit.get("used_percentage")
    reset = rate_limit.get("resets_at")
    if pct is not None and reset is not None:
        p = f"{round(pct, 2):g}"
        return f"{p}%({format_remaining(reset)})"
    elif pct is not None:
        p = f"{round(pct, 2):g}"
        return f"{p}%"
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

    # Rate limits from stdin
    rate_limits = stdin_data.get("rate_limits", {})
    h5_str = format_rate_limit(rate_limits.get("five_hour", {}))
    d7_str = format_rate_limit(rate_limits.get("seven_day", {}))

    # Extra usage from cache
    cache = read_cache()
    extra_str = ""
    if cache and not cache.get("error"):
        eu = cache.get("extra_usage", {})
        if eu.get("is_enabled") and eu.get("used_credits") is not None:
            extra_str = f"${eu['used_credits'] / 100:.2f}"

    # Spawn background fetch if needed
    version = stdin_data.get("version", "2.1.86")
    if should_fetch(cache):
        try_spawn_fetch(version)

    # Output
    parts = [folder, model, ctx_str, h5_str, d7_str]
    if extra_str:
        parts.append(extra_str)
    print(" | ".join(parts))


if __name__ == "__main__":
    try:
        if "--fetch" in sys.argv:
            idx = sys.argv.index("--fetch")
            ver = sys.argv[idx + 1] if idx + 1 < len(sys.argv) else "2.1.86"
            do_fetch(ver)
        else:
            main()
    except Exception:
        pass  # statusline should never crash Claude Code
