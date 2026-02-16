# Public Directory Copy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Copy `public` and `public-dev` directories to build output for server/client packages during build/dev modes.

**Architecture:** Create a reusable `copyPublicFiles()` and `watchPublicFiles()` utility (similar to existing `copySrcFiles`/`watchCopySrcFiles`), then integrate them into the server worker (build + watch) and client worker (dev only, for `public-dev` overlay). Vite already handles `public/` for client packages natively, so client only needs `public-dev` in dev mode.

**Tech Stack:** Node.js fs, `@simplysm/core-node` (fsCopy, fsGlob, fsMkdir, fsRm, FsWatcher)

---

### Task 1: Create `copyPublicFiles` utility

**Files:**
- Create: `packages/sd-cli/src/utils/copy-public.ts`

**Step 1: Write the utility**

Create `packages/sd-cli/src/utils/copy-public.ts` with two functions:

```typescript
import path from "path";
import { fsCopy, fsMkdir, fsRm, fsGlob, FsWatcher, fsExists } from "@simplysm/core-node";

/**
 * public/ 및 public-dev/ 디렉토리의 파일을 dist/로 복사한다.
 * public-dev/가 public/보다 우선한다 (overlay).
 *
 * @param pkgDir 패키지 루트 디렉토리
 * @param includeDev public-dev/ 포함 여부 (dev 모드에서만 true)
 */
export async function copyPublicFiles(pkgDir: string, includeDev: boolean): Promise<void> {
  const distDir = path.join(pkgDir, "dist");
  await fsMkdir(distDir);

  // public/ 복사
  const publicDir = path.join(pkgDir, "public");
  if (await fsExists(publicDir)) {
    const files = await fsGlob("**/*", { cwd: publicDir, absolute: true });
    for (const file of files) {
      const relativePath = path.relative(publicDir, file);
      const distPath = path.join(distDir, relativePath);
      await fsMkdir(path.dirname(distPath));
      await fsCopy(file, distPath);
    }
  }

  // public-dev/ 복사 (overlay: public/ 위에 덮어씀)
  if (includeDev) {
    const publicDevDir = path.join(pkgDir, "public-dev");
    if (await fsExists(publicDevDir)) {
      const files = await fsGlob("**/*", { cwd: publicDevDir, absolute: true });
      for (const file of files) {
        const relativePath = path.relative(publicDevDir, file);
        const distPath = path.join(distDir, relativePath);
        await fsMkdir(path.dirname(distPath));
        await fsCopy(file, distPath);
      }
    }
  }
}

/**
 * public/ 및 public-dev/ 디렉토리를 감시하여 dist/로 실시간 복사한다.
 * 초기 복사 후 변경/추가/삭제를 자동 반영한다.
 *
 * @param pkgDir 패키지 루트 디렉토리
 * @param includeDev public-dev/ 포함 여부 (dev 모드에서만 true)
 * @returns FsWatcher 인스턴스 (shutdown 시 close() 호출 필요) 또는 watch할 대상이 없으면 undefined
 */
export async function watchPublicFiles(pkgDir: string, includeDev: boolean): Promise<FsWatcher | undefined> {
  const distDir = path.join(pkgDir, "dist");
  const publicDir = path.join(pkgDir, "public");
  const publicDevDir = path.join(pkgDir, "public-dev");

  // 초기 복사
  await copyPublicFiles(pkgDir, includeDev);

  // watch 대상 경로 수집
  const watchPaths: string[] = [];
  if (await fsExists(publicDir)) {
    watchPaths.push(path.join(publicDir, "**/*"));
  }
  if (includeDev && (await fsExists(publicDevDir))) {
    watchPaths.push(path.join(publicDevDir, "**/*"));
  }

  if (watchPaths.length === 0) {
    return undefined;
  }

  const watcher = await FsWatcher.watch(watchPaths);

  watcher.onChange({ delay: 300 }, async (changes) => {
    for (const { event, path: filePath } of changes) {
      // 어느 소스 디렉토리에서 온 변경인지 판별
      let sourceDir: string;
      if (filePath.startsWith(publicDevDir + path.sep) || filePath.startsWith(publicDevDir + "/")) {
        sourceDir = publicDevDir;
      } else {
        sourceDir = publicDir;
      }

      const relPath = path.relative(sourceDir, filePath);
      const distPath = path.join(distDir, relPath);

      if (event === "unlink") {
        // public에서 삭제 시, public-dev에 같은 파일이 있으면 삭제하지 않음
        if (sourceDir === publicDir && includeDev) {
          const devOverride = path.join(publicDevDir, relPath);
          if (await fsExists(devOverride)) {
            continue;
          }
        }
        await fsRm(distPath);
      } else if (event === "add" || event === "change") {
        // public에서 변경 시, public-dev에 같은 파일이 있으면 overlay 우선이므로 스킵
        if (sourceDir === publicDir && includeDev) {
          const devOverride = path.join(publicDevDir, relPath);
          if (await fsExists(devOverride)) {
            continue;
          }
        }
        await fsMkdir(path.dirname(distPath));
        await fsCopy(filePath, distPath);
      }
    }
  });

  return watcher;
}
```

