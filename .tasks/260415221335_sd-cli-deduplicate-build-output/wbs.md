# WBS: sd-cli 빌드 결과 중복 출력 제거

## 프로젝트 개요

- **배경:** sd-cli의 dev/watch 모드에서 동일한 에러/경고가 최대 3번 중복 출력되어 가독성이 떨어짐
- **환경:** simplysm 모노레포의 `packages/sd-cli` 패키지. esbuild 기반 클라이언트/서버 빌드 엔진, consola 기반 로거 사용
- **전제조건:** 없음
- **기술적 제약:** esbuild의 `logLevel`은 "silent" | "error" | "warning" | "info" | "debug" | "verbose" 중 택 1. 에러만 숨기고 경고만 표시하는 옵션은 없음
- **참조 자료:**
  - `packages/sd-cli/src/workers/client.worker.ts` — esbuild 빌드 결과 처리 및 이벤트 전송 로직
  - `packages/sd-cli/src/engines/EsbuildClientEngine.ts` — 클라이언트 엔진의 중복 logger.error() 호출 위치
  - `packages/sd-cli/src/engines/BaseEngine.ts` — 공통 엔진의 중복 logger.error()/warn() 호출 위치
  - `packages/sd-cli/src/runtime/ResultCollector.ts` — 빌드 결과 중앙 수집 (현재 warnings 미지원)
  - `packages/sd-cli/src/runtime/engine-watch-events.ts` — watch 이벤트 공통 처리 (현재 warnings 미전달)
  - `packages/sd-cli/src/utils/output-utils.ts` — printErrors() 최종 출력 (현재 에러만 출력)
  - `packages/sd-cli/src/esbuild/esbuild-client-config.ts:191` — dev 모드 logLevel: "warning" 설정
  - `packages/sd-cli/src/orchestrators/DevOrchestrator.ts` — dev 오케스트레이터의 printErrors() 호출
  - `packages/sd-cli/src/orchestrators/WatchOrchestrator.ts` — watch 오케스트레이터의 printErrors() 호출

## Impact Mapping

- **Goal:** dev/watch 빌드 피드백 가독성 향상 — 에러 식별을 위해 중복 메시지를 필터링하는 시간 제거
  - **Actor:** sd-cli 사용자 (개발자)
    - **Impact:** 빌드 에러/경고를 한 번에 파악한다
      - **Deliverable:** 빌드 결과 단일 출력 시스템

## Feature Breakdown

### Epic 1. 빌드 결과 중복 출력 제거

#### [x] Feature 1.1 ResultCollector warnings 인프라 및 출력 통합

**의존성:** 없음

**범위:**

- ResultCollector의 BuildResult에 warnings 필드 추가
- engine-watch-events의 build 이벤트 핸들러에서 warnings를 BuildResult에 저장
- output-utils의 printErrors()를 확장하여 경고도 함께 출력 (에러: `✖`, 경고: `⚠` 구분)

**경계:**

- 프로덕션 빌드(BuildOrchestrator)의 출력 형식은 이 Feature에서 변경하지 않음 (이미 중복 없음)

**근거:**

- 코드베이스: `ResultCollector.ts`의 BuildResult 인터페이스에 warnings 필드 없음
- 코드베이스: `engine-watch-events.ts:62-81`의 build 이벤트 핸들러가 warnings를 무시함
- 코드베이스: `output-utils.ts:31-42`의 printErrors()가 에러만 출력함

#### [x] Feature 1.2 엔진별 중복 출력 제거

**의존성:** Feature 1.1 (ResultCollector warnings 인프라 — warnings가 저장/출력되는 경로가 확보되어야 기존 출력을 제거할 수 있음)

**범위:**

- esbuild-client-config.ts: dev 모드 `logLevel`을 `"warning"` → `"silent"`로 변경 (esbuild 네이티브 에러/경고 출력 억제)
- EsbuildClientEngine.ts: `worker.on("error")` 핸들러의 `logger.error()` 제거 (line 114-117). 초기 빌드 실패 시 `logger.error()` 제거 (line 137). ResultCollector 저장은 유지
- BaseEngine.ts: `worker.on("build")` 핸들러의 `logger.warn()` → 불필요 (ResultCollector가 처리). `_callStartWatch().catch()`의 `logger.error()` → `logger.debug()`로 변경 (line 187)

**경계:**

- BaseEngine의 lint 결과 보고 로직(line 174-183)은 변경하지 않음 (lint는 별도 type으로 ResultCollector에 저장됨)
- 프로덕션 빌드 경로(run 메서드)는 변경하지 않음

**근거:**

