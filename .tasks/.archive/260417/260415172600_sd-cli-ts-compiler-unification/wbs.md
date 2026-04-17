# WBS: sd-cli TypeScript 컴파일러 통합 (SdTsCompiler)

## 프로젝트 개요

- **배경:** v14의 sd-cli에서 TSC 경로(라이브러리), Angular 경로(Angular 라이브러리), esbuild-angular-compiler 경로(클라이언트)가 각각 별도의 컴파일 로직을 가지고 있어 중복이 심하다. rootNames 필터링 누락 같은 버그가 구조적으로 발생하는 상황이다. v12에서는 `SdTsCompiler` 하나로 라이브러리/서버/클라이언트 모두 처리했으며, `tsconfig.angularCompilerOptions` 존재 여부로 Angular를 분기했다.
- **환경:** simplysm 모노레포의 `packages/sd-cli` 패키지. TypeScript 5.9, Angular 21, esbuild 기반 빌드 시스템.
- **전제조건:** 현재 v14의 기능(증분 빌드, watch, lint, SCSS 번들링 등)은 모두 유지해야 한다.
- **기술적 제약:** esbuild 플러그인 구조에서 `SdTsCompiler`를 호출하는 형태는 유지 (v12의 `createSdServerPlugin`, `createSdNgPlugin`처럼). Worker Thread 격리 구조도 유지.
- **참조 자료:**
  - [v12 구조 참고] `D:/workspaces-12/simplysm/packages/sd-cli/src/ts-compiler/SdTsCompiler.ts` — "하나의 클래스로 통합" 구조 방향만 참고. v12 코드를 복사하지 않는다.
  - [v12 구조 참고] `D:/workspaces-12/simplysm/packages/sd-cli/src/types/build/ISdTsCompilerOptions.ts` — 옵션 인터페이스 설계 참고
  - [v12 구조 참고] `D:/workspaces-12/simplysm/packages/sd-cli/src/types/build/ISdTsCompilerResult.ts` — 결과 인터페이스 설계 참고
  - [v12 구조 참고] `D:/workspaces-12/simplysm/packages/sd-cli/src/pkg-builders/server/createSdServerPlugin.ts` — esbuild 플러그인에서 SdTsCompiler를 호출하는 패턴 참고
  - [v12 구조 참고] `D:/workspaces-12/simplysm/packages/sd-cli/src/pkg-builders/client/createSdNgPlugin.ts` — esbuild 플러그인에서 SdTsCompiler를 호출하는 패턴 참고
  - [v14 통합 대상 - TSC 경로] `packages/sd-cli/src/utils/tsc-build.ts` — 현재 TSC 빌드 핵심 로직. 통합 시 이 코드를 기반으로 한다.
  - [v14 통합 대상 - TSC 경로] `packages/sd-cli/src/utils/tsconfig.ts` — tsconfig 파싱, rootNames 필터링
  - [v14 통합 대상 - Angular 경로] `packages/sd-cli/src/angular/angular-compiler.ts` — Angular 컴파일러 래퍼 (AngularSourceFileCache, augmentHostWithCaching, NgtscProgram 생성, affected files, emit, diagnostics)
  - [v14 통합 대상 - Angular 경로] `packages/sd-cli/src/angular/angular-build-pipeline.ts` — Angular 빌드 파이프라인 (emit 후처리, SCSS, diagnostics)
  - [v14 통합 대상 - Angular 경로] `packages/sd-cli/src/angular/ngtsc-build-core.ts` — ngtsc 빌드 핵심 (transformStylesheet, side-effect SCSS, global SCSS)
  - [v14 통합 대상 - esbuild 경로] `packages/sd-cli/src/esbuild/esbuild-angular-compiler-plugin.ts` — 클라이언트용 esbuild Angular 플러그인 (자체 tsconfig 파싱, AngularCompiler 사용)
  - [v14 통합 대상 - esbuild 경로] `packages/sd-cli/src/esbuild/esbuild-tsc-plugin.ts` — 서버용 esbuild tsc 플러그인 (runTscPackageBuild 호출)
  - [v14 통합 대상 - esbuild 경로] `packages/sd-cli/src/esbuild/esbuild-client-config.ts` — 클라이언트 esbuild 설정 (pluginOptions 구성)
  - [v14 통합 대상 - 워커] `packages/sd-cli/src/workers/library-build.worker.ts` — 라이브러리 빌드 워커 (runTscPackageBuild + lint + watch 루프)
  - [v14 통합 대상 - 워커] `packages/sd-cli/src/workers/ngtsc-build.worker.ts` — Angular 라이브러리 빌드 워커 (AngularBuildPipeline + lint + watch 루프)
  - [v14 통합 대상 - 워커] `packages/sd-cli/src/workers/server-esbuild-context.ts` — 서버 esbuild context (tscPlugin 관리)
  - [v14 통합 대상 - Vite] `packages/sd-cli/src/angular/vite-angular-plugin.ts` — Vitest용 Angular Vite 플러그인 (자체 tsconfig 파싱)
  - [v14 유지] `packages/sd-cli/src/utils/output-path-rewriter.ts` — 출력 경로 변환 (SdTsCompiler에서 사용)
  - [v14 유지] `packages/sd-cli/src/utils/diagnostic-utils.ts` — 워크스페이스 진단 필터링 (SdTsCompiler에서 사용)
  - [v14 유지] `packages/sd-cli/src/typecheck/typecheck-serialization.ts` — 진단 직렬화 (SdTsCompiler에서 사용)
  - [v14 유지] `packages/sd-cli/src/lint/lint-with-program.ts` — LintWithProgramRunner (SdTsCompiler에서 사용)
  - [v14 유지] `packages/sd-cli/src/angular/scss-compiler.ts` — SCSS 컴파일 유틸 (SdTsCompiler에서 사용)
