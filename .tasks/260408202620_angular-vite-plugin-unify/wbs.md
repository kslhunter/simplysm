# WBS: Angular Vite 플러그인 통합 및 API 단순화

## 프로젝트 개요

- **배경:** `sdAngularPlugin`(dev/build용)과 `angularVitestPlugin`(test용)이 별도 구현으로 존재하여, 동일한 코드가 dev에서는 정상 동작하고 test에서는 SyntaxError가 발생하는 문제가 있음. test와 dev/build가 서로 다른 빌드 파이프라인을 타는 것 자체가 근본적 문제.
- **환경:** pnpm 모노레포. sd-cli가 Vite/Vitest 빌드를 오케스트레이션. 4개 컨텍스트에서 Angular AOT 컴파일 필요: `sd-cli dev`, `sd-cli build`, `sd-cli check`(test), `vitest.config.ts`.
- **전제조건:** sd.config.ts가 프로젝트 루트에 존재 (sd-cli 사용 프로젝트의 필수 파일)
- **기술적 제약:** Angular 21, TypeScript 5.9, Vite 7, Vitest 4.1, esbuild
- **참조 자료:**
  - `packages/sd-cli/src/angular/vite-angular-plugin.ts` — 현재 sdAngularPlugin 구현 (통합 대상 기반)
  - `packages/sd-cli/src/vitest-plugin.ts` — 현재 angularVitestPlugin 구현 (제거 대상)
  - `packages/sd-cli/src/utils/vite-config.ts` — createClientViteConfig (리팩토링 대상)
  - `packages/sd-cli/src/workers/client.worker.ts` — Worker에서 Vite config 생성 (리팩토링 대상)
  - `packages/sd-cli/src/engines/ViteEngine.ts` — ViteEngine (옵션 전달 경로)
  - `packages/sd-cli/src/utils/ngtsc-build-core.ts` — NgtscEngine 핵심 빌드 로직 (SCSS 유틸 중복 대상)
  - `packages/sd-cli/src/angular/client-transform-stylesheet.ts` — client용 SCSS 변환 (공유유틸 추출 대상)
  - `packages/sd-cli/src/workers/ngtsc-build.worker.ts` — NgtscEngine worker (SCSS 역방향 탐색 중복 대상)
  - `vitest.config.ts` — 현재 angularVitestPlugin 사용처 (마이그레이션 대상)

## Impact Mapping

- **Goal:** dev/build/test 모든 컨텍스트에서 동일한 Angular 빌드 파이프라인을 사용하여, 컨텍스트별 동작 차이로 인한 버그를 0건으로 만든다
  - **Actor:** sd-cli 사용 프로젝트의 개발자
    - **Impact:** test 환경에서도 dev/build와 동일한 빌드 결과를 신뢰한다
      - **Deliverable:** 통합된 sdAngularPlugin
    - **Impact:** 플러그인 설정을 패키지명 하나로 완료한다
      - **Deliverable:** sd.config.ts 기반 자동 설정 resolve
  - **Actor:** sd-cli 라이브러리 관리자
    - **Impact:** 플러그인 코드를 한 곳에서만 유지보수한다
      - **Deliverable:** angularVitestPlugin 제거, 단일 코드베이스

## Feature Breakdown

### Epic 1. 공유 유틸리티 추출

#### [ ] Feature 1.1 SCSS 역방향 탐색 유틸리티 추출

**의존성:** 없음

**범위:**

- `findAffectedByScss()` 함수를 공유 유틸리티로 추출
  - 현재 위치 1: `packages/sd-cli/src/angular/vite-angular-plugin.ts:60-71` — sdAngularPlugin의 HMR에서 사용
  - 현재 위치 2: `packages/sd-cli/src/workers/ngtsc-build.worker.ts:268` — NgtscEngine의 watch 모드에서 동일 패턴
  - 추출 위치: `packages/sd-cli/src/utils/scss-compiler.ts` (SCSS 관련 유틸리티가 이미 있는 파일)
- SCSS 의존성 추적 타입(`Map<string, Set<string>>`)도 공유 타입으로 정의

**경계:**

- SCSS 컴파일 함수 자체(async vs sync)는 추출하지 않음 — 근본적으로 다른 실행 모델

**근거:**

- 코드 분석: `findAffectedByScss`가 vite-angular-plugin.ts와 ngtsc-build.worker.ts에서 동일 로직으로 중복
- 코드 분석: SCSS 의존성 추적 `Map<string, Set<string>>` 구조가 세 곳에서 동일하게 사용 (vite-angular-plugin.ts:112, ngtsc-build-core.ts:158, client-transform-stylesheet.ts:11의 scssDependencies)

#### [ ] Feature 1.2 소스파일 선택 유틸리티 통합

**의존성:** 없음

**범위:**

