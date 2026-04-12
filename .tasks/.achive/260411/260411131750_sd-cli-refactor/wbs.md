# WBS: sd-cli 패키지 리팩토링

## 프로젝트 개요

- **배경:** 리팩토링 분석(`.tasks/260411130908_refactor-sd-cli/refactor.md`)에서 9건의 구조/설계/아키텍처 이슈가 발견됨. 비대한 파일(850줄, 796줄, 595줄 등)과 책임 과다 클래스가 유지보수 비용을 증가시키고 있음.
- **환경:** `@simplysm/sd-cli` 패키지. TypeScript ESM, Node.js 20, Vitest 테스트 프레임워크. 71개 소스 파일.
- **전제조건:** 기존 테스트가 모두 통과하는 상태에서 시작. 기능 변경 없이 구조만 개선.
- **기술적 제약:** 외부 API(export) 변경 최소화. `index.ts`의 public export(`sdAngularPlugin`, `SdAngularPluginOptions`, 설정 타입들)는 유지해야 함.
- **참조 자료:**
  - `.tasks/260411130908_refactor-sd-cli/refactor.md` — 리팩토링 분석 리포트 (이슈 상세 내용)
  - `packages/sd-cli/CLAUDE.md` — 패키지 아키텍처 및 테스트 가이드

## Impact Mapping

- **Goal:** sd-cli 코드 변경 시 파급 범위를 예측 가능하게 하고, 파일당 평균 책임을 단일화하여 유지보수 비용 감소
  - **Actor:** sd-cli 유지보수 개발자
    - **Impact:** 특정 기능 수정 시 관련 파일만 파악하면 된다 (비관련 코드와의 혼재 해소)
      - **Deliverable:** 비대 파일 분할 (publish.ts, replace-deps.ts, package-utils.ts)
      - **Deliverable:** 과다 책임 클래스 분리 (DevWatchOrchestrator, Capacitor)
    - **Impact:** 엔진 추가/수정 시 이벤트 처리 패턴을 한 곳에서만 변경한다
      - **Deliverable:** BaseEngine/EsbuildClientEngine 이벤트 처리 공통화
    - **Impact:** 오케스트레이터 로직 흐름을 단계별로 파악할 수 있다
      - **Deliverable:** Orchestrator start() 메서드 분해
    - **Impact:** 엔진 팩토리의 책임 경계가 명확해진다
      - **Deliverable:** TypecheckOrchestrator의 target 변환을 팩토리로 이동
    - **Impact:** 디렉토리 구조가 실제 내용을 반영한다
      - **Deliverable:** infra/ 디렉토리 재구조화

## Feature Breakdown

### Epic 1. 오케스트레이터 구조 개선

#### [x] Feature 1.1 DevWatchOrchestrator 분리

**의존성:** 없음

**범위:**

- `DevWatchOrchestrator`를 `WatchOrchestrator`와 `DevOrchestrator`로 분리
- 서버 런타임 관리 로직(`_startServerRuntime`, `_restartServers`, `_serverRuntimeWorkers`)을 `ServerRuntimeManager` 클래스로 추출
- 공통 초기화 로직을 `BaseOrchestrator` 추상 기반 클래스로 추출 (D1: 기반 클래스 상속 선택)
- `commands/watch.ts`와 `commands/dev.ts`가 각각 새 오케스트레이터를 사용하도록 변경
- 기존 테스트(`tests/orchestrators/`) 분리된 구조에 맞게 업데이트

**설계 결정:** [D1] 공통 초기화 공유 방식 → 기반 클래스 상속 (BaseOrchestrator). BuildOrchestrator는 대상 아님 (인프라 구조가 다름).

**경계:**

- Orchestrator start() 메서드 내부 분해는 Feature 1.2에서 다룸
- 엔진 계층의 변경은 이 Feature에서 다루지 않음

**근거:**

- DESIGN-001 (Critical): DevWatchOrchestrator 595줄, 25+ 필드, watch/dev 모드별 전용 상태 혼재

#### [x] Feature 1.2 Orchestrator start() 메서드 분해

**의존성:** Feature 1.1

**범위:**

- `BuildOrchestrator.start()` (244줄)을 단계별 private 메서드로 분해 (`_cleanDist`, `_buildAllPackages`, `_addBuildPackageTasks`/`_addServerPackageTasks`/`_addClientPackageTasks`, `_printBuildResults`)
- `TypecheckOrchestrator.start()` (170줄)을 단계별 private 메서드로 분해 (`_executePackageTypechecks`, `_executeNonPackageTypecheck`, `_aggregateTypecheckResults`)
- 기존 테스트 유지 (메서드 분해는 내부 변경이므로 public API 불변)

