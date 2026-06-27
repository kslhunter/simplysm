import re

from _common import load_stdin, deny

data = load_stdin()
cmd = data["tool_input"].get("command", "")

# 명령 시작 위치 접두: 줄 시작 또는 명령 구분 토큰(&& || ; | = ( { &) 직후
CMD_POS = r"(^|[;&|=({])\s*"

# git 차단 기본값. 통과 경로는 둘:
#  1. 조회 서브커맨드(status/diff/log/show)는 항상 허용 — 인자와 무관하게 작업트리·.git·네트워크를
#     건드릴 수 없음. 단 명령 내 모든 git 호출이 조회이고, 서브커맨드가 `git` 바로 뒤에 와야 허용
#     (`-c core.pager=...`·`-C <dir>` 같은 위험 전역 옵션이 끼면 → 조회 아님 → 토큰 필요.
#     부작용 없는 `--no-pager` 만 서브커맨드 앞 예외로 허용).
#  2. 그 외는 명령에 이 토큰이 있어야 함. 에이전트는 명시적으로 opt-in 한 작업 컨텍스트(예: 프로젝트
#     CLAUDE.md)에서만 토큰을 알게 되어 끝 주석으로 덧붙임(예: `git push # sd-git-allow`). 셸이
#     `#...`을 주석 처리하므로 실행엔 영향 없음. 토큰은 전역 시스템 프롬프트에서 빼므로, opt-in 안 한
#     프로젝트에선 변경·발행 git 이 계속 차단됨.
GIT_ALLOW_TOKEN = "sd-git-allow"
git_allowed = GIT_ALLOW_TOKEN in cmd
# `git` 바로 뒤 조회 서브커맨드(부작용 없는 --no-pager 만 사이 허용).
GIT_READONLY = CMD_POS + r"git\s+(?:--no-pager\s+)?(?:status|diff|log|show)\b"

BLOCKED = [
    # 디렉토리 변경 금지
    (CMD_POS + r"cd\s+", "cd (directory change not allowed)"),
    # 대신 {PM} typecheck 사용
    (CMD_POS + r"npx\s+tsc\b", "npx tsc (use {PM} typecheck)"),
    # 대신 {PM} lint 사용
    (CMD_POS + r"npx\s+eslint\b", "npx eslint (use {PM} lint)"),
    # Playwright CLI: 저장 경로 지정 금지. .playwright-cli/ 아래 자동 저장에 맡김
    (CMD_POS + r"(npx\s+)?playwright-cli\s+(?:-s=\S+\s+)?(screenshot|pdf|snapshot)\b[^|;&\n]*[ \t]--filename\b",
     "playwright-cli {screenshot|pdf|snapshot} --filename (omit to auto-save under .playwright-cli/)"),
    (CMD_POS + r"(npx\s+)?playwright-cli\s+(?:-s=\S+\s+)?(state-save|video-start)[ \t]+\S",
     "playwright-cli {state-save|video-start} <path> (omit path to auto-save under .playwright-cli/)"),
]

for pattern, label in BLOCKED:
    if re.search(pattern, cmd):
        deny(label)

# 허용 토큰이 있거나, 명령 내 모든 git 호출이 조회면 통과. 아니면 차단.
if not git_allowed:
    all_git = {m.start() for m in re.finditer(CMD_POS + r"git\b", cmd)}
    readonly_git = {m.start() for m in re.finditer(GIT_READONLY, cmd)}
    if all_git and not all_git <= readonly_git:
        deny("git (forbidden by default; only read-only status/diff/log/show are allowed without the git-allow token).")