- `getPackageSourceFiles()` (`tsconfig.ts:105-113`)를 확장하여 `.fixture.ts` 파일도 포함하는 옵션 추가
  - 현재: `src/` 하위만 반환
  - 변경: `includeFixtures?: boolean` 옵션 추가 시 `.fixture.ts` 파일도 포함
- 또는 별도 함수 `getPackageSourceFilesWithFixtures()` 추가
- angularVitestPlugin의 자체 필터(`f.includes("/src/") || f.includes(".fixture.")`, vitest-plugin.ts:31-33)를 제거하고 이 유틸리티 사용

**경계:**

- `getPackageFiles()` (전체 파일 반환)는 변경하지 않음

**근거:**

- 코드 분석: angularVitestPlugin이 `getPackageSourceFiles()` 대신 자체 필터를 사용하여 동작 차이 발생
- fixture 파일은 `@Component` 데코레이터가 있는 테스트 전용 Angular 호스트 컴포넌트이므로 AOT 컴파일 필수 (`packages/angular/tests/**/*.fixture.ts` — 57개 파일)

### Epic 2. 플러그인 통합

#### [ ] Feature 2.1 sdAngularPlugin API 단순화

**의존성:** Feature 1.1, Feature 1.2

**범위:**

- `SdAngularPluginOptions`를 다음으로 축소:
  - `pkg: string` (필수) — sd.config.ts에서 패키지 설정 조회
  - `onBuildStart?: () => void` (선택) — sd-cli 오케스트레이션용 콜백
  - `onBuild?: (result) => void` (선택) — sd-cli 오케스트레이션용 콜백
- 플러그인 내부에서 sd.config.ts를 읽어 다음을 자동 resolve:
  - tsconfig 경로 (`{pkgDir}/tsconfig.json`)
  - postCssPlugins (`browserSupport.postCss.plugins`)
  - legacyModule (`browserSupport.legacyModule`)
  - replaceDeps → replaceDepDistPaths 자동 계산
- Vite config에서 다음을 자동 파생:
  - `ngDevMode` / `advancedOptimizations` ← Vite `mode` (`development` / `production`)
  - HMR 활성화 여부 ← `configureServer` 훅 호출 여부
  - sourcemap ← Vite resolved config
- 제거 대상 옵션: `dev`, `browserslist` (죽은 코드), `linkerCacheDir` (기본값 충분), `sourcemap` (Vite에서 파생), `legacyModule` (sd.config.ts에서 파생), `postCssPlugins` (sd.config.ts에서 파생), `replaceDepDistPaths` (sd.config.ts에서 파생), `enableLint` (사용처 없음, 제거)

**경계:**

- 플러그인 내부 컴파일 로직(AngularCompiler, JavaScriptTransformer 등)은 변경하지 않음
- sd.config.ts 로딩 유틸(`loadSdConfig`)의 수정은 필요시 최소한으로

**근거:**

- 사용자: "패키지명만 받아서 sd.config.ts에서 읽어야 맞는거 아닐까?"
- 사용자: "browserslist를 왜 안씀?" → 죽은 코드 확인
- 사용자: "enableLint" → 항상 false, 사용처 없음 확인
- 코드 분석: 11개 옵션 중 `onBuildStart`/`onBuild`만 런타임 콜백으로 호출자가 주입 필요

#### [ ] Feature 2.2 angularVitestPlugin을 sdAngularPlugin으로 대체

**의존성:** Feature 2.1

**범위:**

- `vitest-plugin.ts` (`angularVitestPlugin`) 제거
- `sdAngularPlugin`이 Vitest 환경에서도 정상 동작하도록 보장:
  - Vitest = Vite `mode: "development"` + dev server 없음 → `ngDevMode=true`, HMR 비활성화, `advancedOptimizations=false`
  - `JavaScriptTransformer` (Angular Linker) 적용 — 현재 angularVitestPlugin에 누락되어 있던 기능
  - node_modules 내 소스 파일도 transform 대상 — 현재 angularVitestPlugin이 스킵하던 부분 (원래 이슈의 근본 원인)
  - SCSS 비동기 컴파일 + PostCSS 적용 — 현재 angularVitestPlugin은 동기 컴파일, PostCSS 없음
- `packages/sd-cli/src/index.ts` (또는 export 지점)에서 `angularVitestPlugin` export 제거
- `vitest.config.ts` 마이그레이션: `angularVitestPlugin({ tsconfig: "..." })` → `sdAngularPlugin({ pkg: "angular" })`
- 소스파일 선택 로직: `getPackageSourceFiles()` (src/ 전용) + `.fixture.ts` 파일 포함. fixture 파일은 테스트 전용 Angular 호스트 컴포넌트(`@Component` 데코레이터 포함)이므로 AOT 컴파일 필수. client dev/build에는 fixture 파일이 없으므로 영향 없음.

**경계:**

- `angularVitestPlugin`의 테스트 파일(`vitest-plugin.spec.ts`, `vitest-plugin-cwd.spec.ts`)은 sdAngularPlugin 테스트로 마이그레이션하거나 삭제

