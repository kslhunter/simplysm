#!/usr/bin/env python
"""Claude Code statusline: folder | model | context% | 5h%(time) | 7d%(time) | $extra

$extra 는 ~/.claude/.credentials.json 의 OAuth accessToken 으로 Anthropic 공식 사용량
엔드포인트(api.anthropic.com/api/oauth/usage)만 조회해 표시합니다. 본인 사용량 조회
용도이며 토큰을 제3자에게 전송, 저장하지 않습니다.

사용량 조회는 별도 프로세스로 떼어내 백그라운드에서 수행한다 — statusline 렌더가
네트워크 대기로 늦어지지 않도록. 동시 실행은 배타 락으로 하나만 조회하게 막는다.
"""

from __future__ import annotations

import contextlib
import json
import os
import re
import subprocess
import sys
import time
import urllib.request

FETCH_INTERVAL_SECONDS = 180
STALE_LOCK_SECONDS = 60
OWNED_LOCK_ENV_NAME = "SD_STATUSLINE_LOCK_OWNER"
USAGE_URL = "https://api.anthropic.com/api/oauth/usage"
USAGE_TIMEOUT_SECONDS = 15
DEFAULT_VERSION = "2.1.86"


def home_dir() -> str:
    return (
        os.environ.get("HOME")
        or os.environ.get("USERPROFILE")
        or os.path.dirname(os.path.abspath(__file__))
    )


def cache_file_path() -> str:
    return os.path.join(home_dir(), ".claude", "statusline-cache.json")


def cache_dir_path() -> str:
    return os.path.dirname(cache_file_path())


def lock_file_path() -> str:
    return os.path.join(home_dir(), ".claude", "statusline-cache.lock")


def credentials_file_path() -> str:
    return os.path.join(home_dir(), ".claude", ".credentials.json")


# --- 표시 포맷 ---------------------------------------------------------------


def format_model(model_id: str) -> str:
    match = re.match(r"^claude-(\w+)-(\d+)-(\d+)", model_id)
    if not match:
        return model_id

    family = match.group(1)
    return f"{family[:1].upper()}{family[1:].lower()} {match.group(2)}.{match.group(3)}"


