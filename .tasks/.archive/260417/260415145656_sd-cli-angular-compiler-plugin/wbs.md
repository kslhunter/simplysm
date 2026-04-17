# WBS: sd-cli createCompilerPlugin 자체 구현

## 프로젝트 개요

- **배경:** `esbuild-client-config.ts`에서 `@angular/build/private`의 `createCompilerPlugin`을 사용 중이다. 이 함수는 Angular AOT 컴파일, 스타일시트 번들링, JS 변환 등을 하나의 불투명한(opaque) esbuild 플러그인으로 래핑한다. 빌드 파이프라인을 완전히 제어하기 위해 이를 자체 구현으로 대체한다.
- **환경:** sd-cli는 이미 `src/angular/` 디렉토리에 `AngularCompiler`, `AngularBuildPipeline`, `createClientTransformStylesheet` 등 Angular AOT 컴파일 인프라를 보유하고 있다. 이 인프라는 Library 빌드(`ngtsc-build.worker.ts`)와 Vitest(`vite-angular-plugin.ts`)에서 사용 중이나, 클라이언트 esbuild 빌드에서는 `@angular/build`의 `createCompilerPlugin`을 별도로 사용한다.
- **전제조건:** Angular 21, esbuild, TypeScript 5.9 환경. `@angular/compiler-cli`의 `NgtscProgram` API 사용 가능.
- **기술적 제약:**
  - AOT 전용 (JIT 모드 불필요)
  - File Replacements 기능 불필요
  - `JavaScriptTransformer`는 `@angular/build/private`에서 계속 import (Babel + worker pool 기반의 복잡한 구현으로 재구현 실익 없음)
  - `esbuild-pwa.ts`, `esbuild-index-html.ts`의 `@angular/build/private` import는 이번 범위에 포함하지 않음
- **참조 자료:**
  - `packages/sd-cli/src/esbuild/esbuild-client-config.ts` — 현재 createCompilerPlugin 사용 위치 확인
  - `packages/sd-cli/src/angular/angular-compiler.ts` — 기존 AngularCompiler 구현 확인
  - `packages/sd-cli/src/angular/angular-build-pipeline.ts` — 기존 AngularBuildPipeline 구현 확인
  - `packages/sd-cli/src/angular/client-transform-stylesheet.ts` — 기존 스타일시트 변환 구현 확인
  - `node_modules/@angular/build/src/tools/esbuild/angular/compiler-plugin.js` — createCompilerPlugin 원본 구현 참조
  - `node_modules/@angular/build/src/tools/esbuild/javascript-transformer.d.ts` — JavaScriptTransformer API 확인
  - `node_modules/@angular/build/src/tools/esbuild/angular/source-file-cache.d.ts` — SourceFileCache 구조 확인
  - `node_modules/@angular/build/src/tools/esbuild/angular/file-reference-tracker.d.ts` — FileReferenceTracker 구조 확인

## Impact Mapping

- **Goal:** sd-cli의 Angular 클라이언트 빌드 파이프라인에서 `@angular/build`의 불투명 플러그인 의존성을 제거하여, 빌드 동작을 완전히 제어하고 `@angular/build` 내부 API 변경에 대한 취약성을 제거한다
  - **Actor:** sd-cli를 사용하는 개발자
    - **Impact:** Angular 빌드 파이프라인의 모든 단계를 직접 커스터마이징하고, `@angular/build` 메이저 업데이트 시 호환성 문제를 줄인다
      - **Deliverable:** `createCompilerPlugin`을 대체하는 자체 esbuild Angular Compiler Plugin

## Feature Breakdown

### Epic 1. Angular esbuild Plugin 핵심

#### [x] Feature 1.1 esbuild Angular Compiler Plugin — AOT 컴파일 (onStart)

**의존성:** 없음

**범위:**

- 새 파일 `src/esbuild/esbuild-angular-compiler-plugin.ts` 생성
- esbuild Plugin 팩토리 함수 (`createAngularCompilerPlugin`) export
- **setup 단계:**
  - `JavaScriptTransformer` 초기화 (`@angular/build/private`에서 import)
  - LMDB 캐시 초기화 (`LmdbCacheStore` + `Cache` — `lmdb` 직접 사용하여 자체 구현. `@angular/build/private`에서 미 export 확인됨)
  - `typeScriptFileCache: Map<string, string | Uint8Array>` 생성 (컴파일된 TS 출력 저장용)
  - `additionalResults: Map` 생성 (스타일시트/웹워커 출력 보관용)
  - `FileReferenceTracker` 구현 (리소스 파일 의존성 추적 — 간단한 유틸리티이므로 자체 구현)
  - esbuild define 주입: `ngI18nClosureMode = 'false'`
