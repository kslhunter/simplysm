import json, sys, os

data = json.load(sys.stdin)
tool_input = data["tool_input"]
file_path = tool_input["file_path"].replace("\\", "/")
root = os.getcwd().replace("\\", "/")

BLOCKED_FILES = [
    f"{root}/tsconfig.json",
    f"{root}/eslint.config.ts",
]

if file_path in BLOCKED_FILES:
    print(f"Blocked: forbidden file - {file_path}", file=sys.stderr)
    sys.exit(2)