- **CRITICAL 구현 원칙:** v12는 구조 방향만 참고한다. 실제 구현은 v14의 현재 코드(`tsc-build.ts`, `angular-compiler.ts`, `esbuild-angular-compiler-plugin.ts` 등)를 꼼꼼히 읽고 통합해야 한다. v14에만 있는 기능(Worker Thread 격리, EmitAndSemanticDiagnosticsBuilderProgram 증분 빌드, AngularSourceFileCache, HMR/templateUpdates, SerializedDiagnostic 직렬화, createOutputPathRewriter 등)은 반드시 보존한다.

## Impact Mapping

- **Goal:** 컴파일 로직 중복 제거로 "한쪽만 수정하고 다른 쪽은 빠뜨리는" 류의 버그를 구조적으로 방지한다
  - **Actor:** sd-cli 개발자 (본인)
    - **Impact:** 컴파일 관련 변경을 한 곳에서만 하면 모든 빌드 타입에 적용된다
      - **Deliverable:** 통합 `SdTsCompiler` 클래스 — 라이브러리/서버/클라이언트 공통

## Feature Breakdown

### Epic 1. SdTsCompiler 핵심 통합

#### [x] Feature 1.1 SdTsCompiler 클래스 생성 (tsconfig 파싱 + 프로그램 생성)

**의존성:** 없음

**범위:**

- `SdTsCompiler` 클래스 신규 생성 (`src/ts-compiler/SdTsCompiler.ts`)
- tsconfig 파싱 통합: 현재 3곳에 분산된 `ts.readConfigFile` + `ts.parseJsonConfigFileContent` 로직을 `SdTsCompiler` 내부로 통합
  - `utils/tsconfig.ts:83-100` (`parseTsconfig`)
  - `esbuild/esbuild-angular-compiler-plugin.ts:131-159` (`parseTsconfigFile`)
  - `angular/vite-angular-plugin.ts:55-57`
- rootNames 필터링 통합: `getPackageSourceFiles`/`getPackageFiles` 로직을 `SdTsCompiler` 내부에서 `includeTests` 옵션에 따라 분기
  - `utils/tsconfig.ts:106-128`
  - `esbuild/esbuild-angular-compiler-plugin.ts:147-153`
- Angular 자동 감지: `tsconfig.angularCompilerOptions` 존재 여부로 `isForAngular` 결정 (v12 `SdTsCompiler:59`와 동일 패턴)
- 프로그램 생성 통합: Angular이면 `NgtscProgram` → `ts.createEmitAndSemanticDiagnosticsBuilderProgram`, 아니면 `ts.createEmitAndSemanticDiagnosticsBuilderProgram` 직접 생성
  - 현재 TSC 경로: `tsc-build.ts:146-151`
  - 현재 Angular 경로: `angular-compiler.ts:250-274`