- **onStart 훅:**
  - `AngularCompiler`(`src/angular/angular-compiler.ts`) 기반 AOT 컴파일 수행
  - 첫 빌드: `AngularCompiler` 인스턴스 생성 + `initialize()` 호출
  - 증분 빌드: `modifiedFiles`를 수집하고, FileReferenceTracker로 전이적 의존성까지 확장하여 `update()` 호출
  - `emitAffectedFiles()` 결과를 `typeScriptFileCache`에 저장 (filename → contents)
  - `collectDiagnostics()` 결과를 esbuild `PartialMessage` 형식(errors/warnings)으로 변환하여 반환
  - compilerOptions 변환 로직 적용 (target: ES2022, module: ES2022, noEmitOnError: false, inlineSources/inlineSourceMap 등)
  - HMR templateUpdates 전파 지원 — `collectHmrCandidates` 자체 구현 필요 (`src/angular/hmr-candidates.ts`), NgCompiler의 `emitHmrUpdateModule()` API 사용. HMR_MODIFIED_FILE_LIMIT = 32
- **onEnd 훅 골격:** additionalResults 병합 (스타일시트/웹워커 출력물을 result.outputFiles에 추가, metafile 병합)
- **onDispose 훅:** `AngularCompiler` 참조 해제, `JavaScriptTransformer.close()`, LMDB 캐시 close

**경계:**

- TS/JS onLoad 훅은 Feature 1.2에서 구현
- 스타일시트 번들링 콜백은 Feature 2.1에서 구현 (이 Feature에서는 transformStylesheet 콜백 주입 구조만 마련)
- Web Worker 콜백은 Feature 2.2에서 구현

**근거:**

- `createCompilerPlugin`의 onStart 구현 (`compiler-plugin.js` lines 120-331)
- 기존 `AngularCompiler` (`angular-compiler.ts`) — `initialize()`, `update()`, `emitAffectedFiles()`, `collectDiagnostics()` 메서드 확인
- `createCompilerOptionsTransformer` 함수 (`compiler-plugin.js` lines 499-581)
- `aot-compilation.js` lines 108-132 — templateUpdates 수집 (collectHmrCandidates + emitHmrUpdateModule)
- `hmr-candidates.js` — collectHmrCandidates 구현 (~160줄, NgCompiler API: getComponentsWithTemplateFile, getComponentsWithStyleFile, getMeta, emitHmrUpdateModule)
- `lmdb-cache-store.js` + `cache.js` — LmdbCacheStore/Cache 원본 (~90줄)

**설계 결정:**

- D1: LMDB 초기화 → `lmdb` 직접 사용 (LmdbCacheStore + Cache 자체 구현)

**신규 파일:**

- `src/esbuild/file-reference-tracker.ts` — FileReferenceTracker (~50줄)
- `src/esbuild/lmdb-cache-store.ts` — LmdbCacheStore + Cache (~100줄)
- `src/esbuild/esbuild-angular-compiler-plugin.ts` — 메인 플러그인 (~350줄)
- `src/angular/hmr-candidates.ts` — collectHmrCandidates (~200줄)

---

#### [x] Feature 1.2 onLoad 훅 — TS/JS 파일 변환

**의존성:** Feature 1.1

**범위:**

- **TS onLoad 훅** (filter: `/\.[cm]?[jt]sx?$/`):
  - `typeScriptFileCache`에서 컴파일된 출력 조회
  - 캐시에 없고 컴파일 에러가 있었으면: 빈 contents 반환 (연쇄 에러 방지)
  - 캐시에 없고 Angular 데코레이터를 사용하는 파일이면: 에러 반환 ("File not found in TypeScript compilation")
  - 캐시에 없고 일반 파일이면: warning 반환 + 번들러에 위임
  - `string` 타입 출력(미변환 TS emit)이면: `JavaScriptTransformer.transformData()` 적용 (skipLinker=true, sideEffects 분석, advancedOptimizations)
  - 변환 결과를 `Uint8Array`로 `typeScriptFileCache`에 재캐싱
  - 적절한 loader 결정 (`js`, `ts`, `tsx`)
- **JS onLoad 훅** (filter: `/\.[cm]?js$/`):
  - `JavaScriptTransformer.transformFile()` 적용
  - `LoadResultCache` 적용 (esbuild onLoad 결과 캐싱)
  - sideEffects 분석 (advancedOptimizations 활성 시 `build.resolve()`로 확인)
- `LoadResultCache` 구현: esbuild onLoad 결과를 메모리에 캐싱하는 간단한 래퍼 (createCachedLoad 패턴)

**경계:**

- File Replacements 기반 onLoad 훅은 구현하지 않음 (요구사항 제외)
- JIT 모드용 콜백은 구현하지 않음 (요구사항 제외)
- Coverage instrumentation은 구현하지 않음

**근거:**

