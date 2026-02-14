# Vite Scope Watch HMR Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Fix `sdScopeWatchPlugin` so that scope package dist changes (e.g., `@simplysm/solid`) trigger Vite HMR in consumer apps during dev mode.

**Architecture:** Replace the ineffective `server.watcher.add()` call (Vite ignores `node_modules`) with a separate `FsWatcher` from `@simplysm/core-node`. On file change, emit `"change"` on Vite's watcher with the resolved real path to trigger Vite's internal HMR pipeline.

**Tech Stack:** Vite 7 Plugin API, `FsWatcher` from `@simplysm/core-node`, `fs.realpathSync` for pnpm symlink resolution.

---

### Task 1: Replace `configureServer` hook with separate FsWatcher

**Files:**
- Modify: `packages/sd-cli/src/utils/vite-config.ts:1-11` (imports)
- Modify: `packages/sd-cli/src/utils/vite-config.ts:93-178` (sdScopeWatchPlugin)

**Step 1: Add FsWatcher import**

At line 10, after the `getTailwindConfigDeps` import, add:

```typescript
import { FsWatcher } from "@simplysm/core-node";
```

**Step 2: Update the JSDoc comment for `sdScopeWatchPlugin`**

Replace lines 93-100 with updated comment reflecting the new approach:

```typescript
/**
 * scope 패키지의 dist 디렉토리 변경을 감지하는 Vite 플러그인.
 *
 * Vite는 node_modules를 기본적으로 watch에서 제외하므로,
 * scope 패키지의 dist 파일이 변경되어도 HMR/리빌드가 트리거되지 않는다.
 * 이 플러그인은 별도의 FsWatcher로 scope 패키지의 dist 디렉토리를 감시하고,
 * 변경 시 Vite의 내부 HMR 파이프라인을 트리거한다.
 * optimizeDeps에서 제외하여 pre-bundled 캐시로 인한 변경 무시를 방지한다.
 */
```

**Step 3: Replace the `configureServer` hook**

Replace the existing `configureServer` hook (lines 164-176) with:

```typescript
    async configureServer(server) {
      const distDirs: string[] = [];

      for (const scope of scopes) {
        const scopeDir = path.join(pkgDir, "node_modules", scope);
        if (!fs.existsSync(scopeDir)) continue;

        for (const pkgName of fs.readdirSync(scopeDir)) {
          const distDir = path.join(scopeDir, pkgName, "dist");
          if (fs.existsSync(distDir)) {
            distDirs.push(distDir);
          }
        }
      }

      if (distDirs.length === 0) return;

      // Vite의 기본 watcher는 **/node_modules/**를 ignore하고
      // server.watcher.add()로는 이 패턴을 override할 수 없다.
      // 별도의 FsWatcher로 scope 패키지의 dist 디렉토리를 감시한다.
      const scopeWatcher = await FsWatcher.watch(distDirs);
      scopeWatcher.onChange({ delay: 300 }, (changeInfos) => {
        for (const { path: changedPath } of changeInfos) {
          // pnpm symlink → real path 변환 (Vite module graph은 real path 사용)
          let realPath: string;
          try {
            realPath = fs.realpathSync(changedPath);
          } catch {
            continue; // 삭제된 파일
          }

          // Vite의 내부 HMR 파이프라인 트리거
          server.watcher.emit("change", realPath);
        }
      });

      // 서버 종료 시 watcher 정리
      server.httpServer?.on("close", () => void scopeWatcher.close());
    },
```

**Step 4: Typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS (no type errors)

**Step 5: Lint**

Run: `pnpm lint packages/sd-cli/src/utils/vite-config.ts`
Expected: PASS (no lint errors)
