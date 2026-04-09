# WBS: Angular 빌드 파이프라인 통합

## 프로젝트 개요

- **배경:** `sdAngularPlugin`(dev/build용)과 `angularVitestPlugin`(test용)이 별도 구현으로 존재하여, 동일한 코드가 dev에서는 정상 동작하고 test에서는 SyntaxError가 발생하는 문제가 있음. 또한 NgtscEngine(라이브러리 빌드)과 sdAngularPlugin(클라이언트 빌드)이 `AngularCompiler`를 공유하면서도 SCSS/emit/의존성추적 등 전후 파이프라인을 각자 구현하여 중복과 동작 차이가 발생.
- **환경:** pnpm 모노레포. sd-cli가 Vite/Vitest 빌드를 오케스트레이션. Angular AOT 컴파일이 필요한 4개 컨텍스트: `sd-cli dev`(client), `sd-cli build`(client), `sd-cli check`의 test(vitest), `vitest.config.ts`(직접 사용). 별도로 NgtscEngine이 Angular 라이브러리 빌드/watch를 담당.
- **전제조건:** sd.config.ts가 프로젝트 루트에 존재 (sd-cli 사용 프로젝트의 필수 파일)
- **기술적 제약:** Angular 21, TypeScript 5.9, Vite 7, Vitest 4.1, esbuild
- **참조 자료:**
  - `packages/sd-cli/src/angular/vite-angular-plugin.ts` — 현재 sdAngularPlugin 구현 (11개 옵션, client dev/build 전용)
  - `packages/sd-cli/src/vitest-plugin.ts` — 현재 angularVitestPlugin 구현 (제거 대상, NgtscProgram 직접 사용)
  - `packages/sd-cli/src/utils/angular-compiler.ts` — AngularCompiler 클래스 (양측 공유 중)
  - `packages/sd-cli/src/utils/ngtsc-build-core.ts` — NgtscEngine 핵심 빌드 로직 (SCSS/emit/의존성 추적)
  - `packages/sd-cli/src/angular/client-transform-stylesheet.ts` — client용 SCSS 변환 (async + PostCSS + 캐시)
  - `packages/sd-cli/src/workers/ngtsc-build.worker.ts` — NgtscEngine worker (SCSS 역방향 탐색, watch)
  - `packages/sd-cli/src/utils/vite-config.ts` — createClientViteConfig (플러그인 옵션 조립 + Vite config 생성)
  - `packages/sd-cli/src/workers/client.worker.ts` — Client worker (Vite dev/build 실행)
  - `packages/sd-cli/src/engines/ViteEngine.ts` — ViteEngine (옵션 전달 경로)
  - `packages/sd-cli/src/utils/tsconfig.ts:105-113` — getPackageSourceFiles (src/ 전용, fixture 미포함)
  - `vitest.config.ts` — 현재 angularVitestPlugin 사용처 (마이그레이션 대상)

## Impact Mapping

- **Goal:** dev/build/test/library 모든 컨텍스트에서 단일 Angular 빌드 파이프라인을 공유하여, 컨텍스트별 동작 차이로 인한 버그를 0건으로 만든다
  - **Actor:** sd-cli 사용 프로젝트의 개발자
    - **Impact:** test 환경에서도 dev/build와 동일한 빌드 결과를 신뢰한다
      - **Deliverable:** 통합된 Angular 빌드 파이프라인 클래스
    - **Impact:** 플러그인 설정을 패키지명 하나로 완료한다
      - **Deliverable:** sd.config.ts 기반 자동 설정 resolve
  - **Actor:** sd-cli 라이브러리 관리자
    - **Impact:** Angular 빌드 로직을 한 곳에서만 유지보수한다
      - **Deliverable:** 통합 파이프라인 + angularVitestPlugin 제거

## Feature Breakdown

### Epic 1. Angular 빌드 파이프라인 통합 클래스

#### [x] Feature 1.1 AngularBuildPipeline 클래스 생성

**의존성:** 없음

**범위:**

