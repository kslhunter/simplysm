import os, sys

from _common import load_stdin, read_hash_dir, path_hash, file_hash

data = load_stdin()
tool_input = data["tool_input"]
file_path = tool_input.get("file_path", "")
session_id = data.get("session_id", "unknown")

if not file_path or not os.path.isfile(file_path):
    sys.exit(0)

cache_dir = read_hash_dir(session_id)
cache_dir.mkdir(parents=True, exist_ok=True)

(cache_dir / path_hash(file_path)).write_text(file_hash(file_path))
