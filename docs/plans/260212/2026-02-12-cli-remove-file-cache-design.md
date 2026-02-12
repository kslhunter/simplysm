# CLI File-Based Cache Removal Design

## Goal

Remove all file-based caching logic from sd-cli so that every CLI invocation starts from a clean state. In-memory caches (esbuild context, Vite require cache) are unaffected since they naturally reset on process restart.

## Caches to Remove

| Cache | File | Location in Code |
|-------|------|-----------------|
| TypeScript incremental (build) | `packages/{pkg}/.cache/dts.tsbuildinfo` | `dts.worker.ts:131-136, 265-266` |
| TypeScript incremental (typecheck) | `packages/{pkg}/.cache/typecheck-{env}.tsbuildinfo` | `dts.worker.ts:131-136` |
| ESLint cache | `.cache/eslint.cache` | `lint.ts:161-162` |

## Changes

### 1. `packages/sd-cli/src/workers/dts.worker.ts`

**buildDts function (one-shot build):**
- Remove `incremental: true` and `tsBuildInfoFile` from compiler options (lines 131-136)
- Change `ts.createIncrementalCompilerHost(options)` to `ts.createCompilerHost(options)` (line 158)
- Change `ts.createIncrementalProgram(...)` to `ts.createProgram(...)` (line 171)

**startDtsWatch function (watch mode):**
- Remove `incremental: true` and `tsBuildInfoFile` from compiler options (lines 265-266)
- Watch mode uses `ts.createWatchProgram()` which handles its own in-memory state, so no further changes needed

### 2. `packages/sd-cli/src/commands/lint.ts`

- Remove `cache: true` option from ESLint constructor (line 161)
- Remove `cacheLocation` option from ESLint constructor (line 162)
- Update JSDoc comment about cache (line 103)

### 3. `packages/sd-cli/src/commands/typecheck.ts`

- Update JSDoc comment referencing `.cache/typecheck-{env}.tsbuildinfo` (line 138)

### 4. `CLAUDE.md`

- Update `.cache/` directory reference section to reflect that it now only contains Playwright MCP output (or remove if no longer relevant)

## What Stays

- **esbuild context** (in-memory) - resets on process restart
- **Vite require cache** (in-memory) - resets on process restart
- **ts.createWatchProgram** internal state (in-memory) - resets on process restart
- `.cache/` directory itself may still exist from previous runs but won't be actively used

## Risk Assessment

- **TypeScript typecheck/build will be slightly slower** on re-runs since it can't skip unchanged files. For a monorepo of this size, the impact should be minimal.
- **ESLint will re-lint all files** every time. Impact depends on file count but ESLint is typically fast enough.
- **No functional behavior changes** - only performance characteristics change.
