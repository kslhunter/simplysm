# WBS: sd-cli library 빌드에 Solid 프레임워크 지원 추가

## 프로젝트 개요

- **배경:** sd-cli v14에서 client 빌드는 `framework: "solid"` 선택이 가능하지만, library 빌드(`target: "node" | "browser" | "neutral"`)에서는 Solid JSX를 처리할 수 없다. v14의 library 빌드는 tsc 기반이라 Solid JSX 변환이 불가능하므로, esbuild + solidPlugin을 사용하는 새로운 엔진이 필요하다. (v13을 마이그레이션하는 것이 아니라, v14 아키텍처 위에 Solid 지원을 새로 구축한다.)
- **환경:** Simplysm pnpm 모노레포. sd-cli 패키지(`packages/sd-cli`). TypeScript ESM 프로젝트.
- **전제조건:**
  - v14 sd-cli의 BuildEngine 아키텍처(BaseEngine, TscEngine, NgtscEngine, ViteEngine 등)가 안정적으로 동작 중
  - Angular 라이브러리를 위한 NgtscEngine 선례가 존재하여 프레임워크별 엔진 분리 패턴이 확립됨
- **기술적 제약:**
  - Solid JSX는 tsc만으로 JS emit 불가 — `babel-preset-solid` 또는 `esbuild-plugin-solid` 등 별도 컴파일러 필요
  - DTS(.d.ts) emit은 tsc로 가능 (emitDeclarationOnly 모드)
  - v14 library 빌드는 현재 tsc로 JS+DTS를 한 번에 emit하는 구조이므로, Solid용 엔진은 JS(esbuild) + DTS(tsc) 2-pass 필요
- **참조 자료:**
  - `packages/sd-cli/src/engines/index.ts` — 엔진 팩토리 (`createBuildEngine`), `hasAngularCoreDependency` 감지 패턴 확인용
  - `packages/sd-cli/src/engines/BaseEngine.ts` — 엔진 추상 기반 클래스, 서브클래싱 구조 확인용
  - `packages/sd-cli/src/engines/TscEngine.ts` — 현재 library 엔진, 2-pass 분리 시 DTS 처리 참조용
  - `packages/sd-cli/src/engines/NgtscEngine.ts` — Angular 라이브러리 엔진, 프레임워크별 엔진 분리 패턴 참조용
  - `packages/sd-cli/src/workers/library-build.worker.ts` — 현재 library 빌드 워커, `runTscPackageBuild` 호출 방식 참조용
  - `packages/sd-cli/src/utils/tsc-build.ts` — `runTscPackageBuild`, DTS emit 로직 참조용
  - `packages/sd-cli/src/utils/esbuild-config.ts` — esbuild 설정 생성 + `writeChangedOutputFiles` 참조용
  - `packages/sd-cli/src/utils/output-path-rewriter.ts` — 출력 경로 변환(import에 .js 확장자 추가) 참조용
  - `packages/sd-cli/src/utils/package-utils.ts:212-227` — `hasAngularCoreDependency` 구현, 동일 패턴으로 `hasSolidDependency` 구현 참조용
  - `packages/sd-cli/src/sd-config.types.ts` — `SdBuildPackageConfig`, `BuildTarget` 타입 정의
  - `packages/sd-cli/src/utils/lint-core.ts:141` — lint 대상 파일 glob 패턴 (tsx/jsx 누락)
  - `packages/sd-cli/src/vitest-plugin.ts:110` — vitest transform 필터 (tsx 누락)
  - `packages/sd-cli/src/orchestrators/TypecheckOrchestrator.ts` — typecheck 시 `createBuildEngine` 사용, 엔진 라우팅 확인용
  - `D:/workspaces-13/simplysm/packages/sd-cli/src/utils/esbuild-config.ts:78-115` — (참고만) v13에서 esbuild+solid 조합이 어떤 옵션으로 동작했는지 힌트 용도. 코드를 가져오거나 마이그레이션하는 것이 아님

## Impact Mapping

