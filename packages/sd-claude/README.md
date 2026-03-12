# @simplysm/sd-claude

> Simplysm Claude Code asset installer

A postinstall hook that provisions [Claude Code](https://docs.anthropic.com/en/docs/claude-code) projects with shared skills, rules, hooks, and a status line.

On `npm install` (postinstall), the package automatically copies its bundled `sd-*` assets into the consuming project's `.claude/` directory and configures `settings.json` with the status line and session-start hook.

## Bundled Assets

The following assets are installed into the project's `.claude/` directory.

### Skills

| Skill | Trigger | Description |
|-------|---------|-------------|
| `sd-commit` | `/sd-commit` | Stages changes, generates a Conventional Commits message, and commits |
| `sd-check` | `/sd-check` | Runs `check` script (typecheck + lint + test), auto-fixes code errors in a loop via `sd-debug` |
| `sd-plan` | `/sd-plan` | Generates a fully clarified implementation plan through iterative Q&A |
| `sd-debug` | `/sd-debug` | Analyzes errors/stack traces, diagnoses root cause, then delegates to `sd-plan` |
| `sd-review` | `/sd-review` | Scans code for potential bugs across 5 categories, then plans and applies fixes |
| `sd-simplify` | `/sd-simplify` | Reviews code for simplification opportunities, then plans and applies changes |
| `sd-api-review` | `/sd-api-review` | Compares public API against standards and popular libraries, proposes naming/structure improvements |
| `sd-init` | `/sd-init` | Auto-generates `CLAUDE.md` by analyzing the project's scripts, dependencies, and lint config |
| `sd-readme` | `/sd-readme` | Generates README.md documentation for monorepo packages |
| `sd-document` | `/sd-document` | Reads/writes `.docx`, `.xlsx`, `.pptx`, `.pdf` files via Python extraction scripts |
| `sd-email-analyze` | `/sd-email-analyze` | Parses `.eml`/`.msg` email files, extracts headers, body, inline images, and attachments |

### Rules

| Rule file | Purpose |
|-----------|---------|
| `sd-claude-rules.md` | Enforces YAGNI, no unsolicited code edits, Playwright output directory |
| `sd-simplysm-usage.md` | Directs Claude to read package README.md files for `@simplysm/*` API details |

### Hooks & Status Line

| Asset | Description |
|-------|-------------|
| `sd-session-start.sh` | Session-start hook that reminds Claude to read `.claude/rules/*.md` and `CLAUDE.md` |
| `sd-statusline.py` | Status line script showing: folder name, model, context %, 5h usage %, 7d usage % |

The status line fetches usage data from the Anthropic API in the background (every 3 minutes) and caches results in `~/.claude/statusline-cache.json`.
