# sd-cli Review Fixes Design

## Overview

Fix 7 findings from sd-cli code review: bug fixes, dead code removal, type safety improvements, API uniformity, convention compliance, and duplication reduction.

## Findings & Fixes

### F1+F2: sdPublicDevPlugin Content-Type and Error Handling

**File**: `packages/sd-cli/src/utils/vite-config.ts:123-126`

**Problem**: Files served from `public-dev/` lack Content-Type header and stream error handler.

**Fix**:
- Add inline MIME type map (~15 common web asset types) using `path.extname()` lookup
- Set `Content-Type` header via `res.setHeader()` before piping
- Add `stream.on("error", () => next())` to handle TOCTOU race
- Fallback: `application/octet-stream` for unknown extensions

No new dependencies.

### F3: TypecheckEnv "neutral" Dead Code Removal

**File**: `packages/sd-cli/src/utils/tsconfig.ts:37,75-77`

**Problem**: `TypecheckEnv` includes `"neutral"` but all callers map it to `"browser"` before passing. The `case "neutral"` in `getCompilerOptionsForPackage` is unreachable.

**Fix**:
- Change `TypecheckEnv` from `"node" | "browser" | "neutral"` to `"node" | "browser"`
- Delete `case "neutral"` branch in `getCompilerOptionsForPackage`
- Update JSDoc comments

Note: `BuildTarget` keeps `"neutral"` (user config value). `getTypecheckEnvFromTarget` continues to map neutral -> browser.

### F4: PackageInfo Type Alias for Safer Builder Types

**Files**: `packages/sd-cli/src/builders/types.ts`, `LibraryBuilder.ts`, `WatchOrchestrator.ts`

**Problem**: `PackageInfo.config` is typed as full `SdPackageConfig` union, forcing `as SdBuildPackageConfig` casts in LibraryBuilder.

**Fix**:
- Add type alias in `types.ts`:
  ```typescript
  export type BuildPackageInfo = PackageInfo & { config: SdBuildPackageConfig };
  ```
- Use `BuildPackageInfo` at entry points (WatchOrchestrator, LibraryBuilder)
- Remove `as SdBuildPackageConfig` casts from LibraryBuilder (2 locations)
- BaseBuilder unchanged (keeps `PackageInfo` with full union)

### F5: SdPublishConfig Uniform Discriminated Union

**Files**: `packages/sd-cli/src/sd-config.types.ts`, `commands/publish.ts`

**Problem**: `SdPublishConfig = "npm" | SdLocalDirectoryPublishConfig | SdStoragePublishConfig` mixes string literal with object discriminated union, requiring two narrowing patterns.

**Fix**:
- Add new interface:
  ```typescript
  export interface SdNpmPublishConfig {
    type: "npm";
  }
  ```
- Change union:
  ```typescript
  export type SdPublishConfig = SdNpmPublishConfig | SdLocalDirectoryPublishConfig | SdStoragePublishConfig;
  ```
- Update `publish.ts` consumers (3 locations): `config === "npm"` -> `config.type === "npm"`
- Update JSDoc

**Breaking change**: External `sd.config.ts` files must change `publish: "npm"` to `publish: { type: "npm" }`.

### F7: registerWorkerEventHandlers Generic Type

**File**: `packages/sd-cli/src/utils/worker-events.ts:66-70`

**Problem**: Parameter uses `(data: any)` but downstream accesses `data.success`, `data.errors`, etc. `BaseWorkerInfo<TEvents>` generic exists but is unused.

**Fix**:
- Change `workerInfo` parameter type to use typed `on()` method matching `BuildEventData` and `ErrorEventData`
- Remove `as BuildEventData` and `as ErrorEventData` casts (2 locations)
- Verify DevOrchestrator call sites (325, 413) remain compatible

### F8: DevOrchestrator Client Setup Deduplication

**File**: `packages/sd-cli/src/orchestrators/DevOrchestrator.ts:312-485`

**Problem**: `_setupStandaloneClients` and `_setupViteClients` share ~120 lines of identical structure. Differences: Vite adds readyPromises, port tracking, `server: 0` config.

**Fix**:
- Define options interface:
  ```typescript
  interface ClientSetupOptions {
    workers: ClientWorkerInfo[];
    onServerReady?: (workerInfo: ClientWorkerInfo, port: number, completeTask: (result: BuildResult) => void) => void;
    onError?: (workerInfo: ClientWorkerInfo) => void;
    createConfig: (workerInfo: ClientWorkerInfo) => SdClientPackageConfig;
  }
  ```
- Extract shared `_setupClientWorkers(opts)` method containing:
  - Build promise creation loop
  - `registerWorkerEventHandlers` calls
  - `serverReady` event -> `opts.onServerReady` delegation
  - `error` event -> `opts.onError` delegation (optional)
  - `scopeRebuild` event handler
  - Worker start with `opts.createConfig`
  - Return `{ name, promise }[]`
- `readyPromises` managed by caller (`start()` method), not by shared method
- Replace both methods with calls to `_setupClientWorkers` with appropriate options

Target: ~170 lines -> ~100 lines (~70 line reduction).

## Files Modified

| File | Changes |
|------|---------|
| `utils/vite-config.ts` | MIME map + Content-Type header + error handler |
| `utils/tsconfig.ts` | Remove "neutral" from TypecheckEnv + delete case branch |
| `builders/types.ts` | Add `BuildPackageInfo` type alias |
| `builders/LibraryBuilder.ts` | Use `BuildPackageInfo`, remove 2 casts |
| `orchestrators/WatchOrchestrator.ts` | Use `BuildPackageInfo` |
| `sd-config.types.ts` | Add `SdNpmPublishConfig`, update union |
| `commands/publish.ts` | Update 3 `=== "npm"` checks to `.type === "npm"` |
| `utils/worker-events.ts` | Type `on()` handler, remove 2 casts |
| `orchestrators/DevOrchestrator.ts` | Extract `_setupClientWorkers`, remove 2 old methods |

## Dropped Findings

- F6 (DtsWatchInfo/DtsBuildInfo overlap): Only 2 shared fields, extraction adds indirection for minimal gain
- F9 (worker lifecycle duplication): Meaningful behavioral differences between server/library workers
- F10 (_setupServers mixing): Splitting increases parameter-passing complexity
- F11 (generateProductionFiles): Clearly sectioned with comments, each section called once