- **Goal:** sd-cli library 빌드에서 Solid 프레임워크를 지원하여, Solid 기반 라이브러리 패키지를 단일 CLI로 빌드/워치/체크/배포할 수 있게 한다
  - **Actor:** Simplysm 모노레포 개발자
    - **Impact:** Solid 라이브러리를 별도 빌드 도구 없이 기존 워크플로(`pnpm build`, `pnpm watch`, `pnpm check`)로 통합 관리한다
      - **Deliverable 1:** Solid 라이브러리 빌드 엔진 (JS emit: esbuild + solidPlugin, DTS emit: tsc)
      - **Deliverable 2:** tsx/jsx 확장자 지원 (lint, watch, output 처리 등 기존 파이프라인의 확장자 누락 보완)

## Feature Breakdown

### Epic 1. Solid 라이브러리 빌드 지원

#### [ ] Feature 1.1: Solid 라이브러리 감지 및 엔진 라우팅

**의존성:** 없음

**범위:**

- `package-utils.ts`에 `hasSolidDependency(pkgDir)` 함수 추가 (package.json의 dependencies/peerDependencies에서 `solid-js` 존재 여부 확인)
- `createBuildEngine()` 팩토리(`engines/index.ts`)에 Solid 분기 추가: `hasSolidDependency` → SolidEsbuildEngine 라우팅
- `sd-cli`의 `package.json`에 `esbuild-plugin-solid` 의존성 추가
- `SolidEsbuildEngine` 클래스 생성 (`engines/SolidEsbuildEngine.ts`) — BaseEngine 상속
- `solid-library.worker.ts` 스켈레톤 생성 — runTscPackageBuild 위임 (설계 결정 D1: NgtscEngine 패턴과 일관적으로 전용 워커 생성)
- typecheck 시 SolidEsbuildEngine이 noEmit 모드(`{js: false, dts: false}`)를 올바르게 처리하는지 확인 (TypecheckOrchestrator는 createBuildEngine을 사용하므로 Solid 라이브러리도 SolidEsbuildEngine으로 라우팅됨)

**경계:**

- 실제 빌드/워치 로직은 Feature 1.2, 1.3에서 구현 (solid-library.worker 스켈레톤은 Feature 1.1에서 생성하되, esbuild 로직은 Feature 1.2에서 추가)
- `SdBuildPackageConfig`에 `framework` 필드를 추가하는 방식(명시적 설정)은 이 Feature에서 다루지 않음 — 자동 감지 방식을 사용하되, 필요시 plan 단계에서 재검토

**근거:**

- v14의 `hasAngularCoreDependency` → NgtscEngine 패턴과 동일한 자동 감지 방식 (`engines/index.ts:49-52`, `package-utils.ts:212-227`)
- v13에서도 동일한 `hasSolidDependency` 자동 감지 사용 (`D:/workspaces-13/simplysm/packages/sd-cli/src/utils/esbuild-config.ts:78-82`)

---/

#### [ ] Feature 1.2: Solid 라이브러리 프로덕션 빌드 (build 명령)

**의존성:** Feature 1.1

**범위:**

- `SolidEsbuildEngine._callBuild`에 esbuild 빌드 로직 추가 (Feature 1.1에서 생성된 스켈레톤 확장)
- `solid-library.worker.ts`의 build 함수에 esbuild + solidPlugin JS emit 로직 추가 (Feature 1.1에서 생성된 스켈레톤 확장)
- JS emit: esbuild + `esbuild-plugin-solid` (bundle: false, format: esm, write: false → writeChangedOutputFiles)
- DTS emit: `runTscPackageBuild({js: false, dts: true})` 재사용 또는 tsc emitDeclarationOnly 직접 호출
- import 경로에 .js 확장자 추가 처리 (esbuild output에서)
- 빌드 결과(success/errors/warnings/diagnostics)를 EngineResult 형식으로 반환

**경계:**

- watch 모드(증분 리빌드, FsWatcher)는 Feature 1.3에서 구현
- copySrc 파일 복사는 BuildOrchestrator가 엔진 외부에서 처리하므로 변경 불필요

**근거:**

