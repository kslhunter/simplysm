# WBS: orm-common delete 메서드 반환 타입 버그 수정

## 프로젝트 개요

- **배경:** `Queryable.delete(outputColumns)` 오버로드의 반환 타입이 `$columns`(ColumnBuilder 레코드)를 참조하여, 반환값이 원시 타입이 아닌 `ColumnBuilder` 타입으로 추론됨. 소비앱에서 `expr.in()` 등에 전달 시 TS2345 에러 발생.
- **환경:** `@simplysm/orm-common` 패키지 (`packages/orm-common`)
- **전제조건:** 없음
- **기술적 제약:** 없음
- **참조 자료:**
  - `packages/orm-common/src/exec/queryable.ts:1524-1530` — 버그가 있는 `delete` 오버로드 시그니처
  - `packages/orm-common/src/exec/queryable.ts:1282-1289` — 올바른 패턴을 사용하는 `insert` 오버로드 (비교 대상)

## Impact Mapping

- **Goal:** orm-common의 `delete` 메서드가 정확한 타입을 반환하여 소비앱에서 타입 캐스팅 없이 사용 가능
  - **Actor:** orm-common 소비 개발자
    - **Impact:** delete 결과값을 추가 타입 캐스팅 없이 바로 사용한다
      - **Deliverable:** delete 오버로드 시그니처의 `$columns` → `$inferColumns` 수정

## Feature Breakdown

### Epic 1. delete 반환 타입 수정

#### [x] Feature 1.1 delete/update 오버로드 시그니처 수정

**의존성:** 없음

**범위:**

- `delete` 메서드의 오버로드 시그니처 2개 + 구현부 + `executeDefs` 제네릭에서 `TFrom["$columns"]` → `TFrom["$inferColumns"]`로 변경 (`queryable.ts:1525-1531`)
- `update` 메서드의 오버로드 시그니처 2개 + 구현부 + `executeDefs` 제네릭에서 동일하게 변경 (`queryable.ts:1487-1495`)

**경계:**

- 런타임 로직은 변경하지 않음 (타입 시그니처만 수정)

**근거:**

- 코드 확인: `insert`(`queryable.ts:1282-1289`), `upsert`(`queryable.ts:1625-1652`) 등 다른 CUD 메서드는 모두 `$inferColumns`를 사용
- 코드 확인: `update`(`queryable.ts:1487-1495`)도 `delete`와 동일하게 `$columns`를 잘못 사용 중
- 사용자 보고: 소비앱에서 `.delete(["boxId"]).map(item => item.boxId)` 결과가 `ColumnBuilder[]`로 추론되어 `expr.in()`에 전달 시 TS2345 에러 발생

## 제외 사항

- 없음
