# Namespace Rename Remaining Fixes — Design

Completes the namespace rename migration that was partially done. All changes are mechanical `pathXxx` → `xxx` and `fsXxx` → `fs.xxx` renames.

## Context

Finding 8a renamed `path.ts` exports (removing `path` prefix) and Finding 8c specified consumer migration. The `path.ts` source and `fs.spec.ts` were updated, but `path.spec.ts` and all consumer files with `pathNs.pathXxx` calls were missed. Additionally, two `config-manager.ts` lines and two sd-cli test files still use old `fsXxx` names.

## Fix 1: path.spec.ts Import Rename

**File**: `packages/core-node/tests/utils/path.spec.ts`

Remove `path` prefix from all 6 imported function names, all call sites, and describe block names:

```
pathPosix → posix
pathNorm → norm
pathIsChildPath → isChildPath
pathChangeFileDirectory → changeFileDirectory
pathBasenameWithoutExt → basenameWithoutExt
pathFilterByTargets → filterByTargets
```

## Fix 2: Consumer files — pathNs.pathXxx → pathNs.xxx

**Files** (10 files, 19 locations):

| File | Locations | Renames |
|------|-----------|---------|
| `packages/sd-cli/src/workers/dts.worker.ts` | 137,140,143,193,198,210,369 | `pathNs.pathNorm` → `pathNs.norm`, `pathNs.pathIsChildPath` → `pathNs.isChildPath` |
| `packages/sd-cli/src/workers/server.worker.ts` | 530 | `pathNs.pathNorm` → `pathNs.norm` |
| `packages/sd-cli/src/commands/typecheck.ts` | 89,116,221 | `pathNs.pathPosix` → `pathNs.posix`, `pathNs.pathFilterByTargets` → `pathNs.filterByTargets` |
| `packages/sd-cli/src/commands/lint.ts` | 148 | `pathNs.pathFilterByTargets` → `pathNs.filterByTargets` |
| `packages/sd-cli/src/utils/copy-public.ts` | 84 | `pathNs.pathIsChildPath` → `pathNs.isChildPath` |
| `packages/sd-cli/src/utils/replace-deps.ts` | 303 | `pathNs.pathIsChildPath` → `pathNs.isChildPath` |
| `packages/sd-cli/src/utils/tsconfig.ts` | 114,122 | `pathNs.pathIsChildPath` → `pathNs.isChildPath` |
| `packages/sd-cli/src/utils/vite-config.ts` | 37 | `pathNs.pathNorm` → `pathNs.norm` |
| `packages/service-server/src/services/auto-update-service.ts` | 45 | `pathNs.pathPosix` → `pathNs.posix` |
| `packages/service-server/src/transport/http/static-file-handler.ts` | 18 | `pathNs.pathIsChildPath` → `pathNs.isChildPath` |

## Fix 3: config-manager.ts — fsXxx → fs.xxx

**File**: `packages/service-server/src/utils/config-manager.ts`

- Line 39: `fsExists(filePath)` → `fs.exists(filePath)`
- Line 47: `fsReadJson(filePath)` → `fs.readJson(filePath)`

## Fix 4: sd-cli test files — fsExists → fs.exists

**File**: `packages/sd-cli/tests/load-ignore-patterns.spec.ts`
- Lines 73, 82, 97, 114, 129, 146: `vi.mocked(fsExists)` → `vi.mocked(fs.exists)`

**File**: `packages/sd-cli/tests/load-sd-config.spec.ts`
- Lines 60, 71, 90: `vi.mocked(fsExists)` → `vi.mocked(fs.exists)`

## Impact Summary

| Fix | Files | Locations |
|-----|-------|-----------|
| path.spec.ts | 1 | ~20 (6 imports + call sites + describes) |
| Consumer pathNs | 10 | 19 |
| config-manager | 1 | 2 |
| sd-cli tests | 2 | 9 |
| **Total** | **14** | **~50** |
