import re

from _common import load_stdin, deny

data = load_stdin()
cmd = data["tool_input"].get("command", "")

# 명령 시작 위치 접두: 줄 시작 또는 명령 구분 토큰(&& || ; | = ( { &) 직후
CMD_POS = r"(^|[;&|=({])\s*"

# git 차단 기본값. 통과 경로는 둘:
#  1. 조회만 가능한 형태는 항상 허용 — status/diff/log/show(인자 무관 부작용 없음)와 tag -l/--list
#     (목록 조회). 단 명령 내 모든 git 호출이 조회이고, 서브커맨드가 `git` 바로 뒤에 와야 허용
#     (`-c core.pager=...` 같은 위험 전역 옵션(임의 config 주입)이 끼면 → 조회 아님 → 내부 허용 표식 필요.
#     부작용 없는 `--no-pager`·`-C <dir>`(저장소 위치 지정) 만 서브커맨드 앞 예외로 허용).
#  2. 그 외는 명령에 내부 허용 표식이 있어야 함. 표식은 일반 차단 메시지·공통 지침에 노출하지 않고,
#     필요한 전용 workflow 문맥에만 둔다. 셸 주석으로 붙이면 실행엔 영향 없음.
GIT_ALLOW_TOKEN = "sd-git-allow"
git_allowed = GIT_ALLOW_TOKEN in cmd
# `-C <dir>` 의 dir: 따옴표 경로(공백 허용)·무따옴표 모두. 부작용 없는 조회만 통과해야 하므로
# 명령치환·분리자·리다이렉트 우회를 차단 — 큰따옴표 안 `$`·백틱, 무따옴표의 셸 메타 제외
# (작은따옴표 안은 셸이 전부 리터럴 처리하므로 그대로 허용).
GIT_DIR = r'''(?:"[^"$`]*"|'[^']*'|[^\s"'$`;&|<>()]+)'''
# `git` 바로 뒤 조회 서브커맨드(부작용 없는 --no-pager·-C <dir> 만 사이 허용, 순서·반복 무관).
GIT_READONLY = CMD_POS + r"git\s+(?:(?:--no-pager|-C\s+" + GIT_DIR + r")\s+)*(?:status|diff|log|show|tag\s+(?:-l|--list))\b"

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

# 내부 허용 표식이 있거나, 명령 내 모든 git 호출이 조회면 통과. 아니면 차단.
if not git_allowed:
    all_git = {m.start() for m in re.finditer(CMD_POS + r"git\b", cmd)}
    readonly_git = {m.start() for m in re.finditer(GIT_READONLY, cmd)}
    if all_git and not all_git <= readonly_git:
        deny("git (forbidden by default; read-only status/diff/log/show and tag -l/--list are allowed; use the commit skill for commits).")
