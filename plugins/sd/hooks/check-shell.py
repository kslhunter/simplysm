"""PreToolUse(Bash, PowerShell) hook — 차단 대상 셸 명령을 막는다.

차단은 종료코드 2 로만 성립한다(stderr 가 모델에 전달됨). 1 은 차단되지 않는다.

git 은 기본 차단이되 조회 계열만 허용한다. 판정은 "명령 위치에 등장한 git 전체" 에서
"조회로 매치된 git" 을 뺀 차집합이 남는지로 한다 — 한 줄에 조회와 변경이 섞여도 잡힌다.
"""

from __future__ import annotations

import re
import sys

import _bootstrap  # noqa: F401  (sys.path 준비)
from shared.hook_io import (
    configure_stdio,
    format_error_message,
    get_tool_input,
    read_stdin_json,
)

GIT_BLOCK_LABEL = (
    "git (forbidden by default; read-only status/diff/log/show/ls-files/check-ignore "
    "and tag -l/--list are allowed; use the commit skill for commits)."
)
GIT_ALLOW_TOKEN = "sd-git-allow"

COMMAND_POSITION_PATTERN = r"(^|[;&|=({])\s*"
GIT_EXECUTABLE_PATTERN = r"git(?:\.exe)?"
GIT_DIR_PATTERN = r"(?:\"[^\"$`]*\"|'[^']*'|[^\s\"'$`;&|<>()]+)"

GIT_COMMAND_PATTERN = re.compile(
    rf"{COMMAND_POSITION_PATTERN}{GIT_EXECUTABLE_PATTERN}(?=\s|$)",
    re.IGNORECASE,
)
GIT_READONLY_COMMAND_PATTERN = re.compile(
    rf"{COMMAND_POSITION_PATTERN}{GIT_EXECUTABLE_PATTERN}\s+"
    rf"(?:(?:--no-pager|-C\s+{GIT_DIR_PATTERN})\s+)*"
    r"(?:status|diff|log|show|ls-files|check-ignore|tag\s+(?:-l|--list))\b",
    re.IGNORECASE,
)

BLOCKED_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (
        re.compile(rf"{COMMAND_POSITION_PATTERN}cd\s+", re.IGNORECASE),
        "cd (directory change not allowed)",
    ),
    (
        re.compile(rf"{COMMAND_POSITION_PATTERN}npx\s+tsc\b", re.IGNORECASE),
        "npx tsc (use the typecheck script in package.json)",
    ),
    (
        re.compile(rf"{COMMAND_POSITION_PATTERN}npx\s+eslint\b", re.IGNORECASE),
        "npx eslint (use the lint script in package.json)",
    ),
    (
        re.compile(
            rf"{COMMAND_POSITION_PATTERN}(?:npx\s+)?playwright(?:-|\s+)cli\s+(?:(?:-s\s+\S+|-\S+)\s+)*"
            r"(screenshot|pdf|snapshot)\b[^|;&\n]*[ \t]--filename\b",
            re.IGNORECASE,
        ),
        "playwright-cli {screenshot|pdf|snapshot} --filename "
        "(omit to auto-save under .playwright-cli/)",
    ),
    (
        re.compile(
            rf"{COMMAND_POSITION_PATTERN}(?:npx\s+)?playwright(?:-|\s+)cli\s+(?:(?:-s\s+\S+|-\S+)\s+)*"
            r"(state-save|video-start)[ \t]+\S",
            re.IGNORECASE,
        ),
        "playwright-cli {state-save|video-start} <path> "
        "(omit path to auto-save under .playwright-cli/)",
    ),
    (
        re.compile(
            rf"{COMMAND_POSITION_PATTERN}(npm|pnpm|yarn|bun)(?:\.cmd)?\s+"
            r"[^;&|\n]*(?:-g\b|--global\b)",
            re.IGNORECASE,
        ),
        "global install forbidden (npm/pnpm/yarn/bun -g/--global). "
        "Install locally or ask the user.",
    ),
    (
        # pnpm 은 npm 과 달리 `--` 를 벗겨내지 않고 하위 명령에 literal 인자로 넘김 —
        # 필터, 인자가 조용히 무시되거나(playwright test filter 증발) unknown option 오류가 남.
        re.compile(
            rf"{COMMAND_POSITION_PATTERN}pnpm(?:\.cmd)?\s+[^;&|\n]*?\s--(?=\s|$)",
            re.IGNORECASE,
        ),
        "pnpm ... -- <args> (pnpm passes `--` through literally, unlike npm; "
        "drop it — `pnpm <script> <args>`)",
    ),
    (
        re.compile(
            rf"{COMMAND_POSITION_PATTERN}yarn(?:\.cmd)?\s+global\b", re.IGNORECASE
        ),
        "global install forbidden (yarn global). Install locally or ask the user.",
    ),
    (
        re.compile(
            rf"{COMMAND_POSITION_PATTERN}mise(?:\.exe)?\s+(?:use|install|i)\b",
            re.IGNORECASE,
        ),
        "global tool install forbidden (mise use/install). Install locally or ask the user.",
    ),
]


def check_shell_command(command_text: str) -> str | None:
    """차단이면 사유 라벨, 통과면 None."""
    for pattern, label in BLOCKED_PATTERNS:
        if pattern.search(command_text):
            return label

    if is_blocked_git_command(command_text):
        return GIT_BLOCK_LABEL

    return None


def is_blocked_git_command(command_text: str) -> bool:
    if GIT_ALLOW_TOKEN in command_text:
        return False

    git_command_starts = [
        match.start() for match in GIT_COMMAND_PATTERN.finditer(command_text)
    ]
    if not git_command_starts:
        return False

    readonly_starts = {
        match.start() for match in GIT_READONLY_COMMAND_PATTERN.finditer(command_text)
    }
    return any(start not in readonly_starts for start in git_command_starts)


def main() -> None:
    try:
        data = read_stdin_json()
        command = get_tool_input(data, "command")
        if not command:
            return

        label = check_shell_command(command)
        if label is None:
            return

        print(f"Blocked: {label}", file=sys.stderr)
        sys.exit(2)
    except SystemExit:
        raise
    except Exception as error:
        print(
            f"Blocked: check-shell failed: {format_error_message(error)}",
            file=sys.stderr,
        )
        sys.exit(2)


configure_stdio()
main()
