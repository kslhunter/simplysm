# @simplysm/sd-claude

> Simplysm Claude Code CLI — asset installer

A CLI tool and postinstall hook that provisions [Claude Code](https://docs.anthropic.com/en/docs/claude-code) projects with shared skills, rules, hooks, and a status line. It also provides multi-account management for Claude OAuth profiles.

On `npm install` (postinstall), the package automatically copies its bundled `sd-*` assets into the consuming project's `.claude/` directory and configures `settings.json` with the status line and session-start hook.

## CLI Usage

The binary is exposed as `sd-claude` after installation.

```bash
# Install assets into the project's .claude/ directory (also runs automatically on postinstall)
sd-claude install

# Account profile management
sd-claude auth add <name>       # Save the currently logged-in account as a named profile
sd-claude auth use <name>       # Switch to a saved account profile
sd-claude auth list             # List all saved profiles with usage stats
sd-claude auth remove <name>    # Remove a saved profile
```

### `sd-claude install`

Copies all `sd-*` entries from the package's bundled `claude/` directory into the project's `.claude/` directory. It also writes `settings.json` to configure the status line command and the session-start hook. Existing `sd-*` entries are removed before copying to ensure a clean state.

Skipped automatically when running inside the simplysm monorepo with a matching major version.

### `sd-claude auth add <name>`

Reads the current Claude OAuth session from `~/.claude.json` and `~/.claude/.credentials.json`, then saves it as a named profile under `~/.sd-claude/auth/<name>/`. Profile names must match `[a-z0-9_-]+`.

### `sd-claude auth use <name>`

Restores a previously saved profile by writing its `oauthAccount` and `userID` back into `~/.claude.json` and replacing `~/.claude/.credentials.json`. Warns if the saved token has expired.

### `sd-claude auth list`

Lists all saved profiles, marking the currently active one with `*`. For each profile it displays the email, token expiry date, and live API usage stats (5-hour and 7-day utilization fetched from the Anthropic OAuth usage endpoint).

### `sd-claude auth remove <name>`

Deletes the profile directory `~/.sd-claude/auth/<name>/`. Warns if the profile being removed is currently active.

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

## Programmatic API

All CLI command functions are exported from the package entry point for programmatic use.

### `runInstall()`

```typescript
function runInstall(): void;
```

Installs Claude Code assets to the project's `.claude/` directory. This is the same function invoked by `sd-claude install` and the postinstall hook.

---

### `runAuthAdd(name, homeDir?)`

```typescript
function runAuthAdd(name: string, homeDir?: string): void;
```

Saves the currently logged-in Claude account as a named profile. Throws if the profile already exists or the user is not logged in.

---

### `runAuthUse(name, homeDir?)`

```typescript
function runAuthUse(name: string, homeDir?: string): void;
```

Switches to a previously saved account profile. Throws if the profile does not exist.

---

### `runAuthList(homeDir?)`

```typescript
function runAuthList(homeDir?: string): Promise<void>;
```

Prints all saved profiles to stdout with usage statistics. Async because it fetches live usage data from the Anthropic API.

---

### `runAuthRemove(name, homeDir?)`

```typescript
function runAuthRemove(name: string, homeDir?: string): void;
```

Removes a saved account profile. Throws if the profile does not exist.

---

### Auth Utilities

```typescript
function validateName(name: string): void;
function getProfileDir(name: string, homeDir?: string): string;
function profileExists(name: string, homeDir?: string): boolean;
function listProfiles(homeDir?: string): string[];
function readCurrentAuth(homeDir?: string): { oauthAccount: Record<string, unknown>; userID: string };
function readCurrentCredentials(homeDir?: string): Record<string, unknown>;
function getCurrentUserID(homeDir?: string): string | undefined;
```

Low-level helpers for profile management. All functions default to `os.homedir()` when `homeDir` is not provided.

| Function | Description |
|----------|-------------|
| `validateName` | Throws if name does not match `[a-z0-9_-]+` |
| `getProfileDir` | Returns `~/.sd-claude/auth/<name>` |
| `profileExists` | Checks if a profile directory exists |
| `listProfiles` | Returns an array of profile directory names |
| `readCurrentAuth` | Reads `oauthAccount` and `userID` from `~/.claude.json` |
| `readCurrentCredentials` | Reads `~/.claude/.credentials.json` |
| `getCurrentUserID` | Returns the current `userID` or `undefined` |

## Usage Examples

```typescript
import { runInstall, runAuthAdd, runAuthUse, runAuthList, runAuthRemove } from "@simplysm/sd-claude";

// Install assets programmatically
runInstall();

// Save the current account
runAuthAdd("work");

// Switch accounts
runAuthUse("personal");

// List all profiles
await runAuthList();

// Remove a profile
runAuthRemove("old-account");
```
