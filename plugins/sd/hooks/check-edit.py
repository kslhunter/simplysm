import os, sys
from pathlib import Path

from _common import load_stdin, deny, project_root

data = load_stdin()
tool_input = data.get("tool_input") or {}
root = project_root(data)


def norm_key(path):
    return os.path.normcase(str(path.resolve()))


BLOCKED_FILES = {
    norm_key(root / "tsconfig.json"),
    norm_key(root / "eslint.config.ts"),
}


file_path = tool_input.get("file_path")
if not file_path:
    sys.exit(0)

if norm_key(Path(file_path)) in BLOCKED_FILES:
    deny(f"forbidden file - {Path(file_path)}")
