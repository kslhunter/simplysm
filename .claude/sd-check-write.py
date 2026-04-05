import json, os, sys

data = json.load(sys.stdin)
file_path = data["tool_input"]["file_path"]
if os.path.isfile(file_path):
    print(f"File already exists. Use the Edit tool instead of overwriting: {file_path}", file=sys.stderr)
    sys.exit(2)
