# RebuildManager Rebuild Log Design

## Problem

`pnpm watch` shows initial build progress (`start` + `success`), but file changes trigger silent rebuilds — no start/complete messages appear. The rebuild logs in `RebuildManager._runBatch()` use `debug` level (invisible by default), and `WatchOrchestrator`'s `batchComplete` handler only calls `printErrors()`.

## Solution

Add `start`/`success` logs directly in `RebuildManager._runBatch()`.

### Change

**File:** `packages/sd-cli/src/utils/rebuild-manager.ts`

In `_runBatch()`, replace per-task `debug` logs with batch-level `start`/`success`:

```typescript
private async _runBatch(): Promise<void> {
  // ... existing guard ...

  this._isRunning = true;

  const batchBuilds = new Map(this._pendingBuilds);
  this._pendingBuilds.clear();

  const tasks = Array.from(batchBuilds.entries());
  const titles = tasks.map(([, { title }]) => title).join(", ");
  this._logger.start(`리빌드 진행 중... (${titles})`);

  const results = await Promise.allSettled(tasks.map(([, { promise }]) => promise));

  const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failed.length > 0) {
    for (const result of failed) {
      this._logger.error("리빌드 중 오류 발생", { error: String(result.reason) });
    }
  }

  this._logger.success(`리빌드 완료 (${titles})`);

  this.emit("batchComplete");

  this._isRunning = false;

  if (this._pendingBuilds.size > 0) {
    void this._runBatch();
  }
}
```

### Why This Approach

- `RebuildManager` already receives a `consola` logger via constructor
- `consola.start()` / `consola.success()` matches the initial build pattern in `WatchOrchestrator.start()`
- Automatically applies to all orchestrators (Watch, Dev) without additional changes
- Single file change, minimal diff
