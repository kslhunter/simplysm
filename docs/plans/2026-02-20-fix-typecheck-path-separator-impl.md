# Fix: Path Separator Mismatch — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Fix Windows path separator mismatch in sd-cli that causes `pnpm typecheck` to silently report 0 errors.

**Architecture:** TypeScript API returns forward-slash paths on Windows, but sd-cli compares using `path.sep` (backslash). Use `pathIsChildPath()` and `pathNorm()` from `@simplysm/core-node` to normalize all path comparisons.

**Tech Stack:** TypeScript, `@simplysm/core-node` (pathNorm, pathIsChildPath), Vitest

**Design doc:** `docs/plans/2026-02-20-fix-typecheck-path-separator.md`

---

### Task 1: Add cross-platform path tests for tsconfig.ts

**Files:**
- Modify: `packages/sd-cli/tests/get-package-source-files.spec.ts`

**Step 1: Write failing tests for mixed separator scenario**

Add tests that simulate TypeScript API returning forward-slash paths while pkgDir uses OS-native separators. This is exactly the bug on Windows.

```typescript
// Add at end of "getPackageSourceFiles" describe block:
it("TypeScript API의 forward slash 경로도 올바르게 필터링 (Windows 호환)", () => {
  // TypeScript API는 Windows에서도 forward slash 경로를 반환
  const pkgDir = path.resolve("/project/packages/core-common");
  const parsedConfig = {
    fileNames: [
      "/project/packages/core-common/src/index.ts",
      "/project/packages/core-common/src/utils/string.ts",
      "/project/packages/core-common/tests/utils.spec.ts",
      "/project/packages/core-node/src/index.ts",
    ],
  } as ts.ParsedCommandLine;

  const result = getPackageSourceFiles(pkgDir, parsedConfig);

  // path.resolve가 OS-native 경로를 반환하므로 결과도 native 경로
  expect(result).toHaveLength(2);
  expect(result.every((f) => f.includes("core-common/src/") || f.includes("core-common\\src\\"))).toBe(true);
});

// Add at end of "getPackageFiles" describe block:
it("TypeScript API의 forward slash 경로도 올바르게 필터링 (Windows 호환)", () => {
  const pkgDir = path.resolve("/project/packages/core-common");
  const parsedConfig = {
    fileNames: [
      "/project/packages/core-common/src/index.ts",
      "/project/packages/core-common/tests/utils.spec.ts",
      "/project/packages/core-node/src/index.ts",
    ],
  } as ts.ParsedCommandLine;

  const result = getPackageFiles(pkgDir, parsedConfig);

  expect(result).toHaveLength(2);
  expect(result.every((f) => f.includes("core-common"))).toBe(true);
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest packages/sd-cli/tests/get-package-source-files.spec.ts --run`
Expected on Windows: FAIL — `getPackageSourceFiles` returns empty array because `startsWith` comparison fails with mixed separators.

**Step 3: Commit (test only)**

```bash
git add packages/sd-cli/tests/get-package-source-files.spec.ts
git commit -m "test(sd-cli): add cross-platform path separator tests for tsconfig utils"
```

---

### Task 2: Fix tsconfig.ts path comparisons

**Files:**
- Modify: `packages/sd-cli/src/utils/tsconfig.ts:3,113-115,121-123`

**Step 1: Add `pathIsChildPath` import**

At line 3, change:
```typescript
// Before
import { fsExists, fsReadJson } from "@simplysm/core-node";

// After
import { fsExists, fsReadJson, pathIsChildPath } from "@simplysm/core-node";
```

**Step 2: Fix `getPackageSourceFiles` (lines 113-115)**

```typescript
// Before
export function getPackageSourceFiles(
  pkgDir: string,
  parsedConfig: ts.ParsedCommandLine,
): string[] {
  // 경로 구분자까지 포함하여 비교 (packages/core와 packages/core-common 구분)
  const pkgSrcPrefix = path.join(pkgDir, "src") + path.sep;
  return parsedConfig.fileNames.filter((f) => f.startsWith(pkgSrcPrefix));
}

// After
export function getPackageSourceFiles(
  pkgDir: string,
  parsedConfig: ts.ParsedCommandLine,
): string[] {
  const pkgSrcDir = path.join(pkgDir, "src");
  return parsedConfig.fileNames.filter((f) => pathIsChildPath(f, pkgSrcDir));
}
```

**Step 3: Fix `getPackageFiles` (lines 121-123)**

