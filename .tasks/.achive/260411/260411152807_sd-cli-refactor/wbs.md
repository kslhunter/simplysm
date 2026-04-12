# WBS: sd-cli 리팩토링 (Critical + Medium 이슈 해결)

## 프로젝트 개요

- **배경:** sd-cli 패키지의 리팩토링 분석(`.tasks/260411152001_angular-refactor/refactor.md`)에서 구조·설계 개선이 필요한 이슈 5건(Critical 1, Medium 4)이 도출되었다.
- **환경:** `packages/sd-cli` — 71개 TypeScript 소스 파일, 95개 테스트 파일. 모노레포 빌드/개발/배포 CLI 도구.
- **전제조건:** 기존 테스트(`pnpm check sd-cli`)가 통과하는 상태에서 시작한다.
- **기술적 제약:** 기존 public API(`index.ts`의 export)는 변경하지 않는다. 리팩토링으로 인한 외부 동작 변경은 없어야 한다.
- **참조 자료:**
  - `.tasks/260411152001_angular-refactor/refactor.md` — 리팩토링 분석 리포트 (이슈 상세 및 suggestion 확인용)
  - `packages/sd-cli/CLAUDE.md` — sd-cli 아키텍처 참조

## Impact Mapping

- **Goal:** sd-cli 코드베이스의 유지보수 비용 감소 — 변경 시 파악해야 할 파일 수와 중복 코드량을 줄인다
  - **Actor:** sd-cli 개발자 (패키지 유지보수자)
    - **Impact:** 코드 변경 시 관련 파일을 빠르게 파악하고, 중복 수정 없이 한 곳만 변경한다
      - **Deliverable:** 미사용 코드 제거, 중복 코드 통합, 과책임 클래스/파일 분리

## Feature Breakdown

### Epic 1. 미사용 코드 제거 및 중복 통합

#### [x] Feature 1.1 worker-events.ts 미사용 코드 제거

**의존성:** 없음

**범위:**

- `src/utils/worker-events.ts`에서 `registerWorkerEventHandlers()` 함수와 관련 타입(`BaseWorkerInfo`, `WorkerEventHandlerOptions`) 삭제
- 이벤트 데이터 타입(`BuildEventData`, `ErrorEventData`, `ServerReadyEventData`, `ServerBuildEventData`)은 유지
- `tests/utils/worker-events.spec.ts`에서 `registerWorkerEventHandlers` 관련 테스트 삭제
- `engine-watch-events.ts`의 테스트가 동일 기능을 커버하는지 확인

**경계:**

- `engine-watch-events.ts`의 `setupWatchEvents()`는 수정하지 않음
- `worker-events.ts` 파일 자체는 삭제하지 않음 (이벤트 데이터 타입이 남아있으므로)

**근거:**

- STRUCT-001: `registerWorkerEventHandlers`는 `src/` 내에서 0곳 import됨. `tests/utils/worker-events.spec.ts`에서만 참조
- `engine-watch-events.ts`의 `setupWatchEvents()`가 동일 역할(buildStart/build/error 이벤트 구독 + ResultCollector/RebuildManager 연동)을 수행

### Epic 2. Orchestrator 설계 개선

#### [x] Feature 2.1 Orchestrator 생명주기 인터페이스 통일 및 config 로드 경로 통합

**의존성:** 없음

**범위:**

- 모든 Orchestrator(Build, Watch, Dev, Typecheck)가 따르는 공통 생명주기 인터페이스 정의
- `BuildOrchestrator.initialize()`의 config 로드를 `loadAndValidateConfig()`로 통일 (현재도 사용 중이므로 변경 없음)
- `TypecheckOrchestrator.initialize()`의 config 로드를 `loadAndValidateConfig()`로 통일 — 단, 경로 기반 대상 필터링(`extractTargetPackageNames`)은 유지
- Orchestrator별 `initialize()`/`start()`/`shutdown()` 시그니처 차이를 인터페이스로 문서화

**경계:**

- `BuildOrchestrator`/`TypecheckOrchestrator`를 `BaseOrchestrator` 상속으로 전환하지 않음 (일회성 실행이므로 SignalHandler/ResultCollector/RebuildManager 불필요)
- Orchestrator의 비즈니스 로직은 변경하지 않음

**근거:**

- DESIGN-001: 4개 Orchestrator의 생명주기가 동일하나 인터페이스로 강제되지 않음
- ARCH-001: config 로드 경로가 3가지로 분산 — `BaseOrchestrator`는 `loadSdConfig()` + `validateTargets()` 직접 호출, `BuildOrchestrator`는 `loadAndValidateConfig()`, `TypecheckOrchestrator`는 `loadSdConfig()` 직접 호출

**설계 결정 (plan 단계):**

- D1: start() 반환 타입은 제네릭 `OrchestratorLifecycle<TStartResult = void>`로 설계. 각 Orchestrator의 실제 반환 타입을 인터페이스에 정확히 표현
- D2: TypecheckOrchestrator의 loadAndValidateConfig 호출 시 `targets: []`로 전달. check.ts에서 이미 workspace 전체 대상으로 targets 검증을 완료한 후 TypecheckOrchestrator를 호출하므로 중복 검증 불필요
- Feature 문서: `2.1-orchestrator-lifecycle-interface.md`

