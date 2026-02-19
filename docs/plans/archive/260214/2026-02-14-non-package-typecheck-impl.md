# Non-package Typecheck Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** `pnpm typecheck`이 `packages/` 외 파일(tests/ 등)도 타입체크하도록 확장

**Architecture:** `DtsBuildInfo`에서 `pkgDir`/`env`를 optional로 만들고, 없으면 tsconfig.json 옵션 그대로 사용하되 `packages/` 파일만 제외하여 타입체크. `typecheck.ts`에서 non-package 파일 존재 시 task 하나 추가.

**Tech Stack:** TypeScript Compiler API, Worker threads

---

### Task 1: dts.worker — DtsBuildInfo optional 필드 + non-package 분기

**Files:**
- Modify: `packages/sd-cli/src/workers/dts.worker.ts:28-35` (DtsBuildInfo 타입)
- Modify: `packages/sd-cli/src/workers/dts.worker.ts:180-292` (buildDts 함수)

**Step 1: DtsBuildInfo 타입 변경**

`packages/sd-cli/src/workers/dts.worker.ts:28-35`의 `DtsBuildInfo` 인터페이스를 수정:

```typescript
export interface DtsBuildInfo {
  name: string;
  cwd: string;
  /** 패키지 디렉토리. 미지정 시 non-package 모드 (packages/ 제외 전체 타입체크) */
  pkgDir?: string;
  /** 타입체크 환경. pkgDir과 함께 사용 */
  env?: TypecheckEnv;
  /** true면 .d.ts 생성 + 타입체크, false면 타입체크만 (기본값: true) */
  emit?: boolean;
}
```

**Step 2: buildDts 함수에 non-package 분기 추가**

`packages/sd-cli/src/workers/dts.worker.ts:180-292`의 `buildDts` 함수 내부, try 블록 시작 부분(line 182-187)을 분기 처리:

```typescript
async function buildDts(info: DtsBuildInfo): Promise<DtsBuildResult> {
  try {
    const parsedConfig = parseRootTsconfig(info.cwd);

    let rootFiles: string[];
    let baseOptions: ts.CompilerOptions;
    let diagnosticFilter: (d: ts.Diagnostic) => boolean;
    let tsBuildInfoFile: string;

    if (info.pkgDir != null && info.env != null) {
      // 패키지 모드 (기존 동작)
      rootFiles = getPackageSourceFiles(info.pkgDir, parsedConfig);
      baseOptions = await getCompilerOptionsForPackage(parsedConfig.options, info.env, info.pkgDir);
      const pkgSrcPrefix = path.join(info.pkgDir, "src") + path.sep;
      diagnosticFilter = (d) => d.file == null || d.file.fileName.startsWith(pkgSrcPrefix);

      const shouldEmit = info.emit !== false;
      tsBuildInfoFile = path.join(
        info.pkgDir,
        ".cache",
        shouldEmit ? "dts.tsbuildinfo" : `typecheck-${info.env}.tsbuildinfo`,
      );
    } else {
      // non-package 모드: packages/ 제외한 나머지 파일 타입체크
      const packagesPrefix = path.join(info.cwd, "packages") + path.sep;
      rootFiles = parsedConfig.fileNames.filter((f) => !f.startsWith(packagesPrefix));
      baseOptions = parsedConfig.options;
      diagnosticFilter = (d) => d.file == null || !d.file.fileName.startsWith(packagesPrefix);
      tsBuildInfoFile = path.join(info.cwd, ".cache", "typecheck-root.tsbuildinfo");
    }

    // emit 여부 결정 (기본값: true)
    const shouldEmit = info.emit !== false;

    const options: ts.CompilerOptions = {
      ...baseOptions,
      sourceMap: false,
      incremental: true,
      tsBuildInfoFile,
    };

    // 이하 기존 코드 (emit 옵션 설정 ~ return)에서
    // `pkgSrcPrefix` 사용 부분을 `diagnosticFilter`로 대체
```

즉 기존 `filteredDiagnostics` 부분(line 256-258)을 변경:

```typescript
    // 기존: const filteredDiagnostics = allDiagnostics.filter(
    //   (d) => d.file == null || d.file.fileName.startsWith(pkgSrcPrefix),
    // );
    // 변경:
    const filteredDiagnostics = allDiagnostics.filter(diagnosticFilter);
```

그리고 emit 관련 분기에서 `info.pkgDir` 사용하는 부분은 패키지 모드에서만 실행되도록 guard:

```typescript
    if (shouldEmit && info.pkgDir != null) {
      const rewritePath = createDtsPathRewriter(info.pkgDir);
      // ... 기존 writeFile 재작성 로직
    }
```

**Step 3: 테스트 실행**

Run: `pnpm vitest packages/sd-cli/tests/run-typecheck.spec.ts --project=node --run`
Expected: 기존 테스트 모두 PASS (기존 동작 깨지지 않음 확인)

**Step 4: Commit**

```
feat(sd-cli): support non-package typecheck in dts.worker
```

---

### Task 2: typecheck.ts — non-package 파일 감지 및 task 추가

**Files:**
- Modify: `packages/sd-cli/src/commands/typecheck.ts:72-96` (extractPackages 이후)
- Modify: `packages/sd-cli/src/commands/typecheck.ts:105-126` (createTypecheckTasks)

**Step 1: hasNonPackageFiles 체크 추가**

`packages/sd-cli/src/commands/typecheck.ts`의 `extractPackages` 함수 아래에 유틸리티 함수 추가:

