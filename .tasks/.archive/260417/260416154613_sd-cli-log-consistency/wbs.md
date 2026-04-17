# WBS: sd-cli 로그 일관성 개선

## 프로젝트 개요

- **배경:** sd-cli 로그 출력에서 severity 혼용, 태그 누락, 메시지 포맷 불일치, 출력 채널 혼용, 언어 혼용 등 7가지 비일관성이 발견됨. 코드 리뷰를 통해 약 22개 파일에서 확인.
- **환경:** `packages/sd-cli/src/` 내 TypeScript 소스. consola 라이브러리 기반 로깅.
- **전제조건:** 기존 로그의 기능적 동작(로그 레벨 필터링, 태그 표시)은 유지해야 함
- **기술적 제약:** consola 라이브러리의 API(debug, info, warn, error, start, success, fail)를 활용
- **참조 자료:**
  - `packages/sd-cli/CLAUDE.md` — sd-cli 아키텍처 및 패턴 참조
  - 이전 리뷰 결과 — 7가지 비일관성 항목 상세 분석

## Impact Mapping

- **Goal:** sd-cli 로그 출력의 패턴 통일 → 유지보수 시 로그 규칙 학습 비용 제거, 문제 진단 효율 향상
  - **Actor:** sd-cli 개발자 (유지보수자)
    - **Impact:** 새 모듈 추가 시 기존 패턴을 참조하면 자연스럽게 일관된 로그를 작성
      - **Deliverable:** 전체 sd-cli 소스의 로그 일관성 수정
  - **Actor:** sd-cli 사용자 (빌드 도구 사용 시 로그 확인)
    - **Impact:** 로그 메시지가 예측 가능하여 빌드/배포 상태를 빠르게 파악
      - **Deliverable:** severity/포맷이 통일된 로그 출력

## Feature Breakdown

### Epic 1. 로그 일관성 개선

#### [x] Feature 1.1 CLI 진입점 및 공통 유틸리티 로그 통일

**의존성:** 없음

**범위:**

- `sd-cli.ts`: `consola.warn("[sd-cli] ...")` → `consola.withTag` 전환, 수동 `[sd-cli]` prefix 제거
- `sd-cli.ts`: `console.warn("Failed to configure CPU affinity/priority:", ...)` (105행) → consola 전환 및 한국어 메시지로 변경
- `sd-cli-entry.ts`: `consola.error(msg)` (327행) → `consola.withTag` 전환
- `utils/output-utils.ts`: `consola.error/warn/info(...)` (46,48,57,84,88,92행) → `consola.withTag` 전환
- `runtime/worker-utils.ts`: `"${label} can only be called once per Worker"` (49행) → 한국어 에러 메시지로 변경

**경계:**

- output-utils.ts의 함수 시그니처 변경(로거 파라미터 추가 등)은 이 Feature에서 결정하되, 호출자 수정은 Feature 1.2에서 수행
- severity 선택 기준의 정의는 이 Feature에서 확립하고, 다른 Feature가 동일 기준을 적용

**근거:**

- 리뷰 발견: 비일관성 #1(태그 누락 — 4개 파일), #7(영어 메시지 혼입 — 2개 파일)
- `sd-cli.ts:43` — `consola.warn("[sd-cli] replaceDeps 사전 설정 실패:", ...)` 메시지 내 수동 prefix
- `sd-cli.ts:105` — `console.warn("Failed to configure CPU affinity/priority:", ...)` eslint-disable 포함 영어 메시지
- `sd-cli-entry.ts:327` — `consola.error(msg)` 태그 없이 직접 사용
- `utils/output-utils.ts:46,48,57,84,88,92` — 태그 없이 `consola` 직접 사용
- `runtime/worker-utils.ts:49` — 영어 에러 메시지

#### [x] Feature 1.2 커맨드·오케스트레이터 로그 통일

**의존성:** Feature 1.1 (output-utils.ts의 인터페이스 변경 시 호출자 수정 필요)

**범위:**

