import json, os, sys
from pathlib import Path


data = json.load(sys.stdin)
tool_input = data.get("tool_input") or {}
root = Path(os.environ.get("CLAUDE_PROJECT_DIR") or data.get("cwd") or os.getcwd()).resolve()
IS_CODEX = bool(os.environ.get("PLUGIN_ROOT"))


def norm_key(path):
    return os.path.normcase(str(path.resolve()))


BLOCKED_FILES = {
    norm_key(root / "tsconfig.json"),
    norm_key(root / "eslint.config.ts"),
}


def block(file_path):
    reason = f"forbidden file - {file_path}"
    if IS_CODEX:
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": f"Blocked: {reason}",
            }
        }, ensure_ascii=False))
        sys.exit(0)
    print(f"Blocked: {reason}", file=sys.stderr)
    sys.exit(2)


def resolve_patch_path(raw_path):
    path = Path(raw_path.strip().replace("\\", "/"))
    if not path.is_absolute():
        path = root / path
    return path.resolve()


if IS_CODEX:
    command = tool_input.get("command", "")
    touched_paths = []
    for line in command.splitlines():
        for marker in ("*** Add File: ", "*** Delete File: ", "*** Update File: ", "*** Move to: "):
            if line.startswith(marker):
                touched_paths.append(resolve_patch_path(line[len(marker):]))
                break
    for touched_path in touched_paths:
        if norm_key(touched_path) in BLOCKED_FILES:
            block(touched_path)
    sys.exit(0)

file_path = tool_input.get("file_path")
if not file_path:
    sys.exit(0)

if norm_key(Path(file_path)) in BLOCKED_FILES:
    block(Path(file_path))
