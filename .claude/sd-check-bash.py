import json, re, sys

data = json.load(sys.stdin)
cmd = data["tool_input"].get("command", "")

# 명령어 위치 프리픽스: 줄 시작 또는 명령어 구분자(&&, ||, ;) 뒤
CMD_POS = r"(^|&&|\|\||;)\s*"

BLOCKED = [
    # git 금지 명령어
    (CMD_POS + r"git\s+stash\b", "git stash"),
    (CMD_POS + r"git\s+checkout\b", "git checkout"),
    (CMD_POS + r"git\s+restore\b", "git restore"),
    (CMD_POS + r"git\s+reset\b", "git reset"),
    (CMD_POS + r"git\s+clean\b", "git clean"),
    # 폴더이동 금지
    (CMD_POS + r"cd\s+", "cd (폴더이동 금지)"),
    # npx tsc 금지 (pnpm typecheck 사용)
    (CMD_POS + r"npx\s+tsc\b", "npx tsc (pnpm typecheck 사용)"),
    # npx eslint 금지 (pnpm lint 사용)
    (CMD_POS + r"npx\s+eslint\b", "npx eslint (pnpm lint 사용)"),
]

for pattern, label in BLOCKED:
    if re.search(pattern, cmd):
        print(f"Blocked: {label}", file=sys.stderr)
        sys.exit(2)