```typescript
// Before
export function getPackageFiles(pkgDir: string, parsedConfig: ts.ParsedCommandLine): string[] {
  const pkgPrefix = pkgDir + path.sep;
  return parsedConfig.fileNames.filter((f) => f.startsWith(pkgPrefix));
}

// After
export function getPackageFiles(pkgDir: string, parsedConfig: ts.ParsedCommandLine): string[] {
  return parsedConfig.fileNames.filter((f) => pathIsChildPath(f, pkgDir));
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest packages/sd-cli/tests/get-package-source-files.spec.ts --run`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/sd-cli/src/utils/tsconfig.ts
git commit -m "fix(sd-cli): use pathIsChildPath in tsconfig utils for cross-platform path comparison"
```

---

### Task 3: Fix dts.worker.ts path comparisons

**Files:**
- Modify: `packages/sd-cli/src/workers/dts.worker.ts:3,147-178,196-225,358,379`

**Step 1: Add imports**

At line 3, change:
```typescript
// Before
import { createWorker } from "@simplysm/core-node";

// After
import { createWorker, pathIsChildPath, pathNorm } from "@simplysm/core-node";
```

**Step 2: Fix `createDtsPathRewriter` (lines 147-178) — Pattern B**

The `createDtsPathRewriter` function needs `pathNorm()` because it does `slice()` and `split()` after the comparison — `pathIsChildPath` alone is not enough.

```typescript
// Before
function createDtsPathRewriter(
  pkgDir: string,
): (fileName: string, content: string) => [string, string] | null {
  const pkgName = path.basename(pkgDir);
  const distDir = path.join(pkgDir, "dist");
  const distPrefix = distDir + path.sep;
  // 중첩 구조에서 현재 패키지의 접두사: dist/{pkgName}/src/
  const ownNestedPrefix = path.join(distDir, pkgName, "src") + path.sep;

  return (fileName, content) => {
    if (!fileName.startsWith(distPrefix)) return null;

    if (fileName.startsWith(ownNestedPrefix)) {
      // 중첩 경로를 flat으로 재작성: dist/{pkgName}/src/... → dist/...
      const flatPath = path.join(distDir, fileName.slice(ownNestedPrefix.length));
      if (fileName.endsWith(".d.ts.map")) {
        content = adjustDtsMapSources(content, path.dirname(fileName), path.dirname(flatPath));
      }
      return [flatPath, content];
    }

    // 다른 패키지의 중첩 출력 (dist/{otherPkg}/src/...) → 무시
    const relFromDist = fileName.slice(distPrefix.length);
    const segments = relFromDist.split(path.sep);
    if (segments.length >= 3 && segments[1] === "src") {
      return null;
    }

    // 이미 flat 구조 (의존성 없는 패키지) → 그대로 출력
    return [fileName, content];
  };
}

// After
function createDtsPathRewriter(
  pkgDir: string,
): (fileName: string, content: string) => [string, string] | null {
  const pkgName = path.basename(pkgDir);
  const distDir = pathNorm(path.join(pkgDir, "dist"));
  const distPrefix = distDir + path.sep;
  // 중첩 구조에서 현재 패키지의 접두사: dist/{pkgName}/src/
  const ownNestedPrefix = pathNorm(path.join(distDir, pkgName, "src")) + path.sep;

  return (fileName, content) => {
    fileName = pathNorm(fileName);

    if (!fileName.startsWith(distPrefix)) return null;

    if (fileName.startsWith(ownNestedPrefix)) {
      // 중첩 경로를 flat으로 재작성: dist/{pkgName}/src/... → dist/...
      const flatPath = path.join(distDir, fileName.slice(ownNestedPrefix.length));
      if (fileName.endsWith(".d.ts.map")) {
        content = adjustDtsMapSources(content, path.dirname(fileName), path.dirname(flatPath));
      }
      return [flatPath, content];
    }

    // 다른 패키지의 중첩 출력 (dist/{otherPkg}/src/...) → 무시
    const relFromDist = fileName.slice(distPrefix.length);
    const segments = relFromDist.split(path.sep);
    if (segments.length >= 3 && segments[1] === "src") {
      return null;
    }

    // 이미 flat 구조 (의존성 없는 패키지) → 그대로 출력
    return [fileName, content];
  };
}
```

**Step 3: Fix `buildDts` diagnostic filters (lines 196-225) — Pattern A**

Replace all `startsWith(prefix + path.sep)` patterns with `pathIsChildPath`:

```typescript
// In the `if (shouldEmit)` block (lines 203-205), replace:
const pkgSrcPrefix = path.join(info.pkgDir, "src") + path.sep;
diagnosticFilter = (d) => d.file == null || d.file.fileName.startsWith(pkgSrcPrefix);
// With:
const pkgSrcDir = path.join(info.pkgDir, "src");
diagnosticFilter = (d) => d.file == null || pathIsChildPath(d.file.fileName, pkgSrcDir);