- (참고만) v13에서 esbuild+solidPlugin 조합 사용 이력 — 동일 접근이 v14에서도 유효한지 판단 근거
- v14 TscEngine의 _callBuild 패턴 (`engines/TscEngine.ts:48-65`)
- v14 runTscPackageBuild의 js/dts 제어 플래그 (`utils/tsc-build.ts:64-226`)

---

#### [ ] Feature 1.3: Solid 라이브러리 watch 모드 (watch 명령)

**의존성:** Feature 1.2

**범위:**

- SolidEsbuildEngine의 `_callStartWatch` 구현
- FsWatcher로 `*.{ts,tsx}` 파일 감시 (src/ + workspace 의존성 src/ + replaceDeps dist/)
- 파일 변경 시 esbuild 증분 리빌드 (esbuild.context + rebuild)
- 파일 추가/제거 시 esbuild context 재생성
- DTS watch: tsc 증분 재컴파일 (emitDeclarationOnly)
- Worker 이벤트 발행 (buildStart, build, error) → BaseEngine이 ResultCollector/RebuildManager에 전달

**경계:**

- DevWatchOrchestrator의 기존 로직은 변경 불필요 (createBuildEngine이 올바른 엔진을 반환하면 자동 동작)

**근거:**

- v14 library-build.worker.ts의 watch 구조 (`workers/library-build.worker.ts:162-212`) — 동일한 패턴으로 Solid용 watch 구현
- (참고만) v13에서 esbuild.context + rebuild 증분 빌드 방식 사용 이력 — esbuild watch 패턴의 유효성 근거

---

#### [ ] Feature 1.4: sd-cli 빌드 파이프라인 tsx/jsx 확장자 지원

**의존성:** 없음 (Feature 1.1~1.3과 병렬 가능)

**범위:**

- `packages/sd-cli/src/utils/lint-core.ts:141` — lint 대상 glob: `*.{ts,js,mjs,cjs}` → `*.{ts,tsx,js,jsx,mjs,cjs}`
- `packages/sd-cli/src/workers/library-build.worker.ts:177-178` — watch 패턴: `*.ts` → `*.{ts,tsx}`

**경계:**

- `packages/sd-cli/src/workers/ngtsc-build.worker.ts:236,241` — Angular 전용 워커이고 Angular는 tsx를 사용하지 않으므로 변경 불필요
- `packages/sd-cli/src/utils/esbuild-config.ts:21,25` — esbuild가 tsx→js로 변환한 산출물(.js)을 처리하므로 `.js` 체크만으로 충분. 변경 불필요
- `packages/sd-cli/src/utils/output-path-rewriter.ts:14` — 컴파일된 .js/.d.ts 산출물의 import 경로를 처리하며 source 확장자(.tsx)는 여기서 무관. 변경 불필요
- `packages/sd-cli/src/vitest-plugin.ts:110` — AngularCompiler를 사용하는 Angular 전용 vitest 플러그인. Solid 테스트는 `vite-plugin-solid`의 transform을 사용하므로 이 플러그인 수정 불필요
- Angular Vite 플러그인(`vite-angular-plugin.ts:330,457`) — Angular 전용이므로 tsx 추가 불필요
- `server-build.worker.ts:400` — watch 패턴이 `src/**/*`로 이미 모든 확장자 포함. 변경 불필요
- `tsconfig.ts:getPackageSourceFiles` — 확장자 필터 없이 tsconfig의 fileNames를 경로로만 필터. 변경 불필요
- `copy-src.ts` — 사용자 glob 패턴 사용, 확장자 하드코딩 없음. 변경 불필요
- `TypecheckOrchestrator`, `BuildOrchestrator`, `DevWatchOrchestrator` — 엔진 인터페이스만 호출, 확장자 관련 로직 없음. 변경 불필요
- `lint-with-program.ts` — 선언파일/ngtypecheck 필터만, 일반 확장자 필터 없음. 변경 불필요

**근거:**

- `packages/sd-cli/src` 전체 검색으로 확장자 하드코딩 위치를 확인하고, 각각 실제 영향 여부를 분석한 결과
- esbuild/output-path-rewriter 등은 컴파일 산출물(.js)을 처리하므로 source 확장자 추가 불필요

---

#### [ ] Feature 1.5: ESLint 공유 설정 프레임워크별 분리 (packages/lint)

