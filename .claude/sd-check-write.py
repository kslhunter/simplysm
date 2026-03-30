import json, os, sys

data = json.load(sys.stdin)
file_path = data["tool_input"]["file_path"]
if os.path.isfile(file_path):
    print(f"파일이 이미 존재합니다. 덮어쓰기가 위험하므로, Edit 도구를 사용하세요: {file_path}", file=sys.stderr)
    sys.exit(2)
