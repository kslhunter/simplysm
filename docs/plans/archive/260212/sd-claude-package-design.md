# Extract `@simplysm/sd-claude` Package from CLI

## Motivation

1. **Separation of concerns** — Build/dev tooling and Claude Code skills/agents have completely different responsibilities
2. **Independent deployment** — Allow installing Claude skills/agents without requiring the full CLI build toolchain

## New Package: `@simplysm/sd-claude`

### Structure

```
packages/sd-claude/
├── src/
│   ├── index.ts              # exports (install, uninstall)
│   ├── sd-claude.ts          # bin entry point (yargs)
│   └── commands/
│       ├── install.ts        # moved from cli
│       └── uninstall.ts      # moved from cli
├── scripts/
│   └── sync-claude-assets.mjs  # moved from cli
├── claude/                   # gitignored, populated by prepack
│   ├── agents/
│   ├── skills/
│   └── sd-statusline.js
├── package.json
└── README.md
```

### package.json

```json
{
  "name": "@simplysm/sd-claude",
  "bin": { "sd-claude": "./dist/sd-claude.js" },
  "files": ["dist", "claude"],
  "scripts": {
    "prepack": "node scripts/sync-claude-assets.mjs"
  },
  "dependencies": {
    "yargs": "...",
    "glob": "...",
    "consola": "..."
  }
}
```

- Build target: `node`
- Usage: `sd-claude install` / `sd-claude uninstall` or `npx @simplysm/sd-claude install`

## Changes to `@simplysm/cli`

### Deleted

- `src/commands/install.ts`
- `src/commands/uninstall.ts`
- `claude/` directory
- `scripts/sync-claude-assets.mjs`

### Modified

- `src/index.ts` — remove `runInstall`, `runUninstall` exports
- `src/sd-cli.ts` — remove `install`, `uninstall` command registrations
- `package.json`:
  - Remove `files` field entirely (npm includes all non-gitignored files by default)
  - Remove `"cli"` alias from `bin` (keep only `"sd-cli"`)
  - Remove `prepack` script

## Root `.gitignore` Changes

```diff
- packages/cli/claude
+ packages/sd-claude/claude
```

## Dependency Architecture

```
@simplysm/sd-claude (standalone, minimal deps)
  - yargs, glob, consola

@simplysm/cli (build/dev tooling, no claude dependency)
  - esbuild, vite, typescript, eslint, ...
```

No dependency relationship between the two packages.