- `commands/check.ts`: `process.stdout.write` (160-176행) → consola 전환
- `commands/replace-deps.ts`: `consola.warn(...)` (22행) → `consola.withTag` 전환
- `commands/device.ts`: severity 정리 (start/success 패턴 확인)
- `orchestrators/BaseOrchestrator.ts`: `process.stdout.write("⏳ 종료 중...\n")` 등 (105-107행) → consola 전환
- `orchestrators/BuildOrchestrator.ts`: `process.stdout.write("✔ 빌드할 패키지가 없습니다.\n")` (173행) → consola 전환, severity 통일 (success/info 혼용 — 251행 vs 479행)
- `orchestrators/WatchOrchestrator.ts`: `process.stdout.write("⚠ 워치 대상 패키지가 없습니다.\n")` (69행) → consola 전환
- `commands/publish/publish-command.ts`: DRY-RUN 로그 severity 통일 (info로 통일), `process.stdout.write("✔ 배포할 패키지가 없습니다.\n")` (121행) → consola 전환
- `commands/publish/deployment-phase.ts`: `logger.fail(...)` (98행) → error로 통일, DRY-RUN debug→info 전환 (66,72행)
- `commands/publish/git-phase.ts`: DRY-RUN 로그 severity 확인
- `commands/publish/post-publish-phase.ts`: DRY-RUN 로그 severity 확인
- `commands/publish/npm-publisher.ts`: DRY-RUN 로그 severity 확인
- `commands/publish/local-publisher.ts`: DRY-RUN 로그 severity 확인
- `commands/publish/storage-publisher.ts`: DRY-RUN 로그 severity 확인
- `runtime/rebuild-manager.ts`: 에러 메시지 포맷 통일

**경계:**

- 각 커맨드/오케스트레이터의 로그 메시지 내용(한국어 텍스트 자체)은 변경하지 않음
- 로그 출력 위치 추가/삭제는 하지 않음 (기존 로그의 severity/포맷만 조정)

**근거:**

- 리뷰 발견: 비일관성 #2(severity 혼용), #3(에러 포맷 7가지), #4(process.stdout.write 혼용), #5(fail() 1곳만 사용), #6(DRY-RUN info/debug 혼용)
- `check.ts:160-176` — 결과 요약을 `process.stdout.write`로 출력
- `BaseOrchestrator.ts:105-107` — 종료 메시지를 `process.stdout.write`로 출력
- `BuildOrchestrator.ts:173` — 빈 대상 메시지를 `process.stdout.write`로 출력
- `BuildOrchestrator.ts:251` — `success("빌드 실행 완료")` vs `BuildOrchestrator.ts:479` — `info("빌드 완료")` severity 혼용
- `deployment-phase.ts:98` — 코드베이스 유일한 `logger.fail()` 사용
- `deployment-phase.ts:66,72` — DRY-RUN 메시지를 `debug`로 출력 (다른 곳은 `info`)
- `WatchOrchestrator.ts:69` — 빈 대상 메시지를 `process.stdout.write`로 출력
- `publish-command.ts:121` — 빈 대상 메시지를 `process.stdout.write`로 출력

#### [x] Feature 1.3 하위 모듈 로그 통일

**의존성:** 없음

**범위:**

- `lint/lint-core.ts`: severity 정리 — 세부 단계 success와 전체 완료 info 혼용 (136행 vs 183행), 에러 발생 시 error (181행) vs 완료 시 info (183행) 정리
- `electron/electron.ts`: 공개 메서드(`initialize`, `run`, `build`) 단위에서 start/success 도입, 내부 세부 단계는 debug 유지, info (114,145행)/warn (129,408행) 정리
- `capacitor/capacitor.ts`: 공개 메서드(`initialize`, `run`, `build`) 단위에서 start/success 도입, 내부 세부 단계는 debug 유지, warn (241,295,363행) 정리
- `deps/replace-deps/replace-deps.ts`: 에러 메시지 포맷 통일 (인라인 문자열 보간 → 통일된 패턴), severity 정리
- 에러 메시지 포맷 통일: 구조화된 데이터 객체 `{ error: ... }` vs 인라인 문자열 보간 `${message}` 중 하나로 통일

**경계:**

- Electron/Capacitor의 상위 호출자(device.ts, BuildOrchestrator.ts)에서 이미 출력하는 start/success와의 중복 조정은 Feature 1.2에서 처리
- capacitor-build.ts, capacitor-android.ts, capacitor-icon.ts, capacitor-npm-config.ts 등 capacitor 하위 모듈은 현재 debug만 사용하므로 수정 불필요

**근거:**

