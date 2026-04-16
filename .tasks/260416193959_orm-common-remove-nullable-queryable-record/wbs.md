# WBS: orm-common NullableQueryableRecord 제거 — nullable 전파 폐지

## 프로젝트 개요

- **배경:** LEFT JOIN(joinSingle/join)으로 연결된 optional relation에서 `NullableQueryableRecord`가 모든 내부 컬럼에 `| undefined`를 전파하여, select() 콜백에서 불필요한 boilerplate(`.map()` + 개별 `.n`, 또는 `nn()`)를 강제했다. SQL AST 빌더 맥락에서 이 nullable 전파는 실질적 이득이 미미하므로, 근본 원인인 `NullableQueryableRecord` 자체를 제거한다.
- **환경:** `@simplysm/orm-common` 패키지 (DBMS 독립적 ORM 코어 라이브러리)
- **전제조건:** 없음
- **기술적 제약:** `QueryableRecord`, `UnwrapQueryableRecord` 등 기존 타입의 하위 호환성 유지. `join`/`joinSingle` 메서드 시그니처 변경 없음.
- **참조 자료:**
  - `packages/orm-common/src/exec/queryable.ts:1883-1936` — `QueryableRecord`, `NullableQueryableRecord`, `nn()` 정의 위치
  - `packages/orm-common/src/exec/queryable.ts:637-714` — `join`/`joinSingle` 메서드 시그니처 (optional relation 생성 지점)
  - `packages/orm-common/tests/types/nn.spec.ts` — nn() 단위 테스트 (제거 대상)
  - `packages/orm-common/tests/types/nn.acc.spec.ts` — nn() 수락 테스트 (제거 대상)
  - `packages/orm-common/tests/types/nullable-queryable-record.spec.ts` — NullableQueryableRecord 타입 추론 테스트 (수정 대상)
  - `.tasks/260415204449_orm-common-nn-function/` — 기존 nn() 태스크 (이 작업으로 대체됨)

## Impact Mapping

- **Goal:** select() 콜백에서 optional relation 필드 접근 시 boilerplate 완전 제거
  - **Actor:** @simplysm/orm-common 소비앱 개발자
    - **Impact:** optional relation 내부 컬럼을 별도 변환 없이 스키마 정의 그대로의 타입으로 접근함
      - **Deliverable:** `QueryableRecord` 타입 통일 (NullableQueryableRecord 제거)

## Feature Breakdown

### Epic 1. NullableQueryableRecord 제거

#### [x] Feature 1.1 QueryableRecord 타입 통일 및 nn() 제거

**의존성:** 없음

**범위:**

- `QueryableRecord<TData>` 타입 수정: optional relation 분기(`TData[K] extends (infer U)[] | undefined`, `TData[K] extends DataRecord | undefined`)에서 `NullableQueryableRecord` 대신 `QueryableRecord`를 사용하도록 변경
  - 현재 (`queryable.ts:1890-1892`): `TData[K] extends (infer U)[] | undefined → NullableQueryableRecord<U>[] | undefined`
  - 변경: `→ QueryableRecord<U>[] | undefined`
  - 현재 (`queryable.ts:1896-1897`): `TData[K] extends DataRecord | undefined → NullableQueryableRecord<Exclude<TData[K], undefined>> | undefined`
  - 변경: `→ QueryableRecord<Exclude<TData[K], undefined>> | undefined`
- `NullableQueryableRecord` 타입 정의 전체 제거 (`queryable.ts:1905-1926`)
- `nn()` 함수 및 오버로드 전체 제거 (`queryable.ts:1928-1936`)
- `__nnOriginalData` unique symbol 선언 제거 (`queryable.ts:1905`)

**경계:**

- `QueryableWriteRecord`, `UnwrapQueryableRecord` 타입은 변경하지 않음 — `QueryableRecord`만 사용하므로 영향 없음
- `join`/`joinSingle` 메서드 시그니처는 변경하지 않음
- `ExprUnit.n` getter는 변경하지 않음

**근거:**

- 대화: "nn을 따로 둘게 아니라 모두 nn 씌운거 같은 상태를 기본값으로 놓는게 맞는거 아닐까" → "애초에 undefined를 씌우는 기능을 없애자는거임"
- `queryable.ts:1883-1899` — `QueryableRecord` 타입에서 optional relation이 `NullableQueryableRecord`로 매핑되는 두 분기
- `queryable.ts:1907-1926` — `NullableQueryableRecord` 타입 정의 (제거 대상)
- `queryable.ts:1928-1936` — `nn()` 함수 (제거 대상)

#### [x] Feature 1.2 타입 추론 테스트 정리

**의존성:** Feature 1.1 (QueryableRecord 타입 통일)

**범위:**

- `nn.spec.ts` 파일 삭제 — `nn()` 함수가 제거되므로 전체 불필요
- `nn.acc.spec.ts` 파일 삭제 — `nn()` 함수가 제거되므로 전체 불필요
- `nullable-queryable-record.spec.ts` 수정:
  - `nn()` import 제거
  - "nn() 타입 추론" describe 블록 전체 제거 (`nullable-queryable-record.spec.ts:57-141`)
  - "optional relation (joinSingle) fields should be ExprUnit\<T | undefined\>" 테스트 수정: `NullableQueryableRecord` 제거에 따라 `UserNameType`이 `string | undefined` 대신 `string`이 되어야 함 (`nullable-queryable-record.spec.ts:26`)
  - "select auto-infers result type" 테스트는 변경 불필요 (main table 컬럼 테스트이므로)

**경계:**

- SQL 생성 테스트는 이 Feature에서 다루지 않음 — 타입 전용 변경이므로 SQL에 영향 없음
- 다른 테스트 파일의 수정은 범위 밖 (NullableQueryableRecord를 참조하는 다른 테스트 없음)

**근거:**

- `tests/types/nn.spec.ts` — nn() 단위 테스트 (전체 제거)
- `tests/types/nn.acc.spec.ts` — nn() 수락 테스트 (전체 제거)
- `tests/types/nullable-queryable-record.spec.ts:10-30` — joinSingle 결과의 타입 추론 테스트 (기댓값 변경 필요)
- `tests/types/nullable-queryable-record.spec.ts:57-141` — nn() 관련 테스트 블록 (전체 제거)

## 제외 사항

- 문서 업데이트 (CLAUDE.md, usage.md 등) — 코드 변경 완료 후 별도 작업으로 진행
- 외부 소비 프로젝트의 nn() 사용 코드 수정 — 현재 외부 사용 없음 확인됨
- `ExprUnit.n` getter 제거 — 이 작업의 범위 밖 (개별 ExprUnit의 non-null 단언은 별개 용도)

## 의존성 매트릭스

| Feature | 의존 대상 | 필요 산출물 |
|---------|----------|-----------|
| 1.1     | 없음      | -         |
| 1.2     | 1.1      | NullableQueryableRecord가 제거된 QueryableRecord 타입 |
