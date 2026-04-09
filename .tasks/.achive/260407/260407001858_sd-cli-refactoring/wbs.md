# WBS: sd-cli 패키지 모듈 의존성/관심사 분리 리팩토링

## 프로젝트 개요

- **배경:** sd-cli 패키지의 구조적 검토에서 레이어 역전, 거대 클래스, Worker 내 비즈니스 로직, Orchestrator 우회 등 4개 이슈가 P1~P2 우선순위로 식별됨
- **환경:** pnpm 모노레포, TypeScript ESM, sd-cli는 67개 소스 파일로 구성된 빌드/개발/배포 CLI 도구
- **전제조건:** 기존 동작/API를 유지하는 내부 구조 개선. 기존 테스트 통과가 성공 기준
- **기술적 제약:** TypeScript ESM (`"type": "module"`), `import type` 필수 (`verbatimModuleSyntax`)
- **참조 자료:**
  - `packages/sd-cli/CLAUDE.md` — 아키텍처 및 패턴 참조
  - `packages/sd-cli/src/` — 기존 코드베이스 구조 확인

## Impact Mapping

- **Goal:** sd-cli 패키지의 레이어 정합성 확보 및 모듈 응집도 향상 → 코드 변경 시 영향 범위를 예측 가능하게 만든다
  - **Actor:** sd-cli 유지보수 개발자
    - **Impact:** 코드 변경 시 해당 레이어의 책임 경계 내에서만 영향이 발생하고, 새 기능 추가 시 어느 계층에 배치할지 즉시 판단할 수 있다
      - **Deliverable 1:** Worker → Command 역참조 제거 (레이어 역전 해소)
      - **Deliverable 2:** Capacitor 거대 클래스 분리 (단일 책임 원칙)
      - **Deliverable 3:** server-build.worker 비즈니스 로직 분리 (Worker 순수성)
      - **Deliverable 4:** TypecheckOrchestrator 신설 (레이어 일관성)

## Feature Breakdown

### Epic 1. sd-cli 레이어 정합성 및 모듈 응집도 개선

#### [x] Feature 1.1 lint.worker → commands/lint 역참조 제거

**의존성:** 없음

**범위:**

- `commands/lint.ts`에서 `executeLint()` + `LintOptions` + `LintResult` + 관련 헬퍼(`ESLINT_CONFIG_FILES`, `isGlobalIgnoresConfig`, `loadIgnorePatterns`)를 `utils/lint-core.ts`로 추출
- `commands/lint.ts`에는 `runLint()` 래퍼(stdout 출력 + process.exitCode 설정)만 남김
- `workers/lint.worker.ts`의 import를 `utils/lint-core`로 변경
- `utils/lint-utils.ts`의 타입 import를 `utils/lint-core`로 변경
- `commands/check.ts`의 `executeLint`/`LintResult` import를 `utils/lint-core`로 변경 (Feature 1.1 설계 시 발견: check.ts line 4에서 commands/lint를 import)
- 기존 테스트가 새 모듈 경로를 참조하도록 수정 (`tests/commands/check.spec.ts` mock 경로 포함)

**경계:**

- `executeLint`의 내부 로직 변경 없음 (코드 이동만)
- `runLint`의 동작 변경 없음
- lint.worker의 worker 격리 구조 유지

**근거:**

- 검토 결과: `workers/lint.worker.ts`(line 2)가 `commands/lint`를 import하여 Worker→Command 레이어 역전 발생
- 참조 파일: `packages/sd-cli/src/workers/lint.worker.ts`, `packages/sd-cli/src/commands/lint.ts`, `packages/sd-cli/src/utils/lint-utils.ts`

#### [x] Feature 1.2 Capacitor Android 설정 분리

**의존성:** 없음

**범위:**

- `capacitor/capacitor.ts`에서 Android 설정 관련 9개 private 메서드를 `capacitor/capacitor-android.ts`로 추출:
  - `_configureAndroid` (line 517)
  - `_configureAndroidJavaHomePath` (line 553)
  - `_findJava21` (line 575)
  - `_configureAndroidSdkPath` (line 598)
  - `_findAndroidSdk` (line 617)
  - `_configureAndroidManifest` (line 647)
  - `_configureAndroidRootBuildGradle` (line 719)
  - `_configureAndroidBuildGradle` (line 741)
  - `_configureAndroidStyles` (line 791)
- 추출된 함수의 시그니처 설계: private 메서드에서 standalone 함수로 전환 시 필요한 매개변수(`capPath`, `config: SdCapacitorConfig`, `npmConfig: NpmConfig`) 정의. `platforms`/`pkgPath`는 Android 설정 메서드에서 미사용
- `Capacitor` 클래스에서 `configureAndroid()` 호출로 전환
- `_validateTools()`의 `_findAndroidSdk()`/`_findJava21()` 호출을 추출된 함수 import로 변경 (line 218, 229)
- `capacitor.ts`에서 `env` import 제거 (`findAndroidSdk` 내부로 이동)
- 기존 테스트가 새 모듈 구조에서 통과하도록 수정

**경계:**

- Capacitor 초기화/실행/빌드 로직은 이동하지 않음 (Android 설정만 분리)
- `_configureSigningConfig` (line 957)은 빌드 흐름의 일부이므로 이번 범위에 포함하지 않음
- npm 설정(`_setupNpmConf`), 아이콘(`_setupIcon`) 로직은 분리하지 않음

