# WBS: sd-cli 서버 빌드 파이프라인 통합 및 공통 구조 개선

## 프로젝트 개요

- **배경:** sd-cli 14.x의 서버 빌드에서 esbuild(TS→JS transpile + 번들링)와 tsc(타입체크 + DTS)가 분리되어 수동 병렬 실행 중. TS 파싱이 esbuild와 tsc 양쪽에서 중복 수행됨. 클라이언트(Angular)는 이미 `createCompilerPlugin`으로 esbuild 플러그인 내 컴파일러가 통합되어 있으나, 서버만 분리 구조를 유지하고 있어 빌드 타입 간 아키텍처 비일관성이 존재함.
- **환경:** Node.js 20, TypeScript 5.9, esbuild, sd-cli 14.x 모노레포
- **전제조건:** 12.x 코드베이스(`D:\workspaces-12\simplysm\packages\sd-cli`) 참조 가능. 12.x의 `createSdServerPlugin` 패턴(tsc-in-esbuild-plugin)이 검증된 선례.
- **기술적 제약:**
  - 기존 `BuildEngine` 인터페이스 유지 (외부 인터페이스 변경 없음)
  - Worker Thread 격리 패턴 유지
  - `ResultCollector` + `RebuildManager` 배치 처리 패턴 유지
  - 타입에러 발생 시 서버 시작을 막아야 함 (의도된 동작)
- **참조 자료:**
  - `D:\workspaces-12\simplysm\packages\sd-cli\src\pkg-builders\server\createSdServerPlugin.ts` — 12.x의 tsc-in-esbuild-plugin 패턴 (onStart에서 tsc를 **await**하여 완료 후 빌드 진행, onLoad에서 메모리 기반 JS 전달). 이번에는 onStart에서 **await하지 않고** microtask로 병렬 실행하는 점이 다름
  - `D:\workspaces-14\simplysm\packages\sd-cli\src\workers\server-build.worker.ts` — 현재 14.x 서버 빌드 워커 (esbuild ‖ tsc 수동 병렬)
  - `D:\workspaces-14\simplysm\packages\sd-cli\src\esbuild\esbuild-client-config.ts` — 클라이언트의 Angular 플러그인 통합 패턴 참조

## Impact Mapping

- **Goal:** 빌드 파이프라인의 아키텍처 일관성 향상 및 관리 포인트 감소
  - **Actor:** sd-cli 개발자/유지보수자
    - **Impact:** 서버 빌드 구조가 클라이언트와 동일한 "esbuild + 컴파일러 플러그인" 패턴을 가져, 코드 이해·수정이 용이해짐
      - **Deliverable:** esbuild 플러그인으로 tsc를 통합한 서버 빌드 파이프라인
    - **Impact:** 수동 병렬 관리 코드가 제거되어 watch 모드 유지보수 부담이 줄어듦
      - **Deliverable:** 단일 `esbuild.build()` / `context.rebuild()` 호출로 통합된 빌드 흐름

## Feature Breakdown

### Epic 1. 서버 빌드 파이프라인 통합

esbuild 플러그인으로 tsc를 통합하여, 서버 빌드의 수동 병렬 구조(`esbuild ‖ tsc`)를 단일 esbuild 파이프라인으로 변경한다.

#### [x] Feature 1.1: esbuild tsc 플러그인 생성

**의존성:** 없음

**범위:**

- 새 파일 `src/esbuild/esbuild-tsc-plugin.ts` 생성
- `createTscPlugin(options)` 함수: `esbuild.Plugin` + getter 객체를 반환
  - 옵션: `pkgDir`, `cwd`, `output: { dts: boolean }`, `env?: TypecheckEnv`, `includeTests?: boolean`