- 컴파일러 호스트 생성 통합: 공통 `ts.createIncrementalCompilerHost` 생성 후, Angular이면 `readResource`, `transformResource`, `getModifiedResourceFiles`, `resourceNameToFileName` 확장
  - 현재 TSC 경로: `tsc-build.ts:129-144`
  - 현재 Angular 경로: `angular-compiler.ts:175-247`
- `SdTsCompiler`의 인터페이스 설계: 옵션 타입 (`ISdTsCompilerOptions`), 결과 타입 (`ISdTsCompilerResult`) 정의
- `compileAsync(modifiedFileSet)` 메서드: 초기 빌드와 증분 리빌드를 하나의 진입점으로 통합 (v12 `SdTsCompiler:198`과 동일 패턴)

**경계:**

- SCSS 번들링 로직은 Feature 1.3에서 다룸
- lint 통합은 Feature 1.3에서 다룸
- esbuild 플러그인/워커에서의 호출부 변경은 Epic 2에서 다룸

**근거:**

- v12 `SdTsCompiler` 클래스가 동일한 구조로 동작했음 (`SdTsCompiler.ts:52-300`)
- v14에서 rootNames 필터링 누락 버그가 실제 발생 (이번 대화의 발단)
- tsconfig 파싱이 3곳, 프로그램 생성이 3곳에 중복

#### [x] Feature 1.2 진단(diagnostics) + 증분 컴파일 통합

**의존성:** Feature 1.1

**설계 결정:**
- **D1: emit/진단 API** — `compileAsync` 단일 메서드로 compile→affected→emit→diagnostics 통합 (v12 패턴 일치). Angular emit 옵션은 `emitOptions` 매개변수로 전달.
- **compileAsync 시그니처:** `compileAsync(modifiedFiles?, emitOptions?: ISdTsCompilerEmitOptions): Promise<ISdTsCompilerResult>`
- **ISdTsCompilerResult 확장:** `affectedFiles`, `diagnostics`, `errorCount`, `warningCount`, `errors`, `emitResults?` (Angular only) 추가
- **emit 분기:** Non-Angular은 `builderProgram.emit()` (writeFile 훅 경유, 디스크 직접 쓰기, emitResults=undefined), Angular은 per-file emit으로 `EmitResult[]` 반환

**범위:**

- 진단 수집 통합: 현재 4곳에 분산된 diagnostics 수집 로직을 `SdTsCompiler` 내부로 통합
  - `tsc-build.ts:172-198` (config/syntactic/options/global/semantic/declaration/emit 진단 수집)
  - `angular-compiler.ts:498-563` (`collectDiagnostics` 제너레이터)
  - `angular-build-pipeline.ts:368-405` (`_collectDiagnostics`)
  - `esbuild-angular-compiler-plugin.ts:108-125` (`convertDiagnostic`)
- 워크스페이스 필터링: `isWorkspaceDiagnostic` 적용 (현재 `tsc-build.ts:183-185`)
- 진단 직렬화: `serializeDiagnostic` 적용 (현재 `tsc-build.ts:187`)
- affected files 추적 통합: 
  - TSC 경로: `tsc-build.ts:153-168` (`getSemanticDiagnosticsOfNextAffectedFile` 루프)
  - Angular 경로: `angular-compiler.ts:298-378` (`_findAffectedFiles` 수동 구현)
- diagnosticCache (WeakMap) 관리: Angular의 리소스 의존성 기반 캐시 무효화 포함 (`angular-compiler.ts:298-378`)
- emit 처리 통합:
  - TSC 경로: `tsc-build.ts:131-144, 170` (writeFile 훅 + emit)
  - Angular 경로: `angular-compiler.ts:394-496` (`emitAffectedFiles` 제너레이터)

**경계:**

- esbuild용 진단 변환(`convertDiagnostic` → esbuild `PartialMessage`)은 esbuild 플러그인 쪽에서 `SdTsCompiler` 결과를 변환하는 형태로 유지 (컴파일러 자체에 esbuild 의존성을 넣지 않음)

**근거:**

- v12 `SdTsCompiler:198-237`에서 `compileAsync`가 prepare → build → lint를 통합 실행
- 진단이 4곳에 분산되어 일관성 유지가 어려움

#### [x] Feature 1.3 SCSS 번들링 + lint 통합

**의존성:** Feature 1.1

**범위:**

