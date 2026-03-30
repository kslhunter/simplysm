# WBS

## Impact Mapping

- **Goal:** Angular 빌드 파이프라인 통합 — library/client 공통 컴파일러로 incremental 최적화 적용 + ts.Program 외부 노출로 lint 통합 가능
  - **Actor:** sd-cli 사용자 (개발자)
    - **Impact 1:** watch 모드에서 Angular library 변경 시 incremental 최적화(Diagnostic 캐싱, emitAffectedFiles)로 더 빠른 피드백을 받는다
    - **Impact 2:** watch/dev 모드에서 lint가 함께 실행되어 빌드 시점에 lint 에러를 발견한다
    - **Impact 3:** `@angular/build/private` 의존을 최소화하여 Angular 버전 업그레이드 시 깨질 위험을 줄인다
      - **Deliverable 1:** NgtscProgram 기반 통합 Angular 컴파일러 모듈 (library/client 공통, 커스터마이징 가능)
      - **Deliverable 2:** 기존 NgtscEngine(library), ViteEngine(client) 마이그레이션
      - **Deliverable 3:** typecheck+lint 통합 (ts.Program 공유, 워커 내 실행)

## Feature Breakdown

> 각 Feature의 범위 힌트(`-` 불릿)는 대표 예시이며 전체 목록이 아니다. 정식 분해는 `/sd-dev-spec`에서 수행한다.

### Epic 1. 통합 Angular 컴파일러

- [x] Feature 1.1 통합 컴파일러 코어 — 초기화 + 진단
  - 호스트 생성 (TypeScript incremental host + Angular 훅 확장)
  - NgtscProgram + BuilderProgram 래핑
  - AOT 분석 (analyzeAsync)
  - affected 파일 계산 + Diagnostic 수집/캐싱
  - SourceFileCache 통합
  - getTsProgram() 외부 노출
  - 커스터마이징 옵션 (declaration, transformStylesheet 콜백 등)

- [x] Feature 1.2 통합 컴파일러 — Emit + Incremental
  - emitAffectedFiles 최적화 (affected만 emit + incremental skip)
  - Angular transformers 적용 (prepareEmit)
  - output.js / output.dts 옵션에 따른 emit 분기
  - Package.json 캐시 관리 (node_modules 변경 감지)
  - update(modifiedFiles) 메서드 — incremental rebuild 진입점
  - modifiedResourceFiles 기반 리소스 변경 감지

- [x] Feature 1.3 통합 컴파일러 — HMR 지원 (client only)
  - HMR 후보 컴포넌트 분석 (stale source files 비교)
  - HMR update 모듈 코드 생성
  - HMR 수정 파일 수 한계 처리
  - templateUpdates 맵 생성 및 반환

### Epic 2. 엔진/워커 마이그레이션

- [x] Feature 2.1 NgtscEngine 마이그레이션 (library)
  - ngtsc-build-core 빌드/리빌드를 통합 컴파일러로 교체
  - ngtsc-build.worker 수정
  - SCSS transformStylesheet 콜백 구성 (library 패턴: sass 직접 사용)
  - watch 모드 연동 (FsWatcher + SCSS 의존성 추적)

- [x] Feature 2.2 ViteEngine 마이그레이션 (client)
  - AngularFacade를 통합 컴파일러로 교체
  - vite-angular-plugin 수정 (buildStart, handleHotUpdate, transform)
  - client.worker 수정
  - transformStylesheet 콜백 구성 (client 패턴)
  - HMR 연동 (handleHotUpdate에서 통합 컴파일러의 HMR API 사용)

### Epic 3. typecheck+lint 통합

- [x] Feature 3.1 lint-with-program + 워커 내 lint 실행
  - lint-with-program 유틸리티 (program.getSourceFiles()로 파일 추출, ESLint programs 옵션으로 ts.Program 주입)
  - 각 빌드 워커에서 typecheck 후 같은 thread에서 lint 실행
  - 워커 이벤트에 lint 결과 포함