- `onStart` 훅: `runTscPackageBuild()`를 microtask로 스케줄링하여 병렬 실행
  - **메커니즘**: `runTscPackageBuild()`는 **동기 함수**이므로, `Promise.resolve().then(() => runTscPackageBuild({...}))` 패턴으로 microtask 큐에 등록한다. onStart에서 이 Promise를 **await하지 않고** 저장만 한다. esbuild Go 네이티브 코드가 TS→JS transpile을 진행하는 동안, Node.js 메인 스레드에서 microtask로 tsc가 동기 실행되어 실질적 병렬성을 달성한다.
  - **전제조건**: 서버 빌드에 onLoad/onResolve 콜백이 있는 다른 esbuild 플러그인이 없어야 한다. tsc가 메인 스레드를 동기적으로 점유하므로, 다른 JS 콜백이 있으면 블로킹된다. 현재 `createServerEsbuildOptions()`는 plugins를 반환하지 않으므로 성립한다.
  - **parsedConfig 갱신**: onStart 내부에서 매 호출마다 `parseTsconfig(pkgDir)`를 호출하여 최신 tsconfig를 반영한다. 파일 추가/삭제 후 `recreateContext()` → 다음 rebuild의 onStart에서 자동 갱신.
- `onEnd` 훅:
  - tsc Promise를 await하여 결과 수집
  - tsc 결과(errors, diagnostics, program, affectedFiles, builderProgram)를 플러그인 내부 상태에 저장
  - tsc 내부에서 throw된 예외는 try-catch로 포착하여 내부 에러 상태에 저장
  - **`result.errors`에 push하지 않음** — esbuild `BuildFailure` throw 방지. 에러는 getter로 외부에서 조회
  - `BuilderProgram` 캐시 갱신
- 내부 상태 관리:
  - `lastBuilderProgram`: watch 모드 증분 빌드용 `BuilderProgram` 캐싱
  - `lastProgram`: lint 통합용 `ts.Program` 보관
  - `lastAffectedFiles`: 증분 lint용 affected files 보관
  - `lastDiagnostics`: `SerializedDiagnostic[]` 보관
- 외부 인터페이스 (워커에서 lint/diagnostics 연결용):
  - `getProgram(): ts.Program | undefined`
  - `getAffectedFiles(): ReadonlySet<string> | undefined`
  - `getDiagnostics(): SerializedDiagnostic[]` — one-shot build()에서 `ServerBuildResult.build.diagnostics`로 전달
  - `getErrors(): string[] | undefined` — tsc 에러 조회 (Feature 1.2/1.3에서 참조). onEnd 설명 "에러는 getter로 외부 조회"에 해당
  - `resetBuilderProgram(): void` — context 재생성 시 호출
- **인스턴스 소유 패턴**:
  - one-shot `build()`: 함수 로컬 변수로 플러그인 생성 → `esbuild.build({plugins: [tscPlugin]})` 전달 → 빌드 후 getter로 결과 접근
  - watch `startWatch()`: `server-esbuild-context.ts` 모듈 스코프에 저장 → 위임 메서드(`getTscProgram()` 등)로 접근

**경계:**

- lint 실행 자체는 이 플러그인에서 하지 않음 (워커에서 `ts.Program`을 받아 `LintWithProgramRunner`로 처리)
- esbuild 옵션 생성(`createServerEsbuildOptions`)은 변경하지 않음
- esbuild의 TS→JS transpile 동작은 변경하지 않음 (플러그인은 타입체크 + DTS만 담당)
- `output.js === false`일 때 이 플러그인은 사용되지 않음 (esbuild 미실행 시 onStart/onEnd 미트리거). fallback은 Feature 1.3에서 처리

**근거:**