- 리뷰 발견: 비일관성 #2(severity 혼용 — debug/start/info/success 선택 기준 불명확), #3(에러 포맷 7가지)
- `lint-core.ts:136` — `success("ESLint 설정 로드 완료")` vs `lint-core.ts:183` — `info("린트 완료")` 완료 이벤트 severity 혼용
- `electron.ts:114` — `info("Electron이 종료되었습니다.")` 내부에서 사용자 대면 severity 사용
- `electron.ts:129` — `warn("번들링 실패...")` 실패를 warn으로 처리
- `capacitor.ts:241` — `warn("Java 21을 찾을 수 없습니다...")` 경고
- `replace-deps.ts:63` — `error("[${targetName}] 복사 실패: ${message}")` 인라인 보간
- `rebuild-manager.ts:66` — `error("리빌드 에러 발생", { error: String(result.reason) })` 구조화 객체
- 사용자 결정: Electron/Capacitor에 전체 severity 규칙 적용

## 사용자 결정사항

1. `process.stdout.write` → **전부 consola로 전환** (check.ts 요약 포함)
2. Electron/Capacitor → **전체 severity 규칙 적용** (공개 메서드 단위 start/success 도입)

## Feature 1.1 설계 결정사항

- **D1: output-utils.ts 로거 방식** → 모듈-레벨 로거 (`const logger = consola.withTag("sd:cli:output")`). 호출자 수정 불필요, 코드베이스 지배적 패턴 준수.
- **D2: severity 선택 기준** → Feature 1.1 문서에 확립. `debug`(내부 상세) / `start`+`success`(장시간 작업 쌍) / `info`(일반 정보) / `warn`(비치명적) / `error`(치명적). `fail` → `error`로 통일(Feature 1.2 적용).
- **D3: 한국어 에러 메시지 형식** → `"{설명}: ${변수}"` 패턴 (코드베이스 기존 패턴 준수)

## Feature 1.2 설계 결정사항

- **D1: check.ts consola 전환 방식** → severity 분리. 성공 섹션→success, 실패 섹션→error, formatSection 인라인 대체. consola severity 체계와 완전 통합.
- **D2: BuildOrchestrator 빌드 완료 severity** → line 251 `success("빌드 실행 완료")` 제거 + line 479 `info("빌드 완료")`→`success("빌드 완료")`. start(233)/success(479) 쌍 정상화, 중복 완료 메시지 제거.
- **변경 불필요 확인:** device.ts, git-phase.ts, post-publish-phase.ts, npm/local/storage-publisher.ts(이미 올바른 패턴), rebuild-manager.ts(Feature 1.3에서 완료)
- **[DRY-RUN] prefix** → 유지. 모드 표시이므로 태그와 역할 다름.

## Feature 1.3 설계 결정사항

- **D1: lint-core.ts severity 체계** → 세부 단계(설정 로드, 파일 수집, 실행)를 debug로 내리고, 전체 완료를 success로 통일. Electron/Capacitor "내부 세부=debug" 규칙과 일관.
- **D2: electron.ts 번들링 실패 severity** → error로 변경. "실패"에 error가 의미적으로 부합.
- **D3: electron.ts 종료/재시작 알림** → info 유지. 사용자 대면 상태 알림으로 적절.
- **D4: 에러 메시지 포맷** → 인라인 문자열 보간으로 통일. CLI 터미널에서 바로 읽히는 포맷. rebuild-manager.ts의 구조화 객체 패턴을 인라인으로 변경.
- **replace-deps.ts** → 에러 포맷이 이미 인라인 보간이므로 변경 불필요. capacitor/electron warn 3+1곳은 모두 복구 가능한 경고이므로 유지.

## 제외 사항

- 로그 메시지 내용(한국어 텍스트) 자체의 개선 — Goal(일관성)과 무관, 별도 프로젝트
- 새로운 로그 추가/기존 로그 삭제 — 범위 초과
- consola 설정(`setupConsola`) 변경 — 기존 동작 유지
- capacitor/electron 하위 유틸 모듈(capacitor-build.ts, capacitor-android.ts 등) — 현재 debug만 사용하여 비일관성 없음
- 에러 메시지 포맷 3-2(메시지 내 수동 `[prefix]`) — 태그 시스템이 출력하는 정보와 의미가 다른 경우 유지 가능 (예: `[DRY-RUN]`은 모드 표시이므로 태그와 역할 다름). Feature 1.2에서 개별 판단
