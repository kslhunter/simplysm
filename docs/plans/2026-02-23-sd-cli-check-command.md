# sd-cli check 커맨드 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** sd-cli에 일회성 typecheck + lint 커맨드(`check`)를 추가한다.

**Architecture:** 기존 `SdProjectBuildRunner.buildAsync`에 `noEmit` 옵션을 추가하여 워커 시스템을 재활용한다. `SdCliProject.checkAsync`에서 path 해석, 결과 필터링, exit code 처리를 담당한다.

**Tech Stack:** yargs (CLI), SdTsCompiler 워커 (typecheck + lint)

**Design doc:** `docs/plans/2026-02-23-sd-cli-check-command-design.md`

---

### Task 1: SdProjectBuildRunner.buildAsync에 noEmit 옵션 추가

**Files:**

- Modify: `packages/sd-cli/src/pkg-builders/SdProjectBuildRunner.ts:299-338`

**Step 1: 구현**

`buildAsync` 시그니처에 `noEmit?: boolean` 추가, worker initialize 시 전달:

```typescript
// packages/sd-cli/src/pkg-builders/SdProjectBuildRunner.ts

// AS-IS (line 299-303)
static async buildAsync(opt: {
    allPkgPaths: TNormPath[];
    pkgPaths: TNormPath[];
    projConf: ISdProjectConfig;
}) {

// TO-BE
static async buildAsync(opt: {
    allPkgPaths: TNormPath[];
    pkgPaths: TNormPath[];
    projConf: ISdProjectConfig;
    noEmit?: boolean;
}) {
```

```typescript
// AS-IS (line 323-328)
await worker.run("initialize", [
  {
    options: { pkgPath, scopePathSet },
    pkgConf,
  },
]);

// TO-BE
await worker.run("initialize", [
  {
    options: {
      pkgPath,
      scopePathSet,
      ...(opt.noEmit ? { watch: { dev: true, emitOnly: false, noEmit: true } } : {}),
    },
    pkgConf,
  },
]);
```

**Step 2: 검증**

기존 `build` 커맨드가 정상 동작하는지 확인 (noEmit 미전달 시 기존 동작 유지):

```bash
yarn run _sd-cli_ build --packages sd-core-common
```

Expected: 기존과 동일하게 빌드 완료

**Step 3: Commit**

```bash
git add packages/sd-cli/src/pkg-builders/SdProjectBuildRunner.ts
git commit -m "feat(sd-cli): add noEmit option to SdProjectBuildRunner.buildAsync"
```

---

### Task 2: SdCliProject.checkAsync 추가

**Files:**

- Modify: `packages/sd-cli/src/entry/SdCliProject.ts`

**Step 1: 구현**

`SdCliProject` 클래스에 `checkAsync` 정적 메서드 추가. `buildAsync`의 패키지 목록 구성 로직을 재사용하되, 버전 업그레이드 없이 순수 check만 수행:

