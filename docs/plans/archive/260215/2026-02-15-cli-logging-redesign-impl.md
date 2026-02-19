# CLI Logging Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Remove listr2 dependency and replace with consola-based logging + Promise.allSettled for concurrency.

**Architecture:** Replace all Listr instances with sequential consola logging (start/success/fail) and Promise.allSettled for concurrent tasks. Rename RebuildListrManager → RebuildManager, keeping its queue/batch logic but replacing Listr with Promise.allSettled + consola.

**Tech Stack:** consola (existing), Promise.allSettled (native)

---

### Task 1: Rename RebuildListrManager → RebuildManager (remove Listr)

**Files:**
- Modify: `packages/sd-cli/src/utils/listr-manager.ts` (rename class, remove Listr)
- Modify: `packages/sd-cli/src/utils/worker-events.ts:4,64` (update import)
- Modify: `packages/sd-cli/src/builders/BaseBuilder.ts:3,15,29` (update import/type)
- Modify: `packages/sd-cli/src/orchestrators/WatchOrchestrator.ts:9,41,112` (update import/type)
- Modify: `packages/sd-cli/src/commands/dev.ts:16,164` (update import/usage)

**Step 1: Rewrite listr-manager.ts**

Replace Listr usage with Promise.allSettled + consola logging:

```typescript
import { EventEmitter } from "node:events";
import { consola } from "consola";

interface RebuildManagerEvents {
  batchComplete: [];
}

export class RebuildManager extends EventEmitter<RebuildManagerEvents> {
  private _isRunning = false;
  private readonly _pendingBuilds = new Map<string, { title: string; promise: Promise<void>; resolver: () => void }>();
  private readonly _logger: ReturnType<typeof consola.withTag>;

  constructor(logger: ReturnType<typeof consola.withTag>) {
    super();
    this._logger = logger;
  }

  registerBuild(key: string, title: string): () => void {
    let resolver!: () => void;
    const promise = new Promise<void>((resolve) => {
      resolver = resolve;
    });

    this._pendingBuilds.set(key, { title, promise, resolver });

    if (!this._isRunning) {
      void Promise.resolve().then(() => void this._runBatch());
    }

    return resolver;
  }

  private async _runBatch(): Promise<void> {
    if (this._isRunning || this._pendingBuilds.size === 0) {
      return;
    }

    this._isRunning = true;

    const batchBuilds = new Map(this._pendingBuilds);
    this._pendingBuilds.clear();

    const tasks = Array.from(batchBuilds.entries());
    for (const [, { title }] of tasks) {
      this._logger.debug(`리빌드 시작: ${title}`);
    }

    const results = await Promise.allSettled(tasks.map(([, { promise }]) => promise));

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      for (const result of failed) {
        this._logger.error("리빌드 중 오류 발생", { error: String((result as PromiseRejectedResult).reason) });
      }
    }

    this.emit("batchComplete");

    this._isRunning = false;

    if (this._pendingBuilds.size > 0) {
      void this._runBatch();
    }
  }
}
```

**Step 2: Update all imports**

In each file, change:
- `import { RebuildListrManager } from "../utils/listr-manager"` → `import { RebuildManager } from "../utils/listr-manager"`
- `RebuildListrManager` type references → `RebuildManager`

Files to update:
- `worker-events.ts:4,64`
- `BaseBuilder.ts:3,15,29`
- `WatchOrchestrator.ts:9,41,112`
- `dev.ts:16,164`

**Step 3: Verify**

Run: `pnpm typecheck packages/sd-cli`

---

### Task 2: Remove Listr from device.ts (simplest file)

**Files:**
- Modify: `packages/sd-cli/src/commands/device.ts`

**Step 1: Replace Listr with consola logging**

Remove `import { Listr } from "listr2"` (line 2).

Replace Electron Listr block (lines 87-103):
```typescript
    logger.start(`${packageName} (electron) 실행 중...`);
    try {
      const electron = await Electron.create(pkgDir, clientConfig.electron!);
      await electron.run(serverUrl);
      logger.success("Electron 실행 완료");
    } catch (err) {
      logger.error(`Electron 실행 실패: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
    }