- [x] Feature 3.2 명령어 lint 통합
  - check/build: 별도 lint 워커 제거, 엔진 lint 결과 사용
  - scripts 패키지: 빌드 엔진 없으므로 별도 ESLint 실행 유지
  - watch/dev: lint 추가 (패키지 전체 re-lint, Program 공유로 빠름)

## 참조 자료

### AotCompilation 내부 구현 (통합 컴파일러의 reference implementation)

AotCompilation은 `@angular/build/private`의 `createAngularCompilation(false, browserOnly)` 팩토리로 생성된다. 내부 상태는 `#state` (JS native private)에 저장되어 외부 접근 불가. 통합 컴파일러는 이 내부 로직을 NgtscProgram 직접 사용으로 재구현한다.

#### AngularCompilationState 필드

| 필드 | 타입 | 역할 |
|------|------|------|
| angularProgram | NgtscProgram | Angular AOT 컴파일러 |
| compilerHost | ts.CompilerHost | TypeScript 호스트 (Angular 훅 확장) |
| typeScriptProgram | ts.EmitAndSemanticDiagnosticsBuilderProgram | Incremental builder |
| affectedFiles | Set<ts.SourceFile> | 변경 영향을 받는 파일 (진단+emit 대상) |
| templateDiagnosticsOptimization | OptimizeFor | 단일파일/전체 최적화 모드 |
| webWorkerTransform | ts.TransformerFactory | Web Worker 경로 변환 |
| diagnosticCache | WeakMap<ts.SourceFile, ts.Diagnostic[]> | 파일별 Angular 템플릿 진단 캐시 |

#### AotCompilation.initialize() 흐름

```
1. @angular/compiler-cli 동적 로드 → NgtscProgram, OptimizeFor
2. tsconfig 로드 + compilerOptionsTransformer 적용
3. packageJsonCache 재사용 (이전 #state에서)
4. HMR 판단 (수정 파일 ≤ 32개 + _enableHmr 옵션)
5. 수정 파일 분석 → node_modules 변경 시 packageJsonCache.clear()
6. createAngularCompilerHost(ts, options, hostOptions, packageJsonCache)
7. NgtscProgram 생성 (이전 #state?.angularProgram 재사용)
8. ensureSourceFileVersions (SHA256 해시 기반)
9. BuilderProgram 생성 (이전 #state?.typeScriptProgram 재사용)
10. analyzeAsync() — AOT 템플릿 분석
11. HMR 후보 수집 (collectHmrCandidates) → emitHmrUpdateModule
12. findAffectedFiles (BuilderProgram.getSemanticDiagnosticsOfNextAffectedFile 루프)
13. 컴포넌트 리소스 의존성 수집 + 리소스 변경 시 diagnosticCache 무효화
14. #state 생성 (diagnosticCache 재사용)
```

#### createAngularCompilerHost가 하는 일

```
1. ts.createIncrementalCompilerHost(options) 기본 호스트 생성
2. JSDocParsingMode.ParseForTypeErrors 설정 (TS 5.3+)
3. host.readResource = (fileName) => readFile(fileName) ?? ""
4. host.transformResource = async (data, context) → hostOptions.transformStylesheet() 콜백
5. host.resourceNameToFileName = (name, containing) → 경로 해석 + 외부 스타일시트 SHA256 ID
6. host.getModifiedResourceFiles = () → hostOptions.modifiedFiles
7. 모듈 해석 캐시 생성 (ts.createModuleResolutionCache + packageJsonCache)
8. augmentHostWithReplacements (파일 치환 — fileReplacements 옵션)
9. augmentHostWithCaching (SourceFileCache — getSourceFile 래핑)
```

#### collectDiagnostics 흐름