- `AngularBuildPipeline` 클래스를 `packages/sd-cli/src/utils/` 에 생성
- 현재 sdAngularPlugin과 ngtsc-build-core/ngtsc-build.worker에 분산된 공통 파이프라인을 통합:
  - SCSS 변환 콜백 생성 (모드에 따라 async/sync, PostCSS 유무, 캐시 유무 선택)
    - client 모드: `createClientTransformStylesheet()` (async + PostCSS + 디스크캐시)
    - library 모드: `createLibraryTransformStylesheet()` (sync, PostCSS 없음)
  - `AngularCompiler` 생성 + 초기화 (`initialize()`)
  - emit 결과 처리 (모드에 따라 메모리 캐시 vs 디스크 쓰기)
    - client/test 모드: 메모리 Map에 저장 (Vite transform 훅에서 사용)
    - library 모드: `writeEmitResults()` (디스크 쓰기 + output-path-rewriting + side-effect SCSS)
  - SCSS 의존성 추적 (`Map<string, Set<string>>`) 내장
  - SCSS 역방향 탐색 (`findAffectedByScss()`) 메서드 제공
  - 진단(diagnostics) 수집 + 포맷팅
  - 증분 업데이트 (`update()`) 지원 (watch/HMR에서 사용)
- 소스파일 선택: `getPackageSourceFiles()` 확장 — `includeFixtures` 옵션 추가 시 `.fixture.ts` 파일도 포함
  - 현재 `getPackageSourceFiles()` (`tsconfig.ts:105-113`)는 `src/` 하위만 반환
  - fixture 파일은 테스트 전용 Angular 호스트 컴포넌트(`@Component` 데코레이터 포함, `packages/angular/tests/**/*.fixture.ts` — 57개 파일)이므로 AOT 컴파일 필수
  - client dev/build에는 fixture 파일이 없으므로 영향 없음

**경계:**

- watch/HMR 전략(Vite 네이티브 vs FsWatcher)은 이 클래스에 포함하지 않음 — 호출자가 `update()`를 직접 호출
- `JavaScriptTransformer` (Angular Linker)는 이 클래스에 포함하지 않음 — Vite 플러그인 고유 기능
- 라이브러리 빌드의 global SCSS (`scss/styles.scss` → `dist/styles.css`) 컴파일은 이 클래스에 포함하지 않음 — NgtscEngine worker 고유 기능

**근거:**

- 사용자: "하나 딱 만들어놓고 서로 환경에 맞춰 쓰도록하면 앞으로 유지보수 적으로도 훨씬 나을거같은데"
- 코드 분석: `findAffectedByScss`가 vite-angular-plugin.ts:60-71과 ngtsc-build.worker.ts:268에서 동일 로직 중복
- 코드 분석: SCSS 의존성 추적 `Map<string, Set<string>>`이 세 곳에서 동일 구조 사용 (vite-angular-plugin.ts:112, ngtsc-build-core.ts:116-129, client-transform-stylesheet.ts:11)
- 코드 분석: `angularVitestPlugin`이 `getPackageSourceFiles()` 대신 자체 필터(`/src/` || `.fixture.`)를 사용하여 동작 차이 발생 (vitest-plugin.ts:31-33)

#### [x] Feature 1.2 sdAngularPlugin에서 AngularBuildPipeline 사용

**의존성:** Feature 1.1

**범위:**

- `vite-angular-plugin.ts`의 `buildStart()`에서 직접 수행하던 파이프라인을 `AngularBuildPipeline` 호출로 교체:
  - SCSS 콜백 생성 (`createClientTransformStylesheet`) → Pipeline이 처리
  - `AngularCompiler` 생성/초기화 → Pipeline이 처리
  - emit → Pipeline의 메모리 캐시에서 가져옴
  - 진단 수집 → Pipeline이 처리
  - SCSS 의존성 추적/역방향 탐색 → Pipeline이 처리
- `handleHotUpdate()`에서 `AngularBuildPipeline.update()` + `emitAffectedFiles()` 호출
- `findAffectedByScss()` 함수를 vite-angular-plugin.ts에서 제거 (Pipeline 메서드로 대체)
- `scssDependencies` Map을 vite-angular-plugin.ts에서 제거 (Pipeline 내장)

**경계:**

- `JavaScriptTransformer`, `configureServer`, `config()` 등 Vite 플러그인 고유 로직은 그대로 유지
- `transform()` 훅 로직은 그대로 유지 (Pipeline의 메모리 캐시에서 읽는 방식만 변경)

**근거:**

- Feature 1.1에서 만든 Pipeline을 실제 사용처에 적용하는 단계
- 코드 분석: vite-angular-plugin.ts:214-316의 buildStart 로직이 Pipeline으로 대체 가능

#### [x] Feature 1.3 NgtscEngine worker에서 AngularBuildPipeline 사용

**의존성:** Feature 1.1

**범위:**

