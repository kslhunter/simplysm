#!/usr/bin/env python3
import json
import os
import subprocess
import sys
import time
from pathlib import Path

CLAUDE_DIR = Path.home() / ".claude"
PROFILES_FILE = CLAUDE_DIR / "profiles.json"
STATUSLINE_FILE = CLAUDE_DIR / "statusline-cache.json"
CREDENTIALS_FILE = CLAUDE_DIR / ".credentials.json"


def load_profiles():
    if PROFILES_FILE.exists():
        data = json.loads(PROFILES_FILE.read_text(encoding="utf-8"))
        if "accounts" in data:
            return data
    return {"current": "", "accounts": {}}


def save_profiles(data):
    PROFILES_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def get_refresh_token():
    if CREDENTIALS_FILE.exists():
        data = json.loads(CREDENTIALS_FILE.read_text(encoding="utf-8"))
        return data.get("claudeAiOauth", {}).get("refreshToken", "")
    return ""


def get_usage():
    if STATUSLINE_FILE.exists():
        data = json.loads(STATUSLINE_FILE.read_text(encoding="utf-8"))
        rl = data.get("rate_limits", {})
        return {
            "fiveHour": {
                "usedPercentage": rl.get("five_hour", {}).get("used_percentage"),
                "resetsAt": rl.get("five_hour", {}).get("resets_at"),
            },
            "sevenDay": {
                "usedPercentage": rl.get("seven_day", {}).get("used_percentage"),
                "resetsAt": rl.get("seven_day", {}).get("resets_at"),
            },
        }
    return None


def format_remaining(resets_at):
    if resets_at is None:
        return "N/A"
    diff = resets_at - time.time()
    if diff <= 0:
        return "리셋됨"
    days = int(diff // 86400)
    hours = int((diff % 86400) // 3600)
    minutes = int((diff % 3600) // 60)
    if days > 0:
        return f"{days}d{hours}h"
    if hours > 0:
        return f"{hours}h{minutes}m"
    return f"{minutes}m"


def format_usage(usage, is_live=False):
    if not usage:
        return "[사용량 정보 없음]"
    fh = usage.get("fiveHour", {})
    sd = usage.get("sevenDay", {})
    fh_pct = fh.get("usedPercentage")
    sd_pct = sd.get("usedPercentage")
    if fh_pct is None and sd_pct is None:
        return "[사용량 정보 없음]"
    fh_str = f"{fh_pct}%({format_remaining(fh.get('resetsAt'))})"
    sd_str = f"{sd_pct}%({format_remaining(sd.get('resetsAt'))})"
    suffix = "" if is_live else "  ← 저장 시점"
    return f"[{fh_str}, {sd_str}]{suffix}"


def print_list(profiles):
    accounts = profiles.get("accounts", {})
    current = profiles.get("current", "")
    if not accounts:
        print("저장된 계정이 없습니다.")
        return
    print("=== 저장된 계정 ===")
    for name, info in accounts.items():
        is_current = name == current
        marker = "*" if is_current else " "
        usage = get_usage() if is_current else info.get("usage")
        usage_str = format_usage(usage, is_live=is_current)
        print(f"{marker} {name}  {usage_str}")


def cmd_save():
    try:
        result = subprocess.run(
            ["claude", "auth", "status"], capture_output=True, text=True
        )
        auth_data = json.loads(result.stdout)
        org = auth_data.get("orgName", "")
    except Exception:
        print("ERROR: claude auth status에서 Organization 이름을 가져올 수 없습니다.")
        sys.exit(1)
    if not org:
        print("ERROR: Organization 이름이 비어 있습니다.")
        sys.exit(1)

    rt = get_refresh_token()
    if not rt:
        print("ERROR: refresh token을 찾을 수 없습니다.")
        sys.exit(1)

    profiles = load_profiles()
    profiles["accounts"][org] = {"refreshToken": rt, "usage": get_usage()}
    profiles["current"] = org
    save_profiles(profiles)
    print(f"프로필 '{org}' 저장 완료")


def cmd_list():
    print_list(load_profiles())


def cmd_switch(target=None):
    profiles = load_profiles()
    accounts = profiles.get("accounts", {})
    current = profiles.get("current", "")

    if not target:
        print_list(profiles)
        selectable = [name for name in accounts if name != current]
        print(f"\n__SELECTABLE__:{json.dumps(selectable, ensure_ascii=False)}")
        return

    if target not in accounts:
        print(f"ERROR: 프로필 '{target}'을(를) 찾을 수 없습니다.")
        sys.exit(1)

    # 현재 계정 백업 (refresh token + usage)
    if current and current in accounts:
        latest_rt = get_refresh_token()
        if latest_rt:
            accounts[current]["refreshToken"] = latest_rt
        usage = get_usage()
        if usage:
            accounts[current]["usage"] = usage
        save_profiles(profiles)

    # 전환
    rt = accounts[target]["refreshToken"]
    subprocess.run(
        ["claude", "auth", "login"],
        env={
            **os.environ,
            "CLAUDE_CODE_OAUTH_REFRESH_TOKEN": rt,
            "CLAUDE_CODE_OAUTH_SCOPES": "user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload",
        },
    )

    # 갱신된 refresh token 저장 + current 업데이트
    new_rt = get_refresh_token()
    if new_rt:
        accounts[target]["refreshToken"] = new_rt
    profiles["current"] = target
    save_profiles(profiles)
    print(f"'{target}' 계정으로 전환 완료")


def main():
    if len(sys.argv) < 2:
        print("사용법: sd-auth.py <save|list|switch>")
        sys.exit(1)

    action = sys.argv[1]
    rest = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else None

    if action == "save":
        cmd_save()
    elif action == "list":
        cmd_list()
    elif action == "switch":
        cmd_switch(rest)
    else:
        print(f"ERROR: 알 수 없는 명령: {action}")
        sys.exit(1)


if __name__ == "__main__":
    main()
