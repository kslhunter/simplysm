# CLI File-Based Cache Restoration Design

## Goal

Re-introduce file-based caching (TypeScript incremental compilation + ESLint cache) to sd-cli with proper cache separation by execution context.

## Cache Structure

### TypeScript Cache (per-package)

```
packages/{pkg}/.cache/
├── dts.tsbuildinfo                # build & watch shared (emit=true)
├── typecheck-node.tsbuildinfo     # typecheck only (emit=false, env=node)
└── typecheck-browser.tsbuildinfo  # typecheck only (emit=false, env=browser)
```

**Why this separation:**
- `build` and `watch` use identical compiler options (`emit=true`, same outDir/declarationDir) → safe to share `dts.tsbuildinfo`
- `typecheck` uses different compiler options (`emit=false`, `noEmit=true`) → needs separate cache per environment
- TypeScript automatically invalidates cache when compiler options change (tsconfig changes are handled)

### ESLint Cache (project root)

```
.cache/
└── eslint.cache
```

ESLint automatically invalidates cache when config changes.

### Cache Invalidation

- **Automatic:** TypeScript/ESLint detect option/config changes and rebuild
- **Manual:** Delete `.cache/` directories

## Changes

### 1. `packages/sd-cli/src/workers/dts.worker.ts`

**buildDts function:**
- Add `incremental: true` and `tsBuildInfoFile` to compiler options
- `tsBuildInfoFile` path: `dts.tsbuildinfo` when emit=true, `typecheck-{env}.tsbuildinfo` when emit=false
- Change `ts.createCompilerHost()` → `ts.createIncrementalCompilerHost()`
- Change `ts.createProgram()` → `ts.createIncrementalProgram()`

**startDtsWatch function:**
- Add `incremental: true` and `tsBuildInfoFile` to compiler options
- `tsBuildInfoFile` path: `dts.tsbuildinfo` (same as build, since options match)

### 2. `packages/sd-cli/src/commands/lint.ts`

- Add `cache: true` and `cacheLocation` to ESLint constructor
- Update JSDoc to document cache behavior

### 3. Documentation

- `packages/sd-cli/src/commands/typecheck.ts`: Restore incremental mention in JSDoc
- `CLAUDE.md`: Restore `.cache/` directory description with cache file details