**Step 2: Verify typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/sd-cli/src/utils/copy-public.ts
git commit -m "feat(sd-cli): add copyPublicFiles and watchPublicFiles utilities"
```

---

### Task 2: Integrate into server worker (build mode)

**Files:**
- Modify: `packages/sd-cli/src/workers/server.worker.ts` — `build()` function (~line 264-309)

**Step 1: Add `public` copy after esbuild build**

In `server.worker.ts`, import the utility and call it after esbuild build completes (after line 291, before `generateProductionFiles`):

```typescript
// At top of file, add import:
import { copyPublicFiles } from "../utils/copy-public";

// In build() function, after line 291 (fs.writeFileSync confDistPath...):
// Copy public/ to dist/ (production build: no public-dev)
await copyPublicFiles(info.pkgDir, false);
```

**Step 2: Verify typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/sd-cli/src/workers/server.worker.ts
git commit -m "feat(sd-cli): copy public/ to dist/ in server build mode"
```

---

### Task 3: Integrate into server worker (watch/dev mode)

**Files:**
- Modify: `packages/sd-cli/src/workers/server.worker.ts` — `startWatch()` function (~line 319-397)

**Step 1: Add `public` + `public-dev` watch in dev mode**

In the `startWatch()` function, add watching after esbuild context is started. Also add cleanup for the watcher.

```typescript
// At top of file (already imported from Task 2):
import { copyPublicFiles, watchPublicFiles } from "../utils/copy-public";

// Add a module-level variable for the watcher (near line 95, after esbuildContext):
import type { FsWatcher } from "@simplysm/core-node";
/** public 파일 watcher (정리 대상) */
let publicWatcher: FsWatcher | undefined;

// Update cleanup() to also close publicWatcher:
// In cleanup(), add:
const watcherToClose = publicWatcher;
publicWatcher = undefined;
if (watcherToClose != null) {
  await watcherToClose.close();
}

// In startWatch(), after `await esbuildContext.watch();` (line 388), before `await firstBuildPromise;`:
// Watch public/ and public-dev/ (dev mode includes public-dev)
publicWatcher = await watchPublicFiles(info.pkgDir, true);
```

**Step 2: Verify typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/sd-cli/src/workers/server.worker.ts
git commit -m "feat(sd-cli): watch public/ and public-dev/ in server dev mode"
```

---

### Task 4: Integrate into client Vite config (dev mode — `public-dev` overlay)

**Files:**
- Modify: `packages/sd-cli/src/utils/vite-config.ts` — `createViteConfig()` function (~line 231-290)

**Step 1: Add a Vite plugin for `public-dev` overlay in dev mode**

Vite's native `publicDir` only supports a single directory. To overlay `public-dev/` on top of `public/` in dev mode, create a small Vite plugin that serves files from `public-dev/` with higher priority. For **build mode**, Vite handles `public/` natively and `public-dev` is not needed.

In `vite-config.ts`, add a new plugin function and use it in dev mode:

```typescript
import type { Plugin } from "vite";

/**
 * public-dev/ 디렉토리의 파일을 dev 모드에서 public/보다 우선하여 서빙하는 Vite 플러그인.
 * Vite의 기본 publicDir(public/)은 그대로 유지하면서, public-dev/의 파일이 같은 경로에 있으면 우선한다.
 */
function sdPublicDevPlugin(pkgDir: string): Plugin {
  const publicDevDir = path.join(pkgDir, "public-dev");

  return {
    name: "sd-public-dev",
    configureServer(server) {
      if (!fs.existsSync(publicDevDir)) return;

      // Vite의 기본 static 서빙보다 먼저 public-dev/ 파일을 체크
      server.middlewares.use((req, res, next) => {
        if (req.url == null) {
          next();
          return;
        }

        // base path 제거
        const base = server.config.base || "/";
        let urlPath = req.url.split("?")[0];
        if (urlPath.startsWith(base)) {
          urlPath = urlPath.slice(base.length);
        }
        if (urlPath.startsWith("/")) {
          urlPath = urlPath.slice(1);
        }

        const filePath = path.join(publicDevDir, urlPath);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          // sirv 대신 간단히 파일 스트림으로 응답
          const stream = fs.createReadStream(filePath);
          stream.pipe(res);
        } else {
          next();
        }
      });
    },
  };
}
```

Then in `createViteConfig()`, add the plugin in dev mode only:

```typescript
// In the plugins array, add conditionally:
...(mode === "dev" ? [sdPublicDevPlugin(pkgDir)] : []),
```

**Step 2: Verify typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/sd-cli/src/utils/vite-config.ts
git commit -m "feat(sd-cli): serve public-dev/ files in Vite dev mode"
```

---

### Task 5: Integrate `public` copy into server build in BuildOrchestrator

**Files:**
- Modify: `packages/sd-cli/src/orchestrators/BuildOrchestrator.ts` — server build section (~line 412-446)

**Note:** This task may not be needed if the server worker's `build()` function (Task 2) already handles the copy. Since `copyPublicFiles` is called inside the worker's `build()`, the orchestrator does not need additional changes.

**Step 1: Verify**

Read `server.worker.ts` build function to confirm `copyPublicFiles` is called inside the worker. If yes, no changes needed in BuildOrchestrator.

**Step 2: Commit (skip if no changes)**

---

### Task 6: Final verification

**Step 1: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 2: Run lint**

Run: `pnpm lint packages/sd-cli`
Expected: PASS (or only pre-existing warnings)