**설계 결정:** [D1] WatchOrchestrator/DevOrchestrator 분해 여부 → 분해하지 않음 (WatchOrchestrator 64줄로 적절, DevOrchestrator 이미 private 메서드로 분해됨)

**경계:**

- BuildOrchestrator/TypecheckOrchestrator의 클래스 분리는 하지 않음 (메서드 분해만)
- WatchOrchestrator/DevOrchestrator는 변경하지 않음 [D1]

**근거:**

- DESIGN-002 (Medium): start() 메서드가 244줄/170줄로 로직 흐름 파악 어려움

#### [x] Feature 1.3 TypecheckOrchestrator target 변환 이동

**의존성:** Feature 1.2

**범위:**

- `TypecheckOrchestrator`에서 수행하는 `target: "client"` → `target: "browser"` 변환을 엔진 팩토리(`engines/index.ts`)로 이동
- `createTypecheckEngine()` 팩토리 함수 신설 (client→browser 재매핑 후 `createBuildEngine`에 위임)
- `TypecheckOrchestrator`에서 target 변환 로직 제거, `createTypecheckEngine` 호출로 변경
- 기존 테스트(`tests/engines/engine-selection.spec.ts`) 업데이트

**설계 결정:** [D1] 팩토리 API 형태 → `createTypecheckEngine()` 별도 함수 신설. 함수명으로 의도 전달, createBuildEngine 시그니처 불변.

**경계:**

- 엔진 팩토리의 다른 선택 로직은 변경하지 않음

**근거:**

- ARCH-001 (Low): 엔진 선택은 팩토리 책임인데 오케스트레이터가 일부를 수행

### Epic 2. 엔진 이벤트 처리 공통화

#### [x] Feature 2.1 BaseEngine/EsbuildClientEngine 이벤트 중복 제거

**의존성:** 없음

**범위:**

- `BaseEngine.startWatch()`와 `EsbuildClientEngine.startWatch()`에서 공통되는 build/error 이벤트 처리 로직(~25줄)을 `utils/engine-watch-events.ts`의 `setupWatchEvents()` 헬퍼로 추출
- 헬퍼 함수: ResultCollector 등록, RebuildManager 연동, 초기 빌드 완료 감지(`waitForInitialBuild()`)를 캡슐화
- `EsbuildClientEngine`은 헬퍼 사용 + `serverReady` 이벤트만 추가 처리 (`waitForInitialBuild()` 미사용, 기존 `worker.startWatch()` await 유지)
- 기존 테스트(`tests/engines/base-engine.spec.ts`, `tests/engines/esbuild-client-engine.spec.ts`) 유지

**경계:**

- BaseEngine의 템플릿 메서드 패턴 자체는 변경하지 않음
- EsbuildClientEngine을 BaseEngine 상속으로 전환하지 않음 (독립 구현 유지)
- lint 결과 보고, 경고 로깅은 BaseEngine 내부에 유지 (헬퍼 범위 밖)

**설계 결정:** [D1] 헬퍼 API 설계 → 헬퍼가 worker.on() 직접 호출 + `normalizeBuild` 콜백으로 엔진별 이벤트 데이터 정규화 (호출측 코드 최소화)

**근거:**

- DESIGN-003 (Medium): 중복 이벤트 처리로 한쪽만 수정하는 실수 위험

### Epic 3. 비대 파일 분할

#### [x] Feature 3.1 publish.ts 분할

**의존성:** 없음

**범위:**

- `commands/publish.ts` (850줄)을 배포 전략별로 분할:
  - `commands/publish/index.ts` — 진입점 + 버전/Git 오케스트레이션 (기존 import 경로 `"./commands/publish"` 유지)
  - `commands/publish/npm-publisher.ts` — npm publish 로직
  - `commands/publish/storage-publisher.ts` — FTP/SFTP/FTPS 배포 + SSH 키 등록
  - `commands/publish/local-publisher.ts` — 로컬 디렉토리 복사
- 기존 테스트 단일 파일 유지 (runPublish 통합 관점이므로 분할 불필요)

**경계:**

- publish 기능의 동작 변경 없음 (구조만 분할)

**근거:**

- STRUCT-001 (Critical): 850줄 단일 파일에 5가지 이상의 배포 전략이 혼재

#### [x] Feature 3.2 replace-deps.ts 분할

**의존성:** 없음

**범위:**