- 대화: "esbuild의 transpile을 사용하면서 on~을 통해 중간에 가로채서 .d.ts 및 타입체크 하는 방식"
- 대화: "onStart에서 tsc를 시작만 하고 await하지 않으면, esbuild transpile과 진짜 병렬로 돌릴 수 있다"
- 12.x `createSdServerPlugin`의 onStart/onLoad/onEnd 패턴 참조 (단, 12.x는 onStart에서 tsc를 **await**하여 완료 후 빌드를 진행했으나, 이번에는 **await하지 않고** microtask로 병렬 실행. 또한 12.x는 onLoad에서 tsc emit JS를 전달했으나, 이번에는 esbuild 자체 transpile을 사용하므로 onLoad 가로채기 불필요)
- 14.x `runTscPackageBuild()`의 인터페이스(`TscPackageBuildOptions`, `TscPackageBuildResult`) 그대로 활용
- `server-build.worker.ts:166-170` — 현재 `.catch()` 핸들러 패턴 → 플러그인 내부에서도 동일한 방어적 에러 핸들링 필요
- esbuild API: `onEnd`에서 `result.errors`에 push하면 `esbuild.build()`가 `BuildFailure`를 throw할 위험이 있으므로, tsc 결과는 플러그인 내부 상태에 저장하고 getter로 외부 조회하는 방식을 채택

#### [x] Feature 1.2: server-esbuild-context.ts 통합

**의존성:** Feature 1.1

**범위:**

- `EsbuildContextOptions` 인터페이스에 tsc 관련 옵션 추가 (`cwd`, `output.dts`, `env`, `includeTests`)
- `createContext()`: tsc 플러그인을 포함한 esbuild context 생성. 플러그인 인스턴스를 모듈 스코프에 보관
- `recreateContext()`: LOGIC-001 패턴 유지 + 플러그인의 `resetBuilderProgram()` 호출로 tsc 증분 상태 리셋
- `rebuild()`: context.rebuild() 호출 후, tsc 에러를 플러그인 getter(`getErrors()`)에서 조회하여 esbuild 에러와 병합. **반환 타입 변경 없음** — 기존 `{ success, errors?, warnings? }` 유지. 병합 로직: `[...esbuildErrors, ...(tscPlugin.getErrors() ?? [])]`
- `dispose()`: 플러그인 참조 해제
- 새 메서드 (플러그인 getter 위임):
  - `getTscProgram(): ts.Program | undefined`
  - `getTscAffectedFiles(): ReadonlySet<string> | undefined`
  - `getTscDiagnostics(): SerializedDiagnostic[]` — one-shot build()에서 `ServerBuildResult`에 포함
- **server-watch-manager.ts 관련** (기존 Feature 1.4에서 병합):
  - `recreateContext()`에서 tsc 플러그인 리셋이 자동으로 이루어지므로, 파일 추가/삭제 시 watch-manager의 `esbuildCtx.recreateContext()` 호출이 tsc도 리셋
  - rebuild 콜백 시그니처 변경 불필요 — tsc errors가 esbuild 결과에 통합되므로 기존 반환 타입 유지
  - watch-manager는 현재 tsc를 직접 참조하지 않으므로 (`server-watch-manager.ts:40-124`), 실질적 코드 변경 없음. 동작 확인만 수행

**경계:**

- `getMetafile()`, `hasContext()`는 기존 동작 유지
- LOGIC-001 패턴(선제 초기화 + try/finally)의 핵심 구조는 변경하지 않음
- `FsWatcher` 감시 로직, `onChange` 핸들러, `hasFileAddOrRemove()`, metafile 기반 필터링, pnpm symlink 대응 — 모두 기존 동작 유지

**근거:**

- `server-esbuild-context.ts:83-94` — LOGIC-001 패턴
- `server-esbuild-context.ts:64-71` — 현재 rebuild()가 `result.errors.map(e => e.text)`로 string[] 변환. tsc errors가 result.errors에 포함되면 자동으로 string[]에 통합됨
- `server-watch-manager.ts:40-124` — watch 루프 전체 흐름. tsc 직접 참조 없음 확인
- 대화: "context 재생성 시 tsc BuilderProgram도 같이 리셋해야"

**설계 결정 (plan):**