```

Replace Capacitor Listr block (lines 128-144):
```typescript
    logger.start(`${packageName} (device) 실행 중...`);
    try {
      const cap = await Capacitor.create(pkgDir, clientConfig.capacitor!);
      await cap.runOnDevice(serverUrl);
      logger.success("디바이스 실행 완료");
    } catch (err) {
      logger.error(`디바이스 실행 실패: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
    }
```

Also unify other `consola.error(...)` calls → `logger.error(...)` for lines 50, 58, 64, 79, 111, 123, 146.

**Step 2: Verify**

Run: `pnpm typecheck packages/sd-cli`

---

### Task 3: Remove Listr from lint.ts

**Files:**
- Modify: `packages/sd-cli/src/commands/lint.ts`

**Step 1: Replace Listr with sequential consola logging**

Remove `import { Listr } from "listr2"` (line 4). Remove `LogLevels` from consola import if no longer needed.
Remove the `LintContext` interface (lines 28-40) since context is no longer needed.

Replace the Listr block (lines 146-262) and result handling with sequential code:

```typescript
  // ESLint 설정 로드
  logger.start("ESLint 설정 로드");
  const ignorePatterns = await loadIgnorePatterns(cwd);
  logger.debug("ignore 패턴 로드 완료", { ignorePatternCount: ignorePatterns.length });
  logger.success(`ESLint 설정 로드 (${ignorePatterns.length}개 ignore 패턴)`);

  // 린트 대상 파일 수집
  logger.start("린트 대상 파일 수집");
  let files = await fsGlob("**/*.{ts,tsx,js,jsx}", {
    cwd,
    ignore: ignorePatterns,
    nodir: true,
    absolute: true,
  });
  files = pathFilterByTargets(files, targets, cwd);
  logger.debug("파일 수집 완료", { fileCount: files.length });
  logger.success(`린트 대상 파일 수집 (${files.length}개)`);

  // 린트 실행
  let eslint: ESLint | undefined;
  let eslintResults: ESLint.LintResult[] | undefined;
  if (files.length > 0) {
    logger.start(`린트 실행 중... (${files.length}개 파일)`);
    eslint = new ESLint({
      cwd,
      fix,
      cache: true,
      cacheLocation: path.join(cwd, ".cache", "eslint.cache"),
    });
    eslintResults = await eslint.lintFiles(files);
    logger.success("린트 실행 완료");

    // 자동 수정 적용
    if (fix) {
      logger.debug("자동 수정 적용 중...");
      await ESLint.outputFixes(eslintResults);
      logger.debug("자동 수정 적용 완료");
    }
  }

  // Stylelint
  const hasStylelintCfg = await hasStylelintConfig(cwd);
  let stylelintResult: stylelint.LinterResult | undefined;
  if (hasStylelintCfg) {
    logger.start("CSS 파일 수집");
    let cssFiles = await fsGlob("**/*.css", {
      cwd,
      ignore: ignorePatterns,
      nodir: true,
      absolute: true,
    });
    cssFiles = pathFilterByTargets(cssFiles, targets, cwd);
    logger.success(`CSS 파일 수집 (${cssFiles.length}개)`);

    if (cssFiles.length > 0) {
      logger.start(`Stylelint 실행 중... (${cssFiles.length}개 파일)`);
      let configFile: string | undefined;
      for (const f of STYLELINT_CONFIG_FILES) {
        const configPath = path.join(cwd, f);
        if (await fsExists(configPath)) {
          configFile = configPath;
          break;
        }
      }
      stylelintResult = await stylelint.lint({
        files: cssFiles,
        configFile,
        fix,
        cache: true,
        cacheLocation: path.join(cwd, ".cache", "stylelint.cache"),
      });
      logger.success("Stylelint 실행 완료");
    }
  }

  // (keep existing result output logic below, using local variables instead of ctx)
```

Update the result handling section to use local variables (`files`, `eslintResults`, `eslint`, `stylelintResult`) instead of `ctx.*`.

**Step 2: Verify**

Run: `pnpm typecheck packages/sd-cli`

---

### Task 4: Remove Listr from typecheck.ts

**Files:**
- Modify: `packages/sd-cli/src/commands/typecheck.ts`

**Step 1: Replace Listr with Promise.allSettled + Worker pool**

Remove `import { Listr } from "listr2"` (line 4) and `LogLevels` from consola import.

Replace the Listr + Worker section (lines 246-317) with:

```typescript
  // Worker 풀 생성
  const workerPath = import.meta.resolve("../workers/dts.worker");
  const workers: WorkerProxy<typeof DtsWorkerModule>[] = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(Worker.create<typeof DtsWorkerModule>(workerPath));
  }

  const allResults: { displayName: string; result: DtsBuildResult }[] = [];

  try {
    let taskIndex = 0;

    async function runNextTask(worker: WorkerProxy<typeof DtsWorkerModule>): Promise<void> {
      while (taskIndex < tasks.length) {
        const currentIndex = taskIndex++;
        const task = tasks[currentIndex];

        logger.debug(`[${task.displayName}] 타입체크 시작`);
        try {
          const result = await worker.buildDts(task.buildInfo);
          allResults.push({ displayName: task.displayName, result });
          if (result.success) {
            logger.debug(`[${task.displayName}] 타입체크 완료`);
          } else {
            logger.debug(`[${task.displayName}] 타입체크 실패`, { errorCount: result.errorCount });
          }
        } catch (err) {
          logger.error(`Worker 오류: ${task.displayName}`, {
            error: err instanceof Error ? err.message : String(err),
          });
          allResults.push({
            displayName: task.displayName,
            result: {
              success: false,
              errors: [err instanceof Error ? err.message : String(err)],
              diagnostics: [],
              errorCount: 1,
              warningCount: 0,
            },
          });
        }
      }
    }

    logger.start(`타입체크 실행 중... (${tasks.length}개 대상, 동시성: ${concurrency})`);
    await Promise.all(workers.map((worker) => runNextTask(worker)));
    logger.success("타입체크 실행 완료");
  } finally {
    await Promise.all(workers.map((w) => w.terminate()));
  }

  // (keep existing result output logic)
```

Also unify `consola.error(...)` at line 190 → `logger.error(...)`.

**Step 2: Verify**

Run: `pnpm typecheck packages/sd-cli`

---

### Task 5: Remove Listr from build.ts

**Files:**
- Modify: `packages/sd-cli/src/commands/build.ts`

**Step 1: Replace Listr with sequential + Promise.allSettled**

Remove `import { Listr, type ListrTask } from "listr2"` (line 3) and `LogLevels` from consola import.

Replace the main Listr block (lines 197-437) with:

```typescript
  // Phase 1: Lint
  logger.start("Lint");
  await runLint(lintOptions);
  if (process.exitCode === 1) {
    state.hasError = true;
  }
  logger.success("Lint 완료");

  // Phase 2: Clean
  logger.start("Clean");
  await cleanDistFolders(cwd, allPackageNames);
  logger.success("Clean 완료");

  // Phase 3: Build (concurrent)
  logger.start(`Build (${allPackageNames.length}개 패키지)`);

  const buildTasks: Array<{ name: string; target: string; fn: () => Promise<void> }> = [];

  // buildPackages
  for (const { name, config } of buildPackages) {
    buildTasks.push({
      name,
      target: config.target,
      fn: async () => {
        // (same inner logic as current Listr task, lines 228-273)
      },
    });
  }

  // clientPackages
  for (const { name, config } of clientPackages) {
    buildTasks.push({
      name,
      target: "client",
      fn: async () => {
        // (same inner logic as current Listr task, lines 282-382)
      },
    });
  }

  // serverPackages
  for (const { name, config } of serverPackages) {
    buildTasks.push({
      name,
      target: "server",
      fn: async () => {
        // (same inner logic as current Listr task, lines 391-419)
      },
    });
  }

  const buildResults = await Promise.allSettled(
    buildTasks.map(async ({ name, target, fn }) => {
      logger.debug(`[${name}] (${target}) 빌드 시작`);
      await fn();
      logger.debug(`[${name}] (${target}) 빌드 완료`);
    }),
  );

  for (const result of buildResults) {
    if (result.status === "rejected") {
      logger.error("빌드 중 예외 발생", { error: String(result.reason) });
    }
  }

  logger.success("Build 완료");
```

Also unify `consola.error(...)` at lines 136, 452 → `logger.error(...)`.

**Step 2: Verify**

Run: `pnpm typecheck packages/sd-cli`

---

### Task 6: Remove Listr from dev.ts

**Files:**
- Modify: `packages/sd-cli/src/commands/dev.ts`

**Step 1: Replace initial Listr (lines 497-516) with Promise.allSettled**

Remove `import { Listr } from "listr2"` (line 3).

Replace:
```typescript
  // 초기 빌드 (concurrent)
  logger.start("초기 빌드 중...");
  const initialBuildPromises = [
    ...standaloneClientWorkers.map(async (workerInfo) => {
      logger.debug(`[${workerInfo.name}] (client) 초기 빌드 시작`);
      await (standaloneClientBuildPromises.get(workerInfo.name) ?? Promise.resolve());
      logger.debug(`[${workerInfo.name}] (client) 초기 빌드 완료`);
    }),
    ...viteClientWorkers.map(async (workerInfo) => {
      logger.debug(`[${workerInfo.name}] (client) 초기 빌드 시작`);
      await (viteClientBuildPromises.get(workerInfo.name) ?? Promise.resolve());
      logger.debug(`[${workerInfo.name}] (client) 초기 빌드 완료`);
    }),
    ...serverPackages.map(async ({ name }) => {
      logger.debug(`[${name}] (server) 초기 빌드 시작`);
      await (serverRuntimePromises.get(name)?.promise ?? Promise.resolve());
      logger.debug(`[${name}] (server) 초기 빌드 완료`);
    }),
  ];
  await Promise.allSettled(initialBuildPromises);
  logger.success("초기 빌드 완료");
```

**Step 2: Replace Capacitor Listr (lines 612-646) with sequential**

```typescript
  if (capacitorPackages.length > 0) {
    for (const [name, config] of capacitorPackages) {
      const pkgDir = path.join(cwd, "packages", name);
      logger.start(`${name} (capacitor) 초기화 중...`);
      try {
        const cap = await Capacitor.create(pkgDir, config.capacitor!);
        await cap.initialize();
        results.set(`${name}:capacitor`, {
          name,
          target: "client",
          type: "capacitor",
          status: "success",
        });
        logger.success(`${name} (capacitor) 초기화 완료`);
      } catch (err) {
        results.set(`${name}:capacitor`, {
          name,
          target: "client",
          type: "capacitor",
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        });
        logger.fail(`${name} (capacitor) 초기화 실패`);
      }
    }
  }
```

Also unify `consola.error(...)` and `consola.info(...)` calls → `logger.error(...)` / `logger.info(...)` throughout the file.

**Step 3: Verify**

Run: `pnpm typecheck packages/sd-cli`

---

### Task 7: Remove Listr from WatchOrchestrator.ts

**Files:**
- Modify: `packages/sd-cli/src/orchestrators/WatchOrchestrator.ts`

**Step 1: Replace initial Listr (lines 148-178) with Promise.allSettled**

Remove `import { Listr } from "listr2"` (line 2).

Replace:
```typescript
    // Watch 시작 (백그라운드 실행)
    void this._libraryBuilder.startWatch();
    void this._dtsBuilder.startWatch();

    // 초기 빌드 완료 대기
    this._logger.start("초기 빌드 중...");
    const buildPromises = this._libraryBuilder.getInitialBuildPromises();
    const dtsPromises = this._dtsBuilder.getInitialBuildPromises();

    const allPromises = [
      ...this._packages.map(async (pkg) => {
        this._logger.debug(`[${pkg.name}] (${pkg.config.target}) 빌드 시작`);
        await (buildPromises.get(`${pkg.name}:build`) ?? Promise.resolve());
        this._logger.debug(`[${pkg.name}] (${pkg.config.target}) 빌드 완료`);
      }),
      ...this._packages.map(async (pkg) => {
        this._logger.debug(`[${pkg.name}] (dts) 시작`);
        await (dtsPromises.get(`${pkg.name}:dts`) ?? Promise.resolve());
        this._logger.debug(`[${pkg.name}] (dts) 완료`);
      }),
    ];
    await Promise.allSettled(allPromises);
    this._logger.success("초기 빌드 완료");
```

Also unify `consola.error(...)` at line 72 → `this._logger.error(...)`.

**Step 2: Verify**

Run: `pnpm typecheck packages/sd-cli`

---

### Task 8: Remove Listr from publish.ts

**Files:**
- Modify: `packages/sd-cli/src/commands/publish.ts`

**Step 1: Replace publish Listr (lines 725-772) with level-sequential + Promise.allSettled**

Remove `import { Listr, type ListrTask } from "listr2"` (line 4) and `LogLevels` from consola import.

Replace:
```typescript
  const levels = await computePublishLevels(publishPackages);
  const publishedPackages: string[] = [];
  let publishFailed = false;

  for (let levelIdx = 0; levelIdx < levels.length; levelIdx++) {
    if (publishFailed) break;

    const levelPkgs = levels[levelIdx];
    logger.start(`Level ${levelIdx + 1}/${levels.length} 배포 중... (${levelPkgs.length}개 패키지)`);

    const levelResults = await Promise.allSettled(
      levelPkgs.map(async (pkg) => {
        const pkgLabel = dryRun ? `[DRY-RUN] ${pkg.name}` : pkg.name;
        logger.debug(`[${pkgLabel}] 배포 시작`);
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            await publishPackage(pkg.path, pkg.config, version, cwd, logger, dryRun);
            logger.debug(`[${pkgLabel}] 배포 완료`);
            publishedPackages.push(pkg.name);
            return;
          } catch (err) {
            if (attempt < maxRetries) {
              const delay = attempt * 5_000;
              logger.debug(`[${pkgLabel}] 재시도 ${attempt + 1}/${maxRetries} (${delay}ms 대기)`);
              await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
              throw err;
            }
          }
        }
      }),
    );

    const failed = levelResults.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      logger.fail(`Level ${levelIdx + 1}/${levels.length} 일부 실패`);
    } else {
      logger.success(`Level ${levelIdx + 1}/${levels.length} 배포 완료`);
    }
  }
```

Also unify `consola.error(...)` calls → `logger.error(...)` throughout the file (lines 484, 574, 620, 669-673, 702-707, 782-788, 792).

**Step 2: Verify**

Run: `pnpm typecheck packages/sd-cli`

---

### Task 9: Update output-utils.ts comment and remove listr2 dependency

**Files:**
- Modify: `packages/sd-cli/src/utils/output-utils.ts:14` (update comment)
- Modify: `packages/sd-cli/package.json` (remove listr2)

**Step 1: Update comment**

In `output-utils.ts`, line 14 comment says "listr의 체크마크로 이미 표시되므로" → change to:
```
 * 에러만 출력한다.
```

**Step 2: Remove listr2 from package.json**

Remove `"listr2": "^10.1.0"` from dependencies.

**Step 3: Run pnpm install**

Run: `pnpm install`

**Step 4: Full verification**

Run: `pnpm typecheck packages/sd-cli`
Run: `pnpm lint packages/sd-cli`

---

## Verification

After all tasks, run:
1. `pnpm typecheck packages/sd-cli` — Should pass with no errors
2. `pnpm lint packages/sd-cli` — Should pass
3. `grep -r "listr2" packages/sd-cli/src/` — Should return no results
4. `grep -r "from \"listr2\"" packages/sd-cli/` — Should return no results (except maybe node_modules)