- `createCompilerPlugin`의 onLoad 구현 (`compiler-plugin.js` lines 332-434)
- `JavaScriptTransformer` API (`javascript-transformer.d.ts`) — `transformData()`, `transformFile()` 시그니처 확인
- `load-result-cache.js` — MemoryLoadResultCache + createCachedLoad 원본 (~75줄)
- `compiler-plugin.js` lines 464-476 — `hasSideEffects` (build.resolve 기반)
- `compiler-plugin.js` lines 607-637 — `createMissingFileDiagnostic` + `requiresAngularCompiler`

**설계 결정:**

- D1: `MemoryLoadResultCache` + `createCachedLoad` → `src/esbuild/load-result-cache.ts`에 자체 구현 (`@angular/build/private` 미 export)
- D2: `shouldTsIgnoreJs`/`useTypeScriptTranspilation` 플래그 → setup 스코프 let 변수, onStart에서 `getTsProgram().getCompilerOptions()`로 결정
- D3: Bazel rewrite → 미구현 (`path.normalize(args.path)` 만 사용)

**신규 파일:**

- `src/esbuild/load-result-cache.ts` — MemoryLoadResultCache + createCachedLoad (~80줄)

---

### Epic 2. 리소스 처리

#### [x] Feature 2.1 컴포넌트 스타일시트 번들링

**의존성:** Feature 1.1

**범위:**

- `AngularCompilerPluginOptions`에 `stylesheetDependencies` (Map) / `stylesheetErrors` (string[]) 옵션 추가
- `onStart` 시작 시 `stylesheetErrors` 리셋 (stale 에러 방지)
- AOT 컴파일 후 `stylesheetDependencies` → `FileReferenceTracker.add()` 브릿징 (증분 빌드 시 SCSS 의존성 전이적 확장)
- AOT 컴파일 후 `stylesheetErrors` → esbuild `PartialMessage` 변환하여 `result.errors`에 추가
- ~~`FileReferenceTracker` 클래스 구현~~ → Feature 1.1에서 완료됨
- ~~`outputFiles/metafile`을 `additionalResults`에 보관~~ → sd-cli는 인라인 스타일 방식이므로 불필요 (D3)

**경계:**

- `externalRuntimeStyles` 옵션은 구현하지 않음 (Angular dev server 전용 내부 기능)
- 기존 `esbuild-scss-plugin.ts` (side-effect import용)와 `esbuild-postcss-plugin.ts`는 별도로 유지 (플러그인 체인에서 angularPlugin 뒤에 배치)

**설계 결정:**

- D2: stylesheetDependencies/Errors 전달 방식 → Plugin 옵션으로 외부 Map/Array 주입 (Plugin을 SCSS 인프라에 결합시키지 않음)
- D3: outputFiles/metafile in additionalResults → 미구현 (sd-cli 인라인 스타일 방식에서 불필요)
- D4: FileReferenceTracker 구현 → Feature 1.1에서 완료, 추가 수정 불필요

**근거:**

- `createCompilerPlugin`의 `transformStylesheet` 콜백 (`compiler-plugin.js` lines 155-208)
- `FileReferenceTracker` API (`file-reference-tracker.ts`) — Feature 1.1에서 구현 완료
- 기존 `createClientTransformStylesheet` (`client-transform-stylesheet.ts`) — SCSS 컴파일 + PostCSS + 의존성 추적 + 파일 캐시

---

#### [x] Feature 2.2 Web Worker 번들링

**의존성:** Feature 1.1

**범위:**

- `createWorkerTransformer` 자체 구현 (`src/angular/web-worker-transformer.ts`):
  - `new Worker(new URL('path', import.meta.url))` / `new SharedWorker(...)` AST 패턴 감지
  - `fileProcessor` 콜백 호출 후 URL을 번들된 경로로 치환
  - Worker options 인자 없으면 `{ type: 'module' }` 자동 추가
- esbuild 플러그인에서 `processWebWorker` 콜백 구현 + TypeScript transformer 주입:
  - `bundleWebWorker`: `build.esbuild.buildSync()`로 Worker 파일을 별도 번들링 (format: esm, bundle: true, metafile: true, write: false, entryNames: `worker-[hash]`)
  - `processWebWorker` 콜백: 번들 결과의 outputFiles/metafile을 `additionalResults`에 보관, FileReferenceTracker에 의존성 등록
  - `emitAffectedFiles({ additionalTransformers: { before: [createWorkerTransformer(processWebWorker)] } })`로 transformer 주입
  - 에러 발생 시 원본 경로 반환 + 에러를 result.errors에 추가
  - 성공 시 번들된 worker 파일의 outdir 기준 상대 경로 반환

**경계:**

