# WBS: Queryable.single() + 1:N include() 데이터 잘림 버그 수정

## 프로젝트 개요

- **배경:** `Queryable.single()`이 내부적으로 `top(2)`를 호출하여, 1:N 관계 `include()` 사용 시 JOIN으로 전개된 raw SQL 행이 2개로 제한되어 관계 데이터가 잘리는 버그 (GitHub 이슈 #23)
- **환경:** `@simplysm/orm-common@14.0.39`, Node.js v20, MySQL
- **전제조건:** 없음
- **기술적 제약:** 없음
- **참조 자료:**
  - `packages/orm-common/src/exec/queryable.ts:1044` — `single()` 메서드 (수정 대상)
  - `.tasks/260413143418_debug-single-top-truncation/debug.md` — 근본 원인 분석 결과

## Impact Mapping

- **Goal:** 1:N 관계 include + single 조합에서 관계 데이터가 누락 없이 조회되도록 한다
  - **Actor:** ORM 사용 개발자
    - **Impact:** include + single 조합을 신뢰하고 사용한다
      - **Deliverable:** single() 메서드에서 top(2) 제거

## Feature Breakdown

### Epic 1. single() 버그 수정

#### [ ] Feature 1.1 single()에서 top(2) 제거

**의존성:** 없음

**범위:**

- `single()` 메서드에서 `this.top(2).execute()` 호출을 `this.execute()`로 변경
- 기존 복수 결과 검증 로직(`result.length > 1` 시 ArgumentError) 유지

**경계:**

- `top()` 메서드 자체의 동작은 변경하지 않음
- `exists()` 메서드의 `top(1)` 사용은 변경 대상이 아님 (존재 여부만 확인하므로 1:N JOIN에서도 정상 동작)

**근거:**

- GitHub 이슈 #23: "single()이 내부적으로 top(2)를 적용하는데, 이 제한이 1:N JOIN으로 전개된 raw SQL 행에 적용되어, parseQueryResult 그룹핑 전에 행이 잘린다"
- 사용자 결정: "top(2)가 없어야 하는게 맞음"
- debug.md ACH 분석: top(2)가 근본 원인으로 확정

## 제외 사항

- `exists()` 메서드의 `top(1)` 변경 — 사유: 존재 여부 확인 목적으로 1:N JOIN에서도 1행 이상 반환되면 정상 동작하므로 문제 없음
- `top()` 메서드 자체의 로직 변경 — 사유: 단독 사용 시 정상 동작하며 이번 버그와 무관