### Epic 3. 과책임 파일 분리

#### [x] Feature 3.1 BuildOrchestrator 코드 중복 제거

**의존성:** Feature 2.1 (인터페이스 정의 후)

**범위:**

- `_addBuildPackageTasks`, `_addServerPackageTasks`, `_addClientPackageTasks` 3개 메서드의 공통 패턴(엔진 생성→실행→diagnostics 역직렬화→결과 수집→엔진 정리)을 private 메서드로 추출
- 각 메서드는 추출된 공통 메서드를 호출하고 후처리(copySrc, 네이티브 빌드)만 수행

**경계:**

- `BuildOrchestrator`의 전체 구조(initialize/start/shutdown)는 변경하지 않음
- 네이티브 빌드(Capacitor/Electron) 로직은 추출 대상이 아님

**근거:**

- DESIGN-003: 3개 메서드 합계 ~170 LOC 중 ~100 LOC가 동일 패턴 반복 (엔진 생성, run, diagnostics 역직렬화, results push, engine.stop)

**설계 결정 (plan 단계):**

- D1: 공통 메서드 `_runEngineTask`를 BuildOrchestrator의 private 메서드로 추출. 인스턴스 상태(`this._cwd`) 접근 필요하며 현재 내부에서만 사용
- D2: `_runEngineTask`는 `BuildStepResult`를 반환 (results에 직접 push하지 않음). 호출측에서 push와 후처리를 명시적으로 제어
- Feature 문서: `3.1-build-orchestrator-dedup.md`

#### [x] Feature 3.2 publish/index.ts 책임 분리

**의존성:** 없음

**범위:**

- `upgradeVersion()`, `computePublishLevels()`를 `publish/version-upgrade.ts`로 추출
- `replaceEnvVariables()`, `waitWithCountdown()`를 `publish/env-utils.ts`로 추출
- `publish/index.ts`에는 `runPublish()` 오케스트레이션과 `publishPackage()` 라우팅만 남김
- 기존 테스트(`tests/commands/publish.spec.ts`)는 `runPublish`만 import하므로 import 경로 변경 불필요 — 추출 함수가 모두 private이었기 때문

**경계:**

- `publishPackage()` 내부의 npm/local/storage 분기 로직은 현재 이미 별도 파일로 분리되어 있으므로 추가 분리하지 않음
- 함수 시그니처는 변경하지 않음

**근거:**

- DESIGN-002: `publish/index.ts`(638 LOC)에 버전 업그레이드, 환경변수 치환, 배포 레벨 계산, 배포 실행, postPublish 스크립트 등 5개 이상의 독립적 책임이 혼재

#### [x] Feature 3.3 AngularCompiler HMR dead code 제거

**의존성:** 없음

**범위:**

- `AngularCompiler`에서 HMR 관련 코드(`enableHmr`, `HMR_MODIFIED_FILE_LIMIT`, stale source 수집, `collectHmrCandidates` 호출, `templateUpdates` 반환) **삭제** (dead code)
- `AngularBuildPipeline`에서 HMR 전파 코드(`enableHmr` 옵션, `templateUpdates` 반환) 삭제
- `hmr-candidates.ts` 삭제 (유일 소비자인 AngularCompiler HMR 코드 제거됨)
- `angular-compiler-hmr.spec.ts`, `hmr-candidates.spec.ts` 삭제
- `vite-angular-plugin.ts`의 `enableHmr: false` 옵션 삭제

**경계:**

- `AngularSourceFileCache`는 AOT 컴파일의 핵심 부분이므로 삭제 대상이 아님 (`modifiedFiles`는 `getModifiedResourceFiles` 훅에서 사용)
- `hmr-service.ts`, `hmr-client-script.ts`, `esbuild-client-config.ts`는 `client.worker.ts` 경로의 HMR 인프라이며 변경하지 않음
- sdAngularPlugin의 외부 인터페이스(Vite 플러그인 훅)는 변경하지 않음

**근거:**

- DESIGN-004: HMR 코드가 `AngularCompiler`에 존재하나, 클라이언트 dev HMR은 `@angular/build/private`의 `createCompilerPlugin`이 자체 처리(`esbuild-client-config.ts:76`). `enableHmr: true`는 테스트에서만 사용되어 **프로덕션 dead code**임이 확인됨
- 설계 결정 D1: "분리"가 아닌 "삭제" 선택 — 사용처 없는 코드를 분리하여 유지하는 것은 불필요한 복잡도

**Feature 문서:** [3.3-angular-compiler-hmr-removal.md](3.3-angular-compiler-hmr-removal.md)

## 제외 사항

- **STRUCT-002 (utils/ 평면 구조):** Low severity. utils/ 하위 디렉토리 재구조화 시 import 경로 변경이 광범위하게 발생하며, 현재 파일명 접두사로 그룹 유추가 가능하여 긴급하지 않음. 사용자 명시적 제외.
- **ARCH-001 (config 로드 경로 분산):** Low severity. Feature 2.1에서 TypecheckOrchestrator의 config 로드를 `loadAndValidateConfig()`로 통일하는 것으로 부분 해결됨. 완전 통합은 BaseOrchestrator 상속 구조 변경이 필요하여 현재 범위 초과. 사용자 명시적 제외.