```typescript
/**
 * tsconfig 파일 목록에서 packages/ 하위가 아닌 파일이 있는지 확인합니다.
 */
function hasNonPackageFiles(fileNames: string[], cwd: string): boolean {
  return fileNames.some((f) => {
    const relativePath = pathPosix(path.relative(cwd, f));
    return !relativePath.startsWith("packages/");
  });
}
```

**Step 2: createTypecheckTasks에 non-package task 추가**

`packages/sd-cli/src/commands/typecheck.ts:105-126`의 `createTypecheckTasks` 함수 시그니처와 본문 수정:

```typescript
function createTypecheckTasks(
  packages: Map<string, PackageInfo>,
  cwd: string,
  includeNonPackage: boolean,
): TypecheckTask[] {
  const tasks: TypecheckTask[] = [];

  // packages/* - 각 env마다 별도 task 생성
  for (const info of packages.values()) {
    for (const env of info.envs) {
      const envSuffix = info.envs.length > 1 ? ` [${env}]` : "";
      tasks.push({
        displayName: `패키지: ${info.name}${envSuffix}`,
        buildInfo: {
          name: info.name,
          cwd,
          pkgDir: info.dir,
          env,
          emit: false,
        },
      });
    }
  }

  // non-package 파일 (tests/, 루트 *.ts 등)
  if (includeNonPackage) {
    tasks.push({
      displayName: "기타",
      buildInfo: {
        name: "root",
        cwd,
        emit: false,
      },
    });
  }

  return tasks;
}
```

**Step 3: runTypecheck에서 호출부 수정**

`packages/sd-cli/src/commands/typecheck.ts:196` 부근의 `createTypecheckTasks` 호출을 수정:

```typescript
  // 기존: const tasks = createTypecheckTasks(packages, cwd);
  const nonPackage = hasNonPackageFiles(fileNames, cwd);
  const tasks = createTypecheckTasks(packages, cwd, nonPackage);
```

**Step 4: "타입체크할 패키지가 없습니다" 메시지 수정**

line 198-201의 빈 tasks 체크는 non-package task도 포함하므로 메시지 조정:

```typescript
  if (tasks.length === 0) {
    process.stdout.write("✔ 타입체크할 대상이 없습니다.\n");
    return;
  }
```

**Step 5: 테스트 실행**

Run: `pnpm vitest packages/sd-cli/tests/run-typecheck.spec.ts --project=node --run`
Expected: PASS

**Step 6: Commit**

```
feat(sd-cli): add non-package files to typecheck targets
```

---

### Task 3: 테스트 — non-package 파일 타입체크 테스트 추가

**Files:**
- Modify: `packages/sd-cli/tests/run-typecheck.spec.ts`

**Step 1: non-package 파일 포함 테스트 작성**

`packages/sd-cli/tests/run-typecheck.spec.ts`에 테스트 추가:

```typescript
  it("non-package 파일(tests/ 등)이 포함된 경우 기타 task 생성", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({ config: {} });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      options: { lib: ["ES2024", "DOM"], types: [] },
      fileNames: [
        "/project/packages/core-common/src/index.ts",
        "/project/tests/orm/some-test.ts",
      ],
      errors: [],
    } as unknown as ts.ParsedCommandLine);

    vi.mocked(fsExists).mockResolvedValue(false);
    vi.mocked(fsReadJson).mockResolvedValue({ devDependencies: {} });

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue(
      [] as unknown as ts.SortedReadonlyArray<ts.Diagnostic>,
    );

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

    await runTypecheck({ targets: [], options: [] });

    // buildDts가 2번 호출됨: 1번은 패키지, 1번은 기타(non-package)
    expect(mockBuildDts).toHaveBeenCalledTimes(2);

    // 기타 task: pkgDir/env 없이 호출
    const nonPkgCall = mockBuildDts.mock.calls.find(
      (call) => (call[0] as { name: string }).name === "root",
    );
    expect(nonPkgCall).toBeDefined();
    expect((nonPkgCall![0] as { pkgDir?: string }).pkgDir).toBeUndefined();
    expect((nonPkgCall![0] as { env?: string }).env).toBeUndefined();
  });

  it("packages/ 파일만 있으면 기타 task 생성 안 함", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({ config: {} });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      options: { lib: ["ES2024"], types: [] },
      fileNames: ["/project/packages/core-common/src/index.ts"],
      errors: [],
    } as unknown as ts.ParsedCommandLine);

    vi.mocked(fsExists).mockResolvedValue(false);
    vi.mocked(fsReadJson).mockResolvedValue({ devDependencies: {} });

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue(
      [] as unknown as ts.SortedReadonlyArray<ts.Diagnostic>,
    );

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

    await runTypecheck({ targets: [], options: [] });

    // buildDts 호출에 name="root"인 것이 없어야 함
    const nonPkgCall = mockBuildDts.mock.calls.find(
      (call) => (call[0] as { name: string }).name === "root",
    );
    expect(nonPkgCall).toBeUndefined();
  });
```

**Step 2: 테스트 실행**

Run: `pnpm vitest packages/sd-cli/tests/run-typecheck.spec.ts --project=node --run`
Expected: 전체 PASS

**Step 3: typecheck + lint 검증**

Run: `pnpm typecheck packages/sd-cli`
Run: `pnpm lint packages/sd-cli`
Expected: 에러 없음

**Step 4: Commit**

```
test(sd-cli): add non-package typecheck tests
```