- D1: tsc 옵션을 `EsbuildContextOptions`에 optional nested `tsc` 객체로 추가. 기존 `env?: Record<string, string>`와 tsc `env?: TypecheckEnv` 이름 충돌 해결 + `recreateContext()` 호출부(server-watch-manager.ts) 변경 불필요
- D2: `createContext(options.tsc)` 존재 시만 새 플러그인 생성, 부재 시 기존 모듈 스코프 플러그인 재사용
- D3: `recreateContext()`에서 `resetBuilderProgram()` + 기존 플러그인 재사용 (tsc options 불변)

#### [x] Feature 1.3: server-build.worker.ts 리팩토링

**의존성:** Feature 1.2

**범위:**

- `build()` 함수 변경:
  - 현재: `esbuildPromise = esbuild.build()` ‖ `tscResult = runTscPackageBuild()` 수동 병렬 (line 146-185)
  - 변경 (`output.js === true`): 로컬 변수로 `createTscPlugin()` 생성 → `esbuild.build({ ...esbuildOptions, plugins: [tscPlugin.plugin] })` 단일 호출 + `.catch()` 핸들러 유지(esbuild 자체 에러 대응). tsc 결과는 플러그인 getter로 별도 조회: `tscPlugin.getErrors()`, `tscPlugin.getDiagnostics()`. esbuild 에러와 tsc 에러를 워커에서 병합 (`[...jsResult.errors, ...(tscPlugin.getErrors() ?? [])]` — 현재 패턴 `server-build.worker.ts:209`와 동일)
  - 변경 (`output.js === false`): esbuild 미실행. `runTscPackageBuild()` **직접 호출 유지** (플러그인 경유 불가 — esbuild 미실행 시 onStart/onEnd 미트리거)
  - lint: `tscPlugin.getProgram()` (js=true) 또는 `tscResult.program` (js=false)으로 `ts.Program` 획득
- `rebuildAll()` 함수 변경:
  - 현재: `esbuildCtx.rebuild()` ‖ `runTscPackageBuild(..., oldBuilderProgram)` 수동 병렬 (line 243-296)
  - 변경 (`output.js === true`): `esbuildCtx.rebuild()` 한 번 호출. 플러그인이 tsc를 자동 트리거. esbuild 에러와 tsc 에러는 `rebuild()` 내부에서 병합됨
  - **동작 변경 (lint 직렬화)**: 현재는 tsc 완료 직후 lint를 시작하여 esbuild와 잠재적 병렬 실행이 가능하나, 새 구조에서는 `rebuild()` 완료(esbuild + tsc 모두) 후 lint가 직렬 실행됨. lint도 메인 스레드 CPU-bound이므로 실질적 성능 차이는 미미
  - 변경 (`output.js === false`): `runTscPackageBuild()` 직접 호출 유지 (build()와 동일 사유)
  - lint: `esbuildCtx.getTscProgram()` + `esbuildCtx.getTscAffectedFiles()` (js=true) 또는 `tscResult` 직접 사용 (js=false)
- `startWatch()` 함수 변경:
  - `esbuildCtx.createContext()`에 tsc 관련 옵션 전달
  - 초기 빌드도 `rebuildAll()` 통해 단일 호출
- 모듈 스코프 상태 정리:
  - `lastBuilderProgram` 제거 (플러그인/context에서 관리) — `output.js === false` 경로에서는 로컬 변수로 관리
  - `runTscPackageBuild` import는 **유지** (`output.js === false` fallback에서 사용)
  - `watchInfo`, `watchLintRunner` 제거 — D1(클로저 이동)의 자연적 귀결로, `rebuildAll()`이 `startWatch()` 내부로 이동하면서 `info` 파라미터를 직접 사용하고 로컬 변수로 관리
