# Fix: Path Separator Mismatch in sd-cli on Windows

## Problem

`pnpm typecheck packages/orm-common` reports 0 errors even when type errors exist on Windows.

**Root cause**: TypeScript API returns paths with forward slashes (`D:/workspaces-13/.../orm-common/src/...`),
but sd-cli builds comparison prefixes using `path.sep` (backslash `\` on Windows).
`startsWith` always fails, so:

1. `getPackageFiles` / `getPackageSourceFiles` return empty arrays (no root files for TS program)
2. Diagnostic filters exclude all errors
3. Result: typecheck always succeeds with 0 errors on Windows

## Solution

Normalize all paths with `pathNorm()` from `@simplysm/core-node` before comparison.

### Pattern A — Simple child path checks

Replace `startsWith(dir + path.sep)` with `pathIsChildPath()` (internally uses `pathNorm` on both sides).

```typescript
// Before
const pkgPrefix = pkgDir + path.sep;
files.filter((f) => f.startsWith(pkgPrefix));

// After
files.filter((f) => pathIsChildPath(f, pkgDir));
```

### Pattern B — When slice/split needed after comparison

Normalize `fileName` with `pathNorm()` first, then `path.sep` operations work correctly.

```typescript
// Before
const distPrefix = distDir + path.sep;
if (!fileName.startsWith(distPrefix)) return null;
const relFromDist = fileName.slice(distPrefix.length);

// After
fileName = pathNorm(fileName);
const distPrefix = pathNorm(distDir) + path.sep;
if (!fileName.startsWith(distPrefix)) return null;
const relFromDist = fileName.slice(distPrefix.length);
```

### Pattern C — Equality comparison

Replace `path.normalize()` with `pathNorm()` for consistency.

```typescript
// Before
path.normalize(d) === path.normalize(changed)

// After
pathNorm(d) === pathNorm(changed)
```

## Changes

### File 1: `packages/sd-cli/src/utils/tsconfig.ts`

Add import: `pathIsChildPath` from `@simplysm/core-node`

| Line | Current | Fix |
|------|---------|-----|
| 114-115 | `getPackageSourceFiles`: `path.join(pkgDir, "src") + path.sep` + `startsWith` | `pathIsChildPath(f, path.join(pkgDir, "src"))` |
| 122-123 | `getPackageFiles`: `pkgDir + path.sep` + `startsWith` | `pathIsChildPath(f, pkgDir)` |

### File 2: `packages/sd-cli/src/workers/dts.worker.ts`

Add imports: `pathIsChildPath`, `pathNorm` from `@simplysm/core-node`

**`createDtsPathRewriter` (lines 147-178)** — Pattern B:
- Normalize `fileName` param with `pathNorm()` at entry
- Build `distPrefix`, `ownNestedPrefix` with `pathNorm()` + `path.sep`
- `split(path.sep)` then works correctly

**`buildDts` (lines 196-225)** — Pattern A:
- Line 204-205 (emit mode filter): `pathIsChildPath(d.file.fileName, path.join(info.pkgDir, "src"))`
- Line 209-210 (typecheck mode filter): `pathIsChildPath(d.file.fileName, info.pkgDir)`
- Line 220-221 (non-package rootFiles): `!pathIsChildPath(f, path.join(info.cwd, "packages"))`
- Line 223 (non-package diagnosticFilter): `!pathIsChildPath(d.file.fileName, path.join(info.cwd, "packages"))`

**`startDtsWatch` (lines 358, 379)** — Pattern A:
- `pathIsChildPath(diagnostic.file.fileName, path.join(info.pkgDir, "src"))`

### File 3: `packages/sd-cli/src/utils/copy-public.ts`

Add import: `pathIsChildPath` from `@simplysm/core-node`

| Line | Current | Fix |
|------|---------|-----|
| 80 | Dual-check workaround: `startsWith(dir + path.sep) \|\| startsWith(dir + "/")` | `pathIsChildPath(filePath, publicDevDir)` |

### File 4: `packages/sd-cli/src/utils/vite-config.ts`

Add import: `pathNorm` from `@simplysm/core-node`

| Line | Current | Fix |
|------|---------|-----|
| 37 | `path.normalize(d) === path.normalize(changed)` | `pathNorm(d) === pathNorm(changed)` |

## Not Changed (Safe)

- `typecheck.ts` — already uses `pathPosix()` correctly
- `sd-cli-entry.ts:330` — both sides return OS-native paths (`fileURLToPath`, `fs.realpathSync`)
- `server.worker.ts:235` — package name replace, not path comparison
- `init.ts:43` — filename prefix check (`.`), not path comparison
- Remaining 25 files — only path construction for filesystem operations

## Verification

After fix, `pnpm typecheck packages/orm-common` should detect the TS2345 error at
`queryable.ts:431` (`QueryableRecord<TData>` not assignable to `Required<QueryableRecord<TData>>`).
