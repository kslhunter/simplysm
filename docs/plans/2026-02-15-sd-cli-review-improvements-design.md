# sd-cli Review Improvements Design

## Overview

Comprehensive improvement of `packages/sd-cli` based on code review findings.
Addresses 19 verified issues across P0 (Critical) through P3 (Simplification).

**Scope**: ~8,639 lines across 49 source files
**Key change**: Unify build/watch/dev commands under Orchestrator pattern

## Architecture

### Current State

```
commands/watch.ts (39 lines)  → WatchOrchestrator → BaseBuilder → WorkerManager
commands/build.ts (452 lines) → Direct worker management (bypasses Builder pattern)
commands/dev.ts   (660 lines) → Direct worker management (8+ Maps, inline state)
```

### Target State

```
commands/watch.ts → WatchOrchestrator → LibraryBuilder/DtsBuilder     → WorkerManager
commands/build.ts → BuildOrchestrator → LibraryBuilder/DtsBuilder/... → WorkerManager
commands/dev.ts   → DevOrchestrator   → ClientDevBuilder/ServerBuilder → WorkerManager
```

### Shared Infrastructure

- `BaseBuilder`: Pull up event handler registration from Library/Dts builders
- `ResultCollector`: Unified `BuildResult` type (merge 3 overlapping types)
- `SignalHandler`: Used by all Orchestrators
- `RebuildManager`: Rename file from `listr-manager.ts` to `rebuild-manager.ts`
- `registerCleanupHandlers()`: New helper for 4 workers' signal handlers

### Shared Utilities

- `findPackageRoot()`: Extract from 3 command files to `utils/package-utils.ts`
- `parseWorkspaceGlobs()`: Reuse in `publish.ts` (currently re-implemented inline)
- `collectSearchRoots()`: Extract from `replace-deps.ts` internal duplication
- `isSubpathOnlyPackage()`: Extract from nested try/catch in `vite-config.ts`

## P0: Critical Bug Fixes

### 1. Shell injection in SSH public key registration

**File**: `commands/publish.ts:219`

Escape single quotes in public key before shell interpolation:

```typescript
const escapedKey = publicKey.replace(/'/g, "'\\''");
`echo '${escapedKey}' >> ~/.ssh/authorized_keys`,
```

### 2. findAvailablePort returns unavailable port

**File**: `workers/server-runtime.worker.ts:116`

Throw error when no available port found instead of returning `startPort`:

```typescript
throw new Error(
  `${startPort}~${startPort + maxRetries - 1} 범위에서 사용 가능한 포트를 찾을 수 없습니다.`
);
```

### 3. Workspace path filter matches dots in absolute path

**File**: `commands/publish.ts:516`

Check basename instead of full path:

```typescript
.filter((item) => !path.basename(item).includes("."));
```

## P1: Quality Fixes

### 4. Capacitor versionCode prerelease handling

**File**: `capacitor/capacitor.ts:671-675`

Strip prerelease tag before versionCode calculation:

```typescript
const cleanVersion = version.replace(/-.*$/, "");
const versionParts = cleanVersion.split(".");
```

### 5. Client worker undefined port guard

**File**: `workers/client.worker.ts:209-211`

Validate `actualPort` before sending `serverReady` event. Send error if null.

### 6. Unified BuildResult type

Merge 3 overlapping types into single `BuildResult` in `ResultCollector.ts`:

- Remove `PackageResult` from `package-utils.ts`
- Remove local `BuildResult` from `build.ts`
- Add `"vite"`, `"electron"` to `type` union for build command support
- Change `status: "server"` to `status: "running"` (see P2-9)

### 7. Rename listr-manager.ts to rebuild-manager.ts

Update 3 import sites: `WatchOrchestrator`, `dev.ts`, `BaseBuilder`.

## P2: DX/Usability Improvements

### 8. CLI --options naming change

**Files**: `sd-cli-entry.ts` (7 command definitions)

