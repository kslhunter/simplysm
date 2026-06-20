import hashlib, json, os, sys, tempfile
from pathlib import Path

if os.environ.get("PLUGIN_ROOT"):
    sys.exit(0)

data = json.load(sys.stdin)
file_path = (data.get("tool_input") or {}).get("file_path", "")
session_id = data.get("session_id", "unknown")

tmp_base = Path(os.environ.get("CLAUDE_PLUGIN_DATA") or tempfile.gettempdir()) / "tmp"

if not file_path or not os.path.isfile(file_path):
    sys.exit(0)

path_hash = hashlib.sha256(os.path.normpath(file_path).encode()).hexdigest()
cache_file = tmp_base / "read_hash" / session_id / path_hash

cached_hash = ""
if cache_file.is_file():
    cached_hash = cache_file.read_text().strip()

current_hash = hashlib.sha256(open(file_path, "rb").read()).hexdigest()

if cached_hash != current_hash:
    print(f"CRITICAL: File content has changed or was never Read. You MUST Read the file first, then MUST REVISE your Write content based on the current file content before retrying: {file_path}", file=sys.stderr)
    sys.exit(2)
