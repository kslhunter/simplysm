# sd-claude CLI Design

## Summary

Restructure `@simplysm/claude` package into `@simplysm/sd-claude` with a TypeScript CLI entry point (`sd-claude`) that provides two commands via yargs:

1. `sd-claude install` — Install Claude Code assets (replaces `postinstall.mjs`)
2. `sd-claude npx` — Cross-platform npx wrapper (solves Windows `npx.cmd` issue)

## Motivation

- `.mcp.json` uses `npx` as command, which doesn't work on Windows (requires `npx.cmd`)
- Current `postinstall.mjs` is raw JavaScript — should be TypeScript for consistency
- Package naming should follow `sd-*` convention for bin packages

## Package Structure

```
packages/sd-claude/
├── src/
│   ├── sd-claude.ts          # yargs CLI entry (bin)
│   └── commands/
│       ├── install.ts         # Asset installer (postinstall.mjs → TS)
│       └── npx.ts             # Cross-platform npx wrapper
├── scripts/
│   └── sync-claude-assets.mjs # prepack script (unchanged, monorepo-internal)
├── claude/                     # Asset directory (unchanged)
├── package.json
└── tsconfig.json
```

## package.json

Key changes from `@simplysm/claude`:

```json
{
  "name": "@simplysm/sd-claude",
  "bin": { "sd-claude": "./dist/sd-claude.js" },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "claude"],
  "scripts": {
    "postinstall": "node dist/sd-claude.js install",
    "prepack": "node scripts/sync-claude-assets.mjs"
  },
  "dependencies": {
    "yargs": "^18.0.0"
  },
  "devDependencies": {
    "@types/yargs": "^17.0.35"
  }
}
```

## CLI Entry (`src/sd-claude.ts`)

Follow `sd-cli-entry.ts` pattern with yargs:

- `sd-claude install` — Run asset installation
- `sd-claude npx <args..>` — Cross-platform npx passthrough

## Commands

### `install` (`src/commands/install.ts`)

Convert `postinstall.mjs` to TypeScript. Same logic:

1. Find project root (INIT_CWD or node_modules path detection)
2. Skip if simplysm monorepo
3. Copy `sd-*` assets to `.claude/`
4. Set up `settings.json` statusLine
5. **Updated**: Generate `.mcp.json` using `sd-claude npx` instead of raw `npx`:

```json
{
  "mcpServers": {
    "context7": {
      "command": "node",
      "args": [
        "node_modules/@simplysm/sd-claude/dist/sd-claude.js",
        "npx", "-y", "@upstash/context7-mcp"
      ]
    },
    "playwright": {
      "command": "node",
      "args": [
        "node_modules/@simplysm/sd-claude/dist/sd-claude.js",
        "npx", "@playwright/mcp@latest", "--headless"
      ],
      "env": { "PLAYWRIGHT_OUTPUT_DIR": ".playwright-mcp" }
    }
  }
}
```

`node` is cross-platform, so this solves the Windows `npx`/`npx.cmd` issue.

### `npx` (`src/commands/npx.ts`)

Cross-platform npx wrapper:

- Detect OS: `process.platform === "win32"` → `npx.cmd`, else → `npx`
- `child_process.spawn(command, args, { stdio: "inherit", env: process.env })`
- Forward exit code via `process.exit(code)`

## Migration Checklist

| Change | File |
|--------|------|
| Directory rename | `packages/claude/` → `packages/sd-claude/` |
| package.json update | name, bin, main, types, files, dependencies |
| Add tsconfig.json | Same as other node packages |
| Create entry | `src/sd-claude.ts` |
| Create install command | `src/commands/install.ts` (from postinstall.mjs) |
| Create npx command | `src/commands/npx.ts` (new) |
| Update sd.config.ts | `"claude"` → `"sd-claude"` |
| Update root package.json | Workspace references |
| `.mcp.json` generation | Use `sd-claude npx` pattern in install command |

**Files to delete:**
- `scripts/postinstall.mjs` (replaced by `src/commands/install.ts`)