- `ngtsc-build.worker.ts`의 빌드 로직을 `AngularBuildPipeline` 호출로 교체:
  - SCSS 콜백 생성 (`createLibraryTransformStylesheet`) → Pipeline이 처리
  - `AngularCompiler` 생성/초기화 → Pipeline이 처리
  - emit + 디스크 쓰기 → Pipeline의 `writeEmitResults()` 모드
  - SCSS 의존성 추적/역방향 탐색 → Pipeline이 처리
- watch 모드에서의 SCSS 역방향 탐색을 Pipeline 메서드로 대체
- Pipeline에 `collectRawDiagnostics()` 메서드 추가 — `NgtscBuildResult.build.diagnostics: SerializedDiagnostic[]` 직렬화 지원
- `ngtsc-build-core.ts`에서 Pipeline 모듈로 함수 이동:
  - `createLibraryTransformStylesheet()` → angular-build-pipeline.ts
  - `writeEmitResults()` → angular-build-pipeline.ts
- `ngtsc-build-core.ts`에서 `trackDeps()`, `formatScssError()` export (Pipeline과 `compileSideEffectScss` 양쪽 공유)
- `runNgtscBuild()` 제거 (Pipeline으로 대체, 호출처 소멸)

**경계:**

- global SCSS 컴파일 (`compileGlobalScss`), side-effect SCSS 레지스트리, FsWatcher 로직은 worker에 유지
- `buildCompilerOptions()`, `buildScssLoadPaths()` — ngtsc-build-core.ts에 유지 (Pipeline은 계산된 값을 입력받음)
- `SideEffectScssEntry`, `SideEffectScssOptions` 타입 — ngtsc-build-core.ts에 유지 (의존 방향 유지)
- `NgtscBuildInfo`, `NgtscBuildResult`, `NgtscCombinedBuildEvent` 타입 — 변경 없음

**근거:**

- Feature 1.1에서 만든 Pipeline을 NgtscEngine 쪽에도 적용하여 중복 제거 완성
- 코드 분석: ngtsc-build.worker.ts와 ngtsc-build-core.ts의 빌드 파이프라인이 sdAngularPlugin과 동일 패턴

### Epic 2. Vite 플러그인 통합

#### [x] Feature 2.1 sdAngularPlugin API 단순화

**의존성:** Feature 1.2
**Feature 문서:** [2.1-sd-angular-plugin-api-simplify.md](./2.1-sd-angular-plugin-api-simplify.md)

**범위:**

- `SdAngularPluginOptions`를 다음으로 축소:
  - `pkg: string` (필수) — sd.config.ts에서 패키지 설정 조회
  - `onBuildStart?: () => void` (선택) — sd-cli 오케스트레이션용 콜백
  - `onBuild?: (result) => void` (선택) — sd-cli 오케스트레이션용 콜백
- 플러그인 내부에서 sd.config.ts를 읽어 다음을 자동 resolve:
  - tsconfig 경로 (`{pkgDir}/tsconfig.json`)
  - postCssPlugins (`browserSupport.postCss.plugins`)
  - legacyModule (`browserSupport.legacyModule`)
  - replaceDeps → replaceDepDistPaths 자동 계산 (플러그인이 glob 해석 + node_modules 탐색)
- Vite config에서 다음을 자동 파생:
  - `ngDevMode` / `advancedOptimizations` ← Vite `mode` (`development` / `production`)
  - HMR 활성화 여부 ← `configureServer` 훅 호출 여부
  - sourcemap ← Vite resolved config
- 제거 대상 옵션 (11개 → 3개):
  - `dev` → Vite mode에서 파생
  - `browserslist` → 죽은 코드 (플러그인 내부에서 사용하지 않음)
  - `linkerCacheDir` → 기본값 충분
  - `sourcemap` → Vite config에서 파생
  - `legacyModule` → sd.config.ts에서 파생
  - `postCssPlugins` → sd.config.ts에서 파생
  - `replaceDepDistPaths` → sd.config.ts에서 파생
  - `enableLint` → 모든 경로에서 항상 false, 사용처 없음
- enableLint 제거 시 플러그인 내부 lint 코드(LintWithProgramRunner) 전체 제거, onBuild.lint 필드는 유지 (Feature 3에서 정리)

**경계:**

- sd.config.ts 로딩 유틸(`loadSdConfig`)의 수정은 필요시 최소한으로
- `createClientViteConfig` 옵션 정리는 Feature 3.1 범위 (단, sdAngularPlugin 호출 부분만 새 API로 변경)
- `onBuild` 콜백 시그니처의 `lint?` 필드 제거는 Feature 3 범위

**근거:**

