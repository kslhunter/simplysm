# @simplysm/sd-claude

Simplysm Claude Code CLI — asset installer

## Installation

pnpm add @simplysm/sd-claude

## Source Index

### Commands

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/commands/install.ts` | `runInstall` | Copies sd-* Claude Code assets into the project's `.claude/` directory | `-` |
| `src/commands/auth-utils.ts` | `validateName`, `getProfileDir`, `profileExists`, `listProfiles`, `readCurrentAuth`, `readCurrentCredentials`, `getCurrentUserID` | Shared helpers for reading and locating Claude auth profile data | `auth-utils.spec.ts` |
| `src/commands/auth-add.ts` | `runAuthAdd` | Saves the current Claude login session as a named auth profile | `auth-add.spec.ts` |
| `src/commands/auth-use.ts` | `runAuthUse` | Switches the active Claude login to a saved named profile | `auth-use.spec.ts` |
| `src/commands/auth-list.ts` | `runAuthList` | Lists all saved auth profiles with email and token expiry info | `auth-list.spec.ts` |
| `src/commands/auth-remove.ts` | `runAuthRemove` | Deletes a saved auth profile from the local profile store | `auth-remove.spec.ts` |

## License

Apache-2.0
