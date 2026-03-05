# sd-cli Review Findings Design

Date: 2026-03-05
Target: `packages/sd-cli`
Scope: 10 confirmed findings from code review (Finding 8 excluded — trade-off analysis showed extraction cost exceeds benefit)

## Overview

Fix defects, resolve convention violations, and simplify repetitive patterns in `packages/sd-cli`.

## Finding 1: check command race condition

**File**: `src/commands/check.ts:113`
**Problem**: `lint({ fix: true })` and `executeTypecheck()` run in parallel via `Promise.allSettled`. ESLint auto-fix modifies source files while TypeScript reads them, causing spurious type errors.

**Fix**: Change `fix: true` to `fix: false` in `check.ts:113`. The `check` command is a validation-only command and should not modify files. Users who want auto-fix should use `sd lint` separately. Keep `Promise.allSettled` parallel execution — the race condition is caused by file mutation, not parallelism.

## Finding 2: appName escaping in capacitor config

**File**: `src/capacitor/capacitor.ts:414`
**Problem**: `appName` is interpolated into generated `capacitor.config.ts` without escaping. Special characters (`"`, `\`, backtick) break the generated file's syntax.

**Fix**: Add validation in `_validateConfig` (after line 89) with a regex: `/^[a-zA-Z0-9 \-]+$/`. Reject `appName` with special characters via `CapacitorConfigError`. Validation is preferred over escaping because Capacitor/Android also have issues with special character app names.

## Finding 3: signing password Groovy escaping

**File**: `src/capacitor/capacitor.ts:752-754`
**Problem**: `storePassword`, `keyAlias`, `keyPassword` are interpolated into Groovy single-quoted strings without escaping. A `'` in the password breaks `build.gradle` syntax.

**Fix**: Escape `'` as `'\''` (end string, escaped quote, restart string) for each value before interpolation. This is the standard shell/Groovy pattern for embedding single quotes in single-quoted strings.

## Finding 4: SdConfigParams.opt rename to options

**File**: `src/sd-config.types.ts:252`
**Problem**: Public `SdConfigParams` uses `opt` while the entire internal codebase uses `options`, creating awkward `opt: this._options.options` mappings at 7+ call sites.

**Fix**: Rename `SdConfigParams.opt` to `SdConfigParams.options`. Update:
- `sd-config.types.ts`: field name + JSDoc example code
- All `loadSdConfig` call sites (DevOrchestrator, typecheck, device, publish, build, watch)
- `sd-cli-entry.ts`: yargs mapping

Breaking change, but acceptable — TypeScript compiler will catch all affected `sd.config.ts` files at build time.

## Finding 5: as unknown as BaseWorkerInfo (2 sites)

**File**: `src/orchestrators/DevOrchestrator.ts:327, 415`
**Problem**: `ClientWorkerInfo` is not structurally compatible with `BaseWorkerInfo` due to `worker` type mismatch, requiring `as unknown as` cast.

**Fix**: Change `registerWorkerEventHandlers` parameter type from `BaseWorkerInfo` to an inline structural type requiring only the fields actually used:
```typescript
workerInfo: {
  name: string;
  config: { target: string };
  worker: { on(event: string, handler: (data: any) => void): void };
  isInitialBuild: boolean;
  buildResolver: (() => void) | undefined;
}
```
This makes `ClientWorkerInfo` structurally compatible without casting. Update `BaseWorkerInfo` export to match or remove if no longer needed.

## Finding 6: as unknown as in test code (18 sites)

**File**: `tests/run-typecheck.spec.ts`
**Problem**: 18 occurrences of `as unknown as` for mock object creation.

**Fix**: Create mock factory functions in the test file:
- `createMockParsedCommandLine(overrides: Partial<ts.ParsedCommandLine>): ts.ParsedCommandLine`
- `createMockWorker(overrides): ReturnType<typeof Worker.create>`
- Similar factories for other mocked types

Each factory uses `as T` internally (single point of casting) while test code calls them type-safely.

## Finding 7: Unused barrel files

**Files**: `src/builders/index.ts`, `src/infra/index.ts`, `src/orchestrators/index.ts`
**Problem**: Re-export barrel files exist but no consumer imports from them. All imports go directly to specific files.

**Fix**: Delete all 3 barrel files. No side effects — verified that zero imports reference these paths.

## Finding 9: DevOrchestrator._setupServers repetition

**File**: `src/orchestrators/DevOrchestrator.ts:491-704`
**Problem**: 248-line method with "set result + resolve first build + resolve build" pattern repeated 6 times across event handlers.

**Fix**:
1. Extract `resolveServerStep` local function that encapsulates the 3-step pattern (set result, resolve runtime promise if first build, call build resolver). `isFirstBuild` state and promise references captured via closure.
2. Promote `startServerRuntime` inner function to private method `_startServerRuntime` to reduce nesting by one level.
3. Do NOT split `_setupServers` into separate build/runtime methods — runtime start is triggered inside build event handlers, so splitting would break event flow.

Expected result: 6 repeated blocks become single-line `resolveServerStep(key, result)` calls. Method length reduces to ~160 lines.

## Finding 10: scanOptionalPeerDeps / scanNativeModules unification

**File**: `src/utils/esbuild-config.ts:185, 247`
**Problem**: Two near-identical recursive dependency traversal functions differing only in the "should mark as external" check.

**Fix**: Create `scanDependencyTree(pkgName, resolveDir, external, visited, collector)` where `collector: (depDir: string, pkgJson: PkgJson) => string[]` returns package names to add to external set. The collector approach (returning names to add) handles the optional peer deps case where multiple names can be added per package.

`collectUninstalledOptionalPeerDeps` and `collectNativeModuleExternals` public functions remain, internally delegating to `scanDependencyTree`.

## Finding 11: dts.worker.ts inline signal handler

**File**: `src/workers/dts.worker.ts:98-114`
**Problem**: Only worker using inline SIGTERM/SIGINT handlers instead of shared `registerCleanupHandlers`. Caused by sync cleanup function vs async-only utility.

**Fix**: Change `registerCleanupHandlers` signature from `cleanup: () => Promise<void>` to `cleanup: () => void | Promise<void>`. Wrap return value with `Promise.resolve()` internally. Replace inline handlers in `dts.worker.ts` with `registerCleanupHandlers(cleanup, logger)`.

## Files Modified

| File | Findings |
|------|----------|
| `src/commands/check.ts` | F1 |
| `src/capacitor/capacitor.ts` | F2, F3 |
| `src/sd-config.types.ts` | F4 |
| `src/sd-cli-entry.ts` | F4 |
| `src/orchestrators/DevOrchestrator.ts` | F4, F5, F9 |
| `src/commands/typecheck.ts` | F4 |
| `src/commands/device.ts` | F4 |
| `src/commands/publish.ts` | F4 |
| `src/commands/build.ts` | F4 |
| `src/commands/watch.ts` | F4 |
| `src/utils/worker-events.ts` | F5 |
| `tests/run-typecheck.spec.ts` | F6 |
| `src/builders/index.ts` | F7 (delete) |
| `src/infra/index.ts` | F7 (delete) |
| `src/orchestrators/index.ts` | F7 (delete) |
| `src/utils/esbuild-config.ts` | F10 |
| `src/utils/worker-utils.ts` | F11 |
| `src/workers/dts.worker.ts` | F11 |
