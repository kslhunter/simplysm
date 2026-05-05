import hashlib, json, os, sys

sys.path.insert(0, ".claude/scripts")
from sd_paths import resolve_tmp_base

data = json.load(sys.stdin)
file_path = data["tool_input"]["file_path"]
session_id = data.get("session_id", "unknown")

if os.path.isfile(file_path):
    path_hash = hashlib.sha256(os.path.normpath(file_path).encode()).hexdigest()
    cache_file = resolve_tmp_base() / "read_hash" / session_id / path_hash

    cached_hash = ""
    if cache_file.is_file():
        cached_hash = cache_file.read_text().strip()

    current_hash = hashlib.sha256(open(file_path, "rb").read()).hexdigest()

    if cached_hash != current_hash:
        print(f"CRITICAL: File content has changed or was never Read. You MUST Read the file first, then MUST REVISE your Write content based on the current file content before retrying: {file_path}", file=sys.stderr)
        sys.exit(2)
