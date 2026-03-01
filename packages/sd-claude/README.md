# @simplysm/sd-claude

Simplysm Claude Code CLI — asset installer and Claude account profile manager.

## Installation

```bash
pnpm add @simplysm/sd-claude
```

On install, the `postinstall` script automatically copies Claude Code assets (`sd-*` entries) from the package's `claude/` directory into the project's `.claude/` directory and configures the status line in `.claude/settings.json`.

## CLI

The package provides the `sd-claude` binary.

```
sd-claude <command> [options]
sd-claude --help
```

### `install`

Installs Claude Code assets to the project's `.claude/` directory. This is also run automatically via the `postinstall` script.

```bash
sd-claude install
```

**Behavior:**

- Locates the project root via `INIT_CWD` environment variable or by finding `node_modules` in the path.
- Copies all `sd-*` entries from the package's `claude/` directory to the project's `.claude/` directory.
- Removes any previously installed `sd-*` entries before copying (clean install).
- Adds a `statusLine` entry to `.claude/settings.json` if one is not already configured:
  ```json
  { "type": "command", "command": "node .claude/sd-statusline.js" }
  ```
- Skips installation when running inside the simplysm monorepo at the same major version.
- Errors during installation are suppressed (logged as warnings) to avoid blocking `pnpm install`.

### `auth`

Manages Claude account profiles. Profiles are stored in `~/.sd-claude/auth/<name>/`.

Each profile stores:
- `auth.json` — `oauthAccount` and `userID` from `~/.claude.json`
- `credentials.json` — full contents of `~/.claude/.credentials.json`

#### `auth add <name>`

Saves the currently logged-in Claude account as a named profile.

```bash
sd-claude auth add <name>
```

- `<name>`: Profile name. Must match `[a-z0-9_-]+`.
- Reads the current auth state from `~/.claude.json` and `~/.claude/.credentials.json`.
- Fails if the profile name already exists. Remove it first with `auth remove`.
- Requires an active Claude login. Run `/login` in Claude Code before saving.

**Example:**

```bash
sd-claude auth add personal
sd-claude auth add work
```

#### `auth use <name>`

Switches to a saved Claude account profile.

```bash
sd-claude auth use <name>
```

- Reads the saved `auth.json` and `credentials.json` from `~/.sd-claude/auth/<name>/`.
- Updates `~/.claude.json` (only `oauthAccount` and `userID` fields; other fields are preserved).
- Replaces `~/.claude/.credentials.json` entirely with the saved credentials.
- Warns if the saved token has expired (run `/login` after switching to refresh).

**Example:**

```bash
sd-claude auth use work
```

#### `auth list`

Displays all saved profiles with their active status, email, token expiry, and usage.

```bash
sd-claude auth list
```

Output format per profile:

```
* <name> (<email>) expires: YYYY-MM-DD │ 5h: <pct>(<remaining>) │ 7d: <pct>(<remaining>)
```

- `*` marks the currently active profile (matched by `userID`); inactive profiles show a space.
- Usage is fetched live from `https://api.anthropic.com/api/oauth/usage` using the profile's OAuth token (5-second timeout). Shows `?` when unavailable or when the token is expired.
- Usage shows the `daily` window (falling back to `five_hour`) as the `5h` column, and `seven_day` as the `7d` column.
- Profiles are sorted alphabetically.

**Example output:**

```
* work (work@company.com) expires: 2025-12-31 │ 5h: 42%(3h15m) │ 7d: 18%(2d4h)
  personal (personal@gmail.com) expires: 2025-11-01 │ 5h: ? │ 7d: ?
```

#### `auth remove <name>`

Removes a saved Claude account profile.

```bash
sd-claude auth remove <name>
```

- Deletes `~/.sd-claude/auth/<name>/` and all its contents.
- Warns if the profile being removed is the currently active account (the active session in Claude Code is not affected).

**Example:**

```bash
sd-claude auth remove personal
```

## Programmatic API

All commands are also exported as functions for use in Node.js scripts.

