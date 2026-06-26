import re

from _common import load_stdin, deny

data = load_stdin()
cmd = data["tool_input"].get("command", "")

# Command position prefix: line start or after a command-opening token (&& || ; | = ( { &)
CMD_POS = r"(^|[;&|=({])\s*"

# Git escape hatch: every git command is blocked unless this token appears in the command. The
# agent learns the token only from a working context that explicitly opts in (e.g. a project
# CLAUDE.md) and appends it as a trailing comment (e.g. `git push # sd-git-allow`); the shell
# treats `#...` as a comment so execution is unaffected. The token is intentionally kept out of
# the global system prompt, so git stays blocked wherever a project has not opted in.
GIT_ALLOW_TOKEN = "sd-git-allow"
git_allowed = GIT_ALLOW_TOKEN in cmd

BLOCKED = [
    # No directory change allowed
    (CMD_POS + r"cd\s+", "cd (directory change not allowed)"),
    # Use {PM} typecheck instead
    (CMD_POS + r"npx\s+tsc\b", "npx tsc (use {PM} typecheck)"),
    # Use {PM} lint instead
    (CMD_POS + r"npx\s+eslint\b", "npx eslint (use {PM} lint)"),
    # Playwright CLI: do not specify save paths; let it auto-save under .playwright-cli/
    (CMD_POS + r"(npx\s+)?playwright-cli\s+(?:-s=\S+\s+)?(screenshot|pdf|snapshot)\b[^|;&\n]*[ \t]--filename\b",
     "playwright-cli {screenshot|pdf|snapshot} --filename (omit to auto-save under .playwright-cli/)"),
    (CMD_POS + r"(npx\s+)?playwright-cli\s+(?:-s=\S+\s+)?(state-save|video-start)[ \t]+\S",
     "playwright-cli {state-save|video-start} <path> (omit path to auto-save under .playwright-cli/)"),
]

for pattern, label in BLOCKED:
    if re.search(pattern, cmd):
        deny(label)

# All git commands are blocked unless the allow-token is present in the command.
if not git_allowed and re.search(CMD_POS + r"git\b", cmd):
    deny("git (forbidden by default; only allowed where the working context provides the git-allow token).")
