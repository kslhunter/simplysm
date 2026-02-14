# replaceDeps Copy Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Change `replaceDeps` from symlink replacement to file-copy mode, resolving symlink targets to actual `.pnpm` store paths and copying source files there.

**Architecture:** `setupReplaceDeps` resolves symlink targets via `fs.realpath`, then copies source files (excluding `node_modules`, `package.json`, `.cache`, `tests`). New `watchReplaceDeps` uses `FsWatcher` to incrementally copy changed files. `preserveSymlinks: true` is removed from Vite config.

**Tech Stack:** Node.js `fs`, `@simplysm/core-node` (`fsCopy`, `fsRm`, `FsWatcher`), existing `resolveReplaceDepEntries`/`parseWorkspaceGlobs`

---

### Task 1: Update `setupReplaceDeps` to copy mode

**Files:**
- Modify: `packages/sd-cli/src/utils/replace-deps.ts:95-163`
- Test: `packages/sd-cli/tests/replace-deps.spec.ts:65-143`

**Step 1: Update tests for copy behavior**

Replace the symlink-checking tests with copy-checking tests. The test setup must create a symlink from `node_modules/@simplysm/solid` to a "real" directory (simulating pnpm's `.pnpm` store), so `fs.realpath` resolves through it.

```typescript
// In replace-deps.spec.ts, replace the entire "setupReplaceDeps" describe block:

describe("setupReplaceDeps", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sd-replace-deps-"));

    // Source package (simplysm/packages/solid)
    const sourceDir = path.join(tmpDir, "simplysm", "packages", "solid");
    await fs.promises.mkdir(sourceDir, { recursive: true });
    await fs.promises.writeFile(path.join(sourceDir, "index.js"), "export default 1;");
    // Excluded dirs/files
    await fs.promises.mkdir(path.join(sourceDir, "node_modules", "dep"), { recursive: true });
    await fs.promises.writeFile(path.join(sourceDir, "node_modules", "dep", "x.js"), "dep");
    await fs.promises.writeFile(path.join(sourceDir, "package.json"), "{}");
    await fs.promises.mkdir(path.join(sourceDir, ".cache"), { recursive: true });
    await fs.promises.writeFile(path.join(sourceDir, ".cache", "c.dat"), "cache");
    await fs.promises.mkdir(path.join(sourceDir, "tests"), { recursive: true });
    await fs.promises.writeFile(path.join(sourceDir, "tests", "t.spec.ts"), "test");

    // Target project: simulate pnpm structure
    // "real" directory (like .pnpm store)
    const appRoot = path.join(tmpDir, "app");
    const realDir = path.join(appRoot, "node_modules", ".pnpm", "@simplysm+solid@1.0.0", "node_modules", "@simplysm", "solid");
    await fs.promises.mkdir(realDir, { recursive: true });
    await fs.promises.writeFile(path.join(realDir, "index.js"), "old");

    // symlink from node_modules/@simplysm/solid -> real dir
    const symlinkDir = path.join(appRoot, "node_modules", "@simplysm");
    await fs.promises.mkdir(symlinkDir, { recursive: true });
    const symlinkPath = path.join(symlinkDir, "solid");
    await fs.promises.symlink(realDir, symlinkPath, "dir");
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  test("source files are copied to the resolved real path (not symlink replaced)", async () => {
    const appRoot = path.join(tmpDir, "app");

    await setupReplaceDeps(appRoot, {
      "@simplysm/*": "../simplysm/packages/*",
    });

    // Symlink must still exist (not replaced)
    const symlinkPath = path.join(appRoot, "node_modules", "@simplysm", "solid");
    const stat = await fs.promises.lstat(symlinkPath);
    expect(stat.isSymbolicLink()).toBe(true);

    // File was copied to the real path
    const realDir = path.join(appRoot, "node_modules", ".pnpm", "@simplysm+solid@1.0.0", "node_modules", "@simplysm", "solid");
    const content = await fs.promises.readFile(path.join(realDir, "index.js"), "utf-8");
    expect(content).toBe("export default 1;");
  });

  test("excluded directories and files are not copied", async () => {
    const appRoot = path.join(tmpDir, "app");

    await setupReplaceDeps(appRoot, {
      "@simplysm/*": "../simplysm/packages/*",
    });

    const realDir = path.join(appRoot, "node_modules", ".pnpm", "@simplysm+solid@1.0.0", "node_modules", "@simplysm", "solid");

    // node_modules, package.json, .cache, tests must NOT be copied
    expect(fs.existsSync(path.join(realDir, "node_modules", "dep", "x.js"))).toBe(false);
    expect(await fs.promises.readFile(path.join(realDir, "package.json"), "utf-8").catch(() => null)).toBeNull();
    expect(fs.existsSync(path.join(realDir, ".cache", "c.dat"))).toBe(false);
    expect(fs.existsSync(path.join(realDir, "tests", "t.spec.ts"))).toBe(false);
  });

  test("skips when source path does not exist", async () => {
    const appRoot = path.join(tmpDir, "app");

    // Create target for non-existent source
    const realDir2 = path.join(appRoot, "node_modules", ".pnpm", "@simplysm+no-exist@1.0.0", "node_modules", "@simplysm", "no-exist");
    await fs.promises.mkdir(realDir2, { recursive: true });
    const symlinkPath2 = path.join(appRoot, "node_modules", "@simplysm", "no-exist");
    await fs.promises.symlink(realDir2, symlinkPath2, "dir");

    // Should not throw
    await setupReplaceDeps(appRoot, {
      "@simplysm/*": "../simplysm/packages/*",
    });

    // solid was copied, no-exist was skipped
    const realDir = path.join(appRoot, "node_modules", ".pnpm", "@simplysm+solid@1.0.0", "node_modules", "@simplysm", "solid");
    const content = await fs.promises.readFile(path.join(realDir, "index.js"), "utf-8");
    expect(content).toBe("export default 1;");
  });

  test("handles non-symlink target (plain directory) by copying directly", async () => {
    const appRoot = path.join(tmpDir, "app");

    // Remove symlink, create a plain directory instead
    const symlinkPath = path.join(appRoot, "node_modules", "@simplysm", "solid");
    await fs.promises.rm(symlinkPath, { force: true });
    await fs.promises.mkdir(symlinkPath, { recursive: true });
    await fs.promises.writeFile(path.join(symlinkPath, "index.js"), "old-plain");

    await setupReplaceDeps(appRoot, {
      "@simplysm/*": "../simplysm/packages/*",
    });

    // File was copied in-place
    const content = await fs.promises.readFile(path.join(symlinkPath, "index.js"), "utf-8");
    expect(content).toBe("export default 1;");
  });

  test("workspace package node_modules are also processed", async () => {
    const appRoot = path.join(tmpDir, "app");

    // Workspace package with pnpm-like structure
    const pkgRealDir = path.join(appRoot, "packages", "client", "node_modules", ".pnpm", "@simplysm+solid@1.0.0", "node_modules", "@simplysm", "solid");
    await fs.promises.mkdir(pkgRealDir, { recursive: true });
    await fs.promises.writeFile(path.join(pkgRealDir, "index.js"), "old-ws");

    const pkgSymlinkParent = path.join(appRoot, "packages", "client", "node_modules", "@simplysm");
    await fs.promises.mkdir(pkgSymlinkParent, { recursive: true });
    await fs.promises.symlink(pkgRealDir, path.join(pkgSymlinkParent, "solid"), "dir");

    // pnpm-workspace.yaml
    await fs.promises.writeFile(path.join(appRoot, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n");

    await setupReplaceDeps(appRoot, {
      "@simplysm/*": "../simplysm/packages/*",
    });

    const content = await fs.promises.readFile(path.join(pkgRealDir, "index.js"), "utf-8");
    expect(content).toBe("export default 1;");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest packages/sd-cli/tests/replace-deps.spec.ts --run --project=node`
Expected: FAIL (tests expect copy behavior but implementation still does symlink)

**Step 3: Implement copy-based `setupReplaceDeps`**

Replace the symlink logic (lines 136-161) in `replace-deps.ts`:

```typescript
// replace-deps.ts — change imports at top:
import { fsCopy } from "@simplysm/core-node";

// ... (keep resolveReplaceDepEntries and parseWorkspaceGlobs unchanged)

// Filter for excluded paths
const EXCLUDED_NAMES = new Set(["node_modules", "package.json", ".cache", "tests"]);

function replaceDepsCopyFilter(absolutePath: string): boolean {
  const basename = path.basename(absolutePath);
  return !EXCLUDED_NAMES.has(basename);
}

/**
 * replaceDeps 설정에 따라 소스 파일을 node_modules 내 패키지의 실제 경로로 복사한다.
 *
 * 1. pnpm-workspace.yaml 파싱 → workspace 패키지 경로 목록
 * 2. [루트, ...workspace 패키지]의 node_modules에서 매칭되는 패키지 찾기
 * 3. 타겟 경로를 realpath로 resolve → 소스 파일을 복사
 *
 * @param projectRoot - 프로젝트 루트 경로
 * @param replaceDeps - sd.config.ts의 replaceDeps 설정
 */
export async function setupReplaceDeps(projectRoot: string, replaceDeps: Record<string, string>): Promise<void> {
  const logger = consola.withTag("sd:cli:replace-deps");

  // 1. Workspace 패키지 경로 목록 수집
  const searchRoots = [projectRoot];

  const workspaceYamlPath = path.join(projectRoot, "pnpm-workspace.yaml");
  try {
    const yamlContent = await fs.promises.readFile(workspaceYamlPath, "utf-8");
    const workspaceGlobs = parseWorkspaceGlobs(yamlContent);

    for (const pattern of workspaceGlobs) {
      const dirs = await glob(pattern, { cwd: projectRoot, absolute: true });
      searchRoots.push(...dirs);
    }
  } catch {
    // pnpm-workspace.yaml가 없으면 루트만 처리
  }

  // 2. 각 searchRoot의 node_modules에서 매칭되는 패키지 찾기
  for (const searchRoot of searchRoots) {
    const nodeModulesDir = path.join(searchRoot, "node_modules");

    try {
      await fs.promises.access(nodeModulesDir);
    } catch {
      continue;
    }

    const targetNames: string[] = [];
    for (const pattern of Object.keys(replaceDeps)) {
      const matches = await glob(pattern, { cwd: nodeModulesDir });
      targetNames.push(...matches);
    }

    if (targetNames.length === 0) continue;

    const entries = resolveReplaceDepEntries(replaceDeps, targetNames);

    // 3. 소스 파일을 타겟의 실제 경로로 복사
    for (const { targetName, sourcePath } of entries) {
      const targetPath = path.join(nodeModulesDir, targetName);
      const resolvedSourcePath = path.resolve(projectRoot, sourcePath);

      // 소스 경로 존재 확인
      try {
        await fs.promises.access(resolvedSourcePath);
      } catch {
        logger.warn(`소스 경로가 존재하지 않아 스킵합니다: ${resolvedSourcePath}`);
        continue;
      }

      try {
        // symlink인 경우 realpath로 resolve, 아니면 그대로 사용
        const realTargetPath = await fs.promises.realpath(targetPath);

        await fsCopy(resolvedSourcePath, realTargetPath, replaceDepsCopyFilter);

        logger.info(`${targetName} → ${sourcePath} (복사)`);
      } catch (err) {
        logger.error(`복사 실패 (${targetName}): ${err instanceof Error ? err.message : err}`);
      }
    }
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest packages/sd-cli/tests/replace-deps.spec.ts --run --project=node`
Expected: PASS

---

### Task 2: Add `watchReplaceDeps` function

**Files:**
- Modify: `packages/sd-cli/src/utils/replace-deps.ts` (add new export)
- Test: `packages/sd-cli/tests/replace-deps.spec.ts` (add new describe block)

**Step 1: Write the test**

```typescript
// Append to replace-deps.spec.ts:

describe("watchReplaceDeps", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sd-replace-deps-watch-"));

    // Source
    const sourceDir = path.join(tmpDir, "simplysm", "packages", "solid");
    await fs.promises.mkdir(sourceDir, { recursive: true });
    await fs.promises.writeFile(path.join(sourceDir, "index.js"), "original");

    // Target (pnpm-like)
    const appRoot = path.join(tmpDir, "app");
    const realDir = path.join(appRoot, "node_modules", ".pnpm", "@simplysm+solid@1.0.0", "node_modules", "@simplysm", "solid");
    await fs.promises.mkdir(realDir, { recursive: true });
    await fs.promises.writeFile(path.join(realDir, "index.js"), "old");

    const symlinkParent = path.join(appRoot, "node_modules", "@simplysm");
    await fs.promises.mkdir(symlinkParent, { recursive: true });
    await fs.promises.symlink(realDir, path.join(symlinkParent, "solid"), "dir");
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  test("returns entries and a dispose function", async () => {
    const appRoot = path.join(tmpDir, "app");
    const result = await watchReplaceDeps(appRoot, {
      "@simplysm/*": "../simplysm/packages/*",
    });

    expect(result.entries.length).toBeGreaterThan(0);
    expect(typeof result.dispose).toBe("function");

    await result.dispose();
  });
});
```

Add import of `watchReplaceDeps` at the top of the test file.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/sd-cli/tests/replace-deps.spec.ts --run --project=node`
Expected: FAIL (`watchReplaceDeps` is not exported)

**Step 3: Implement `watchReplaceDeps`**

Add after `setupReplaceDeps` in `replace-deps.ts`:

```typescript
import { fsCopy, fsMkdir, fsRm, FsWatcher } from "@simplysm/core-node";

// ... existing code ...

export interface ReplaceDepEntry {
  sourcePath: string;
  realTargetPath: string;
}

export interface WatchReplaceDepResult {
  entries: ReplaceDepEntry[];
  dispose: () => Promise<void>;
}

/**
 * replaceDeps 설정에 따라 소스 디렉토리를 감시하여 변경된 파일을 실시간 복사한다.
 *
 * @param projectRoot - 프로젝트 루트 경로
 * @param replaceDeps - sd.config.ts의 replaceDeps 설정
 * @returns entries (소스-타겟 매핑)와 dispose 함수
 */
export async function watchReplaceDeps(
  projectRoot: string,
  replaceDeps: Record<string, string>,
): Promise<WatchReplaceDepResult> {
  const logger = consola.withTag("sd:cli:replace-deps");

  // resolve entries (reuse workspace/glob logic from setupReplaceDeps)
  const resolvedEntries: ReplaceDepEntry[] = [];

  const searchRoots = [projectRoot];
  const workspaceYamlPath = path.join(projectRoot, "pnpm-workspace.yaml");
  try {
    const yamlContent = await fs.promises.readFile(workspaceYamlPath, "utf-8");
    const workspaceGlobs = parseWorkspaceGlobs(yamlContent);
    for (const pattern of workspaceGlobs) {
      const dirs = await glob(pattern, { cwd: projectRoot, absolute: true });
      searchRoots.push(...dirs);
    }
  } catch {
    // no workspace
  }

  for (const searchRoot of searchRoots) {
    const nodeModulesDir = path.join(searchRoot, "node_modules");
    try {
      await fs.promises.access(nodeModulesDir);
    } catch {
      continue;
    }

    const targetNames: string[] = [];
    for (const pattern of Object.keys(replaceDeps)) {
      const matches = await glob(pattern, { cwd: nodeModulesDir });
      targetNames.push(...matches);
    }
    if (targetNames.length === 0) continue;

    const entries = resolveReplaceDepEntries(replaceDeps, targetNames);

    for (const { sourcePath, targetName } of entries) {
      const targetPath = path.join(nodeModulesDir, targetName);
      const resolvedSourcePath = path.resolve(projectRoot, sourcePath);

      try {
        await fs.promises.access(resolvedSourcePath);
      } catch {
        continue;
      }

      try {
        const realTargetPath = await fs.promises.realpath(targetPath);
        resolvedEntries.push({ sourcePath: resolvedSourcePath, realTargetPath });
      } catch {
        // target doesn't exist
      }
    }
  }

  if (resolvedEntries.length === 0) {
    return { entries: [], dispose: async () => {} };
  }

  // Watch source directories
  const watchPaths = resolvedEntries.map((e) => path.join(e.sourcePath, "**"));
  const watcher = await FsWatcher.watch(watchPaths);

  watcher.onChange({ delay: 300 }, async (changes) => {
    const fileChanges = changes.filter((c) => ["add", "change", "unlink"].includes(c.event));
    if (fileChanges.length === 0) return;

    logger.log("replaceDeps 변경 감지...");

    for (const { event, path: filePath } of fileChanges) {
      for (const entry of resolvedEntries) {
        if (!filePath.startsWith(entry.sourcePath + path.sep) && filePath !== entry.sourcePath) continue;

        const relPath = path.relative(entry.sourcePath, filePath);

        // Check exclusion
        const topSegment = relPath.split(path.sep)[0];
        if (EXCLUDED_NAMES.has(topSegment)) continue;

        const targetFilePath = path.join(entry.realTargetPath, relPath);

        if (event === "unlink") {
          logger.debug(`삭제: ${targetFilePath}`);
          await fsRm(targetFilePath);
        } else {
          logger.debug(`복사: ${filePath} → ${targetFilePath}`);
          await fsMkdir(path.dirname(targetFilePath));
          await fsCopy(filePath, targetFilePath);
        }
      }
    }

    logger.info("replaceDeps 복사 완료");
  });

  return {
    entries: resolvedEntries,
    dispose: async () => {
      await watcher.close();
    },
  };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/sd-cli/tests/replace-deps.spec.ts --run --project=node`
Expected: PASS

---

### Task 3: Update call sites and remove `preserveSymlinks`

**Files:**
- Modify: `packages/sd-cli/src/commands/dev.ts:9,81-84`
- Modify: `packages/sd-cli/src/orchestrators/WatchOrchestrator.ts:7,16,45,76-79,195-209`
- Modify: `packages/sd-cli/src/utils/vite-config.ts:142-144`

**Step 1: Update `dev.ts`**

Add import and watch call:

```typescript
// Line 9: change import
import { setupReplaceDeps, watchReplaceDeps } from "../utils/replace-deps";
import type { WatchReplaceDepResult } from "../utils/replace-deps";

// Lines 81-84: add watch after setup
  // replaceDeps 설정이 있으면 파일 복사 + watch
  let replaceDepWatcher: WatchReplaceDepResult | undefined;
  if (sdConfig.replaceDeps != null) {
    await setupReplaceDeps(cwd, sdConfig.replaceDeps);
    replaceDepWatcher = await watchReplaceDeps(cwd, sdConfig.replaceDeps);
  }

// At termination (line ~593, inside the Promise.all for worker termination):
// Add replaceDepWatcher dispose
  await Promise.all([
    ...standaloneClientWorkers.map(({ worker }) => worker.terminate()),
    ...viteClientWorkers.map(({ worker }) => worker.terminate()),
    ...[...serverBuildWorkers.values()].map(({ worker }) => worker.terminate()),
    ...[...serverRuntimeWorkers.values()].map((worker) => worker.terminate()),
    replaceDepWatcher?.dispose(),
  ]);
```

**Step 2: Update `WatchOrchestrator.ts`**

Add import, field, and watch/cleanup:

```typescript
// Line 7: change import
import { setupReplaceDeps, watchReplaceDeps } from "../utils/replace-deps";
import type { WatchReplaceDepResult } from "../utils/replace-deps";

// Add field (after line 45, _copySrcWatchers):
  private _replaceDepWatcher: WatchReplaceDepResult | undefined;

// Lines 76-79: add watch after setup
    if (sdConfig.replaceDeps != null) {
      await setupReplaceDeps(this._cwd, sdConfig.replaceDeps);
      this._replaceDepWatcher = await watchReplaceDeps(this._cwd, sdConfig.replaceDeps);
    }

// In shutdown() method, add dispose to Promise.all:
    await Promise.all([
      this._libraryBuilder.shutdown(),
      this._dtsBuilder.shutdown(),
      ...this._copySrcWatchers.map((w) => w.close()),
      this._replaceDepWatcher?.dispose(),
    ]);
```

**Step 3: Remove `preserveSymlinks` from `vite-config.ts`**

Delete lines 142-144 (the `resolve` block):

```typescript
  const config: ViteUserConfig = {
    root: pkgDir,
    base: `/${name}/`,
    // resolve: { preserveSymlinks: true } — REMOVED
    plugins: [
```

**Step 4: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 5: Run all tests**

Run: `pnpm vitest packages/sd-cli/tests/replace-deps.spec.ts --run --project=node`
Expected: PASS