- Worker 내부의 Zone.js 처리는 하지 않음 (esbuild의 supported 옵션으로 제어하지 않음)
- Worker에 Angular 플러그인 체인은 적용하지 않음 (esbuild.buildSync는 plugins를 지원하지 않음)
- AngularCompiler / AngularCompilerOptions는 수정하지 않음 (NgtscProgram이 호스트의 processWebWorker를 인식하지 않아 host 확장 방식 불가, 기존 additionalTransformers 인프라 활용)

**근거:**

- `createCompilerPlugin`의 `processWebWorker` 콜백 (`compiler-plugin.js` lines 209-238)
- `bundleWebWorker` 함수 (`compiler-plugin.js` lines 582-606)
- `web-worker-transformer.js` — `createWorkerTransformer` 원본 (~93줄, `@angular/build/private`에서 미 export)
- `AngularCompiler.emitAffectedFiles(options?: EmitOptions)` — `additionalTransformers.before` 지원 (`angular-compiler.ts:394`)

**설계 결정:**

- D1: processWebWorker 아키텍처 → TypeScript transformer 주입 방식 (AngularCompiler host 확장 불가 — NgtscProgram 미인식)

**신규 파일:**

- `src/angular/web-worker-transformer.ts` — createWorkerTransformer (~60줄)

---

### Epic 3. 통합

#### [x] Feature 3.1 esbuild-client-config.ts 통합 + 테스트

**의존성:** Feature 1.1, Feature 1.2, Feature 2.1, Feature 2.2

**범위:**

- `esbuild-client-config.ts` 수정:
  - `@angular/build/private`에서 `createCompilerPlugin`, `SourceFileCache`, `CompilerPluginOptions`, `BundleStylesheetOptions` import 제거
  - 새 `createAngularCompilerPlugin` 함수로 교체
  - `SourceFileCache` 대체: `esbuild-client-config.ts` 내부에 `ClientSourceFileCache` 클래스 정의 (`AngularSourceFileCache` 확장 + `typeScriptFileCache`, `loadResultCache` 프로퍼티)
  - `ClientEsbuildResult` 인터페이스의 `sourceFileCache` 타입을 `ClientSourceFileCache`로 업데이트
  - `createClientTransformStylesheet` 호출하여 `transformStylesheet` 콜백 구성 (Feature 2.1의 `BundleStylesheetOptions` 대체)
- `client.worker.ts` 연동 확인:
  - watch 모드의 `sd-build-start` 플러그인이 새 캐시 구조와 호환되는지 확인 (loadResultCache, typeScriptFileCache 무효화)
  - `templateUpdates` Map 공유 경로 확인
- 기존 테스트 업데이트:
  - `tests/utils/esbuild-client-config.spec.ts` — mock 대상 변경
  - `tests/utils/esbuild-client-config.acc.spec.ts` — mock 대상 변경
  - 새 플러그인에 대한 단위 테스트 추가

**경계:**

- `esbuild-pwa.ts`, `esbuild-index-html.ts`의 `@angular/build/private` import는 수정하지 않음
- `vite-angular-plugin.ts`는 수정하지 않음 (AngularBuildPipeline 기반, 별도 경로)

**설계 결정:**

- D1: `ClientSourceFileCache` 클래스 위치 → `esbuild-client-config.ts` 내부 정의 (5줄 미만 간단한 클래스, 사용처 한정적)
- D2: `BundleStylesheetOptions` 대체 방식 → `createClientTransformStylesheet` 콜백 사용 (Feature 2.1에서 구현 완료)

**근거:**

- 현재 `esbuild-client-config.ts` (`esbuild-client-config.ts` lines 7-12, 64-99) — 교체 대상 코드
- `client.worker.ts` lines 251-309 — `sd-build-start` 플러그인의 캐시 무효화 로직
- 기존 테스트 파일의 `@angular/build/private` mock 패턴

## 제외 사항

- **File Replacements (onLoad `.json$`)** — 사용자 명시적 제외
- **JIT 모드 지원 (`jit-plugin-callbacks`)** — 사용자 명시적 제외 (AOT 전용)
- **Coverage instrumentation (`instrumentForCoverage`)** — createCompilerPlugin 기능 중 현재 사용하지 않는 기능
- **`externalRuntimeStyles` 옵션** — Angular dev server 전용 내부 옵션으로 sd-cli에서 사용하지 않음
- **`SharedTSCompilationState`** — Angular CLI의 다중 compilation 동기화용으로 sd-cli에서는 단일 compilation만 사용
- **`esbuild-pwa.ts`, `esbuild-index-html.ts`의 `@angular/build/private` 의존성 제거** — 이번 범위 초과 (별도 작업)
- **`JavaScriptTransformer` 자체 구현** — Babel + worker pool 기반의 복잡한 구현으로 재구현 실익 없음. `@angular/build/private`에서 계속 import