- 외부 인터페이스 유지:
  - `ServerBuildInfo`, `ServerWatchInfo`, `ServerBuildResult`, `ServerCombinedBuildEvent`, `ServerBuildWorkerEvents` — 변경 없음
  - Worker 이벤트(`buildStart`, `build`, `error`) — 변경 없음

**경계:**

- `ServerEsbuildEngine`과의 인터페이스는 변경하지 않음 (워커의 내부 구현만 변경)
- `collectAllExternals`, `generateProductionFiles`, `copyPublicFiles` 등 프로덕션 아티팩트 생성 로직은 변경하지 않음
- `.config.json` 작성, public 파일 감시 등 부수 로직은 변경하지 않음

**근거:**

- `server-build.worker.ts:146-185` — build() 함수의 수동 병렬 코드
- `server-build.worker.ts:154,250` — `info.output.js` 분기. js=false일 때 esbuild 미실행, tsc만 실행
- `server-build.worker.ts:243-296` — rebuildAll() 함수의 수동 병렬 코드
- `server-build.worker.ts:238` — `lastBuilderProgram` 모듈 스코프 상태
- 대화: "esbuild.build() 한 번 호출로 단일 파이프라인"

**설계 결정 (plan):**

- D1: `lastBuilderProgram` 로컬 관리 방식 → B. 클로저 이동. `rebuildAll()`을 `startWatch()` 내부 클로저로 이동하여 `lastBuilderProgram`, `watchLintRunner`를 로컬 변수로 캡처. `watchInfo`는 `info` 파라미터로 대체

### Epic 2. 테스트 업데이트

구조 변경에 따라 기존 테스트를 업데이트하고, 새로 생성된 플러그인의 테스트를 작성한다.

#### [x] Feature 2.1: esbuild tsc 플러그인 테스트

**의존성:** Feature 1.1

**범위:**

- 새 파일 `tests/esbuild/esbuild-tsc-plugin.spec.ts` 생성 (src/ 미러링 원칙에 따라 `tests/esbuild/` 디렉토리 신설)
- `createTscPlugin()` 단위 테스트:
  - onStart에서 tsc가 microtask로 스케줄링되는지 검증
  - onEnd에서 타입 에러가 `result.errors`에 push되지 않고 `getErrors()`로만 조회되는지 검증
  - onEnd에서 tsc 예외 throw 시 에러 핸들링 검증
  - DTS emit 제어 (`output.dts: true/false`)
  - `getProgram()`, `getAffectedFiles()`, `getDiagnostics()`, `getErrors()` 반환값 검증
  - `resetBuilderProgram()` 호출 후 상태 리셋 검증
  - watch 모드 증분 빌드 (`BuilderProgram` 재사용) 검증

**경계:**

- 실제 esbuild 빌드 실행 테스트는 통합 테스트(Feature 2.3)에서 수행
- `runTscPackageBuild`는 모킹하여 단위 테스트에 집중

**근거:**

- 새로 생성되는 핵심 모듈이므로 단위 테스트 필수
- 기존 `tests/utils/esbuild-config.spec.ts` 패턴 참조

#### [x] Feature 2.2: 기존 서버 빌드 테스트 업데이트

**의존성:** Feature 1.3

**범위:**

- `tests/workers/server-build-worker.spec.ts` — build/rebuildAll 호출 구조 변경 반영
- `tests/workers/server-build-lint.spec.ts` — lint 연결 경로 변경 반영 (플러그인에서 ts.Program 획득)
- `tests/workers/server-esbuild-context.spec.ts` — tsc 관련 옵션/메서드 추가 반영
- `tests/workers/server-esbuild-context.acc.spec.ts` — context 통합 테스트 업데이트
- `tests/workers/server-watch-manager.spec.ts` — rebuild 결과 타입 변경 없으므로 변경 최소. recreateContext()의 tsc 리셋 동작 확인
- `tests/workers/server-watch-manager.acc.spec.ts` — watch 통합 테스트 업데이트
- `tests/engines/server-esbuild-engine.spec.ts` — 엔진 테스트 (외부 인터페이스 불변이므로 변경 최소)

