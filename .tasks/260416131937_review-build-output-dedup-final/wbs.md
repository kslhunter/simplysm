# WBS: 빌드 출력 중복 제거 최종 리뷰 이슈 수정

## 프로젝트 개요

- **배경:** `.tasks/260415221335_sd-cli-deduplicate-build-output/` 작업의 최종 심층 리뷰에서 6건의 이슈 발견 (Medium 2건, Low 4건)
- **환경:** simplysm 모노레포 `packages/sd-cli` 패키지
- **전제조건:** 기존 WBS(`.tasks/260415221335_sd-cli-deduplicate-build-output/wbs.md`)의 모든 Feature가 완료된 상태
- **기술적 제약:** 없음
- **참조 자료:**
  - `.tasks/260416131937_review-build-output-dedup-final/review.md` — 리뷰 이슈 6건 상세
  - `packages/sd-cli/src/workers/client.worker.ts:317-323` — LOGIC-001/002 대상 catch 블록
  - `packages/sd-cli/src/engines/EsbuildClientEngine.ts:104-151` — CONSIST-001/DESIGN-001 대상 코드
  - `packages/sd-cli/src/runtime/engine-watch-events.ts:62-84` — DESIGN-002 테스트 대상
  - `packages/sd-cli/tests/utils/engine-watch-events.acc.spec.ts` — DESIGN-002 테스트 추가 위치
  - `packages/sd-cli/tests/engines/esbuild-client-engine.spec.ts` — DESIGN-003 테스트 추가 위치

## Impact Mapping

- **Goal:** 빌드 출력 중복 제거 구현의 품질 완성 — 리뷰 이슈 0건
  - **Actor:** sd-cli 개발자 (유지보수자)
    - **Impact:** 코드 경로 간 일관성을 신뢰하고, 새 기능 경로가 테스트로 보호됨을 확인한다
      - **Deliverable:** 코드 일관성 수정 + 누락 테스트 보강

## Feature Breakdown

### Epic 1. 소스 코드 일관성 수정

#### [x] Feature 1.1 client.worker.ts catch 블록 개선

**의존성:** 없음

**범위:**

- LOGIC-001: catch 블록에서 초기 빌드일 때 `sender.send("error")`를 호출하지 않도록 조건 분기 추가 (이중 보고 제거)
- LOGIC-002: catch 블록에서 `result`가 접근 가능한 경우 `warnings` 필드를 `initialBuildResolve`에 포함

**경계:**

- 후속 빌드(비초기) catch 경로의 `sender.send("error")`는 유지 (setupWatchEvents가 유일한 처리 경로)
- 정상 경로(try 블록)의 초기/후속 빌드 분기는 변경하지 않음

**근거:**

- 리뷰 LOGIC-001: `client.worker.ts:317-323`에서 초기 빌드 에러가 이중 보고됨
- 리뷰 LOGIC-002: `client.worker.ts:322`에서 catch 경로의 `initialBuildResolve`에 warnings 누락

#### [x] Feature 1.2 EsbuildClientEngine 일관성 및 상태 정리

**의존성:** 없음

**범위:**

- ~~CONSIST-001: 이미 이전 WBS 작업에서 `"\n"`으로 수정됨 (git diff 확인). 추가 작업 불필요~~
- DESIGN-001: `setupWatchEvents` 호출 후 `resolveInitialBuild()`를 명시적으로 호출하여 isInitialBuild 상태 정리

**경계:**

- `engine-watch-events.ts`의 코드는 변경하지 않음
- `setupWatchEvents` 함수 내부 로직은 변경하지 않음

**근거:**

- 리뷰 CONSIST-001: 거짓양성 — 이전 WBS에서 이미 수정됨
- 리뷰 DESIGN-001: `EsbuildClientEngine.ts:104-111`에서 setupWatchEvents의 isInitialBuild가 사실상 미사용

### Epic 2. 누락 테스트 보강

#### [x] Feature 2.1 engine-watch-events warnings 테스트 추가

**의존성:** 없음

**범위:**

- `engine-watch-events.acc.spec.ts`에 warnings 관련 테스트 3건 추가:
  - build 이벤트 `{ success: true, warnings: ["warn1"] }` → `result.warnings === "warn1"` 확인
  - build 이벤트 `{ success: true }` (warnings 없음) → `result.warnings === undefined` 확인
  - build 이벤트 `{ success: false, errors: [...], warnings: ["warn1"] }` → 에러와 경고 모두 저장 확인

**경계:**

- 소스 코드(`engine-watch-events.ts`)는 변경하지 않음 (기능은 이미 올바르게 구현됨)

**근거:**

- 리뷰 DESIGN-002: Feature 1.1 요구명세의 warnings 시나리오에 대한 테스트가 `engine-watch-events.acc.spec.ts`에 부재

#### [x] Feature 2.2 EsbuildClientEngine 초기 빌드 warnings 테스트 추가

**의존성:** Feature 1.2 (CONSIST-001 수정 후 테스트 기대값이 `"\n"` join 기준이어야 함)

**범위:**

- `esbuild-client-engine.spec.ts`에 startWatch() warnings 관련 테스트 3건 추가:
  - `startWatch` 결과 `{ success: true, warnings: ["w1"] }` → ResultCollector에 status "success", warnings "w1" 저장 확인
  - `startWatch` 결과 `{ success: false, errors: ["e1"], warnings: ["w1"] }` → ResultCollector에 status "error", message + warnings 모두 저장 확인
  - `startWatch` 결과 `{ success: true }` (warnings 없음) → ResultCollector에 추가 저장 없음 확인

**경계:**

- `run()` 메서드의 warnings 테스트(이미 존재)는 변경하지 않음

**근거:**

- 리뷰 DESIGN-003: Feature 2.1 요구명세의 초기 빌드 warnings 시나리오에 대한 테스트가 `esbuild-client-engine.spec.ts`에 부재

## 제외 사항

- 프로덕션 빌드(BuildOrchestrator) 관련 변경 — 사유: 리뷰에서 이슈 미발견
- setupWatchEvents 함수 내부 리팩토링 — 사유: DESIGN-001은 호출부에서 resolveInitialBuild()로 해소, 함수 내부 변경은 범위 초과