**의존성:** 없음 (Feature 1.1~1.4와 병렬 가능)

**범위:**

현재 `packages/lint/src/eslint-recommended.ts` 하나에 공통 룰과 Angular 전용 처리가 혼재되어 있음. 이를 3개 export로 분리:

- `eslint-recommended` — 프레임워크 무관 공통 설정
  - JS 파일 블록: `["**/*.js", "**/*.jsx", "**/*.mjs", "**/*.cjs"]` + commonRules
  - TS 파일 블록: `["**/*.ts", "**/*.tsx"]` + commonRules + `@typescript-eslint/*` 룰 + `@simplysm/no-hard-private`, `no-subpath-imports-from-simplysm`, `ts-no-throw-not-implemented-error`, `ts-no-unused-protected-readonly` + unusedImportsRules + noNodeBuiltinsRules + import 룰
  - 테스트 파일 블록: `["**/tests/**/*.ts", "**/tests/**/*.tsx"]` + 완화 룰
- `eslint-recommended-ng` — Angular 전용 설정
  - `...angular.configs.tsRecommended`
  - `["**/*.ts"]` + `angular.processInlineTemplates` 프로세서 + Angular 전용 룰 (`@angular-eslint/no-output-native`, `@simplysm/ts-no-unused-injects`)
  - `["**/*.html"]` + `angular.configs.templateRecommended` + `angular.configs.templateAccessibility` + `@simplysm/ng-template-*` 룰
- `eslint-recommended-solid` — Solid 전용 설정 (향후 `eslint-plugin-solid` 룰 추가 대비, 초기에는 빈 설정 또는 기본 Solid 룰만)

소비 프로젝트 사용 예시:
```typescript
// Angular 프로젝트:  [...recommended, ...recommendedNg]
// Solid 프로젝트:    [...recommended, ...recommendedSolid]
// 혼합 모노레포:     [...recommended, ...recommendedNg, ...recommendedSolid]
```

- `packages/lint/package.json`의 exports에 새 진입점 추가 (`./eslint-recommended-ng`, `./eslint-recommended-solid`)
- 이 패키지를 사용하는 모든 프로젝트의 `eslint.config.ts`에서 import 변경 필요

**경계:**

- `packages/lint/src/eslint-recommended.ts:102-104` — devDependencies 경로 패턴의 `.jsx`는 설정 파일(eslint.config, vitest.config 등)을 가리키므로 추가 불필요
- 기존 커스텀 룰 파일(`rules/*.ts`)은 변경 불필요 — 룰 자체는 프레임워크 무관, 적용 대상만 config에서 결정
- `eslint-plugin.ts`는 변경 불필요 — 룰 등록만 담당

**근거:**

- 현재 `eslint-recommended.ts:118` 블록에 Angular 전용 처리(`processInlineTemplates`, `@angular-eslint/*`)와 TS 공통 룰이 혼재하여, tsx 파일에 Angular 프로세서가 적용되는 문제
- ESLint flat config의 순서 머지 특성을 활용: 공통 블록 + 프레임워크 블록을 spread하면 `.ts`는 공통+프레임워크, `.tsx`는 공통만 자동 적용
- ESLint 생태계 표준 패턴(`@angular-eslint/recommended`, `eslint-plugin-solid/recommended` 등)과 일관적인 분리 구조

## 제외 사항

- **`SdBuildPackageConfig`에 `framework` 필드 추가 (명시적 설정 방식):** 자동 감지(`hasSolidDependency`)로 충분하며 v14의 Angular 감지 패턴과 일관적. 필요성이 확인되면 추후 Feature로 분리. (사유: Goal 달성에 불필요)
- **Angular Vite 플러그인의 tsx 지원 (`vite-angular-plugin.ts`):** Angular는 JSX/TSX를 사용하지 않으며, 수정 시 오히려 예기치 않은 동작을 유발할 수 있음. (사유: Goal 미연결)
- **Solid client 빌드 개선:** 현재 client 빌드의 Solid 지원(`vite-plugin-solid`)은 이미 동작 중이므로 이 프로젝트 범위 밖. (사유: 범위 초과)
