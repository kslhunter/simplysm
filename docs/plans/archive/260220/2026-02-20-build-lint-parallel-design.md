# Build Orchestrator: Lint + Build Parallel Execution

## Problem

`BuildOrchestrator.start()` runs Lint → Clean → Build sequentially.
Lint and Build are independent (lint checks source, build outputs to dist),
so running them sequentially wastes time.

## Design

### Current Flow

```
Phase 1: Lint   (await runLint)
Phase 2: Clean  (await cleanDistFolders)
Phase 3: Build  (await Promise.allSettled)
```

### New Flow

```
Phase 1: Clean  (await cleanDistFolders)  — must complete before build
Phase 2: Lint + Build in parallel (Promise.allSettled)
```

### Changes

**File**: `packages/sd-cli/src/orchestrators/BuildOrchestrator.ts` — `start()` method

- Move Clean before Lint+Build (dist must be cleared before build writes)
- Run `runLint()` and all `buildTasks` concurrently via `Promise.allSettled`
- `state.hasError` handling unchanged — each checks its own result

### Behavior Preserved

- Lint failure does not abort build (same as current)
- Build artifacts (dist) remain even if lint fails
- `publish` checks `state.hasError` to decide whether to proceed

### Scope

- ~10 lines changed in one file
- No new dependencies
- No API changes
