import os, sys

from _common import load_stdin, read_hash_dir, path_hash, file_hash

data = load_stdin()
file_path = (data.get("tool_input") or {}).get("file_path", "")
session_id = data.get("session_id", "unknown")

if not file_path or not os.path.isfile(file_path):
    sys.exit(0)

cache_file = read_hash_dir(session_id) / path_hash(file_path)

cached_hash = ""
if cache_file.is_file():
    cached_hash = cache_file.read_text().strip()

current_hash = file_hash(file_path)

if cached_hash != current_hash:
    print(f"CRITICAL: File content has changed or was never Read. You MUST Read the file first, then MUST REVISE your Write content based on the current file content before retrying: {file_path}", file=sys.stderr)
    sys.exit(2)
