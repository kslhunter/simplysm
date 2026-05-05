import hashlib, json, os, sys

data = json.load(sys.stdin)
tool_input = data["tool_input"]
file_path = tool_input.get("file_path", "")
session_id = data.get("session_id", "unknown")

if not file_path or not os.path.isfile(file_path):
    sys.exit(0)

file_hash = hashlib.sha256(open(file_path, "rb").read()).hexdigest()
path_hash = hashlib.sha256(os.path.normpath(file_path).encode()).hexdigest()

cache_dir = os.path.join(".tmp", "read_hash", session_id)
os.makedirs(cache_dir, exist_ok=True)

with open(os.path.join(cache_dir, path_hash), "w") as f:
    f.write(file_hash)
