# Server Watch Debounce Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** server.worker.ts의 esbuild 네이티브 watch를 FsWatcher + rebuild()로 전환하여 300ms debounce 적용

**Architecture:** library.worker.ts와 동일한 패턴. FsWatcher가 서버 소스 + scope 패키지 dist를 300ms debounce로 감시하고, 변경 감지 시 esbuildContext.rebuild()를 수동 호출한다.

**Tech Stack:** FsWatcher (chokidar wrapper), esbuild context API

---

### Task 1: server.worker.ts — FsWatcher 방식으로 전환

**Files:**
- Modify: `packages/sd-cli/src/workers/server.worker.ts`

**Step 1: import 변경**

`import type { FsWatcher }` → 실제 import으로 변경:

```typescript
import { createWorker, FsWatcher } from "@simplysm/core-node";
```

기존 `import { createWorker } from "@simplysm/core-node";`와 `import type { FsWatcher } from "@simplysm/core-node";`를 합친다.

**Step 2: ServerWatchInfo에 watchScopes 추가**

```typescript
export interface ServerWatchInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  env?: Record<string, string>;
  configs?: Record<string, unknown>;
  externals?: string[];
  /** scope 패키지 감시 대상 (e.g. ["@simplysm"]) */
  watchScopes?: string[];
}
```

**Step 3: 리소스 관리에 srcWatcher 추가**

기존 `publicWatcher` 옆에 추가:

```typescript
/** 소스 + scope 패키지 watcher (정리 대상) */
let srcWatcher: FsWatcher | undefined;
```

cleanup 함수에 srcWatcher close 추가:

```typescript
async function cleanup(): Promise<void> {
  const contextToDispose = esbuildContext;
  esbuildContext = undefined;

  const watcherToClose = publicWatcher;
  publicWatcher = undefined;

  const srcWatcherToClose = srcWatcher;
  srcWatcher = undefined;

  if (contextToDispose != null) {
    await contextToDispose.dispose();
  }

  if (watcherToClose != null) {
    await watcherToClose.close();
  }

  if (srcWatcherToClose != null) {
    await srcWatcherToClose.close();
  }
}
```

**Step 4: esbuild context 생성 함수 추출**

library.worker.ts의 `createAndBuildContext` 패턴을 따라, startWatch에서 context 생성 로직을 함수로 추출:

```typescript
async function createAndBuildContext(
  info: ServerWatchInfo,
  isFirstBuild: boolean,
  resolveFirstBuild?: () => void,
): Promise<esbuild.BuildContext> {
  const parsedConfig = parseRootTsconfig(info.cwd);
  const entryPoints = getPackageSourceFiles(info.pkgDir, parsedConfig);
  const compilerOptions = await getCompilerOptionsForPackage(
    parsedConfig.options,
    "node",
    info.pkgDir,
  );

  const mainJsPath = path.join(info.pkgDir, "dist", "main.js");
  const external = collectAllExternals(info.pkgDir, info.externals);
  const baseOptions = createServerEsbuildOptions({
    pkgDir: info.pkgDir,
    entryPoints,
    compilerOptions,
    env: info.env,
    external,
  });

  let isBuildFirstTime = isFirstBuild;

  const context = await esbuild.context({
    ...baseOptions,
    plugins: [
      {
        name: "watch-notify",
        setup(pluginBuild) {
          pluginBuild.onStart(() => {
            sender.send("buildStart", {});
          });

          pluginBuild.onEnd((result) => {
            const errors = result.errors.map((e) => e.text);
            const warnings = result.warnings.map((w) => w.text);
            const success = result.errors.length === 0;

            if (isBuildFirstTime && success) {
              const confDistPath = path.join(info.pkgDir, "dist", ".config.json");
              fs.writeFileSync(confDistPath, JSON.stringify(info.configs ?? {}, undefined, 2));
            }

            sender.send("build", {
              success,
              mainJsPath,
              errors: errors.length > 0 ? errors : undefined,
              warnings: warnings.length > 0 ? warnings : undefined,
            });

            if (isBuildFirstTime) {
              isBuildFirstTime = false;
              resolveFirstBuild?.();
            }
          });
        },
      },
    ],
  });

  await context.rebuild();

  return context;
}
```

