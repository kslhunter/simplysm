# @simplysm/sd-claude

Claude Code asset installer for simplysm projects. Automatically provisions `.claude/` directory with rules, skills, and hooks via `postinstall`.

## Installation

```bash
npm install @simplysm/sd-claude
```

On `pnpm install`, the `postinstall` script copies `sd-*` assets into the consuming project's `.claude/` directory and registers hooks in `.claude/settings.json`.

## How It Works

### Asset Installation Flow

1. **Project root detection** -- uses `INIT_CWD` or `node_modules` path to find the consuming project root.
2. **Self-install guard** -- skips installation if the consuming project is the simplysm monorepo with the same major version.
3. **Clean** -- removes existing `sd-*` entries from `.claude/`.
4. **Copy** -- copies all `sd-*` assets from `claude/` to `.claude/`.
5. **Settings setup** -- registers hooks in `.claude/settings.json` (SessionStart, PreToolUse Write, PreToolUse Bash, SubagentStart, statusLine).

Installation failure does not block `pnpm install` -- the entire process is wrapped in try-catch.

### Prepack Sync

Before `npm publish`/`npm pack`, the `prepack` script synchronizes the root `.claude/sd-*` assets into `packages/sd-claude/claude/`. The source of truth is the root `.claude/` directory.

## Included Assets

### Rules (1)

| File | Description |
|------|-------------|
| `sd-claude-rules.md` | Compaction rules, forbidden commands, tool usage rules, conversation rules, Playwright rules, coding rules |

### References (4)

| File | Description |
|------|-------------|
| `sd-clarify.md` | Clarification guidelines for ambiguous user requests |
| `sd-debug.md` | Debugging reference for root cause analysis |
| `sd-options.md` | Option presentation and scoring rules for user choices |
| `sd-readme.md` | Package README reference rules |

### Skills (16)

| Skill | Description |
|-------|-------------|
| `sd-apk-decompile` | APK decompilation (Python + Java tools) |
| `sd-check` | typecheck/lint/test execution and error resolution |
| `sd-claude-docs` | CLAUDE.md and README.md simultaneous generation |
| `sd-commit` | Group-based commit creation |
| `sd-debug` | Bug root cause analysis |
| `sd-deliverable` | User manual and SIT document generation |
| `sd-dev` | Integrated development orchestrator (spec -> plan -> TDD -> check -> review) |
| `sd-doc-extract` | Document file text/image extraction (docx, xlsx, pptx, pdf, eml, msg) |
| `sd-issue` | GitHub issue creation for simplysm |
| `sd-outlook` | Outlook mail search and download via Microsoft Graph API |
| `sd-plan` | Requirement specification and implementation plan creation |
| `sd-prompt` | Skill/prompt file authoring and improvement |
| `sd-review` | Code review report generation |
| `sd-tdd` | TDD development from plan |
| `sd-use` | Natural language routing to sd-* skills |
| `sd-wbs` | WBS Feature decomposition |

### Hooks (4)

| Hook | Type | Description |
|------|------|-------------|
| `sd-session-start.sh` | SessionStart, SubagentStart | Outputs rules/*.md and CLAUDE.md paths on session start |
| `sd-check-write.py` | PreToolUse (Write) | Pre-checks file existence before Write tool execution |
| `sd-check-git.py` | PreToolUse (Bash) | Blocks forbidden git commands (stash, checkout, restore, reset, clean) |
| `sd-statusline.py` | statusLine | Displays folder, model, context%, usage in status bar |

## CLI

The package provides a `sd-claude` CLI command for multi-account management.

### `sd-claude auth save`

Saves the current Claude Code account (Organization name + refresh token) to `~/.claude/profiles.json`.

```bash
sd-claude auth save
```

### `sd-claude auth switch`

Displays saved accounts with usage info and switches to the selected account. Requires TTY.

```bash
sd-claude auth switch
```

## Usage Examples

### Consuming Project Setup

Install the package -- assets are provisioned automatically:

```bash
pnpm add -D @simplysm/sd-claude
```

After installation, the `.claude/` directory contains all `sd-*` rules, skills, and hooks. The `.claude/settings.json` is configured with the required hooks.

### Manual Reinstall

If assets need to be refreshed:

```bash
node node_modules/@simplysm/sd-claude/scripts/postinstall.mjs
```
