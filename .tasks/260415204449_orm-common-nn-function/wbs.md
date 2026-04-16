# WBS: orm-common nn() 타입 유틸리티 함수 추가

## 프로젝트 개요

- **배경:** `select()` 콜백에서 relation을 통째로 전달하거나 개별 필드에 접근할 때, `NullableQueryableRecord` 때문에 모든 내부 필드가 `| undefined`가 되어 일일이 `.map()` + `.n`을 붙여야 하는 번거로움이 있음. `nn()` 함수로 `NullableQueryableRecord<TData>`를 원본 `TData` 기반의 `QueryableRecord<TData>`로 변환하여 이 문제를 해결한다.
- **환경:** `@simplysm/orm-common` 패키지 (DBMS 독립적 ORM 코어 라이브러리)
- **전제조건:** 없음
- **기술적 제약:** 런타임 변경 최소화 (identity function). 기존 `QueryableRecord`/`NullableQueryableRecord` 타입의 하위 호환성 유지.
- **참조 자료:**
  - `packages/orm-common/src/exec/queryable.ts` — `QueryableRecord`, `NullableQueryableRecord`, `UnwrapQueryableRecord` 타입 정의 및 Queryable 체인 빌더
  - `packages/orm-common/src/expr/expr-unit.ts` — `ExprUnit.n` getter (기존 non-null 단언 패턴 참조)
  - `packages/orm-common/tests/types/nullable-queryable-record.spec.ts` — 기존 타입 추론 테스트 패턴 참조
  - `packages/orm-common/tests/setup/models/` — 테스트용 테이블 정의 (User, Post, Company 등)

## Impact Mapping

- **Goal:** select() 콜백에서 relation 필드 접근 시 불필요한 boilerplate(`.map()` + 개별 `.n`) 제거
  - **Actor:** @simplysm/orm-common 소비앱 개발자
    - **Impact:** relation을 통째로 전달하거나 `nn()`으로 감싸는 것만으로 원본 스키마 타입을 얻음
      - **Deliverable:** `nn()` 타입 유틸리티 함수

## Feature Breakdown

### Epic 1. nn() 타입 유틸리티

#### [x] Feature 1.1 NullableQueryableRecord phantom type 추가 및 nn() 함수 구현

**의존성:** 없음

**범위:**

- `NullableQueryableRecord<TData>` 타입에 phantom type 추가 — 원본 `TData`를 타입 레벨에서 기억
- `nn()` 함수 구현:
  - overload 1: `NullableQueryableRecord<TData>[] | undefined` → `QueryableRecord<TData>[]`
  - overload 2: `NullableQueryableRecord<TData> | undefined` → `QueryableRecord<TData>`
  - 런타임: identity function (입력을 그대로 반환)
- phantom type용 unique symbol 선언 (패키지 내부 전용, 외부 미노출)
- `index.ts`에서 `nn` export (queryable.ts에서 `export *`로 이미 포함되므로, queryable.ts에 함수를 추가하면 자동 export됨)

**경계:**

- `QueryableRecord` 타입 자체는 변경하지 않음
- `UnwrapQueryableRecord` 타입은 변경하지 않음 — `nn()`의 결과인 `QueryableRecord<TData>`는 기존 unwrap 로직으로 처리 가능
- `ExprUnit.n` getter는 변경하지 않음

**근거:**

- 대화: `nn()` 함수 방식 합의, phantom type으로 원본 `TData`를 보존하여 `QueryableRecord<TData>`로 변환
- `queryable.ts:1881-1898` — `NullableQueryableRecord` 타입 정의 위치
- `queryable.ts:1859-1875` — `QueryableRecord` 타입 정의 위치
- `expr-unit.ts:11` — `ExprUnit.n` getter (동일 개념의 기존 구현 참조)

#### [x] Feature 1.2 nn() 타입 추론 테스트

**의존성:** Feature 1.1 (nn() 함수 및 phantom type)

**범위:**

- 단일 relation에 `nn()` 적용 시 타입 검증: `nn(item.joinedRelation).nonNullableColumn` → `ExprUnit<T>` (schema NOT NULL이면 `| undefined` 없음)
- 단일 relation에 `nn()` 적용 시 schema-nullable 컬럼 검증: `nn(item.joinedRelation).nullableColumn` → `ExprUnit<T | undefined>` (schema nullable이면 `| undefined` 유지)
- 배열 relation에 `nn()` 적용 시 타입 검증: `nn(item.arrayRelation)` → `QueryableRecord<T>[]`
- `nn()` 미사용 시 기존 동작 유지 검증: `item.joinedRelation?.column` → `ExprUnit<T | undefined> | undefined`
- 런타임 동작 검증: `nn()`이 입력 객체를 그대로 반환하는지

**경계:**

- SQL 생성 테스트는 이 Feature에서 다루지 않음 — `nn()`은 타입 전용이므로 SQL에 영향 없음

**근거:**

- `tests/types/nullable-queryable-record.spec.ts` — 기존 타입 추론 테스트 패턴 (`expectTypeOf`, `$infer` 활용)
- `tests/setup/models/User.ts`, `Post.ts` — 테스트용 테이블 (nullable/non-nullable 컬럼 혼재, FK 관계 정의됨)

## 제외 사항

- deep nn (중첩 relation까지 재귀적으로 non-nullable 변환) — 현재 요구사항 범위 밖. 필요 시 별도 논의
- `.n` 프로퍼티 방식 — 컬럼명 충돌 문제로 `nn()` 함수 방식으로 결정됨

## 의존성 매트릭스

| Feature | 의존 대상 | 필요 산출물 |
|---------|----------|-----------|
| 1.1     | 없음      | -         |
| 1.2     | 1.1      | nn() 함수, phantom type이 적용된 NullableQueryableRecord |
