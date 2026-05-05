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
    # Use pnpm typecheck instead
    (CMD_POS + r"npx\s+tsc\b", "npx tsc (use pnpm typecheck)"),
    # Use pnpm lint instead
    (CMD_POS + r"npx\s+eslint\b", "npx eslint (use pnpm lint)"),
]

for pattern, label in BLOCKED:
    if re.search(pattern, cmd):
        print(f"Blocked: {label}", file=sys.stderr)
        sys.exit(2)