- SCSS 번들링 통합: `SdTsCompiler` 내부에서 Angular의 `transformResource` 콜백을 통한 스타일 번들링 관리
  - 현재 라이브러리: `ngtsc-build-core.ts:85-116` (`createLibraryTransformStylesheet`)
  - 현재 클라이언트: `client-transform-stylesheet.ts` (`createClientTransformStylesheet`)
  - v12: `SdTsCompiler:64-69` (`SdStyleBundler` 인스턴스)
- 글로벌 SCSS 컴파일 통합:
  - 현재: `ngtsc-build-core.ts:140-183` (`compileSideEffectScss`, `compileGlobalScss`)
  - v12: `SdTsCompiler:203-204` (`_buildGlobalStyleAsync`)
- lint 통합: `SdTsCompiler.compileAsync()` 결과에 lint 결과 포함
  - 현재 라이브러리 워커: `library-build.worker.ts:74-82, 133-147`
  - 현재 Angular 워커: `ngtsc-build.worker.ts:114-123, 196-215`
  - v12: `SdTsCompiler:203-206` (compileAsync 내에서 lint 병렬 실행)
- `LintWithProgramRunner` 활용: 기존 `lint-with-program.ts`를 `SdTsCompiler`에서 직접 사용

**경계:**

- 클라이언트의 PostCSS 통합(`client-transform-stylesheet.ts`)은 `transformStylesheet` 콜백으로 외부에서 주입하는 형태 유지 (SdTsCompiler가 PostCSS를 직접 알 필요 없음)
- ESLint 설정 자체는 변경하지 않음

**설계 결정 (Feature 문서에서 확정):**

- D1: scssLoadPaths 옵션 불필요 — pkgDir/cwd에서 자동 도출
- D2: `createLibraryTransformStylesheet`를 `angular-build-pipeline.ts`에서 `ngtsc-build-core.ts`로 이동
- D3: Feature 1.2 전까지 affectedFiles 없이 전체 lint 실행
- D4: scssErrors/scssDependencies는 매 compileAsync 리셋, sideEffectScssRegistry는 유지

**참고:** `createLibraryTransformStylesheet`의 현재 위치는 `angular-build-pipeline.ts:85-116`이다 (WBS 초기 작성 시 `ngtsc-build-core.ts`로 기재되었으나 정정)

**근거:**

- v12에서 lint, 스타일 번들링이 `compileAsync` 안에서 통합 실행됨 (`SdTsCompiler:203-207`)
- 현재 lint 통합 패턴이 `library-build.worker.ts`와 `ngtsc-build.worker.ts`에서 거의 동일하게 중복

### Epic 2. 호출부 통합 (엔진/워커/플러그인)

#### [x] Feature 2.1 라이브러리 빌드 엔진 전환

**의존성:** Feature 1.2, Feature 1.3

**범위:**

- `library-build.worker.ts`에서 `runTscPackageBuild` 직접 호출 → `SdTsCompiler` 인스턴스 사용으로 전환
  - 현재: `library-build.worker.ts:74-147` (build), `163-246` (watch 루프)
  - `SdTsCompiler` 인스턴스를 워커 모듈 스코프에 보관, `compileAsync(modifiedFileSet)` 호출
- watch 루프 내 증분 빌드: `SdTsCompiler`가 내부적으로 `oldBuilderProgram`을 관리하므로 워커에서 직접 관리할 필요 없음
  - 현재: `library-build.worker.ts:104, 127` (`lastBuilderProgram` 수동 관리)
- lint 호출 제거: `SdTsCompiler.compileAsync()` 결과에 lint 결과가 포함되므로 워커에서 별도 lint 호출 불필요
- `TscEngine` 인터페이스 변경 없음 (워커 내부만 변경)

**경계:**

- `TscEngine.ts` 자체의 구조 변경은 최소화 (워커 내부 구현만 교체)
- `build-change-filter.ts`의 `shouldSkipRebuild`, `hasFileAddOrRemove` 등 watch 유틸은 그대로 사용

**설계 결정 (Feature 문서에서 확정):**

- D1: SdTsCompiler 인스턴스를 모듈 스코프 변수로 관리 (build/watch 공통 패턴)
- D2: rebuildAll에서 onChange의 변경 파일 경로를 Set으로 구성하여 compileAsync(modifiedFiles)에 전달 (packageJsonCache 클리어 용도)

**근거:**

- v12 `SdTsLibBuilder:13`에서 `new SdTsCompiler(opt, false)`로 생성하여 사용

#### [x] Feature 2.2 Angular 라이브러리 빌드 엔진 전환

