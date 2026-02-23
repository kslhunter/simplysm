# sd-cli check 커맨드 설계

## 개요

sd-cli에 `check` 커맨드를 추가한다. 일회성으로 typecheck + lint를 수행하고 (emit 없이) error/warning을 출력한다.

## CLI 인터페이스

```bash
sd-cli check [path] [--type <lint|typecheck>] [--config <path>] [--options <opts>]
```

### path (선택)

- **미입력** → simplysm.js에 등록된 전체 패키지 대상
- **패키지 디렉토리** (예: `packages/sd-core-common`) → 해당 패키지만
- **파일 경로** (예: `packages/sd-core-common/src/utils/FnUtils.ts`) → 파일이 속한 패키지를 찾아 check 실행 후, 해당 파일의 결과만 필터링

### --type (선택)

- **미지정** → typecheck + lint 둘 다
- **`typecheck`** → typecheck 결과(`type === "compile"`)만 출력
- **`lint`** → lint 결과(`type === "lint"`)만 출력

### 기타 옵션

- `--config` (기본: `simplysm.js`) - 프로젝트 설정 파일
- `--options` - 옵션 설정 (배열)

## 동작

1. 항상 일회성 실행 (변경감지 없음)
2. emit/dist 생성하지 않음
3. error가 있으면 `process.exit(1)`, 없으면 정상 종료

## 구현 전략

기존 `SdTsCompiler` 워커 시스템을 재활용한다.

### 실행 흐름

```
CLI: sd-cli check [path] [--type type]
  → SdCliProject.checkAsync()
    → loadProjConfAsync(cwd, dev=true, opt)
    → path 해석 → 대상 패키지 결정
    → SdProjectBuildRunner.buildAsync({ allPkgPaths, pkgPaths, projConf, noEmit: true })
      → worker.initialize({ options: { pkgPath, scopePathSet, watch: { dev: true, emitOnly: false, noEmit: true } } })
      → worker.rebuild()
      → worker.kill()
    → 결과 필터링 (--type, 파일경로)
    → 로깅
    → error 있으면 process.exit(1)
```

### --type 필터링 전략

워커는 항상 typecheck + lint 둘 다 수행한다 (noEmit 모드). 결과의 `ISdBuildMessage.type` 필드로 출력 단계에서 필터링한다. typecheck와 lint가 병렬 실행되므로 성능 손실 미미.

- `ISdBuildMessage.type === "compile"` → typecheck 결과
- `ISdBuildMessage.type === "lint"` → lint 결과

## 변경 파일

### 1. `sd-cli-entry.ts` - check 커맨드 등록

```typescript
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

### 2. `SdCliProject.ts` - checkAsync 추가

새로운 정적 메서드. `buildAsync`에서 버전 업그레이드/배포 관련 로직 없이 순수하게 check만.

- `loadProjConfAsync(cwd, dev=true, opt)` 사용
- path 해석 로직: 파일/패키지 디렉토리/전체 판별
- `SdProjectBuildRunner.buildAsync({ ..., noEmit: true })` 호출
- 결과 필터링 (`--type`, 파일 경로)
- 로깅 후 error 존재 시 `process.exit(1)`

### 3. `SdProjectBuildRunner.ts` - buildAsync에 noEmit 옵션 추가

```typescript
static async buildAsync(opt: {
    allPkgPaths: TNormPath[];
    pkgPaths: TNormPath[];
    projConf: ISdProjectConfig;
    noEmit?: boolean;  // 추가
}) {
    // ...
    await worker.run("initialize", [{
        options: {
            pkgPath,
            scopePathSet,
            ...(opt.noEmit ? { watch: { dev: true, emitOnly: false, noEmit: true } } : {}),
        },
        pkgConf,
    }]);
    // ...
}
```

### 4. `ISdTsCompilerOptions.ts` - 변경 없음

기존 `watch?` 구조를 그대로 재활용.
