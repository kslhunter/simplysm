"""SessionStart hook — statusline 스크립트를 사용자 홈에 두고 statusLine 설정을 심는다.

플러그인 디렉터리가 아니라 홈에 복사해 두는 이유는, 설정에 남는 경로가 플러그인 설치
위치 변경에 흔들리지 않게 하기 위함이다.

이미 심어둔 옛 명령(LEGACY_COMMAND_BUILDERS)만 새 명령으로 교체하고,
사용자가 직접 지정한 statusLine 은 건드리지 않는다.
"""

from __future__ import annotations

import contextlib
import json
import os
import shutil
import time
from collections.abc import Callable

import _bootstrap  # noqa: F401  (sys.path 준비)
from shared.hook_io import as_record, configure_stdio


def home_dir() -> str:
    return (
        os.environ.get("HOME")
        or os.environ.get("USERPROFILE")
        or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )


def to_posix_path(file_path: str) -> str:
    return file_path.replace("\\", "/")


def build_command(script_path: str) -> str:
    return f'python "{to_posix_path(script_path)}"'


#: 과거에 이 훅이 심었던 명령들 — 이것과 일치할 때만 교체한다.
LEGACY_COMMAND_BUILDERS: tuple[Callable[[str], str], ...] = (
    # Bun 런타임 시절
    lambda home: (
        f'bun "{to_posix_path(os.path.join(home, ".claude", "sd", "statusline.ts"))}"'
    ),
    # 별도 설치 경로에 심겼던 Python 버전
    lambda home: build_command(
        os.path.join(
            home, ".claude", "plugins", "data", "sd-claude-inline", "statusline.py"
        )
    ),
)


def main() -> None:
    try:
        plugin_root = os.environ.get("CLAUDE_PLUGIN_ROOT")
        if not plugin_root:
            return

        data_dir = os.path.join(home_dir(), ".claude", "sd")
        os.makedirs(data_dir, exist_ok=True)

        source_path = os.path.join(plugin_root, "hooks", "assets", "statusline.py")
        target_path = os.path.join(data_dir, "statusline.py")

        copy_statusline_if_needed(source_path, target_path)
        inject_statusline_setting(target_path)
    except Exception:
        # statusline 설정 실패는 세션 시작을 막지 않습니다.
        pass


def copy_statusline_if_needed(source_path: str, target_path: str) -> None:
    if not os.path.exists(source_path):
        return

    source_stat = os.stat(source_path)
    try:
        target_stat = os.stat(target_path)
        if source_stat.st_size == target_stat.st_size and int(
            source_stat.st_mtime
        ) == int(target_stat.st_mtime):
            return
    except OSError:
        pass

    shutil.copyfile(source_path, target_path)
    os.utime(target_path, (source_stat.st_atime, source_stat.st_mtime))


def inject_statusline_setting(statusline_path: str) -> None:
    settings_path = os.path.join(home_dir(), ".claude", "settings.json")
    settings = read_settings(settings_path)

    command = build_command(statusline_path)
    legacy_commands = {build(home_dir()) for build in LEGACY_COMMAND_BUILDERS}
    current = settings.get("statusLine")

    if isinstance(current, dict):
        current_command = current.get("command")
        if current_command == command:
            return
        if current_command not in legacy_commands:
            return
    elif "statusLine" in settings:
        # 사용자가 직접 지정한 형태 — 건드리지 않는다.
        return

    settings["statusLine"] = {"type": "command", "command": command}
    write_settings_atomic(settings_path, settings)


def read_settings(settings_path: str) -> dict:
    try:
        with open(settings_path, encoding="utf-8") as handle:
            return as_record(json.load(handle)) or {}
    except OSError, ValueError:
        return {}


def write_settings_atomic(settings_path: str, settings: dict) -> None:
    os.makedirs(os.path.dirname(settings_path), exist_ok=True)

    temp_path = f"{settings_path}.{os.getpid()}.{int(time.time() * 1000)}.tmp"
    try:
        with open(temp_path, "w", encoding="utf-8") as handle:
            handle.write(json.dumps(settings, indent=2, ensure_ascii=False) + "\n")
        os.replace(temp_path, settings_path)
    except OSError:
        with contextlib.suppress(OSError):
            os.remove(temp_path)
        raise


configure_stdio()
main()
