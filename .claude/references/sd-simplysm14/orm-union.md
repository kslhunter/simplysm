# ORM UNION 사용법

[단일 쿼리 우선](./orm.md) 규칙을 지키면서 **서로 다른 엔티티를 한 목록으로** 보여줘야 할 때 쓴다. 코드에서 merge 하지 말고, select shape 을 동일하게 맞춘 두 Queryable 을 `Queryable.union(...)` 으로 합친다.

## 규칙

- 두 쿼리의 select 컬럼 이름·타입·순서가 정확히 일치해야 한다.
- 행 종류 구분 등 리터럴 값은 JS 값을 그대로 쓴다.
- 한쪽에만 있는 컬럼은 NULL 자리채움이 필요한데 타입 추론이 안 되므로 `expr.raw("<type>")\`NULL\`` 로 명시한다.
- 필터(`where`)는 union 전에 각 쿼리에 같은 조건으로 적용한다 — 각 소스에서 미리 행 수를 줄여야 union 비용이 작다 (predicate pushdown). union 결과에 필터를 걸면 두 소스를 다 읽은 뒤 거르게 되고, select 한 컬럼만 남아 join 컬럼으로 필터도 불가하다.
- 총 건수는 가능하면 **각 소스에서 따로 `count` 후 합산**한다. union 결과의 `count` 는 양쪽 SELECT 를 모두 실행해 머티리얼라이즈한 뒤 세지만, 각각 세면 단순 집계로 끝난다. UNION DISTINCT 등으로 중복 제거가 필요해 합산이 부정확해질 때만 union 후 count.
- `Queryable.union(...)` 결과는 의미상 wrap 된 derived table 로, 그 위에서 호출되는 모든 fluent 연산자(`orderBy` / `limit` / `top` / `distinct` / `groupBy` / `having` / `where` / `select` / `join` 등)는 외부 union 위에 자동 적용된다. sub 별 적용(predicate pushdown 등)을 원하면 union 전에 각 sub-Queryable 에 미리 호출한다.

## 예시

```ts
// 입고 라인
let inQr = db.stockInLine().select((l) => ({
  id: l.id,
  rowType: "IN",
  date: l.stockIn!.date,
  partNo: l.part!.partNo,
  qtyIn: l.qty,
  qtyOut: expr.raw("number")`NULL`,
  partnerName: l.stockIn!.supplier!.name,
}));

// 출고 라인 (입고와 동일 shape)
let outQr = db.stockOutLine().select((l) => ({
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