```ts
import {
  runInstall,
  runAuthAdd,
  runAuthUse,
  runAuthList,
  runAuthRemove,
  validateName,
  getProfileDir,
  profileExists,
  listProfiles,
  readCurrentAuth,
  readCurrentCredentials,
  getCurrentUserID,
} from "@simplysm/sd-claude";
```

### `runInstall(): void`

Runs the install command programmatically. See [`install`](#install) for behavior details.

```ts
import { runInstall } from "@simplysm/sd-claude";

runInstall();
```

### `runAuthAdd(name: string, homeDir?: string): void`

Saves the currently logged-in Claude account as a named profile.

- `name`: Profile name (validated against `[a-z0-9_-]+`).
- `homeDir`: Override for the home directory (defaults to `os.homedir()`). Primarily used in tests.

```ts
import { runAuthAdd } from "@simplysm/sd-claude";

runAuthAdd("work");
```

### `runAuthUse(name: string, homeDir?: string): void`

Switches to a saved Claude account profile.

- `name`: Profile name to switch to.
- `homeDir`: Override for the home directory.

```ts
import { runAuthUse } from "@simplysm/sd-claude";

runAuthUse("work");
```

### `runAuthList(homeDir?: string): Promise<void>`

Prints all saved profiles to stdout with status, expiry, and live usage data.

- `homeDir`: Override for the home directory.

```ts
import { runAuthList } from "@simplysm/sd-claude";

await runAuthList();
```

### `runAuthRemove(name: string, homeDir?: string): void`

Removes a saved Claude account profile.

- `name`: Profile name to remove.
- `homeDir`: Override for the home directory.

```ts
import { runAuthRemove } from "@simplysm/sd-claude";

runAuthRemove("personal");
```

### `validateName(name: string): void`

Validates that a profile name matches `[a-z0-9_-]+`. Throws an `Error` if invalid.

```ts
import { validateName } from "@simplysm/sd-claude";

validateName("my-profile"); // OK
validateName("My Profile"); // throws Error
```

### `getProfileDir(name: string, homeDir?: string): string`

Returns the absolute path to the profile directory: `<homeDir>/.sd-claude/auth/<name>`.

```ts
import { getProfileDir } from "@simplysm/sd-claude";

const dir = getProfileDir("work");
// e.g. "/home/user/.sd-claude/auth/work"
```

### `profileExists(name: string, homeDir?: string): boolean`

Returns `true` if the profile directory exists.

```ts
import { profileExists } from "@simplysm/sd-claude";

if (profileExists("work")) {
  console.log("Profile work exists");
}
```

### `listProfiles(homeDir?: string): string[]`

Returns an array of all saved profile names (directory names under `~/.sd-claude/auth/`). Returns an empty array if no profiles exist.

```ts
import { listProfiles } from "@simplysm/sd-claude";

const profiles = listProfiles();
// e.g. ["personal", "work"]
```

### `readCurrentAuth(homeDir?: string): { oauthAccount: Record<string, unknown>; userID: string }`

Reads `oauthAccount` and `userID` from `~/.claude.json`. Throws if not logged in.

```ts
import { readCurrentAuth } from "@simplysm/sd-claude";

const { oauthAccount, userID } = readCurrentAuth();
```

### `readCurrentCredentials(homeDir?: string): Record<string, unknown>`

Reads and returns the full contents of `~/.claude/.credentials.json`.

```ts
import { readCurrentCredentials } from "@simplysm/sd-claude";

const credentials = readCurrentCredentials();
```

### `getCurrentUserID(homeDir?: string): string | undefined`

Returns the `userID` from `~/.claude.json`, or `undefined` if the file does not exist or cannot be read.

```ts
import { getCurrentUserID } from "@simplysm/sd-claude";

const userID = getCurrentUserID();
```

## Profile Storage Layout

```
~/.sd-claude/
  auth/
    <name>/
      auth.json         # { oauthAccount, userID }
      credentials.json  # full ~/.claude/.credentials.json snapshot
```