Rename `--options` / `-o` to `--config-opt` / `-o`. Call sites change from
`options.options` to `options.configOpt`.

**Breaking change**: CLI flag name changes. `SdConfigParams.opt` stays the same.

### 9. status: "server" → "running"

Change `status: "server"` to `status: "running"` in `BuildResult` type and all
usage sites (`ResultCollector.ts`, `output-utils.ts`, orchestrators, `dev.ts`).

### 10. Expand index.ts exports

```typescript
export * from "./sd-config.types";
export { createViteConfig, type ViteConfigOptions } from "./utils/vite-config";
export { sdTailwindConfigDepsPlugin, sdScopeWatchPlugin } from "./utils/vite-config";
```

### 11. Type-safe worker events

Use existing `*WorkerEvents` interfaces to type worker event handlers.
Remove `unknown` casts from `worker-events.ts` and `dev.ts`.

## P3: Simplification — Orchestrator Pattern

### 12. DevOrchestrator extraction

Extract `commands/dev.ts` (660 lines) into `orchestrators/DevOrchestrator.ts`:

```
DevOrchestrator
├── initialize()         — Config load, package classification
├── start()              — Create and start all workers
│   ├── Standalone client builders (Vite dev server, auto port)
│   ├── Server build builders (esbuild watch)
│   ├── Server-linked client builders (Vite + server proxy)
│   └── Server runtime workers (Fastify execution)
├── awaitTermination()   — SignalHandler.waitForTermination()
└── shutdown()           — Clean up all workers
```

Result: `commands/dev.ts` becomes ~40 lines, matching `watch.ts` structure.

### 13. BuildOrchestrator extraction

Extract `commands/build.ts` (452 lines) into `orchestrators/BuildOrchestrator.ts`.
Reuse `LibraryBuilder`/`DtsBuilder` in one-shot build mode (no watch).

### 14. BaseBuilder event handler consolidation

Pull `registerEventHandlers()` logic from `LibraryBuilder` and `DtsBuilder`
into `BaseBuilder` as a protected method. Subclasses provide type labels and
worker keys only.

## P3: Simplification — Code Deduplication

### 15. findPackageRoot extraction

Move from `init.ts`, `add-client.ts`, `add-server.ts` to `utils/package-utils.ts`.

### 16. parseWorkspaceGlobs reuse

`publish.ts` imports `parseWorkspaceGlobs` from `replace-deps.ts` instead of
re-implementing YAML parsing inline.

### 17. collectSearchRoots helper

Extract duplicated workspace root collection from `setupReplaceDeps` and
`watchReplaceDeps` in `replace-deps.ts`.

### 18. Signal cleanup handler helper

Extract from 4 workers to `utils/worker-utils.ts`:

```typescript
export function registerCleanupHandlers(
  cleanup: () => Promise<void>,
  logger: ReturnType<typeof consola.withTag>,
): void;
```

### 19. vite-config.ts nested try/catch cleanup

Extract `isSubpathOnlyPackage(pkgJsonPath): boolean` helper to flatten
4-level nesting and remove duplicated `depPkg.exports` condition.

## Execution Order

Recommended implementation order (respects dependencies):

1. **P0 Critical fixes** (items 1-3) — Independent, small changes
2. **Shared utilities** (items 15-19) — Foundation for later refactoring
3. **Type unification** (items 6, 7, 9) — BuildResult + rename
4. **DX improvements** (items 8, 10, 11) — API surface changes
5. **P1 fixes** (items 4, 5) — Independent quality fixes
6. **BaseBuilder consolidation** (item 14) — Required before Orchestrators
7. **BuildOrchestrator** (item 13) — Simpler orchestrator first
8. **DevOrchestrator** (item 12) — Most complex orchestrator last

## Testing Strategy

- Run `pnpm typecheck` after each phase
- Run `pnpm lint` after each phase
- Manual testing: `pnpm dev`, `pnpm watch`, `pnpm build` after Orchestrator changes
- Verify CLI help output after `--options` → `--config-opt` change