**의존성:** Feature 1.2, Feature 1.3

**설계 결정:**
- **D1: side-effect SCSS deps 역방향 탐색** — 워커가 통합 deps 맵 관리 (compile-time deps를 SdTsCompiler 결과에서 복사 + side-effect deps를 writeEmitResults/compileSideEffectScss에서 추가)
- **D2: side-effect SCSS 에러 수집** — 워커가 별도 배열로 수집 후 result.scssErrors와 병합 (compileAsync 이후 발생하는 에러는 result 스냅샷에 미포함)
- **D3: writeEmitResults 함수 위치** — angular-build-pipeline.ts에서 그대로 import (Feature 3.1에서 정리)
- **D4: globalScss 옵션** — 항상 true (현재 build/watch 모두 compileGlobalScss 무조건 호출)

**범위:**

- `ngtsc-build.worker.ts`에서 `AngularBuildPipeline` 사용 → `SdTsCompiler` 인스턴스 사용으로 전환
  - 현재: `ngtsc-build.worker.ts:114-215` (build + watch)
  - `angular-build-pipeline.ts` 전체가 `SdTsCompiler`로 대체
- `angular-compiler.ts`의 `AngularCompiler` 클래스: `SdTsCompiler` 내부로 흡수 (Angular 분기 로직)
- watch 루프 통합: Feature 2.1의 `library-build.worker.ts`와 거의 동일한 패턴이 되어야 함
  - 현재: `ngtsc-build.worker.ts:239-350+` (library-build.worker.ts와 거의 동일한 중복)
- `NgtscEngine.ts` 인터페이스 변경 없음 (워커 내부만 변경)

**경계:**

- `angular-build.ts` (NgtscProgram re-export)는 `SdTsCompiler` 내부에서 사용하므로 유지
- `ngtsc-build-core.ts`의 side-effect SCSS/global SCSS 로직은 Feature 1.3에서 `SdTsCompiler`에 통합되므로 여기서는 호출부만 교체

**근거:**

- v12에서 Angular 라이브러리도 `SdTsCompiler`를 그대로 사용 (Angular 감지는 내부에서 자동)

#### [x] Feature 2.3 서버 빌드 esbuild 플러그인 전환

**의존성:** Feature 1.2, Feature 1.3

**설계 결정:**
- **D1: resetBuilderProgram** — SdTsCompiler 인스턴스 재생성 (createContext()가 새 플러그인을 생성하므로 자연스러운 패턴)
- **D2: watch js=false modifiedFiles** — 전달하지 않음. 서버는 non-Angular이므로 sourceFileCache 불필요. builderProgram이 증분성 관리

**범위:**

- `esbuild-tsc-plugin.ts`에서 `runTscPackageBuild` 직접 호출 → `SdTsCompiler` 인스턴스 사용으로 전환
  - 현재: `esbuild-tsc-plugin.ts:42-51` (onStart에서 parseTsconfig + runTscPackageBuild 호출)
  - `SdTsCompiler` 인스턴스를 플러그인 클로저에 보관, `compileAsync()` 호출
- `server-esbuild-context.ts`의 `tscPlugin` 관리: `SdTsCompiler` 인스턴스로 교체
  - 현재: `server-esbuild-context.ts:37-51`
- `TscPluginResult` 인터페이스의 getter들 (`getProgram`, `getAffectedFiles`, `getDiagnostics`, `getErrors`): `SdTsCompiler` 결과에서 추출
- `TscPluginResult`에 `getLintResult()` getter 추가 (lint 통합용)
- `server-build.worker.ts`의 일회성 빌드/watch에서 별도 `LintWithProgramRunner` 제거, SdTsCompiler lint 통합 활용

**경계:**

- esbuild 플러그인 구조 자체(onStart/onEnd 훅)는 유지
- 서버 빌드의 esbuild 번들링 로직은 변경하지 않음
- `server-watch-manager.ts` 로직 변경 없음

**근거:**

- v12 `createSdServerPlugin:17`에서 `new SdTsCompiler(conf, true)`로 esbuild 플러그인 안에서 사용

#### [x] Feature 2.4 클라이언트 빌드 esbuild 플러그인 전환

**의존성:** Feature 1.2

