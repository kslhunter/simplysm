# @simplysm/sd-cli

워크스페이스 빌드/배포 오케스트레이터. 라이브러리 export 는 `sd.config.ts` 작성용 타입과 Vitest Angular 플러그인, 그리고 외부 도구가 재사용할 `SdTsCompiler` 다. CLI 서브커맨드는 이 문서 대상 아님 (`pnpm sd-cli --help`).

## 사용 트리거 인덱스
- **`SdConfigFn` / `SdConfig` / `SdConfigParams`** — `sd.config.ts` 의 default export 타이핑. 자세히: [sd-config.md](./sd-config.md)
- **패키지별 설정 타입 (`SdBuildPackageConfig`, `SdClientPackageConfig`, `SdServerPackageConfig`, `SdScriptsPackageConfig`)** — `SdConfig.packages` 값 타이핑. 자세히: [sd-config.md](./sd-config.md)
- **`SdPublishConfig` / `SdPostPublishScriptConfig`** — `publish`·`postPublish` 항목 타이핑. 자세히: [sd-config.md](./sd-config.md)
- **`SdCapacitorConfig` / `SdElectronConfig` / `SdPwaConfig` / `SdBrowserSupportConfig`** — 클라이언트 패키지의 모바일/데스크톱/PWA/브라우저 지원 옵션. 자세히: [sd-config.md](./sd-config.md)
- **`sdAngularPlugin(options)`** — Vitest 의 `vite.config` (또는 `vitest.config`) 에서 Angular 패키지 AOT 컴파일이 필요할 때 plugin 으로 추가.
- **`SdTsCompiler` (+ `ISdTsCompilerOptions`, `ISdTsCompilerResult`)** — 사용자 코드에서 직접 호출할 일은 거의 없음. Angular/Non-Angular TS 패키지를 증분 컴파일·진단·lint·SCSS 통합 처리하는 엔진. `sd-cli` 내부 엔진(`engines/`, `orchestrators/`) 및 `sdAngularPlugin` 에서 사용. 외부에서 동일한 엔진을 재사용해야 할 때만 직접 import.

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
