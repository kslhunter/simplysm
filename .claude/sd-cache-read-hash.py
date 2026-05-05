import hashlib, json, os, sys

sys.path.insert(0, ".claude/scripts")
from sd_paths import resolve_tmp_base

data = json.load(sys.stdin)
tool_input = data["tool_input"]
file_path = tool_input.get("file_path", "")
session_id = data.get("session_id", "unknown")

if not file_path or not os.path.isfile(file_path):
    sys.exit(0)

file_hash = hashlib.sha256(open(file_path, "rb").read()).hexdigest()
path_hash = hashlib.sha256(os.path.normpath(file_path).encode()).hexdigest()

cache_dir = resolve_tmp_base() / "read_hash" / session_id
cache_dir.mkdir(parents=True, exist_ok=True)

(cache_dir / path_hash).write_text(file_hash)
