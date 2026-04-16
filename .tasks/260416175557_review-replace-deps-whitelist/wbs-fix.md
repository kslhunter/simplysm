# WBS: replace-deps 리뷰 이슈 수정

## 프로젝트 개요

- **배경:** replace-deps 화이트리스트 전환 구현에 대한 코드 리뷰에서 테스트 품질 이슈 2건, 에러 처리 비일관성 1건이 발견됨
- **환경:** sd-cli 패키지 (`packages/sd-cli`)
- **전제조건:** replace-deps 화이트리스트 구현 완료 상태
- **기술적 제약:** 없음
- **참조 자료:**
  - `.tasks/260416175557_review-replace-deps-whitelist/review.md` — 리뷰 결과 (3건의 이슈 상세)
  - `packages/sd-cli/src/deps/replace-deps/replace-deps.ts` — 프로덕션 코드
  - `packages/sd-cli/tests/deps/replace-deps/replace-deps-setup.acc.spec.ts` — LOGIC-001 대상 테스트
  - `packages/sd-cli/tests/utils/replace-deps-watch.spec.ts` — TEST-001 대상 테스트

## Impact Mapping

- **Goal:** 리뷰에서 발견된 테스트 품질 및 에러 처리 이슈를 해소하여 코드 신뢰성을 확보한다
  - **Actor:** sd-cli 개발자
    - **Impact:** 테스트가 실제 동작을 정확히 검증하여 회귀 버그를 조기에 감지한다
      - **Deliverable:** 리뷰 이슈 3건 수정

## Feature Breakdown

### Epic 1. 리뷰 이슈 수정

#### [x] Feature 1.1 리뷰 이슈 3건 일괄 수정

**의존성:** 없음

**범위:**

- LOGIC-001: `replace-deps-setup.acc.spec.ts`의 package.json 보존 테스트에서 타겟 package.json의 version을 소스와 다른 값(`"2.0.0"`)으로 설정하여 필터 실패 시 테스트가 감지하도록 수정
- CONSIST-001: `replace-deps.ts`의 `watchReplaceDeps` for 루프 내부에 entry 단위 try-catch를 추가하여 `setupReplaceDeps`와 동일한 에러 격리 수준 확보
- TEST-001: `replace-deps-watch.spec.ts`에 npm 기본 파일(README.md) 변경 시 watch가 감지하는지 검증하는 테스트 케이스 추가

**경계:**

- 프로덕션 로직 변경은 CONSIST-001의 try-catch 추가에 한정
- 기존 테스트의 의미가 변하지 않도록 수정 (LOGIC-001은 검증력 강화만)

**근거:**

- 리뷰 문서: `.tasks/260416175557_review-replace-deps-whitelist/review.md`
- 사용자 확인: "sd-dev 스킬로 3가지 전부 수행하자"

## 설계 결정 요약

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | Feature 분할 | 단일 Feature로 통합 | 3건 모두 소규모 수정, 동일 모듈 대상, 상호 의존성 없음 |

## 제외 사항

- 없음