**근거:**

- 사용자: "dev/build 랑 test랑 서로 다른 방식의 빌드를 한다는거 자체가 단 1도 이해가 안감"
- 원래 이슈: angularVitestPlugin의 `transform`이 `id.includes("node_modules")`로 스킵 → SyntaxError
- 코드 분석: angularVitestPlugin에 Linker 누락, PostCSS 누락, node_modules 스킵 — 모두 sdAngularPlugin에는 없는 문제

### Epic 3. 호출 경로 정리

#### [ ] Feature 3.1 createClientViteConfig에서 플러그인 옵션 조립 코드 제거

**의존성:** Feature 2.1

**범위:**

- `createClientViteConfig` 함수에서 sdAngularPlugin 관련 옵션 조립 코드 제거:
  - `browserslist` 정규화 로직 (line 89-95) — 플러그인이 sd.config.ts에서 직접 읽으므로 불필요
  - `replaceDepDistPaths` 계산 로직 (line 106-122) — 플러그인 내부로 이동
  - sdAngularPlugin 인스턴스 생성 시 개별 옵션 나열 (line 133-144) → `sdAngularPlugin({ pkg: pkgName, onBuildStart, onBuild })` 으로 단순화
- `CreateClientViteConfigOptions` 인터페이스에서 제거되는 옵션: `tsconfigPath` (플러그인이 직접 resolve), `browserslist` (플러그인이 sd.config.ts에서 읽음), `postCssPlugins` (동일), `legacyModule` (동일)
- `CreateClientViteConfigOptions`에 유지/변경되는 옵션:
  - `pkgName` → 플러그인에 `pkg`로 전달
  - `onBuildStart`/`onBuild` → 플러그인에 그대로 전달
  - Vite config 관련 옵션(`mode`, `serverPort`, `env`, `polyfills`, `pwa`, `exclude`, `watch`, `outDir`, `base`)은 Vite config 생성 목적으로 유지

**경계:**

- `createClientViteConfig`의 Vite config 생성 역할(server, css, esbuild target, polyfills, PWA, legacyModule 등)은 그대로 유지. 플러그인과 무관한 Vite 설정까지 리팩토링하지 않음.

**근거:**

- 사용자: 플러그인이 sd.config.ts를 직접 읽으므로 중간 조립 레이어 불필요
- 코드 분석: `vite-config.ts:133-144`에서 11개 옵션을 일일이 풀어서 전달하는 구조

#### [ ] Feature 3.2 client.worker.ts 옵션 전달 경로 정리

**의존성:** Feature 3.1

**범위:**

- `ClientBuildInfo` 인터페이스에서 플러그인이 직접 읽게 된 필드 제거: `browserSupport` (플러그인이 sd.config.ts에서 읽음), `enableLint` (제거됨)
- `startWatch()`, `startLegacyWatch()`, `build()` 함수에서 해당 필드 전달 코드 제거
- `ViteEngine`에서 `ClientBuildInfo`로 전달하는 옵션도 동일하게 정리

**경계:**

- Worker 구조(createWorker, sender, events) 자체는 변경하지 않음
- `ClientBuildInfo`의 나머지 필드(`name`, `cwd`, `pkgDir`, `framework`, `port`, `env`, `configs`, `replaceDeps`, `pwa`, `exclude`, `outDir`, `base`)는 Vite config 생성에 필요하므로 유지

**근거:**

- Feature 3.1에서 createClientViteConfig 옵션이 줄어들면, 그 상위 호출자(client.worker.ts, ViteEngine)에서도 불필요한 전달 코드가 생김
- 코드 분석: `client.worker.ts:207-226`(startWatch), `419-444`(build)에서 `browserslist`, `postCssPlugins`, `legacyModule`, `enableLint`를 일일이 풀어서 전달

## 제외 사항

- **check 명령의 typecheck 경로 (NgtscEngine)**: typecheck는 Vite 없이 동작하는 별도 경로. Vite 플러그인 통합과는 별개의 컴파일러 레벨 통합이 필요. (사유: 범위 초과)
- **AngularCompiler / NgtscProgram 컴파일러 레벨 통합**: sdAngularPlugin 내부의 AngularCompiler와 NgtscEngine의 NgtscProgram이 같은 일을 하지만, 이번 범위는 Vite 플러그인 레이어에 집중. (사유: 범위 초과)
- **`createClientViteConfig`의 Vite 설정 생성 리팩토링**: polyfills, PWA, legacyModule, server config 등 플러그인과 무관한 Vite 설정 로직은 현재 구조 유지. (사유: 플러그인 통합과 무관)
- **SCSS 컴파일 함수 통합 (async vs sync)**: client용 `createClientTransformStylesheet()`(async + PostCSS + 캐시)과 library용 `createLibraryTransformStylesheet()`(sync + side-effect 레지스트리)는 실행 모델이 근본적으로 다름. (사유: 통합 불가)
