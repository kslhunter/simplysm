import json, re, sys

data = json.load(sys.stdin)
cmd = data["tool_input"].get("command", "")

BLOCKED = [
    (r"\bgit\s+stash\b", "git stash"),
    (r"\bgit\s+checkout\b", "git checkout"),
    (r"\bgit\s+restore\b", "git restore"),
    (r"\bgit\s+reset\b", "git reset"),
    (r"\bgit\s+clean\b", "git clean"),
]

for pattern, label in BLOCKED:
    if re.search(pattern, cmd):
        print(f"Blocked command: {label}", file=sys.stderr)
        sys.exit(2)