- 사용자 제보: 동일 에러가 `[ERROR]`, `[sd:cli:engine:esbuild-client] ERROR`, `✖` 로 3번 출력
- 코드베이스: `esbuild-client-config.ts:191` — dev 모드 `logLevel: "warning"`이 에러도 출력함
- 코드베이스: `EsbuildClientEngine.ts:114-117` — setupWatchEvents와 별도로 error 이벤트를 구독하여 logger.error() 호출
- 코드베이스: `EsbuildClientEngine.ts:137` — 초기 빌드 실패 시 logger.error() + resultCollector.add() 이중 보고
- 코드베이스: `BaseEngine.ts:171` — 경고를 logger.warn()으로 즉시 출력 (printErrors에서 재출력 안 되지만 ResultCollector에도 미저장)
- 코드베이스: `BaseEngine.ts:187` — startWatch 실패 시 logger.error() + resultCollector.add() 이중 보고

### Epic 2. 리뷰 이슈 수정

#### [x] Feature 2.1 EsbuildClientEngine 초기 빌드 warnings 전달

**의존성:** Feature 1.1 (ResultCollector warnings 인프라 — warnings 필드가 존재해야 저장 가능)

**범위:**

- client.worker.ts의 `initialBuildResolve` 호출에 `warnings` 필드 추가
- EsbuildClientEngine.startWatch()에서 초기 빌드 성공 시에도 `result.warnings`가 있으면 ResultCollector에 warnings 포함하여 저장

**경계:**

- 후속 빌드의 warnings 전달은 Feature 1.1에서 이미 완료 (setupWatchEvents 경로)
- 프로덕션 빌드(run)의 warnings는 이미 정상 전달됨

**근거:**

- 리뷰 LOGIC-001: `client.worker.ts:303-312`에서 초기 빌드 resolve에 warnings 누락
- 리뷰 LOGIC-001: `EsbuildClientEngine.ts:129-138`에서 초기 빌드 결과의 warnings 미처리
- 코드베이스: 후속 빌드(line 288-299)와 프로덕션 빌드(line 170-174)는 warnings 전달 중
- 코드베이스: `client.worker.ts:44-48`의 `ClientBuildResult` 인터페이스에 `warnings?: string[]` 필드가 이미 존재

#### [x] Feature 2.2 printErrors 함수명 변경

**의존성:** 없음

**범위:**

- `output-utils.ts`의 `printErrors()` 함수를 `printDiagnostics()`로 이름 변경
- 호출처 4곳 업데이트: `DevOrchestrator.ts`(2곳), `WatchOrchestrator.ts`(2곳)
- 테스트 파일 업데이트: `output-utils.spec.ts`, `dev-orchestrator.spec.ts`, `watch-orchestrator.spec.ts`

**경계:**

- `printErrors`는 패키지 외부로 export되지 않으므로 외부 영향 없음
- 함수의 동작 자체는 변경하지 않음 (이름만 변경)

**근거:**

- 리뷰 DESIGN-001: Feature 1.1에서 경고 출력 기능이 추가되었으나 함수명이 `printErrors()`로 남아 실제 동작과 불일치

### Epic 3. 에러 출력 포맷 개선

#### [x] Feature 3.1 esbuild 에러 location 정보 포함 및 출력 포맷 통합

**의존성:** 없음

**범위:**

- `output-utils.ts`의 `formatEsbuildMessage()`에 `location` 필드 처리 추가 — `file:line:column: text` 형식
- `notes`의 `location`도 동일하게 처리
- `EsbuildClientEngine.ts:134`의 `join("; ")` → `join("\n")`으로 변경 (다른 경로와 통일)

**경계:**

- `BuildResult` 인터페이스 구조는 변경하지 않음
- `printDiagnostics`의 출력 로직은 변경하지 않음 (`formatBuildMessages`가 이미 `\n` split 처리)
- 프로덕션 빌드 경로는 변경하지 않음

**근거:**

- 사용자 제보: 에러 발생 파일명이 표시되지 않고, 모든 에러가 `;`로 이어진 한 줄로 출력
- 코드베이스: `formatEsbuildMessage`가 esbuild `Message.location`(file, line, column) 정보를 무시
- 코드베이스: `EsbuildClientEngine.ts:134`에서 `join("; ")`로 한 줄 합침 (다른 곳은 `join("\n")`)
- 코드베이스: `formatBuildMessages`가 이미 `msg.split("\n")`으로 개별 줄 처리하므로, 포맷팅 함수 수정만으로 전체 출력 개선 가능

## 제외 사항

- 프로덕션 빌드(BuildOrchestrator) 출력 변경 — 사유: 이미 `logLevel: "silent"`이고 EngineResult로 반환하여 중복 없음
- 서버 런타임 에러 출력 — 사유: ServerRuntimeManager의 에러는 빌드 에러와 다른 계층이며 현재 중복 보고 없음
- consola 로거 자체 교체/커스터마이징 — 사유: 목표는 중복 제거이지 로거 변경이 아님