// In the else block (lines 208-210), replace:
const pkgPrefix = info.pkgDir + path.sep;
diagnosticFilter = (d) => d.file == null || d.file.fileName.startsWith(pkgPrefix);
// With:
diagnosticFilter = (d) => d.file == null || pathIsChildPath(d.file.fileName, info.pkgDir);

// In the non-package block (lines 220-223), replace:
const packagesPrefix = path.join(info.cwd, "packages") + path.sep;
rootFiles = parsedConfig.fileNames.filter((f) => !f.startsWith(packagesPrefix));
baseOptions = parsedConfig.options;
diagnosticFilter = (d) => d.file == null || !d.file.fileName.startsWith(packagesPrefix);
// With:
const packagesDir = path.join(info.cwd, "packages");
rootFiles = parsedConfig.fileNames.filter((f) => !pathIsChildPath(f, packagesDir));
baseOptions = parsedConfig.options;
diagnosticFilter = (d) => d.file == null || !pathIsChildPath(d.file.fileName, packagesDir);
```

**Step 4: Fix `startDtsWatch` (lines 358, 379) — Pattern A**

```typescript
// Line 358, replace:
const pkgSrcPrefix = path.join(info.pkgDir, "src") + path.sep;
// With:
const pkgSrcDir = path.join(info.pkgDir, "src");

// Line 379, replace:
if (diagnostic.file != null && !diagnostic.file.fileName.startsWith(pkgSrcPrefix)) {
// With:
if (diagnostic.file != null && !pathIsChildPath(diagnostic.file.fileName, pkgSrcDir)) {
```

**Step 5: Run typecheck to verify no type errors introduced**

Run: `pnpm typecheck packages/sd-cli`

**Step 6: Commit**

```bash
git add packages/sd-cli/src/workers/dts.worker.ts
git commit -m "fix(sd-cli): use pathIsChildPath/pathNorm in dts worker for cross-platform path comparison"
```

---

### Task 4: Fix copy-public.ts path comparison

**Files:**
- Modify: `packages/sd-cli/src/utils/copy-public.ts:2,80`

**Step 1: Add `pathIsChildPath` import**

At line 2, change:
```typescript
// Before
import { fsCopy, fsMkdir, fsRm, fsGlob, FsWatcher, fsExists } from "@simplysm/core-node";

// After
import { fsCopy, fsMkdir, fsRm, fsGlob, FsWatcher, fsExists, pathIsChildPath } from "@simplysm/core-node";
```

**Step 2: Fix dual-check workaround at line 80**

```typescript
// Before
if (filePath.startsWith(publicDevDir + path.sep) || filePath.startsWith(publicDevDir + "/")) {

// After
if (pathIsChildPath(filePath, publicDevDir)) {
```

**Step 3: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`

**Step 4: Commit**

```bash
git add packages/sd-cli/src/utils/copy-public.ts
git commit -m "fix(sd-cli): use pathIsChildPath in copy-public for cross-platform path comparison"
```

---

### Task 5: Fix vite-config.ts path comparison

**Files:**
- Modify: `packages/sd-cli/src/utils/vite-config.ts:11,37`

**Step 1: Add `pathNorm` import**

At line 11, change:
```typescript
// Before
import { FsWatcher } from "@simplysm/core-node";

// After
import { FsWatcher, pathNorm } from "@simplysm/core-node";
```

**Step 2: Fix equality comparison at line 37**

```typescript
// Before
if (externalDeps.some((d) => path.normalize(d) === path.normalize(changed))) {

// After
if (externalDeps.some((d) => pathNorm(d) === pathNorm(changed))) {
```

**Step 3: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`

**Step 4: Commit**

```bash
git add packages/sd-cli/src/utils/vite-config.ts
git commit -m "fix(sd-cli): use pathNorm in vite-config for consistent path normalization"
```

---

### Task 6: Full verification

**Step 1: Run all sd-cli tests**

Run: `pnpm vitest packages/sd-cli --run`
Expected: ALL PASS

**Step 2: Run typecheck for sd-cli**

Run: `pnpm typecheck packages/sd-cli`
Expected: 0 errors

**Step 3: Run lint for sd-cli**

Run: `pnpm lint packages/sd-cli`
Expected: 0 errors

**Step 4: Verify the original bug is fixed**

Run: `pnpm typecheck packages/orm-common`
Expected: Should detect the TS2345 error at `queryable.ts:431` (proving the path comparison now works).
