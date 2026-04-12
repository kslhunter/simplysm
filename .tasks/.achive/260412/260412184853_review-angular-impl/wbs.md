# WBS: Angular 패키지 리뷰 이슈 수정 (2차)

## 프로젝트 개요

- **배경:** `.tasks/260412174058_review-angular/` Feature 구현 결과에 대한 최종 리뷰에서 Medium 1건, Low 1건 발견
- **환경:** `packages/angular` — Angular 21, Zoneless, Signal 기반 UI 라이브러리
- **전제조건:** 기존 테스트가 통과하는 상태에서 수정 진행
- **기술적 제약:** Chrome 61+ 호환성
- **참조 자료:**
  - `.tasks/260412184853_review-angular-impl/review.md` — 리뷰 리포트 (이슈 상세 설명 및 위치)
  - `.tasks/260412174058_review-angular/1.1-resource-management-error-handling.md` — CONSIST-005 수정 대상 문서

## Impact Mapping

- **Goal:** 리뷰 발견 이슈 0건 달성
  - **Actor:** 라이브러리 소비 프로젝트 개발자
    - **Impact:** 네트워크 오류 후 주소 검색 모달 재시도 시 정상 동작
      - **Deliverable:** 스크립트 로드 실패 재시도 버그 수정 + 문서 일관성 수정

## Feature Breakdown

### Epic 1. 리뷰 이슈 수정

#### [x] Feature 1.1 스크립트 로드 재시도 버그 수정 및 문서 정합성

**의존성:** 없음

**범위:**

- LOGIC-005: `loadDaumPostcodeScript` onerror 시 실패한 스크립트 요소를 DOM에서 제거하여 재시도 가능하게 함
- CONSIST-005: Feature 1.1 문서의 설계 섹션 코드 예시를 D2 결정(모듈 레벨 상태 없음)에 맞게 수정

**경계:**

- `loadDaumPostcodeScript` 함수의 기존 정상 흐름(스크립트 로드 성공, 이미 로드된 경우)은 변경하지 않음

**설계 결정:**

- LOGIC-005: 새 스크립트 삽입 분기(`existing == null`)의 `onerror` 핸들러에서 `scriptEl.remove()` 호출. 기존 스크립트 발견 분기(`existing != null`)의 `error` 리스너에서도 `existing.remove()` 호출. 이렇게 하면 재시도 시 항상 `existing == null` 분기를 타게 되어 새 스크립트를 삽입

**근거:**

- review.md: LOGIC-005, CONSIST-005

## 제외 사항

- 없음
