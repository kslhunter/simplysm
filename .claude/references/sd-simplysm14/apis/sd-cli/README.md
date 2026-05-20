# @simplysm/sd-cli

워크스페이스 빌드/배포 오케스트레이터. 소비 표면은 두 갈래다 — `pnpm sd-cli <cmd>` 서브커맨드와 `sd.config.ts` 작성용 타입. 라이브러리 export 로는 Vitest Angular 플러그인과 외부 도구가 재사용할 `SdTsCompiler` 도 노출한다.

## 사용 트리거 인덱스

### 서브커맨드 (`pnpm sd-cli <cmd>`)

- **`check`** — 타입체크와 lint 를 병렬 실행. 일반 검증 명령으로 가장 자주 호출됨.
- **`watch`** — 워크스페이스 전체 또는 일부 패키지를 watch 모드로 증분 빌드.
- **`dev`** — server 패키지를 dev 모드로 실행 (`tsx` 핫리로드 + client 패키지의 dev http 서버 동반 기동).
- **`device`** — client 패키지를 안드로이드 디바이스 또는 Electron 데스크톱에서 실행. dev 서버가 떠 있어야 함.
- **`build`** — 프로덕션 빌드. `sd.config.ts` 의 `packages` 전 항목 또는 `-t` 지정 항목.
- **`publish`** — 빌드 후 `publish` 설정을 따라 배포 (npm / 로컬 디렉토리 / FTP·SFTP). `--no-build` 로 기존 산출물만 배포.
- **`replace-deps`** — `sd.config.ts.replaceDeps` 에 따라 `node_modules` 패키지를 로컬 소스로 심링크 교체.
- **`init`** — 인터랙티브 프롬프트로 SI 워크스페이스 골격 생성.

공통 옵션:
- `-t / --target <pkg>` (반복 가능) — 대상 패키지. `sd.config.ts.packages` 키 (= `@simplysm/` 접두사 **제외**한 짧은 이름). 미지정 시 전체.
- `-o / --opt <val>` (반복 가능) — `sd.config.ts` 함수의 `params.opt[]` 로 전달. `check` 와 `init` 제외 전 커맨드에서 지원.
- `--debug` — 디버그 로그 출력 (모든 커맨드).
- `--help / -h` — 단독 호출 시 모든 서브커맨드 종합 도움말.

커맨드별 고유 옵션:
- `check`: `--type typecheck|lint` (반복 가능, 기본 둘 다), `--fix` (lint 자동 수정).
- `device`: `--target <pkg>` (단수, 미지정 시 유일 client 자동 선택), `--url <devServerUrl>` (미지정 시 `sd.config.ts` 의 server 설정에서 자동 도출).
- `publish`: `--no-build` (빌드 생략), `--dry-run` (실제 배포 없이 시뮬레이션).

진실 근거: `packages/sd-cli/src/sd-cli-entry.ts` (yargs 등록부), `packages/sd-cli/src/commands/<cmd>.ts`.

### 설정 타입 (`sd.config.ts`)

- **`SdConfigFn` / `SdConfig` / `SdConfigParams`** — `sd.config.ts` 의 default export 함수와 그 반환 타입. 자세히: [sd-config.md](./sd-config.md)
- **`SdBuildPackageConfig` / `SdClientPackageConfig` / `SdServerPackageConfig` / `SdScriptsPackageConfig`** — `SdConfig.packages` 의 값 타입. 각각 라이브러리 / Frontend 앱 / Fastify 서버 / 유틸 패키지에 대응. 자세히: [sd-config.md](./sd-config.md)
- **`SdPublishConfig` / `SdPostPublishScriptConfig`** — 패키지의 `publish` 와 전역 `postPublish` 항목 타입. 자세히: [sd-config.md](./sd-config.md)
- **`SdCapacitorConfig` / `SdElectronConfig` / `SdPwaConfig` / `SdBrowserSupportConfig`** — client 패키지의 모바일·데스크톱·PWA·브라우저 지원 옵션. 자세히: [sd-config.md](./sd-config.md)

### 라이브러리 export

- **`sdAngularPlugin(options)`** — Vitest 의 `vite.config` / `vitest.config` 에서 Angular 패키지 AOT 컴파일이 필요할 때 plugin 으로 추가.
- **`SdTsCompiler` (+ `ISdTsCompilerOptions`, `ISdTsCompilerResult`)** — Angular/Non-Angular TS 패키지를 증분 컴파일·진단·lint·SCSS 통합 처리하는 엔진. `sd-cli` 내부와 `sdAngularPlugin` 이 사용. 외부에서 동일한 엔진을 재사용할 때만 직접 import.

## sdAngularPlugin

```typescript
import { sdAngularPlugin, type SdAngularPluginOptions } from "@simplysm/sd-cli";

// vitest.config.ts
plugins: [sdAngularPlugin({ pkg: "angular" })]
```

`pkg` 는 `sd.config.ts.packages` 키 (= `packages/<pkg>/` 디렉토리명). 패키지의 `.ts` 를 AOT 컴파일해 `transform` 훅에서 JS 로 치환한다. `tsconfig.json` 의 `angularCompilerOptions` 유무로 Angular 모드를 자동 감지. Vitest watch 의 `watchChange` 를 받아 증분 재컴파일. 첫 `buildStart` 전에 `config()` 호출 필수 (Vitest 가 자동 호출).

## SdTsCompiler

```typescript
import { SdTsCompiler } from "@simplysm/sd-cli";

const compiler = new SdTsCompiler({
  pkgDir: "/abs/path/to/packages/foo",
  cwd: "/abs/path/to/workspace",
  output: { js: true, dts: false },  // 출력 제어 — 둘 다 false 면 typecheck only
  includeTests: false,                // true 면 tests/ 도 rootNames 에 포함
  lint: false,
  globalScss: false,
});
const result = await compiler.compileAsync(/* modifiedFiles? */);
// result.diagnostics, result.errorCount, result.emitResults (Angular), ...
```

특징:
- 인스턴스를 재사용해 호출 간 incremental 빌드 (`tsBuildInfoFile` 은 `<pkgDir>/.cache/` 하위).
- `compileAsync(modifiedFiles)` 의 modifiedFiles 는 watch 모드의 변경 파일. 미전달 시 전체 affected 탐색.
- Angular 패키지(`tsconfig.angularCompilerOptions`)는 자동으로 NgtscProgram 사용. 결과의 `emitResults: { filename, contents, sourceFileName }[]` 를 호출자가 디스크/번들러에 전달. Non-Angular 은 `host.writeFile` 로 디스크에 직접 emit (결과의 `emitResults` undefined).
- `compilerOptionsTransformer` 로 target/module/outDir 등을 후처리 override 가능.
- `transformStylesheet`, `externalStylesheets`, `sourceFileCache` 는 Angular 클라이언트 빌드 통합용 (esbuild 플러그인이 사용).
- 단계별 try/catch 로 부분 복구 — 한 단계 실패해도 다른 진단/emit 결과는 유지.
- 결과의 `affectedFiles` 가 `undefined` 면 전역 변경 (전체 리빌드 신호).

전체 옵션·결과 필드 정의는 `packages/sd-cli/src/ts-compiler/sd-ts-compiler-options.ts`, `sd-ts-compiler-result.ts` 참조.