```typescript
// packages/sd-cli/src/entry/SdCliProject.ts
// buildAsync 메서드 뒤에 추가 (line 123 이후)

static async checkAsync(opt: {
    config: string;
    options?: string[];
    path?: string;
    type?: "lint" | "typecheck";
}): Promise<void> {
    const logger = SdLogger.get(["simplysm", "sd-cli", "SdCliProject", "checkAsync"]);

    logger.debug("프로젝트 설정 가져오기...");
    const projConf = await loadProjConfAsync(process.cwd(), true, opt);

    logger.debug("프로젝트 package.json 가져오기...");
    const projNpmConf = (await FsUtils.readJsonAsync(
        path.resolve(process.cwd(), "package.json"),
    )) as INpmConfig;

    logger.debug("패키지 목록 구성...");
    if (!projNpmConf.workspaces) {
        throw new Error("프로젝트 package.json에 workspaces가 설정되어있지 않습니다.");
    }
    const allPkgPaths = (
        await projNpmConf.workspaces.mapManyAsync(async (item) => await FsUtils.globAsync(item))
    )
        .filter((item) => !item.includes("."))
        .map((item) => PathUtils.norm(item));

    // path 해석 → 대상 패키지 결정
    let pkgPaths = allPkgPaths.filter((pkgPath) => path.basename(pkgPath) in projConf.packages);
    let filterFilePath: string | undefined;

    if (opt.path) {
        const inputPath = PathUtils.norm(path.resolve(process.cwd(), opt.path));

        // 패키지 디렉토리인지 확인
        const matchedPkg = pkgPaths.find((pkgPath) => inputPath === pkgPath);
        if (matchedPkg) {
            pkgPaths = [matchedPkg];
        } else {
            // 파일 경로로 간주 → 해당 파일이 속한 패키지 찾기
            const containingPkg = pkgPaths.find((pkgPath) => inputPath.startsWith(pkgPath + "/"));
            if (containingPkg) {
                pkgPaths = [containingPkg];
                filterFilePath = inputPath;
            } else {
                throw new Error(`경로에 해당하는 패키지를 찾을 수 없습니다. (${opt.path})`);
            }
        }
    }

    logger.debug("체크 프로세스 시작...");
    let messages = await SdProjectBuildRunner.buildAsync({
        allPkgPaths,
        pkgPaths,
        projConf,
        noEmit: true,
    });

    // --type 필터링
    if (opt.type === "lint") {
        messages = messages.filter((m) => m.type === "lint");
    } else if (opt.type === "typecheck") {
        messages = messages.filter((m) => m.type === "compile");
    }

    // 파일 경로 필터링
    if (filterFilePath) {
        messages = messages.filter((m) => m.filePath === filterFilePath);
    }

    this._logging(messages, logger);

    if (messages.some((m) => m.severity === "error")) {
        process.exit(1);
    }
}
```

**Step 2: 검증**

Task 3 완료 후 통합 검증.

**Step 3: Commit**

```bash
git add packages/sd-cli/src/entry/SdCliProject.ts
git commit -m "feat(sd-cli): add SdCliProject.checkAsync for one-time typecheck and lint"
```

---

### Task 3: sd-cli-entry.ts에 check 커맨드 등록

**Files:**

- Modify: `packages/sd-cli/src/sd-cli-entry.ts`

**Step 1: 구현**

`build` 커맨드 뒤 (line 127 이후), `publish` 커맨드 앞에 `check` 커맨드 추가:

```typescript
// packages/sd-cli/src/sd-cli-entry.ts
// build 커맨드 뒤에 추가

.command(
    "check [path]",
    "타입체크 및 린트를 수행합니다.",
    (cmd) =>
        cmd
            .version(false)
            .hide("help")
            .hide("debug")
            .positional("path", {
                type: "string",
                describe: "패키지 경로 또는 파일 경로",
            })
            .options({
                config: {
                    type: "string",
                    describe: "설정 파일 경로",
                    default: "simplysm.js",
                },
                options: {
                    type: "string",
                    array: true,
                    describe: "옵션 설정",
                },
                type: {
                    type: "string",
                    choices: ["lint", "typecheck"] as const,
                    describe: "체크 종류 (미지정 시 둘 다)",
                },
            }),
    async (argv) => await SdCliProject.checkAsync(argv),
)
```

**Step 2: 통합 검증**

전체 패키지 check:

```bash
yarn run _sd-cli_ check
```

Expected: 모든 패키지에 대해 typecheck + lint 수행, 결과 출력 후 종료

특정 패키지 check:

```bash
yarn run _sd-cli_ check packages/sd-core-common
```

Expected: sd-core-common 패키지만 check

lint만:

```bash
yarn run _sd-cli_ check packages/sd-core-common --type lint
```

Expected: lint 결과만 출력 (`[lint]` 타입만)

typecheck만:

```bash
yarn run _sd-cli_ check packages/sd-core-common --type typecheck
```

Expected: typecheck 결과만 출력 (`[compile]` 타입만)

파일 경로:

```bash
yarn run _sd-cli_ check packages/sd-core-common/src/utils/FnUtils.ts
```

Expected: FnUtils.ts 관련 결과만 출력

**Step 3: Commit**

```bash
git add packages/sd-cli/src/sd-cli-entry.ts
git commit -m "feat(sd-cli): add check command to CLI entry"
```