**설계 결정:**
- **D1: NgtscProgram 노출** — `ISdTsCompilerResult`에 `ngtscProgram?: NgtscProgram` 필드 추가 (HMR의 `collectHmrCandidates`가 필요, staleSourceFiles는 이전 result.program에서 캡처)
- **D2: 진단 변환** — `result.program`으로 `SerializedDiagnostic.start`에서 line/column 계산하는 `convertSerializedDiagnosticToEsbuild` 어댑터 함수 생성 (기존 타입 변경 불필요)
- **D3: 클라이언트 SCSS 상태** — plugin-owned maps (`stylesheetDependencies`/`stylesheetErrors`)를 통한 흐름 유지 (`createClientTransformStylesheet`가 직접 기록, SdTsCompiler 내부 SCSS 상태는 라이브러리용)
- **D4: `AngularCompilerPluginOptions` 유지** — 인터페이스 구조 유지, 내부 구현만 SdTsCompiler로 교체

**범위:**

- `esbuild-angular-compiler-plugin.ts`에서 자체 `parseTsconfigFile` + `AngularCompiler` 사용 → `SdTsCompiler` 인스턴스 사용으로 전환
  - 현재: `esbuild-angular-compiler-plugin.ts:377-394` (`handleFirstBuild`에서 parseTsconfigFile + AngularCompiler 생성)
  - `SdTsCompiler` 인스턴스를 플러그인 클로저에 보관
- `handleRebuild` 로직: `SdTsCompiler.compileAsync(modifiedFileSet)` 호출로 단순화
- `convertDiagnostic` → `convertSerializedDiagnosticToEsbuild`: `result.program`으로 line/column 계산
- `esbuild-client-config.ts`의 `includeTestMetadata` 옵션: `createCompilerOptionsTransformer`에서 `supportTestBed`/`supportJitMode`로 전달 (기존 방식 유지)
- HMR 관련 로직: 이전 `result.program`에서 staleSourceFiles 캡처, `result.ngtscProgram`으로 `collectHmrCandidates` + `emitHmrUpdateModule` 호출
- `vite-angular-plugin.ts`: `AngularBuildPipeline` → `SdTsCompiler` + 로컬 emittedFilesBySource Map

**경계:**

- esbuild 플러그인의 onLoad/onResolve 훅 구조는 유지
- `JavaScriptTransformer`, `AngularCache` 등 esbuild 플러그인 전용 인프라는 플러그인 쪽에 유지
- `bundleWebWorker`, `requiresAngularCompiler`, `createMissingFileDiagnostic` 등 esbuild 전용 유틸은 플러그인 파일에 유지
- 클라이언트 SCSS 상태는 plugin-owned maps로 유지 (SdTsCompiler result의 scssErrors/scssDependencies는 사용하지 않음)

**근거:**

- v12 `createSdNgPlugin:30`에서 `new SdTsCompiler(opt, true)`로 esbuild 플러그인 안에서 사용
- 현재 `esbuild-angular-compiler-plugin.ts`가 자체 tsconfig 파싱/rootNames 필터링을 가지고 있어 버그 발생

### Epic 3. 정리 및 제거

#### [x] Feature 3.1 사용되지 않는 파일/함수 제거

**의존성:** Feature 2.1, Feature 2.2, Feature 2.3, Feature 2.4

**설계 결정:**
- **D1: writeEmitResults 이동 위치** — `ngtsc-build-core.ts`로 이동 (의존하는 `trackDeps`, `formatScssError`, `SideEffectScssOptions`가 같은 파일에 위치하여 응집도 최고)

**범위:**

- 파일 전체 삭제:
  - `utils/tsc-build.ts` 전체 (`runTscPackageBuild` → SdTsCompiler로 대체, import 0건 확인)
  - `angular-build-pipeline.ts` 전체 (`writeEmitResults`를 `ngtsc-build-core.ts`로 이동 후 삭제)
- 부분 제거:
  - `angular-compiler.ts`의 `AngularCompiler` 클래스, `AngularCompilerOptions`, private 헬퍼 제거 (유지: `EmitResult`, `EmitOptions`, `AngularSourceFileCache`, `augmentHostWithCaching`)
  - `ngtsc-build-core.ts`의 `buildCompilerOptions`, `buildScssLoadPaths` 제거 (외부 import 0건)
- 이미 완료:
  - `esbuild-angular-compiler-plugin.ts`의 `parseTsconfigFile` — Feature 2.4에서 이미 제거됨
