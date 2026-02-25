# Typecheck Tests Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Make `pnpm typecheck` include package test files (`packages/*/tests/`) in type checking, while never emitting `.d.ts` files for them.

**Architecture:** Add a `getPackageFiles()` utility that returns all files (src + tests) for a package. In `buildDts()`, when `emit=false` (typecheck-only mode), use this broader file set and wider diagnostic filter. When `emit=true` (dts generation), keep existing `src/`-only behavior unchanged.

**Tech Stack:** TypeScript Compiler API, Vitest

---

### Task 1: Add `getPackageFiles` utility

**Files:**
- Modify: `packages/sd-cli/src/utils/tsconfig.ts:109-116`
- Test: `packages/sd-cli/tests/get-package-source-files.spec.ts`

**Step 1: Write failing tests for `getPackageFiles`**

Add to the existing test file:

```typescript
import { getPackageSourceFiles, getPackageFiles } from "../src/utils/tsconfig";

describe("getPackageFiles", () => {
  it("패키지 디렉토리 내 모든 파일 필터링 (src + tests)", () => {
    const pkgDir = `/project/packages/core-common`;
    const parsedConfig = {
      fileNames: [
        `/project/packages/core-common/src/index.ts`,
        `/project/packages/core-common/src/utils/string.ts`,
        `/project/packages/core-common/tests/utils.spec.ts`,
        `/project/packages/core-common/tests/setup/helpers.ts`,
        `/project/packages/core-node/src/index.ts`,
        `/project/packages/core-node/tests/fs.spec.ts`,
      ],
    } as ts.ParsedCommandLine;

    const result = getPackageFiles(pkgDir, parsedConfig);

    expect(result).toEqual([
      `/project/packages/core-common/src/index.ts`,
      `/project/packages/core-common/src/utils/string.ts`,
      `/project/packages/core-common/tests/utils.spec.ts`,
      `/project/packages/core-common/tests/setup/helpers.ts`,
    ]);
  });

  it("유사한 이름의 다른 패키지 파일 제외 (core vs core-common)", () => {
    const pkgDir = `/project/packages/core`;
    const parsedConfig = {
      fileNames: [
        `/project/packages/core/src/index.ts`,
        `/project/packages/core/tests/utils.spec.ts`,
        `/project/packages/core-common/src/index.ts`,
        `/project/packages/core-common/tests/utils.spec.ts`,
      ],
    } as ts.ParsedCommandLine;

    const result = getPackageFiles(pkgDir, parsedConfig);

    expect(result).toEqual([
      `/project/packages/core/src/index.ts`,
      `/project/packages/core/tests/utils.spec.ts`,
    ]);
  });

  it("파일이 없으면 빈 배열 반환", () => {
    const pkgDir = `/project/packages/empty`;
    const parsedConfig = {
      fileNames: [
        `/project/packages/core/src/index.ts`,
      ],
    } as ts.ParsedCommandLine;

    const result = getPackageFiles(pkgDir, parsedConfig);

    expect(result).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/sd-cli/tests/get-package-source-files.spec.ts --run --project=node`
Expected: FAIL - `getPackageFiles` is not exported

**Step 3: Implement `getPackageFiles`**

Add after the existing `getPackageSourceFiles` function in `packages/sd-cli/src/utils/tsconfig.ts`:

```typescript
/**
 * 패키지의 전체 파일 목록 가져오기 (src + tests 포함)
 */
export function getPackageFiles(
  pkgDir: string,
  parsedConfig: ts.ParsedCommandLine,
): string[] {
  const pkgPrefix = pkgDir + path.sep;
  return parsedConfig.fileNames.filter((f) => f.startsWith(pkgPrefix));
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/sd-cli/tests/get-package-source-files.spec.ts --run --project=node`
Expected: PASS

**Step 5: Commit**

```
feat(sd-cli): add getPackageFiles utility for full package file listing
```

---

### Task 2: Use `getPackageFiles` in `buildDts` typecheck mode

**Files:**
- Modify: `packages/sd-cli/src/workers/dts.worker.ts:5-10,195-207`

**Step 1: Update import**

In `dts.worker.ts`, add `getPackageFiles` to the import:

```typescript
import {
  getCompilerOptionsForPackage,
  getPackageFiles,
  getPackageSourceFiles,
  parseRootTsconfig,
  type TypecheckEnv,
} from "../utils/tsconfig";
```

