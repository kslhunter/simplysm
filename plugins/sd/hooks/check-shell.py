import json, os, re, sys

data = json.load(sys.stdin)
cmd = data["tool_input"].get("command", "")

# Codex 는 native PLUGIN_ROOT 를 set(Claude 는 CLAUDE_PLUGIN_ROOT 만) → 호스트 판별.
IS_CODEX = bool(os.environ.get("PLUGIN_ROOT"))


def block(reason):
    # Claude: exit 2 + stderr (기존 동작 그대로). Codex: stdout JSON permissionDecision(deny).
    if IS_CODEX:
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": f"Blocked: {reason}",
            }
        }, ensure_ascii=False))
        sys.exit(0)
    print(f"Blocked: {reason}", file=sys.stderr)
    sys.exit(2)

# Command position prefix: start of line or after command separator (&&, ||, ;, |)
CMD_POS = r"(^|&&|\|\||;|\|)\s*"

BLOCKED = [
    # Blocked git commands
    (CMD_POS + r"git\s+stash\b", "git stash"),
    (CMD_POS + r"git\s+checkout\b", "git checkout"),
    (CMD_POS + r"git\s+restore\b", "git restore"),
    (CMD_POS + r"git\s+reset\b", "git reset"),
    (CMD_POS + r"git\s+clean\b", "git clean"),
    # No directory change allowed
    (CMD_POS + r"cd\s+", "cd (directory change not allowed)"),
    # Use {PM} typecheck instead
    (CMD_POS + r"npx\s+tsc\b", "npx tsc (use {PM} typecheck)"),
    # Use {PM} lint instead
    (CMD_POS + r"npx\s+eslint\b", "npx eslint (use {PM} lint)"),
    # Playwright CLI: do not specify save paths; let it auto-save under .playwright-cli/
    (CMD_POS + r"(npx\s+)?playwright-cli\s+(?:-s=\S+\s+)?(screenshot|pdf|snapshot)\b[^|;&\n]*[ \t]--filename\b",
     "playwright-cli {screenshot|pdf|snapshot} --filename (omit to auto-save under .playwright-cli/)"),
    (CMD_POS + r"(npx\s+)?playwright-cli\s+(?:-s=\S+\s+)?(state-save|video-start)[ \t]+\S",
     "playwright-cli {state-save|video-start} <path> (omit path to auto-save under .playwright-cli/)"),
]

for pattern, label in BLOCKED:
    if re.search(pattern, cmd):
        block(label)

# Git read-only inspection block (working-tree-only policy).
GIT_READ_VERBS = r"status|diff|log|show|blame|reflog|rev-list|rev-parse|ls-files|ls-tree|cat-file|describe|whatchanged|shortlog|grep"
if not re.search(r"\bSDGIT\b", cmd):
    m = re.search(CMD_POS + rf"git\s+(?P<verb>{GIT_READ_VERBS})\b", cmd)
    if m:
        block(
            f"git {m.group('verb')} "
            "(working-tree inspection via git is forbidden; use Read/Grep/Glob)."
        )