- 사용자: "패키지명만 받아서 sd.config.ts에서 읽어야 맞는거 아닐까?"
- 사용자: "browserslist를 왜 안씀?" → 죽은 코드 확인 (vite-angular-plugin.ts:46-47에 선언만 있고 내부 참조 없음)
- 사용자: "enableLint" → ViteEngine에서 항상 `output.lint = false`로 전달 (BuildOrchestrator:315, DevWatchOrchestrator:386)
- 코드 분석: 11개 옵션 중 `onBuildStart`/`onBuild`만 런타임 콜백으로 호출자가 주입 필요

#### [x] Feature 2.2 angularVitestPlugin을 sdAngularPlugin으로 대체

**의존성:** Feature 2.1
**Feature 문서:** [2.2-angular-vitest-plugin-replace.md](./2.2-angular-vitest-plugin-replace.md)

**범위:**

- `vitest-plugin.ts` (`angularVitestPlugin`) 제거
- `sdAngularPlugin`이 Vitest 환경에서도 정상 동작하도록 보장:
  - Vitest = Vite `mode: "development"` + dev server 없음 → `ngDevMode=true`, HMR 비활성화, `advancedOptimizations=false`
  - `JavaScriptTransformer` (Angular Linker) 적용 — 현재 angularVitestPlugin에 누락되어 있던 기능
  - node_modules 내 소스 파일도 transform 대상 — 현재 angularVitestPlugin이 `id.includes("node_modules")`로 스킵하던 부분 (원래 이슈의 근본 원인, vitest-plugin.ts:110)
  - SCSS 비동기 컴파일 + PostCSS 적용 — 현재 angularVitestPlugin은 동기 컴파일, PostCSS 없음
- `packages/sd-cli/src/index.ts` (또는 export 지점)에서 `angularVitestPlugin` export 제거
- `vitest.config.ts` 마이그레이션: `angularVitestPlugin({ tsconfig: "..." })` → `sdAngularPlugin({ pkg: "angular" })`
- Angular 라이브러리 테스트 지원: `AngularBuildPipeline`의 `includeFixtures` 옵션으로 `.fixture.ts` 파일도 AOT 컴파일 대상에 포함

**경계:**

- `angularVitestPlugin`의 테스트 파일(`vitest-plugin.spec.ts`, `vitest-plugin-cwd.spec.ts`)은 sdAngularPlugin 테스트로 마이그레이션하거나 삭제

**근거:**

- 사용자: "dev/build 랑 test랑 서로 다른 방식의 빌드를 한다는거 자체가 단 1도 이해가 안감"
- 원래 이슈: angularVitestPlugin의 `transform`이 `id.includes("node_modules")`로 스킵 → SyntaxError
- 코드 분석: angularVitestPlugin에 Linker 누락, PostCSS 누락, node_modules 스킵 — 모두 sdAngularPlugin에는 없는 문제

### Epic 3. 호출 경로 정리

#### [x] Feature 3.1 createClientViteConfig에서 플러그인 옵션 조립 코드 제거

**의존성:** Feature 2.1
**Feature 문서:** [3.1-create-client-vite-config-cleanup.md](./3.1-create-client-vite-config-cleanup.md)

**범위:**

- `createClientViteConfig` 함수 (`vite-config.ts`)에서 sdAngularPlugin 관련 옵션 조립 코드 제거:
  - `browserslist` 정규화 로직 — 함수 내부에서 sd.config.ts를 로딩하여 자체 resolve
  - `replaceDepDistPaths` 계산 로직 — dead code 제거 (sdAngularPlugin 내부 이동 완료, 결과 미사용)
  - sdAngularPlugin 인스턴스 생성 — Feature 2.1에서 이미 `{ pkg, onBuildStart, onBuild }` 단순화 완료
- `CreateClientViteConfigOptions` 인터페이스에서 제거되는 옵션: `tsconfigPath`, `browserslist`, `postCssPlugins`, `legacyModule`, `enableLint`
  - `enableLint`도 추가 제거 (함수 body에서 미참조, dead code)
- `CreateClientViteConfigOptions`에 유지/변경되는 옵션:
  - `pkgName` → 플러그인에 `pkg`로 전달 + sd.config.ts 패키지 조회 키
  - `onBuildStart`/`onBuild` → 플러그인에 그대로 전달
  - Vite config 관련 옵션(`mode`, `serverPort`, `env`, `polyfills`, `pwa`, `exclude`, `watch`, `outDir`, `base`, `replaceDeps`, `onScopeRebuild`, `framework`)은 Vite config 생성 목적으로 유지
