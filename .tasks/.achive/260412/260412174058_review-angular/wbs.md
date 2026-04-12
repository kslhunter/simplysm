# WBS: Angular 패키지 코드 리뷰 이슈 수정

## 프로젝트 개요

- **배경:** `/sd-review angular` 실행 결과 Medium 8건, Low 9건(총 17건)의 이슈 발견. 안정성, 정확성, 일관성 개선 필요.
- **환경:** `packages/angular` — Angular 21, Zoneless, Signal 기반 UI 라이브러리
- **전제조건:** 기존 테스트가 통과하는 상태에서 수정 진행
- **기술적 제약:** Chrome 61+ 호환성, Zoneless 환경
- **참조 자료:**
  - `.tasks/260412174058_review-angular/review.md` — 리뷰 리포트 (이슈 상세 설명 및 위치)

## Impact Mapping

- **Goal:** 코드 리뷰에서 발견된 설계/로직/성능/일관성 이슈 0건 달성
  - **Actor:** 라이브러리 개발자 및 소비 프로젝트 개발자
    - **Impact:** 리소스 누수·예기치 않은 동작 없이 안정적으로 컴포넌트 사용
      - **Deliverable:** 안정성 및 리소스 관리 수정, 로직/성능 수정, 일관성 수정

## Feature Breakdown

### Epic 1. 안정성 및 정확성 개선

#### [x] Feature 1.1 리소스 관리 및 에러 처리 수정

**의존성:** 없음
**Feature 문서:** [1.1-resource-management-error-handling.md](./1.1-resource-management-error-handling.md)

**범위:**

- DESIGN-001: `sd-data-detail.base.ts` effect 내 queueMicrotask에 cancelled 플래그 패턴 적용
- DESIGN-002: `sd-dock.ts` onResizeBarMousedown 시작부에 기존 _dragCleanup 호출 추가
- DESIGN-007: `injectSheetColumnResizing.ts` onMousedown 시작부에 기존 resizingCleanup 호출 추가
- DESIGN-003: `sd-modal.provider.ts` showAsync에서 createComponent 실패 시 modalCount 감소 및 Promise reject 처리
- DESIGN-005: `sd-address-search.modal.ts` _initAsync 에러를 catch하여 사용자에게 표시, 스크립트 로드 완료 보장

**경계:**

- 기존 동작의 의미론적 변경 없음 — 방어 로직 추가만

**설계 결정:**

- D1: cancelled 플래그 패턴은 `injectDataSheetRefreshManager.ts:61-87`과 동일하게 적용
- D2: DESIGN-005 스크립트 로드는 모듈 레벨 Promise 캐싱 방식으로 race condition 방지

**근거:**

- review.md: DESIGN-001, DESIGN-002, DESIGN-003, DESIGN-005, DESIGN-007

#### [x] Feature 1.2 로직 정확성 및 성능 수정

**의존성:** 없음
**Feature 문서:** [1.2-logic-accuracy-performance.md](./1.2-logic-accuracy-performance.md)

**범위:**

- LOGIC-001: `sd-data-sheet.base.ts` key가 undefined일 때 constructor.name 폴백 적용
- LOGIC-003: `sd-barcode.ts` bwipjs.toSVG() computed에 try/catch 적용
- DESIGN-004: `sd-state-preset.ts` 프리셋 추가 시 이름 중복 검사 추가
- PERF-001: `useSelectionManager.ts` isSelected에서 Set 기반 O(1) 조회로 변경
- PERF-002: `sd-shared-data-select.ts` getChildren 결과 메모이제이션

**경계:**

- LOGIC-002 제외: filter 직접 참조는 의도된 설계 (작업 사본 vs 스냅샷 역할 차이)
- LOGIC-004 제외: persist 실패 시 에러 보고만으로 충분 (롤백의 UI 깜빡임 부작용이 이점보다 큼)

**설계 결정:**

- D1: LOGIC-002 현행 유지 — filter는 작업 사본, lastFilter는 스냅샷. 비대칭은 역할 차이로 정당화
- D2: LOGIC-004 현행 유지 — UI 설정 특성상 세션 내 즉각 반영 중요, 롤백 불필요

**근거:**

- review.md: LOGIC-001, LOGIC-003, DESIGN-004, PERF-001, PERF-002

### Epic 2. 일관성 개선

#### [x] Feature 2.1 네이밍 및 메시지 통일

**의존성:** 없음
**Feature 문서:** [2.1-naming-message-consistency.md](./2.1-naming-message-consistency.md)

**범위:**

- CONSIST-001: `sd-activated-modal.provider.ts` canDeactiveFn → canDeactivateFn 이름 변경 (사용처 일괄)
- CONSIST-002: `sd-date-range.picker.ts` 파일명을 `sd-date-range-picker.ts`로 변경
- CONSIST-003: `injectDataSheetModalEditManager.ts` + `injectDataSheetExcelManager.ts` 토스트 메시지 띄어쓰기 통일 (D1: 두 파일 모두 수정)
- CONSIST-004: 현행 유지 (use 접두사는 inject() 미사용이므로 규칙상 올바름) — 수정 불필요
- DESIGN-006: `sd-dropdown.ts` isPlaceBottom/isPlaceRight → shouldPlaceAbove/shouldPlaceLeft 변수명 변경

**경계:**

- CONSIST-004는 현행 유지로 결정 — 문서화만 고려

**설계 결정:**

- D1: CONSIST-003 범위에 `injectDataSheetExcelManager.ts`도 포함 (동일 패턴 통일)

**근거:**

- review.md: CONSIST-001~004, DESIGN-006

## 제외 사항

- CONSIST-004 수정: use 접두사가 규칙상 올바르므로 코드 변경 불필요 (사유: 현행 컨벤션 준수)
- LOGIC-002 수정: filter 직접 참조는 의도된 설계 (사유: 작업 사본 vs 스냅샷 역할 차이, 외부 mutation은 Signal 안티패턴)
- LOGIC-004 수정: persist 실패 시 롤백 불필요 (사유: 에러 보고만으로 충분, 롤백의 UI 깜빡임 부작용이 이점보다 큼)