def format_remaining(reset_epoch_seconds: float) -> str:
    delta_seconds = reset_epoch_seconds - time.time()
    if delta_seconds <= 0:
        return "0m"

    total_minutes = int(delta_seconds // 60)
    days = total_minutes // (24 * 60)
    hours = (total_minutes % (24 * 60)) // 60
    minutes = total_minutes % 60

    if days > 0:
        return f"{days}d{hours}h"
    if hours > 0:
        return f"{hours}h{minutes}m"
    return f"{minutes}m"


def format_percentage(value: float) -> str:
    return f"{round(value, 2):g}"


def format_rate_limit(rate_limit: dict | None) -> str:
    used_percentage = as_number((rate_limit or {}).get("used_percentage"))
    resets_at = as_number((rate_limit or {}).get("resets_at"))

    if used_percentage is not None and resets_at is not None:
        return f"{format_percentage(used_percentage)}%({format_remaining(resets_at)})"
    if used_percentage is not None:
        return f"{format_percentage(used_percentage)}%"
    return "?"


def format_extra_usage(cache: dict | None) -> str:
    if not cache or cache.get("error"):
        return ""

    extra_usage = as_record(cache.get("extra_usage"))
    if not extra_usage:
        return ""

    used_credits = as_number(extra_usage.get("used_credits"))
    if extra_usage.get("is_enabled") is not True or used_credits is None:
        return ""

    return f"${used_credits / 100:.2f}"


# --- 캐시 -------------------------------------------------------------------


def read_cache() -> dict | None:
    try:
        with open(cache_file_path(), encoding="utf-8") as handle:
            return as_record(json.load(handle))
    except OSError, ValueError:
        return None


def should_fetch(cache: dict | None) -> bool:
    if not cache:
        return True
    return (
        time.time() - (as_number(cache.get("last_fetch_ts")) or 0)
        > FETCH_INTERVAL_SECONDS
    )


def write_cache_atomic(data: dict) -> None:
    os.makedirs(cache_dir_path(), exist_ok=True)

    temp_path = f"{cache_file_path()}.{os.getpid()}.{int(time.time() * 1000)}.tmp"
    try:
        with open(temp_path, "w", encoding="utf-8") as handle:
            json.dump(data, handle)
        os.replace(temp_path, cache_file_path())
    except OSError:
        with contextlib.suppress(OSError):
            os.remove(temp_path)
        raise


def write_cache(old_cache: dict | None, error_message: str | None) -> None:
    data = dict(old_cache) if old_cache else {}
    data["last_fetch_ts"] = time.time()
    data["error"] = error_message
    write_cache_atomic(data)


# --- 락 ---------------------------------------------------------------------


def acquire_lock() -> int | None:
    """배타 락 획득. 이미 잡혀 있으면 None. 60초 넘게 방치된 락은 걷어낸다."""
    os.makedirs(cache_dir_path(), exist_ok=True)

    descriptor = open_lock_file()
    if descriptor is None:
        return None

    with contextlib.suppress(OSError):
        os.write(descriptor, f"{os.getpid()}\n".encode())
    return descriptor


def open_lock_file() -> int | None:
    flags = os.O_CREAT | os.O_EXCL | os.O_WRONLY
    try:
        return os.open(lock_file_path(), flags, 0o600)
    except FileExistsError:
        pass
    except OSError:
        return None

    if not remove_stale_lock_if_needed():
        return None

    try:
        return os.open(lock_file_path(), flags, 0o600)
    except OSError:
        return None


def remove_stale_lock_if_needed() -> bool:
    try:
        if time.time() - os.stat(lock_file_path()).st_mtime <= STALE_LOCK_SECONDS:
            return False
        os.remove(lock_file_path())
        return True
    except OSError:
        return False


def close_lock(descriptor: int) -> None:
    with contextlib.suppress(OSError):
        os.close(descriptor)


def release_lock(descriptor: int) -> None:
    close_lock(descriptor)
    with contextlib.suppress(OSError):
        os.remove(lock_file_path())


# --- 사용량 조회 -------------------------------------------------------------


def try_spawn_fetch(version: str) -> None:
    """조회를 백그라운드 프로세스로 떼어낸다. 락 소유권은 환경변수로 자식에 넘긴다."""
    descriptor = acquire_lock()
    if descriptor is None:
        return

    spawned = False
    try:
        close_lock(descriptor)

        env = dict(os.environ)
        env[OWNED_LOCK_ENV_NAME] = "1"

        kwargs: dict = {
            "stdin": subprocess.DEVNULL,
            "stdout": subprocess.DEVNULL,
            "stderr": subprocess.DEVNULL,
            "env": env,
        }
        if os.name == "nt":
            kwargs["creationflags"] = (
                subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
            )
        else:
            kwargs["start_new_session"] = True

        subprocess.Popen(  # noqa: S603
            [sys.executable, os.path.abspath(__file__), "--fetch", version], **kwargs
        )
        spawned = True
    except Exception:
        # statusline should never crash Claude Code
        pass
    finally:
        if not spawned:
            release_lock(descriptor)


def do_fetch(version: str) -> None:
    owns_spawn_lock = os.environ.get(OWNED_LOCK_ENV_NAME) == "1"
    try:
        if owns_spawn_lock:
            do_fetch_locked(version)
            return

        descriptor = acquire_lock()
        if descriptor is None:
            return
        try:
            do_fetch_locked(version)
        finally:
            release_lock(descriptor)
    except Exception:
        # statusline should never crash Claude Code
        pass
    finally:
        if owns_spawn_lock:
            with contextlib.suppress(OSError):
                os.remove(lock_file_path())


def do_fetch_locked(version: str) -> None:
    cache = read_cache()
    if cache and not should_fetch(cache):
        return

    try:
        with open(credentials_file_path(), encoding="utf-8") as handle:
            credentials = as_record(json.load(handle)) or {}

        oauth = as_record(credentials.get("claudeAiOauth"))
        if not oauth:
            raise ValueError("missing claudeAiOauth")

        token = oauth.get("accessToken")
        if not isinstance(token, str) or not token:
            raise ValueError("missing accessToken")

        expires_at_milliseconds = as_number(oauth.get("expiresAt")) or 0
        if expires_at_milliseconds < time.time() * 1000:
            write_cache(cache, "token_expired")
            return

        usage_data = fetch_usage(token, version)
        extra_usage = as_record(usage_data.get("extra_usage")) or {}
        write_cache_atomic(
            {
                "last_fetch_ts": time.time(),
                "extra_usage": {
                    "is_enabled": extra_usage.get("is_enabled") is True,
                    "used_credits": extra_usage.get("used_credits"),
                },
                "error": None,
            }
        )
    except Exception as error:
        write_cache(cache, str(error) or type(error).__name__)


def fetch_usage(token: str, version: str) -> dict:
    request = urllib.request.Request(  # noqa: S310
        USAGE_URL,
        headers={
            "Authorization": f"Bearer {token}",
            "anthropic-beta": "oauth-2025-04-20",
            "User-Agent": f"claude-code/{version}",
        },
    )

    with urllib.request.urlopen(request, timeout=USAGE_TIMEOUT_SECONDS) as response:  # noqa: S310
        payload = json.loads(response.read().decode("utf-8"))

    usage_data = as_record(payload)
    if usage_data is None:
        raise ValueError("invalid usage response")
    return usage_data


# --- 렌더 -------------------------------------------------------------------


def main() -> None:
    stdin_data = read_stdin_json()

    workspace = as_record(stdin_data.get("workspace"))
    current_dir = as_string((workspace or {}).get("current_dir")) or as_string(
        stdin_data.get("cwd")
    )
    folder = basename(current_dir) if current_dir else "?"

    model_id = as_string((as_record(stdin_data.get("model")) or {}).get("id"))
    model = format_model(model_id) if model_id else "?"

    effort_level = as_string((as_record(stdin_data.get("effort")) or {}).get("level"))
    if effort_level:
        model = f"{model} {effort_level}"

    used_percentage = (as_record(stdin_data.get("context_window")) or {}).get(
        "used_percentage"
    )
    context_text = f"{used_percentage}%" if used_percentage is not None else "?"

    rate_limits = as_record(stdin_data.get("rate_limits")) or {}
    five_hour_text = format_rate_limit(as_record(rate_limits.get("five_hour")))
    seven_day_text = format_rate_limit(as_record(rate_limits.get("seven_day")))

    cache = read_cache()
    extra_text = format_extra_usage(cache)

    if should_fetch(cache):
        try_spawn_fetch(as_string(stdin_data.get("version")) or DEFAULT_VERSION)

    parts = [folder, model, context_text, five_hour_text, seven_day_text]
    if extra_text:
        parts.append(extra_text)
    print(" | ".join(parts))


def read_stdin_json() -> dict:
    try:
        if sys.stdin is None or sys.stdin.isatty():
            return {}
        text = sys.stdin.read().strip()
        return (as_record(json.loads(text)) or {}) if text else {}
    except Exception:
        return {}


def basename(file_path: str) -> str:
    parts = [part for part in file_path.replace("\\", "/").split("/") if part]
    return parts[-1] if parts else ""


def as_record(value: object) -> dict | None:
    return value if isinstance(value, dict) else None


def as_string(value: object) -> str | None:
    return value if isinstance(value, str) else None


def as_number(value: object) -> float | None:
    return (
        float(value)
        if isinstance(value, (int, float)) and not isinstance(value, bool)
        else None
    )


if __name__ == "__main__":
    try:
        for stream in (sys.stdout, sys.stderr):
            if stream is not None:
                stream.reconfigure(encoding="utf-8")

        if "--fetch" in sys.argv:
            index = sys.argv.index("--fetch")
            do_fetch(
                sys.argv[index + 1] if index + 1 < len(sys.argv) else DEFAULT_VERSION
            )
        else:
            main()
    except Exception:
        # statusline should never crash Claude Code
        pass