**근거:**

- 검토 결과: Capacitor 클래스 1,109줄 중 Android 설정이 ~305줄(28%)로 가장 큰 단일 블록 (line 512~823)
- 참조 파일: `packages/sd-cli/src/capacitor/capacitor.ts` (line 512~823)

#### [x] Feature 1.3 server-build.worker 비즈니스 로직 분리

**의존성:** 없음

**범위:**

- `workers/server-build.worker.ts`에서 4개 프로덕션 배포 관련 함수를 `utils/server-production-files.ts`로 추출:
  - `collectAllExternals` (line 143, ~7줄)
  - `parseLockfileVersions` (line 156, ~36줄)
  - `resolveLockedVersions` (line 197, ~15줄)
  - `generateProductionFiles` (line 216, ~100줄)
- `server-build.worker.ts`에서 추출된 함수를 import하여 호출하도록 변경
- 기존 테스트가 새 모듈 구조에서 통과하도록 수정
- `ServerBuildInfo` 타입은 worker에 유지, 새 파일에서 `import type`으로 참조 (D1: 런타임 순환 없음)
- `collectAllDependencyExternals`, `cpx` import는 새 파일로 이동 (worker에서 직접 사용 안 함)
- 테스트는 `vi.mock()` 전역 모킹으로 leaf 의존성을 처리하므로 변경 불필요 예상 (D3)

**경계:**

- Worker의 빌드 실행 로직(`build`, `rebuildAll`, `startWatch`, `stopWatch`, `cleanup`)은 이동하지 않음
- `createEsbuildWatchContext` 등 esbuild 컨텍스트 관리는 Worker에 유지
- 추출된 함수의 내부 로직 변경 없음 (코드 이동만)

**근거:**

- 검토 결과: Worker에 프로덕션 파일 생성, YAML 파싱 등 빌드 실행과 무관한 비즈니스 로직이 ~158줄 포함
- 참조 파일: `packages/sd-cli/src/workers/server-build.worker.ts` (line 143~315)
- Feature 문서: [1.3-server-build-worker-logic-separation.md](./1.3-server-build-worker-logic-separation.md)

#### [x] Feature 1.4 TypecheckOrchestrator 신설

**의존성:** 없음

**범위:**

- `orchestrators/TypecheckOrchestrator.ts` 클래스 신설
  - `initialize()`: sd.config.ts 로드, 워크스페이스 패키지 탐색, tests 병합, 패키지 분류, scripts 패키지 수집
  - `start()`: 엔진 생성, 동시성 제어(`runWithConcurrency`), 타입체크 실행, 비패키지 타입체크, 결과 집계(진단 역직렬화, 에러/경고 카운트, lint 결과), 포맷 출력 생성
  - `shutdown()`: 엔진 stop (현재 `executeTypecheck`에서 try/finally로 처리 중인 로직)
- `commands/typecheck.ts`에서 `executeTypecheck`의 오케스트레이션 로직을 TypecheckOrchestrator로 이동
- `commands/typecheck.ts`는 TypecheckOrchestrator를 호출하는 얇은 래퍼로 전환
- `TypecheckOptions`, `TypecheckResult` 타입을 TypecheckOrchestrator 파일 또는 engines/types.ts로 이동
- `commands/check.ts`에서 TypecheckOrchestrator를 사용하도록 변경
- 기존 테스트가 새 모듈 구조에서 통과하도록 수정

**경계:**

- CheckOrchestrator는 이번 범위에 포함하지 않음 (P3 이슈)
- BuildOrchestrator의 기존 코드 수정 없음
- 타입체크 실행 로직 자체의 변경 없음 (구조 이동만)

**근거:**

- 검토 결과: `commands/typecheck.ts`(295줄)가 `createBuildEngine` 직접 호출, 동시성 제어, 결과 집계 등 오케스트레이션 로직을 수행하여 command→engine 레이어를 우회
- BuildOrchestrator/DevWatchOrchestrator의 `initialize() → start() → shutdown()` 패턴과 일관성 확보
- 참조 파일: `packages/sd-cli/src/commands/typecheck.ts`, `packages/sd-cli/src/orchestrators/BuildOrchestrator.ts` (패턴 참조)
- Feature 문서: [1.4-typecheck-orchestrator.md](./1.4-typecheck-orchestrator.md)

## 제외 사항

- **CheckOrchestrator 신설** (P3): check.ts의 typecheck+lint+test 조율 로직. P2 범위 초과로 제외
- **ViteEngine 이벤트 중복 제거** (P3): BaseEngine과 ViteEngine의 ~100줄 이벤트 처리 중복. BaseEngine 수정이 전 엔진에 영향을 미쳐 P2 범위 초과
- **PublishOrchestrator 신설** (P4): publish.ts 834줄 분해. 변경 범위가 매우 크고 고위험으로 제외
- **utils/ 도메인별 하위 그룹화** (P4): import 경로 전체 변경 필요. 범위 초과로 제외
- **Capacitor 초기화/빌드 로직 분리**: Capacitor 분리는 Android 설정(~314줄)만으로 한정. 사용자 선택에 의한 범위 제한
- **sd-config.types.ts 분리**: 358줄이지만 현재 관리 가능 수준. 향후 성장 시 재검토
