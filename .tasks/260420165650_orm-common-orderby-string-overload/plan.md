# @simplysm/orm-common `Queryable.orderBy` string overload 추가

## 배경

`.tasks/260420140423_review-data-components-usability/review.archived.md`의 DESIGN-006에서 확정된 독립 개선안. data-* 컴포넌트 제거 WBS(`.tasks/260420163508_remove-data-base-classes/wbs.md`)와 독립적으로 진행 가능.

## 문제

현재 `Queryable.orderBy`는 lambda 시그니처만 제공한다.

```typescript
// packages/orm-common/src/exec/queryable.ts:419-437 (현재)
orderBy(
  fn: (columns: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>,
  orderBy?: "ASC" | "DESC",
): Queryable<TData, TFrom> {
  if (Array.isArray(this.meta.from)) {
    const newFroms = this.meta.from.map((from) => from.orderBy(fn, orderBy));
    return new Queryable({ ...this.meta, from: newFroms });
  }
  const column = fn(this.meta.columns);
  return new Queryable({ ...this.meta, orderBy: [...(this.meta.orderBy ?? []), [column, orderBy]] });
}
```

동적 정렬(`sortingDefs` 루프, 체인 경로 키)에서 소비자가 매번 `obj.getChainValue(item, key, true) as any` 래핑을 작성해야 한다. adtek의 `utils/applyDbOrderBy.ts`가 이 보일러플레이트를 래핑한 자체 유틸.

소비자가 `(item as any)[s.key]`로 잘못 쓰면 체인 경로("vendor.name" 등)에서 undefined로 silent 실패.

## 변경안

`orderBy`에 string overload 추가. 체인 경로 문자열을 받으면 내부에서 `obj.getChainValue(columns, keyStr, true)`로 변환.

```typescript
// After
orderBy(
  fn: (columns: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>,
  orderBy?: "ASC" | "DESC",
): Queryable<TData, TFrom>;

orderBy(
  keyStr: string,
  orderBy?: "ASC" | "DESC",
): Queryable<TData, TFrom>;

orderBy(
  fnOrKey: string | ((columns: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>),
  dir?: "ASC" | "DESC",
): Queryable<TData, TFrom> {
  const fn = typeof fnOrKey === "string"
    ? (columns: QueryableRecord<TData>) => obj.getChainValue(columns, fnOrKey, true) as any
    : fnOrKey;

  if (Array.isArray(this.meta.from)) {
    const newFroms = this.meta.from.map((from) => from.orderBy(fn, dir));
    return new Queryable({ ...this.meta, from: newFroms });
  }
  const column = fn(this.meta.columns);
  return new Queryable({ ...this.meta, orderBy: [...(this.meta.orderBy ?? []), [column, dir]] });
}
```

## 소비자 코드 변화

```typescript
// Before
for (const s of this.sortingDefs()) {
  qr = qr.orderBy((item) => obj.getChainValue(item, s.key, true) as any, s.desc ? "DESC" : "ASC");
}

// After
for (const s of this.sortingDefs()) {
  qr = qr.orderBy(s.key, s.desc ? "DESC" : "ASC");
}
```

## 영향 범위

### 코드 수정

- `packages/orm-common/src/exec/queryable.ts:419-437` — overload 시그니처 + 구현 분기
  - `obj` import 추가 필요 (`@simplysm/core-common`에서)
  - 순환 의존 없음 확인 (`orm-common`은 이미 `core-common`에 의존)

### 테스트

- `packages/orm-common/tests/exec/queryable.*.spec.ts` 또는 해당 경로에 `orderBy.string.spec.ts` 추가
  - 단순 키 테스트 (`"id"`)
  - 체인 키 테스트 (`"vendor.name"`)
  - lambda 시그니처가 기존과 동일하게 동작하는지 회귀 테스트
  - array from(`Array.isArray(this.meta.from)`) 분기 커버

### 문서

- `.claude/references/sd-simplysm14/orm-common/` 하위 `orderBy` 설명 문서 (있으면) 업데이트
- `packages/orm-common/docs/` (있으면) 업데이트

### 소비 프로젝트 정리 (optional)

- adtek의 `utils/applyDbOrderBy.ts` 제거 가능 (`qr.orderBy(s.key, ...)` 직접 호출로 대체)
- 단 adtek은 모노레포 밖 범위이므로 본 task에 포함하지 않음

## 완료 조건

1. [x] `packages/orm-common/src/exec/queryable.ts` 수정
2. [x] 테스트 추가 + `pnpm test -t orm-common` (또는 동등 스크립트) 통과
3. [x] `pnpm check -t orm-common` 통과
4. [x] 관련 문서 업데이트

## 설계 결정

- **D1 (구현 시그니처)**: plan 원안의 overload 선언(lambda/string 각각 2개)은 TypeScript의 재귀적 overload 호환성 검사에서 `queryable.ts:791, 950`의 `this` 자기참조 할당과 충돌(TS2322). 단일 union 시그니처(`fnOrKey: string | ((columns) => ExprUnit<ColumnPrimitive>)`)로 변경. 호출자 관점의 동작(lambda/string 모두 허용)은 plan 의도 그대로.
- **D2 (캐스팅 타입)**: plan의 `as any`는 `as ExprUnit<ColumnPrimitive>`로 강화하여 타입 안전성 향상.

## 관련 작업

- 선행 아님, 후행 아님 (완전 독립)
- 병행 가능: `.tasks/260420163508_remove-data-base-classes/wbs.md` (data-* 삭제)