- `utils/replace-deps.ts` (410줄)을 기능 단위로 분할:
  - 해석 로직 (`resolveReplaceDepEntries`, `resolveAllReplaceDepEntries`)
  - 실행 로직 (`setupReplaceDeps`, `watchReplaceDeps`)
- 분할 방식 (별도 파일 vs 같은 디렉토리 내 분리)은 구현 시 결정
- 기존 테스트 유지

**경계:**

- replace-deps 기능의 동작 변경 없음

**근거:**

- STRUCT-002 (Medium): 4가지 독립 기능이 하나의 파일에 집중 (410줄)

#### [x] Feature 3.3 package-utils.ts 분할

**의존성:** 없음

**범위:**

- `utils/package-utils.ts` (397줄)을 책임별로 분할:
  - 패키지 분류 (`classifyWatchPackages`, `classifyDevPackages`, `filterPackagesByTargets`)
  - 의존성 수집 (`collectDeps`, `resolveWorkspaceDeps`)
- 기존 테스트 유지

**경계:**

- 패키지 유틸 기능의 동작 변경 없음

**근거:**

- STRUCT-003 (Medium): 패키지 분류와 의존성 수집이라는 서로 다른 책임이 혼재 (397줄)

### Epic 4. 플랫폼/인프라 구조 개선

#### [x] Feature 4.1 Capacitor 클래스 분할

**의존성:** 없음

**범위:**

- `capacitor/capacitor.ts` (796줄)에서 빌드/서명 관련 로직과 아이콘 생성 로직을 분리:
  - `capacitor.ts` — 초기화 + 실행 오케스트레이션 (~500줄)
  - `capacitor-build.ts` — Gradle 빌드 + 서명 설정 + 출력 복사 (~120줄)
  - `capacitor-icon.ts` — Sharp 아이콘 생성 (~70줄)
- 추출 패턴: capacitor-android.ts와 동일한 standalone 함수 export
- build() 메서드는 Capacitor 클래스에 유지, 내부 구현만 위임
- 기존 테스트(`tests/capacitor/`) 유지

**설계 결정:** [D1] 추출 API 형태 → standalone 함수 (capacitor-android.ts 패턴 일관성). [D2] build() 위치 → Capacitor 클래스 유지 (public API 보존). [D3] 명령어 실행 → 추출 파일에서 cpx 직접 import.

**경계:**

- `capacitor-android.ts`는 현재 구조 유지 (이미 분리됨)
- Capacitor 기능의 동작 변경 없음

**근거:**

- DESIGN-004 (Medium): 초기화/실행/빌드/아이콘 생성이 단일 클래스 796줄에 집중

#### [x] Feature 4.2 infra/ 디렉토리 재구조화

**의존성:** 없음

**범위:**

- `infra/` 디렉토리를 `runtime/`으로 이름 변경
- `ResultCollector.ts`와 `SignalHandler.ts`의 디렉토리명 변경 (`src/infra/` → `src/runtime/`)
- import 경로 업데이트 (사용처: engines 6개, orchestrators 2개, utils 2개, tests 5개)
- 기존 테스트(`tests/infra/` → `tests/runtime/`) 업데이트
- `packages/sd-cli/CLAUDE.md` 디렉토리 구조 설명 업데이트

**설계 결정:** [D1] 새 디렉토리명 → `runtime/`. ResultCollector(런타임 결과 추적) + SignalHandler(런타임 시그널 처리)의 역할을 포괄.

**경계:**

- 새로운 인프라 유틸리티 추가는 하지 않음 (위치 변경만)

**근거:**

- STRUCT-004 (Low): "infra"라는 광범위한 이름에 2개 파일(87줄)만 존재

## 제외 사항

- **utils/ 하위 폴더 재구조화 (angular/, esbuild/ 등 서브디렉토리 생성)**: 리팩토링 분석에서 제안되었으나, 현재 파일 수준 분할만으로 충분하며 디렉토리 구조 변경은 파급이 큼 (범위 초과)
- **파일 감시 패턴 공통화 (copy-public, copy-src, replace-deps)**: 유사 패턴이 존재하나 각 파일이 200줄 미만이고 동작이 미묘하게 달라 추상화의 가치 대비 리스크가 큼 (Goal 미연결)
- **Worker 이벤트 타입 표준화**: 이미 `CommonBuildWorkerEvents`로 부분 통일되어 있으며 추가 표준화의 실익이 적음 (Goal 미연결)
- **테스트 커버리지 강화**: 리팩토링의 범위이며, 새 테스트 추가는 별도 작업으로 진행 (범위 초과)