**Step 2: Modify the package mode section in `buildDts`**

Replace lines 195-207 (the `if (info.pkgDir != null && info.env != null)` block):

```typescript
    if (info.pkgDir != null && info.env != null) {
      // 패키지 모드
      baseOptions = await getCompilerOptionsForPackage(parsedConfig.options, info.env, info.pkgDir);

      const shouldEmit = info.emit !== false;
      if (shouldEmit) {
        // emit 모드: src만 대상 (d.ts 생성)
        rootFiles = getPackageSourceFiles(info.pkgDir, parsedConfig);
        const pkgSrcPrefix = path.join(info.pkgDir, "src") + path.sep;
        diagnosticFilter = (d) => d.file == null || d.file.fileName.startsWith(pkgSrcPrefix);
      } else {
        // 타입체크 모드: 패키지 전체 파일 대상 (src + tests)
        rootFiles = getPackageFiles(info.pkgDir, parsedConfig);
        const pkgPrefix = info.pkgDir + path.sep;
        diagnosticFilter = (d) => d.file == null || d.file.fileName.startsWith(pkgPrefix);
      }

      tsBuildInfoFile = path.join(
        info.pkgDir,
        ".cache",
        shouldEmit ? "dts.tsbuildinfo" : `typecheck-${info.env}.tsbuildinfo`,
      );
    }
```

**Step 3: Run typecheck to verify**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS (no regressions in sd-cli itself)

**Step 4: Commit**

```
feat(sd-cli): include test files in typecheck mode
```

---

### Task 3: Update existing tests

**Files:**
- Modify: `packages/sd-cli/tests/run-typecheck.spec.ts`

**Step 1: Update the `targets` filter test to include test files**

The existing test at line 169 (`targets 옵션으로 파일 필터링`) only has `src/` files in `fileNames`. Add test files to verify they're picked up correctly:

```typescript
  it("targets 옵션으로 파일 필터링 (tests 포함)", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({
      config: {},
    });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      options: { lib: ["ES2024"], types: [] },
      fileNames: [
        "/project/packages/core-common/src/index.ts",
        "/project/packages/core-common/tests/utils.spec.ts",
        "/project/packages/core-node/src/index.ts",
        "/project/packages/cli/src/index.ts",
      ],
      errors: [],
    } as unknown as ts.ParsedCommandLine);

    vi.mocked(fsExists).mockResolvedValue(false);
    vi.mocked(fsReadJson).mockResolvedValue({ devDependencies: {} });

    const { Worker } = await import("@simplysm/core-node");
    const mockBuildDts = vi.fn(() =>
      Promise.resolve({
        success: true,
        diagnostics: [],
        errorCount: 0,
        warningCount: 0,
      }),
    );
    vi.mocked(Worker.create).mockReturnValue({
      buildDts: mockBuildDts,
      terminate: vi.fn(() => Promise.resolve()),
    } as unknown as ReturnType<typeof Worker.create>);

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue(
      [] as unknown as ts.SortedReadonlyArray<ts.Diagnostic>,
    );

    await runTypecheck({
      targets: ["packages/core-common"],
      options: [],
    });

    // core-common 패키지만 buildDts 호출
    expect(mockBuildDts).toHaveBeenCalledTimes(2); // neutral: node + browser
    const calls = mockBuildDts.mock.calls;
    for (const call of calls) {
      expect((call[0] as { name: string }).name).toBe("core-common");
    }
  });
```

**Step 2: Run tests**

Run: `pnpm vitest packages/sd-cli/tests/run-typecheck.spec.ts --run --project=node`
Expected: PASS

**Step 3: Commit**

```
test(sd-cli): add test for typecheck with test file inclusion
```

---

### Task 4: Verify with real typecheck

**Step 1: Run full typecheck**

Run: `pnpm typecheck`
Expected: PASS (or only pre-existing type errors in test files appear)

**Step 2: Verify test files are checked by targeting a specific package**

Run: `pnpm typecheck packages/orm-common`
Expected: If test files have type errors (e.g., implicit any), they now appear.

**Step 3: Verify .d.ts files are NOT generated**

Run: `ls packages/orm-common/dist/` (should have no newly generated `.d.ts` from tests)

**Step 4: Commit (if any fix needed)**

```
fix(sd-cli): fix type errors in test files discovered by expanded typecheck
```