```
1. Option 진단: configFileParsingDiagnostics + angularCompiler.getOptionDiagnostics + tsc옵션
2. Syntactic 진단: globalDiagnostics + 파일별 syntacticDiagnostics
3. Semantic 진단: 파일별 semanticDiagnostics
4. Angular 템플릿 진단:
   - affectedFiles에 포함된 파일: angularCompiler.getDiagnosticsForFile() → diagnosticCache.set()
   - affectedFiles에 미포함: diagnosticCache.get() (캐시 사용)
   - 리소스(SCSS/HTML) 변경 시: 해당 .ts 파일의 캐시 무효화 + affectedFiles에 추가
```

#### emitAffectedFiles 흐름

```
1. prepareEmit() → Angular transformers 획득
2. transformers.before에 추가:
   - replaceBootstrap (platformBrowserDynamic → platformBrowser)
   - webWorkerTransform (Worker 경로 변환)
   - lazyRoutesTransformer (SSR only — browserOnlyBuild=false일 때)
3. emitNextAffectedFile 루프 (BuilderProgram이 영향 파일 자동 처리)
4. Angular 고유 emit:
   - TypeScript가 영향받는 것으로 판단하지 않지만 Angular이 처리해야 할 파일
   - safeToSkipEmit 체크: 의존성 미변경 + affectedFiles 미포함 → skip
   - recordSuccessfulEmit 호출 (incremental 추적)
5. 반환: Iterator<{ filename, contents }>
```

### findAffectedFiles 알고리즘

```
1. BuilderProgram.getSemanticDiagnosticsOfNextAffectedFile() 반복 호출
2. 각 affected 파일을 Set에 추가
3. .ngtypecheck.ts 파일이 affected이면 → 원본 .ts 파일도 추가
   (예: component.ngtypecheck.ts → component.ts)
4. buildInfo 사용 시: 모든 TTC 파일의 원본도 추가
```

### ensureSourceFileVersions

- BuilderProgram이 필요로 하는 `ts.SourceFile.version` 필드 추가
- 파일 내용의 SHA256 해시를 version으로 설정
- incremental compilation에서 파일 변경 감지에 사용

### @angular/build/private 사용 현황

프로젝트에서 실제 사용하는 항목 4개 (58개 중):

| 항목 | 사용 파일 | 통합 컴파일러에서의 운명 |
|------|---------|----------------------|
| createAngularCompilation | angular-facade.ts | 제거 — NgtscProgram 직접 사용으로 대체 |
| SourceFileCache | angular-facade.ts | 제거 — 자체 호스트 캐싱으로 대체 |
| JavaScriptTransformer | angular-facade.ts | **유지** — client 빌드에서 JS 변환용 (esbuild 워커 풀 기반 병렬 처리) |
| ComponentStylesheetBundler | angular-facade.ts | **제거** — sass.compileAsync + postcss 직접 사용으로 대체 (Feature 2.2 D1) |

### @angular/compiler-cli 직접 사용

| API | 사용 파일 | 역할 |
|-----|---------|------|
| NgtscProgram | angular-build.ts (re-export) → ngtsc-build-core.ts | Angular AOT 컴파일러 프로그램 |
| OptimizeFor | angular-build.ts (re-export) → ngtsc-build-core.ts | 진단 최적화 레벨 |

통합 컴파일러도 NgtscProgram + OptimizeFor를 직접 사용한다.

### NgtscProgram 주요 API

| API | 역할 |
|-----|------|
| `new NgtscProgram(rootNames, options, host, oldProgram?)` | 생성 (incremental: oldProgram 재사용) |
| `.compiler` | Angular 컴파일러 인스턴스 접근 |
| `.compiler.analyzeAsync()` | AOT 템플릿 분석 (비동기) |
| `.compiler.prepareEmit()` | emit용 transformers 획득 |
| `.compiler.getDiagnosticsForFile(sf, optimization)` | 파일별 Angular 진단 |
| `.compiler.ignoreForEmit` | emit 무시할 파일 Set |
| `.compiler.ignoreForDiagnostics` | 진단 무시할 파일 Set |
| `.compiler.incrementalCompilation.safeToSkipEmit(sf)` | incremental skip 판단 |
| `.compiler.incrementalCompilation.recordSuccessfulEmit(sf)` | emit 기록 (다음 빌드에서 skip 가능) |
| `.compiler.getResourceDependencies(sf)` | 컴포넌트 리소스(.scss/.html) 의존성 |
| `.compiler.emitHmrUpdateModule(node)` | HMR update 모듈 코드 생성 |
| `.getTsProgram()` | ts.Program 추출 — **lint 통합의 핵심** |