- `createClientViteConfig` 내부에서 `loadSdConfig()` 호출하여 `browserSupport`(browserslist, postCssPlugins, legacyModule) 자체 resolve
- `tsconfigPath`는 `pkgDir/tsconfig.json`으로 자동 derive
- `client.worker.ts`의 `createClientViteConfig` 호출부에서 제거된 옵션 삭제 + `resolvePackageInfo()` 정리

**경계:**

- `createClientViteConfig`의 Vite config 생성 역할(server, css, esbuild target, polyfills, PWA, legacyModule 등)은 그대로 유지 — 입력 소스만 변경(옵션 → sd.config.ts)
- `ClientBuildInfo`에서 `browserSupport`/`enableLint` 제거는 Feature 3.2
- `onBuild.lint?` 필드 제거는 Feature 3.2 (타입 연쇄: ClientBuildResult → ViteEngine)

**근거:**

- 사용자: 플러그인이 sd.config.ts를 직접 읽으므로 중간 조립 레이어 불필요
- 코드 분석: Feature 2.1 완료 후 `replaceDepDistPaths` 계산은 dead code (결과 미사용)
- 코드 분석: `enableLint`는 `CreateClientViteConfigOptions`에 선언만 있고 함수 body에서 미참조
- 설계 결정 D1: `createClientViteConfig`가 `loadSdConfig()` 직접 호출 (framework "solid" 호환, jiti 캐싱)

#### [x] Feature 3.2 client.worker.ts 옵션 전달 경로 정리

**의존성:** Feature 3.1
**Feature 문서:** [3.2-client-worker-option-cleanup.md](./3.2-client-worker-option-cleanup.md)

**범위:**

- `ClientBuildInfo` 인터페이스 (`client.worker.ts`)에서 플러그인이 직접 읽게 된 필드 제거: `browserSupport`, `enableLint`
- `startWatch()`, `startLegacyWatch()`, `build()` 함수에서 해당 필드 전달 코드 제거
- `ViteEngine`에서 `ClientBuildInfo`로 전달하는 옵션도 동일하게 정리
- `startWatch()`의 `legacyModule` 분기를 worker 내부 `loadSdConfig()` 호출로 대체 (설계 결정 D1)
- `onBuild` 콜백 시그니처에서 `lint?` 필드 제거 (Feature 3.1에서 이관됨, 설계 결정 D2)
- `ClientBuildResult.lint?` 필드 제거 + ViteEngine lint 이벤트 처리 제거 (dead code)

**경계:**

- Worker 구조(createWorker, sender, events) 자체는 변경하지 않음
- `ClientBuildInfo`의 나머지 필드(`name`, `cwd`, `pkgDir`, `framework`, `port`, `env`, `configs`, `replaceDeps`, `pwa`, `exclude`, `outDir`, `base`)는 Vite config 생성에 필요하므로 유지
- `EngineResult.lint?`는 다른 엔진이 실제 사용하므로 유지

**근거:**

- Feature 3.1에서 createClientViteConfig 옵션이 줄어들면, 그 상위 호출자(client.worker.ts, ViteEngine)에서도 불필요한 전달 코드가 생김
- Feature 3.1 비목표에서 `onBuild.lint?` 제거를 Feature 3.2로 이관
- 코드 분석: `vite-angular-plugin.ts`의 3개 `onBuild` 호출 모두 lint 미전달 → dead 타입

## 제외 사항

- **check 명령의 typecheck 경로**: typecheck는 Vite 없이 동작하는 별도 경로(NgtscEngine). AngularBuildPipeline을 Feature 1.3에서 적용하므로 컴파일 로직은 공유하지만, typecheck 커맨드 자체의 흐름은 변경하지 않음. (사유: 범위 한정)
- **`createClientViteConfig`의 Vite 설정 생성 리팩토링**: polyfills, PWA, legacyModule, server config 등 플러그인과 무관한 Vite 설정 로직은 현재 구조 유지. (사유: 플러그인 통합과 무관)
- **SCSS 컴파일 함수 통합 (async vs sync)**: client용 async 컴파일과 library용 sync 컴파일은 실행 모델이 근본적으로 다르므로 각각 유지. Pipeline이 모드에 따라 적절한 것을 선택. (사유: 통합 불가)
- **global SCSS / side-effect SCSS 로직 이동**: 라이브러리 빌드 고유 기능(`compileGlobalScss`, `compileSideEffectScss`)은 ngtsc-build worker에 유지. (사유: 라이브러리 빌드 전용)
