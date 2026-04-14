import json, os, sys

data = json.load(sys.stdin)
file_path = data["tool_input"]["file_path"]
if os.path.isfile(file_path):
    print(f"CRITICAL: This file already exists. NEVER delete/rm the file and retry with Write. You MUST use the Edit tool instead: {file_path}", file=sys.stderr)
    sys.exit(2)