**경계:**

- `tests/utils/tsc-build.spec.ts`는 `runTscPackageBuild` 자체가 변경되지 않으므로 수정 불필요
- `tests/utils/esbuild-config.spec.ts`는 `createServerEsbuildOptions`가 변경되지 않으므로 수정 불필요

**근거:**

- 내부 구현 변경에 따른 기존 테스트의 모킹/검증 로직 업데이트 필요
- 외부 인터페이스(ServerBuildInfo 등)는 불변이므로 엔진 테스트 변경 최소

#### [x] Feature 2.3: 통합 테스트 회귀 검증

**의존성:** Feature 2.2

**범위:**

- `tests/sd-cli-server/` 통합 테스트 실행 및 통과 확인
- `pnpm check -t sd-cli` (typecheck + lint + test) 전체 통과 확인
- dev 모드 수동 검증: 실제 서버 패키지로 `pnpm dev` 실행하여 watch 모드 동작 확인

**경계:**

- 다른 패키지(angular, core-common 등)의 테스트는 이 범위에 포함하지 않음

**근거:**

- 빌드 인프라 변경이므로 회귀 검증 필수
- 단위 테스트만으로는 watch 모드의 실제 동작을 보장할 수 없으므로 통합/수동 검증 포함

**설계 결정 (plan):**

- D1: dev 모드 수동 검증 — 이 모노레포에 `target: "server"` 패키지가 없으므로(`sd.config.ts`), 사용자가 외부 프로젝트에서 수동 수행

### Epic 3. 문서 및 정리

#### [x] Feature 3.1: 아키텍처 문서 업데이트

**의존성:** Feature 1.3

**범위:**

- `packages/sd-cli/CLAUDE.md` — Architecture 섹션의 서버 빌드 설명 업데이트
  - "server-build.worker.ts — esbuild + tsc 병렬" → "esbuild + tsc 플러그인 통합"
  - Key Patterns에 "esbuild tsc 플러그인" 패턴 설명 추가
- 새 파일에 대한 Architecture 트리 업데이트 (`esbuild-tsc-plugin.ts`)

**경계:**

- 프로젝트 루트 CLAUDE.md는 이 Feature에서 변경하지 않음 (sd-cli 패키지 CLAUDE.md만)
- 사용법 문서(usage docs)는 외부 인터페이스 변경 없으므로 불필요

**근거:**

- `packages/sd-cli/CLAUDE.md`에 현재 아키텍처가 상세히 기술되어 있으므로 변경 반영 필요

## 제외 사항

- **라이브러리 빌드(TscEngine) 변경** — 라이브러리는 번들링이 필요 없어 tsc 단독이 적합. 사유: Goal(아키텍처 일관성)에 연결되지 않음
- **Angular 라이브러리 빌드(NgtscEngine) 변경** — 이미 NgtscProgram으로 통합되어 있음. 사유: 이미 달성됨
- **클라이언트 빌드(EsbuildClientEngine) 변경** — 이미 Angular `createCompilerPlugin`으로 통합되어 있음. 사유: 이미 달성됨
- **12.x의 SdTsCompiler 공통 래퍼 도입** — 14.x에서 의도적으로 분리한 모듈화를 역행. 사유: 14.x의 `runTscPackageBuild` + 각 워커별 호출 패턴이 더 명확
- **12.x의 SdDepAnalyzer/SdDepCache 도입** — 14.x의 `BuilderProgram` 증분 빌드가 더 효율적. 사유: 14.x가 이미 더 나은 전략
- **Worker 간 watch 루프 공통 추상화** — library-build, ngtsc-build, server-build 각각의 watch 루프가 유사하지만 차이(metafile 필터링, SCSS 역방향 탐색 등)가 있어 무리한 공통화는 복잡도만 증가. 사유: 범위 초과
