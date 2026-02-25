# Build Lint+Build Parallel Execution — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Run lint and build concurrently in `BuildOrchestrator.start()` to reduce total build time.

**Architecture:** Move Clean phase before Lint+Build, then run lint and all build tasks together via `Promise.allSettled`. No new abstractions needed — just reorder existing calls.

**Tech Stack:** TypeScript, existing `runLint` and `buildTasks` infrastructure

---

### Task 1: Parallelize Lint and Build in BuildOrchestrator

**Files:**
- Modify: `packages/sd-cli/src/orchestrators/BuildOrchestrator.ts:242-464`

**Step 1: Reorder phases — Clean first, then Lint+Build parallel**

Replace lines 242-464 (from `// Phase 1: Lint` through `this._logger.success("Build")`) with:

```typescript
    // Phase 1: Clean (must complete before build writes to dist)
    this._logger.start("Clean");
    await cleanDistFolders(this._cwd, this._allPackageNames);
    this._logger.success("Clean");

    // Phase 2: Lint + Build (concurrent)
    this._logger.start("Lint + Build");

    // 빌드 작업 목록 생성
    const buildTasks: Array<() => Promise<void>> = [];

    // ... (existing buildTasks population code — lines 263-460 unchanged) ...

    // Lint와 Build를 병렬 실행
    const lintTask = async (): Promise<void> => {
      await runLint(lintOptions);
      if (process.exitCode === 1) {
        state.hasError = true;
      }
    };

    await Promise.allSettled([
      lintTask(),
      ...buildTasks.map((task) => task()),
    ]);
    this._logger.success("Lint + Build");
```

**Step 2: Run typecheck to verify**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS (no type errors)

**Step 3: Commit**

```bash
git add packages/sd-cli/src/orchestrators/BuildOrchestrator.ts
git commit -m "perf(sd-cli): run lint and build concurrently in BuildOrchestrator"
```