### 현재 두 경로의 차이점

| 항목 | library (ngtsc-build-core) | client (AngularFacade) |
|------|--------------------------|----------------------|
| Program 생성 | NgtscProgram 직접 | createAngularCompilation (AotCompilation) |
| .d.ts emit | O (declaration: true/false 제어) | X (declaration: false 강제) |
| ts.Program 접근 | O (getTsProgram()) | X (#state private) |
| SourceFileCache | X | O |
| Diagnostic 캐싱 (WeakMap) | X | O (AotCompilation 내부) |
| emitAffectedFiles 최적화 | X (전체 emit) | O (affected only + safeToSkipEmit) |
| BuilderProgram | X (일반 ts.Program) | O (ts.EmitAndSemanticDiagnosticsBuilderProgram) |
| Package.json 캐시 관리 | X | O |
| HMR | X (불필요) | O |
| SCSS 처리 | sass 직접 (compileScssFile/String) | ComponentStylesheetBundler |
| PostCSS | X | O |
| JS 변환 | X | O (JavaScriptTransformer) |
| ensureSourceFileVersions | X | O (SHA256 기반) |

### Host 확장 매핑 (library → 통합)

| ngtsc-build-core (현재) | createAngularCompilerHost 대응 | 통합 컴파일러에서 |
|------------------------|-------------------------------|-----------------|
| `hostExt.readResource = ts.sys.readFile` | `host.readResource = readFile ?? ""` | 동일 패턴 |
| `hostExt.transformResource (SCSS)` | `host.transformResource → hostOptions.transformStylesheet` | 콜백으로 주입 |
| `hostExt.getModifiedResourceFiles` (watch) | `host.getModifiedResourceFiles → hostOptions.modifiedFiles` | 콜백으로 주입 |
| `createOutputPathRewriter` (host.writeFile 래핑) | host.writeFile 기본 | 커스터마이징 포인트 |
| angularCompilerOptions 수동 병합 | loadConfiguration() 내부 처리 | loadConfiguration() 또는 수동 |

### 파일 규모 (마이그레이션 영향 추정)

| 파일 | 줄 수 | 변경 범위 |
|------|-------|---------|
| ngtsc-build-core.ts | 403 | 전면 교체 |
| angular-facade.ts | 243 | 전면 교체 (통합 컴파일러로 대체) |
| vite-angular-plugin.ts | 204 | 부분 수정 (AngularFacade → 통합 컴파일러) |
| ngtsc-build.worker.ts | 151 | 부분 수정 (API 변경 대응) |
| client.worker.ts | 209 | 부분 수정 |
| angular-build.ts | 33 | 수정 (re-export 변경) |

### 이전 lint 통합 시도에서 확인된 사항

- Worker thread 간 ts.Program 공유 불가 (직렬화 불가) → lint를 빌드 워커 안으로 이동해야 함
- ESLint `parserOptions: { programs: [program], project: null }`로 외부 Program 주입 가능 (typescript-eslint v8.57.2에서 동작 확인)
- FlatESLint 인스턴스는 lintFiles()를 여러 번 호출 가능 (rules/config 1회 로드 후 캐시)
- program.getSourceFiles()에서 패키지 소스 파일을 추출하여 ESLint에 전달 가능 (glob 불필요)
- 현재 check에서 client typecheck는 NgtscEngine으로 포함 (typecheck.ts에서 client 제외 조건 삭제됨)
- 현재 check/build에서 lint는 별도 워커로 병렬 실행 (롤백 상태)

### 현재 명령어별 동작 (롤백 후)

| 명령어 | emit | typecheck | dts | lint | test |
|--------|------|-----------|-----|------|------|
| check | X | O | X | O (별도 병렬) | O |
| build | O | O | O/X | O (별도 병렬) | X |
| watch | O | O | O | X | X |
| dev | O | O | X | X | X |

### 참조 파일

- `packages/sd-cli/src/utils/ngtsc-build-core.ts` — 마이그레이션 대상 (library). createNgtscProgramWithHost, runNgtscBuild, runNgtscRebuild, collectDiagnostics, emitFiles 전체 흐름 확인
- `packages/sd-cli/src/angular/angular-facade.ts` — 마이그레이션 대상 (client). createAngularCompilation 사용 패턴, initialize/update/emitAffectedFiles/diagnose 흐름 확인
- `packages/sd-cli/src/angular/vite-angular-plugin.ts` — client Vite 플러그인. buildStart, handleHotUpdate, transform 훅. HMR lock 패턴 확인
- `packages/sd-cli/src/utils/angular-build.ts` — NgtscProgram, OptimizeFor re-export. AngularLibraryHostExtensions 인터페이스 정의
- `packages/sd-cli/src/workers/ngtsc-build.worker.ts` — library 워커. build, startWatch 흐름. FsWatcher + SCSS 의존성 역추적 패턴 확인
- `packages/sd-cli/src/workers/client.worker.ts` — client 워커. Vite dev server 생성, 프로덕션 빌드 흐름 확인
- `packages/sd-cli/src/engines/BaseEngine.ts` — CommonBuildWorkerEvents 정의. lint 이벤트 추가 시 여기 수정
- `packages/sd-cli/src/engines/types.ts` — EngineResult, BuildOutput 인터페이스. lint 필드 추가 시 여기 수정
- `packages/sd-cli/src/commands/check.ts` — check 명령어. lint 통합 시 별도 runLint 제거
- `packages/sd-cli/src/orchestrators/BuildOrchestrator.ts` — build 명령어. lint 통합 시 별도 lint 태스크 제거
- `packages/sd-cli/src/utils/scss-compiler.ts` — SCSS 컴파일 유틸리티. library의 transformStylesheet 콜백에서 사용
- `node_modules/.pnpm/@angular+build@21.2.5_@angu_2a26e9c246485d21170f7b8cdfba592b/node_modules/@angular/build/src/tools/angular/compilation/aot-compilation.js` — AotCompilation 실제 구현. initialize, collectDiagnostics, emitAffectedFiles, findAffectedFiles, AngularCompilationState 전체 로직 확인
- `node_modules/.pnpm/@angular+build@21.2.5_@angu_2a26e9c246485d21170f7b8cdfba592b/node_modules/@angular/build/src/tools/angular/angular-host.js` — createAngularCompilerHost 구현. 호스트 훅 확장, SourceFileCache 통합, 모듈 해석 캐시, ensureSourceFileVersions 확인

## 완료 후 목표 상태 (최종 정리표)

모든 Feature 완료 후 sd-cli 명령어별 동작:

| 명령어 | 패키지 타입 | emit(JS) | typecheck | dts | lint | test |
|--------|-----------|----------|-----------|-----|------|------|
| **check** | library | X | O | X | O (Program 공유) | O |
| **check** | angular library | X | O (통합컴파일러) | X | O (Program 공유) | O |
| **check** | server | X | O | X | O (Program 공유) | O |
| **check** | client (Angular) | X | O (통합컴파일러) | X | O (Program 공유) | O |
| **check** | scripts | 제외 | 제외 | 제외 | O (별도) | O |
| **build** | library | O (tsc) | O | O | O (Program 공유) | X |
| **build** | angular library | O (통합컴파일러) | O | O | O (Program 공유) | X |
| **build** | server | O (esbuild) | O | X | O (Program 공유) | X |
| **build** | client (Angular) | O (통합컴파일러+Vite) | O | X | O (Program 공유) | X |
| **watch** | library | O (tsc) | O | O | O (Program 공유) | X |
| **watch** | angular library | O (통합컴파일러) | O | O | O (Program 공유) | X |
| **watch** | server/client | 제외 | 제외 | 제외 | 제외 | X |
| **dev** | server | O (esbuild) | O | X | O (Program 공유) | X |
| **dev** | client (Angular) | O (통합컴파일러+Vite) | O | X | O (Program 공유) | X |
| **dev** | library | 제외 | 제외 | 제외 | 제외 | X |

### "Program 공유" 의미

- typecheck에서 생성한 ts.Program을 ESLint의 `parserOptions.programs`에 주입
- ESLint가 자체 Program을 생성하지 않음 (program 중복 생성 제거)
- 빌드 워커 내에서 같은 thread로 실행 (Worker thread 간 Program 공유 불가하므로)
- scripts 패키지만 예외: 빌드 엔진이 없으므로 별도 ESLint 실행

## 완료 후 검증 체크리스트

모든 Feature 완료 후, 아래 항목을 하나씩 검증한다. 하나라도 실패하면 해당 Feature로 돌아가 수정한다.

### 기능 검증

- [ ] `pnpm check` — 전체 패키지 typecheck + lint + test 통과
- [ ] `pnpm check sd-cli` — sd-cli 패키지 단독 통과
- [ ] `pnpm check angular` — angular library 패키지 단독 통과 (통합컴파일러 사용 확인)
- [ ] `pnpm build` — 전체 패키지 프로덕션 빌드 성공
- [ ] `pnpm watch` — library/angular library watch 모드 시작 후 파일 변경 시 rebuild + lint 결과 출력
- [ ] `pnpm dev` — server + client dev 모드 시작 후 파일 변경 시 rebuild + lint 결과 출력

### 아키텍처 검증

- [ ] 통합컴파일러에서 `getTsProgram()` 호출 → ts.Program 반환 확인
- [ ] 통합컴파일러에서 `declaration: true` 설정 시 .d.ts 파일 생성 확인 (library)
- [ ] 통합컴파일러에서 `declaration: false` 설정 시 .d.ts 미생성 확인 (client)
- [ ] angular library watch 모드에서 파일 변경 시 affected 파일만 re-emit 확인 (전체 emit 아님)
- [ ] angular library watch 모드에서 변경되지 않은 파일의 Diagnostic이 캐시에서 반환되는지 확인
- [ ] client dev 모드에서 HMR 동작 확인
- [ ] lint 결과가 빌드 워커 이벤트에 포함되어 출력되는지 확인
- [ ] scripts 패키지의 lint가 별도 실행으로 동작하는지 확인

### 의존성 검증

- [ ] `@angular/build/private`에서 import하는 항목이 `JavaScriptTransformer`만 남았는지 확인
- [ ] `createAngularCompilation`, `SourceFileCache` import가 완전히 제거되었는지 확인
- [ ] 기존 테스트 전체 통과 (`pnpm test sd-cli`)

## 제외 사항

- non-Angular library 빌드 변경 (TscEngine/ServerEsbuildEngine) — 별도 아키텍처, 이번 범위 아님
- `@angular/build/private`의 JavaScriptTransformer 대체 — esbuild 워커 풀 기반 병렬 처리를 자체 구현하는 것은 비용 대비 효과 낮음. client에서 계속 사용
- Vitest Angular 플러그인 (vitest-plugin.ts) 변경 — 별도 경로, 이번 범위 아님
- ESLint rule 변경이나 추가
- `pnpm lint` 단독 명령어 변경 (기존 동작 유지)