**Step 5: startWatch를 FsWatcher 방식으로 전환**

```typescript
async function startWatch(info: ServerWatchInfo): Promise<void> {
  if (isWatchStarted) {
    throw new Error("startWatch는 Worker당 한 번만 호출할 수 있습니다.");
  }
  isWatchStarted = true;

  try {
    // 첫 번째 빌드 완료 대기를 위한 Promise
    let resolveFirstBuild!: () => void;
    const firstBuildPromise = new Promise<void>((resolve) => {
      resolveFirstBuild = resolve;
    });

    // 초기 esbuild context 생성 및 빌드
    esbuildContext = await createAndBuildContext(info, true, resolveFirstBuild);

    // 첫 번째 빌드 완료 대기
    await firstBuildPromise;

    // Watch public/ and public-dev/ (dev mode includes public-dev)
    publicWatcher = await watchPublicFiles(info.pkgDir, true);

    // FsWatcher 감시 경로 수집
    const watchPaths: string[] = [];

    // 1) 서버 자체 소스
    watchPaths.push(path.join(info.pkgDir, "src", "**", "*.{ts,tsx}"));

    // 2) scope 패키지 dist 디렉토리
    if (info.watchScopes != null) {
      for (const scope of info.watchScopes) {
        const scopeDir = path.join(info.pkgDir, "node_modules", scope);
        if (!fs.existsSync(scopeDir)) continue;

        for (const pkgName of fs.readdirSync(scopeDir)) {
          const distDir = path.join(scopeDir, pkgName, "dist");
          if (fs.existsSync(distDir)) {
            watchPaths.push(distDir);
          }
        }
      }
    }

    // FsWatcher 시작
    srcWatcher = await FsWatcher.watch(watchPaths);

    // 파일 변경 감지 시 처리
    srcWatcher.onChange({ delay: 300 }, async (changes) => {
      try {
        // 서버 자체 소스에서 add/unlink가 있으면 context 재생성
        const srcDir = path.join(info.pkgDir, "src");
        const hasEntryPointChange = changes.some(
          (c) =>
            (c.event === "add" || c.event === "unlink") &&
            c.path.startsWith(srcDir.replace(/\\/g, "/")),
        );

        if (hasEntryPointChange) {
          logger.debug("서버 소스 파일 추가/삭제 감지, context 재생성");

          const oldContext = esbuildContext;
          esbuildContext = await createAndBuildContext(info, false);

          if (oldContext != null) {
            await oldContext.dispose();
          }
        } else {
          if (esbuildContext != null) {
            await esbuildContext.rebuild();
          }
        }
      } catch (err) {
        sender.send("error", {
          message: err instanceof Error ? err.message : String(err),
        });
      }
    });
  } catch (err) {
    sender.send("error", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
```

**Step 6: typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 7: Commit**

```bash
git add packages/sd-cli/src/workers/server.worker.ts
git commit -m "feat(sd-cli): add 300ms debounce to server watch via FsWatcher"
```

---

### Task 2: DevOrchestrator — watchScopes 전달

**Files:**
- Modify: `packages/sd-cli/src/orchestrators/DevOrchestrator.ts:636-643`

**Step 1: startWatch 호출에 watchScopes 추가**

```typescript
serverBuild.worker
  .startWatch({
    name,
    cwd: this._cwd,
    pkgDir,
    watchScopes: this._watchScopes,
    env: { ...this._baseEnv, ...config.env },
    configs: config.configs,
    externals: config.externals,
  })
```

**Step 2: typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/sd-cli/src/orchestrators/DevOrchestrator.ts
git commit -m "feat(sd-cli): pass watchScopes to server worker for debounced watch"
```
