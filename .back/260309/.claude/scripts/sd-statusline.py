import json
import os
import sys
import time
from datetime import datetime, timezone

sys.stdout.reconfigure(encoding="utf-8")
from pathlib import Path
from urllib.request import Request, urlopen

# region Constants

STDIN_TIMEOUT_MS = 5000
FETCH_TIMEOUT_S = 5
CACHE_TTL_S = 180  # 3 minutes
CACHE_PATH = Path.home() / ".claude" / "usage-api-cache.json"
LOCK_PATH = Path.home() / ".claude" / "usage-api-cache.lock"

# endregion

# region Stdin


def read_stdin() -> str:
    try:
        if not sys.stdin.isatty():
            return sys.stdin.read()
    except Exception:
        pass
    return ""


# endregion

# region OAuth


def get_oauth_token() -> str | None:
    try:
        config_dir = os.environ.get("CLAUDE_CONFIG_DIR") or str(Path.home() / ".claude")
        credentials_path = Path(config_dir) / ".credentials.json"
        if not credentials_path.exists():
            return None

        credentials = json.loads(credentials_path.read_text("utf-8"))
        oauth = credentials.get("claudeAiOauth")
        if oauth is None:
            return None

        expires_at = oauth.get("expiresAt")
        if expires_at is not None and time.time() * 1000 > expires_at:
            return None

        return oauth.get("accessToken")
    except Exception:
        return None


def read_cache() -> dict | None:
    try:
        if not CACHE_PATH.exists():
            return None
        return json.loads(CACHE_PATH.read_text("utf-8"))
    except Exception:
        return None


def write_cache(data: dict) -> None:
    try:
        CACHE_PATH.write_text(
            json.dumps({"data": data, "timestamp": time.time() * 1000}),
            "utf-8",
        )
    except Exception:
        pass


def acquire_lock() -> bool:
    try:
        fd = os.open(str(LOCK_PATH), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.close(fd)
        return True
    except OSError:
        # Lock file exists; check if it's stale (older than CACHE_TTL_S)
        try:
            age = time.time() - LOCK_PATH.stat().st_mtime
            if age > CACHE_TTL_S:
                LOCK_PATH.unlink(missing_ok=True)
                fd = os.open(str(LOCK_PATH), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                os.close(fd)
                return True
        except OSError:
            pass
        return False


def release_lock() -> None:
    try:
        LOCK_PATH.unlink(missing_ok=True)
    except OSError:
        pass


def fetch_usage(token: str, version: str) -> dict | None:
    cache = read_cache()
    if cache is not None and time.time() * 1000 - cache.get("timestamp", 0) < CACHE_TTL_S * 1000:
        return cache.get("data")

    stale_data = cache.get("data") if cache else {}

    if not acquire_lock():
        return stale_data or None

    try:
        req = Request(
            "https://api.anthropic.com/api/oauth/usage",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
                "anthropic-beta": "oauth-2025-04-20",
            },
        )
        with urlopen(req, timeout=FETCH_TIMEOUT_S) as resp:
            if resp.status != 200:
                write_cache(stale_data)
                return stale_data or None
            data = json.loads(resp.read())

        if not isinstance(data, dict):
            write_cache(stale_data)
            return stale_data or None

        write_cache(data)
        return data
    except Exception:
        write_cache(stale_data)
        return stale_data or None
    finally:
        release_lock()


# endregion

# region Formatting


def format_percent(value: float | None) -> str:
    if value is None:
        return "?"
    return str(round(value))


def format_time_remaining(iso_date: str | None) -> str:
    if not iso_date:
        return ""
    try:
        reset_time = datetime.fromisoformat(iso_date.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        diff = reset_time - now
        diff_seconds = int(diff.total_seconds())

        if diff_seconds <= 0:
            return ""

        diff_minutes = diff_seconds // 60
        diff_hours = diff_minutes // 60
        days = diff_hours // 24
        hours = diff_hours % 24
        minutes = diff_minutes % 60

        if days > 0:
            return f"{days}d{hours}h"
        if hours > 0:
            return f"{hours}h{minutes}m"
        return f"{minutes}m"
    except Exception:
        return ""


# endregion

# region Main


def main() -> None:
    input_str = read_stdin()
    data: dict = {}

    if input_str:
        try:
            data = json.loads(input_str)
        except Exception:
            pass

    # Basic information
    model_name = (data.get("model") or {}).get("display_name", "Unknown")
    ctx = data.get("context_window") or {}
    context_size = ctx.get("context_window_size", 0)
    usage = ctx.get("current_usage") or {}
    context_used = (
        usage.get("input_tokens", 0)
        + usage.get("output_tokens", 0)
        + usage.get("cache_creation_input_tokens", 0)
        + usage.get("cache_read_input_tokens", 0)
    )
    context_percent = round((context_used / context_size) * 100) if context_size > 0 else 0

    # Try fetching usage with OAuth token
    token = get_oauth_token()
    daily_percent = "?"
    daily_reset_time = ""
    week_percent = "?"
    week_reset_day = ""
    extra_usage = ""

    if token is not None:
        usage_response = fetch_usage(token, data.get("version", "unknown"))
        if usage_response is not None:
            daily_data = usage_response.get("daily") or usage_response.get("five_hour")
            if daily_data:
                daily_percent = format_percent(daily_data.get("utilization"))
                daily_reset_time = format_time_remaining(daily_data.get("resets_at"))
            week_data = usage_response.get("seven_day")
            if week_data:
                week_percent = format_percent(week_data.get("utilization"))
                week_reset_day = format_time_remaining(week_data.get("resets_at"))

            extra = usage_response.get("extra_usage")
            if extra and extra.get("is_enabled") and extra.get("used_credits") is not None:
                extra_usage = f"${extra['used_credits'] / 100:.2f}"

    # Fallback: weekly_token_usage
    if week_percent == "?" and data.get("weekly_token_usage"):
        used = data["weekly_token_usage"].get("tokens_used", 0)
        limit = data["weekly_token_usage"].get("tokens_limit", 0)
        if limit > 0:
            week_percent = str(round((used / limit) * 100))

    # Folder name
    cwd = data.get("cwd") or os.getcwd()
    folder_name = os.path.basename(cwd)

    # Output
    daily_str = f"{daily_percent}%({daily_reset_time})" if daily_reset_time else f"{daily_percent}%"
    week_str = f"{week_percent}%({week_reset_day})" if week_reset_day else f"{week_percent}%"
    parts = [folder_name, model_name, f"{context_percent}%", daily_str, week_str]
    if extra_usage:
        parts.append(extra_usage)
    print(" │ ".join(parts))


if __name__ == "__main__":
    main()

# endregion
