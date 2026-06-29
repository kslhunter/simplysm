# ORM UNION 사용법

[단일 쿼리 우선](./orm.md) 규칙을 지키면서 **서로 다른 엔티티를 한 목록으로** 보여줘야 할 때 씀. 두 쿼리 결과를 애플리케이션 코드에서 배열로 합치지 말고, select 결과 형태(컬럼 이름·타입·순서)를 동일하게 맞춘 두 Queryable 을 `Queryable.union(...)` 으로 DB 단에서 합침.

## 규칙

- 두 쿼리의 select 컬럼 이름·타입·순서가 정확히 일치해야 함.
- 행이 어느 소스에서 왔는지를 구분하는 식별 리터럴(예: `rowType: "IN"`)은 JS 값을 select 결과 객체에 그대로 넣음.
- 두 쿼리 중 한쪽 select 에만 존재하는 컬럼은 나머지 쪽에서 NULL 자리채움이 필요한데, 그냥 `null` 만 쓰면 SQL 타입 추론이 안 되므로 `` expr.raw("<type>")`NULL` `` 으로 타입을 명시함.
- 필터(`where`)는 union 전에 각 쿼리에 같은 조건으로 적용함 — 각 소스에서 미리 행 수를 줄여야 union 비용이 작음 (predicate pushdown). union 결과에 필터를 걸면 두 소스를 다 읽은 뒤 거르게 되고, select 로 남긴 컬럼만 접근 가능하여 원본 엔티티의 join 경로 컬럼으로는 필터링 불가함.
- 원본 엔티티의 relation 경로(`l.part`, `l.stockIn.supplier` 등)를 select 에서 쓰려면 `select` 전에 각 소스 쿼리에서 `include(...)`/`joinSingle(...)` 로 먼저 붙임.
- 총 건수는 가능하면 **각 소스에서 따로 `count` 후 합산**함. 현재 `Queryable.union(...)` 은 SQL `UNION ALL` 로 렌더링되어 중복을 제거하지 않으므로, 두 소스 간 고유 행 수가 필요하면 `Queryable.union(...).distinct().wrap().count()` 처럼 distinct 후 wrap 하여 셈.
- `Queryable.union(...)` 결과는 의미상 derived table(서브쿼리 결과를 감싼 가상 테이블)로 취급되어, 그 위에서 호출되는 모든 fluent 연산자(`orderBy` / `limit` / `top` / `distinct` / `groupBy` / `having` / `where` / `select` / `join` 등)는 외부 union 결과 위에 자동 적용됨. union 에 합쳐지기 전 각 소스(sub-Queryable, 즉 union 인자로 넘기는 개별 Queryable)에 개별 적용(predicate pushdown 등)을 원하면 `Queryable.union(...)` 호출 전에 각 Queryable 에 미리 호출함.

## 예시

```ts
// 입고 라인
let inQr = db.stockInLine()
  .include((l) => l.stockIn.supplier)
  .include((l) => l.part)
  .select((l) => ({
    id: l.id,
    rowType: "IN",
    date: l.stockIn!.date,
    partNo: l.part!.partNo,
    qtyIn: l.qty,
    qtyOut: expr.raw("number")`NULL`,
    partnerName: l.stockIn!.supplier!.name,
  }));

// 출고 라인 (입고와 동일 shape)
let outQr = db.stockOutLine()
  .include((l) => l.stockOut.customer)
  .include((l) => l.part)
  .select((l) => ({
    id: l.id,
    rowType: "OUT",
    date: l.stockOut!.date,
    partNo: l.part!.partNo,
    qtyIn: expr.raw("number")`NULL`,
    qtyOut: l.qty,
    partnerName: l.stockOut!.customer!.name,
  }));

if (partNoFilter) {
  const pat = `%${partNoFilter.toUpperCase()}%`;
  inQr = inQr.where((r) => [expr.like(expr.upper(r.partNo), pat)]);
  outQr = outQr.where((r) => [expr.like(expr.upper(r.partNo), pat)]);
}

const total = (await inQr.count()) + (await outQr.count());

const items = await Queryable.union(inQr, outQr)
  .orderBy((r) => r.date, "DESC")
  .orderBy((r) => r.rowType, "ASC")
  .limit(page * 50, 50)
  .execute();
```