- `utils/tsconfig.ts`의 `parseTsconfig` — `SdTsCompiler`, `server-build.worker.ts`, `server-watch-manager.ts`, `typecheck-non-package.ts` 등 다수 사용 중이므로 유지
- 테스트 정리: `angular-build-pipeline.spec.ts`, `angular-compiler-aot.spec.ts`, `angular-compiler-aot.acc.spec.ts` 삭제, `ngtsc-build-core-write-emit.spec.ts` import 수정
- re-export/호환 코드 없이 깨끗하게 제거

**경계:**

- `utils/tsconfig.ts` 전체 유지 (`parseTsconfig` 포함, 다수 파일에서 사용 중)
- `angular-build.ts` (NgtscProgram re-export)는 SdTsCompiler에서 import하므로 유지
- `angular-compiler.ts`의 `AngularSourceFileCache`, `augmentHostWithCaching`, `EmitResult`, `EmitOptions`는 7개 파일에서 사용 중이므로 유지

**근거:**

- 통합 후 기존 개별 구현은 사용처가 없어지므로 제거 대상

#### [x] Feature 3.2 watch 루프 중복 통합

**의존성:** Feature 2.1, Feature 2.2

**설계 결정:**
- **D1: 통합 방식** — 단일 워커 통합. `ngtsc-build.worker.ts`를 `library-build.worker.ts`로 흡수. SdTsCompiler가 이미 Angular/non-Angular 내부 분기하므로 워커도 하나로 통합이 자연스러움.
- **D2: globalScss 전달 방식** — `BuildOutput`에 `globalScss?: boolean` 추가. NgtscEngine이 `output`에 포함하여 전달. BuildOutput이 빌드 동작 제어의 단일 창구 역할.

**범위:**

- `ngtsc-build.worker.ts`를 `library-build.worker.ts`로 흡수 (단일 워커)
  - build(): Angular 조건 분기 (writeEmitResults, SCSS 에러 병합, try-catch)
  - startWatch(): Angular 조건 분기 (SCSS 글로브, combinedScssDeps, buildWatchEvent, compileSideEffectScss)
- `BuildOutput`에 `globalScss?: boolean` 추가
- `LibraryBuildInfo`에서 미사용 `config` 필드 제거
- `NgtscEngine._getWorkerPath()` → `library-build.worker` 경로 변경, `_callBuild`/`_callStartWatch`에서 `globalScss: true` 전달
- `ngtsc-build.worker.ts` 삭제
- 테스트 통합: ngtsc 테스트를 library 테스트로 이동, ngtsc 테스트 파일 삭제
- `build-change-filter.ts`, `build-watch-paths.ts` 등 기존 공통 유틸은 유지

**경계:**

- `ngtsc-build-core.ts`의 타입(`NgtscBuildInfo`, `NgtscBuildResult` 등) 및 함수 제거는 Feature 3.1 범위
- 서버/클라이언트 워커는 esbuild 기반이므로 이 Feature의 범위가 아님
- 엔진 클래스(TscEngine + NgtscEngine) 통합은 wbs 제외사항

**근거:**

- 현재 두 워커의 watch 루프가 `shouldSkipRebuild`, `hasFileAddOrRemove`, `lastSourceFilePaths` 관리 등 거의 동일한 패턴
- SdTsCompiler 통합 후 ngtsc 전용 로직은 `result.isForAngular` / `result.emitResults` 조건으로 분기 가능

## 제외 사항

- **TypecheckOrchestrator 변경**: typecheck 전용 경로(`typecheck-non-package.ts` 등)는 이번 통합 범위에 포함하지 않음. SdTsCompiler를 사용하도록 전환할 수 있으나 별도 작업으로 분리. (사유: 현재 typecheck 경로는 중복 문제가 아닌 독립 경로이므로 범위 초과)
- **Vite dev server 구조 변경**: `client.worker.ts`의 Vite 관련 로직은 변경하지 않음. (사유: Vite는 자체 컴파일 파이프라인을 가지며, SdTsCompiler와 직접 관련 없음)
- **엔진 클래스 통합** (`TscEngine` + `NgtscEngine` 합치기): 엔진 레벨 통합은 이번 범위에 포함하지 않음. (사유: 엔진은 워커 관리, 이벤트 발행 등 다른 관심사를 가지며, 컴파일러 통합과 별개)
- **ESLint 설정/규칙 변경**: lint 실행 인프라만 통합하고 ESLint 설정 자체는 변경하지 않음. (사유: 범위 초과)
