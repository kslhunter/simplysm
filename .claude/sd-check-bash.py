import json, re, sys

data = json.load(sys.stdin)
cmd = data["tool_input"].get("command", "")

# Command position prefix: start of line or after command separator (&&, ||, ;)
CMD_POS = r"(^|&&|\|\||;)\s*"

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
        print(f"Blocked: {label}", file=sys.stderr)
        sys.exit(2)
