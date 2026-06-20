import hashlib, json, os, sys, tempfile
from pathlib import Path

if os.environ.get("PLUGIN_ROOT"):
    sys.exit(0)

data = json.load(sys.stdin)
tool_input = data["tool_input"]
file_path = tool_input.get("file_path", "")
session_id = data.get("session_id", "unknown")

if not file_path or not os.path.isfile(file_path):
    sys.exit(0)

tmp_base = Path(os.environ.get("CLAUDE_PLUGIN_DATA") or tempfile.gettempdir()) / "tmp"

file_hash = hashlib.sha256(open(file_path, "rb").read()).hexdigest()
path_hash = hashlib.sha256(os.path.normpath(file_path).encode()).hexdigest()

cache_dir = tmp_base / "read_hash" / session_id
cache_dir.mkdir(parents=True, exist_ok=True)

(cache_dir / path_hash).write_text(file_hash)
