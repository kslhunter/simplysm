# @simplysm/orm-common — Queryable

체이닝 SELECT/INSERT/UPDATE/DELETE/UPSERT 빌더. `DbContext.queryable(builder)` 가 만든 팩토리 호출(`db.user()`)마다 새 alias 가 할당된 새 `Queryable` 이 반환된다. 모든 체이닝 메서드는 새 인스턴스를 반환(immutable).

```ts
class Queryable<TData extends DataRecord, TFrom extends TableBuilder | never>
```
- `TData` — 결과 row 타입 (관계 include 포함).
- `TFrom` — CUD(INSERT/UPDATE/DELETE/UPSERT) 시 필요한 원본 TableBuilder. `select`/`join`/`union`/`wrap`/`groupBy`/`recursive`/`distinct` 한 후엔 `never` 가 되어 CUD 불가.

## 옵션 체이닝

- `.select(fn: cols => mapped)` — SELECT 컬럼/표현식 재구성. 원시 리터럴은 자동 `ExprUnit` 으로 래핑. → `Queryable<UnwrapQueryableRecord<R>, never>`.
- `.distinct()` — DISTINCT.
- `.lock()` — FOR UPDATE.
- `.top(n)` — TOP N (ORDER BY 무관).
- `.limit(skip, take)` — `orderBy` 필수, 없으면 throw.
- `.orderBy(fn | "key.path", "ASC" | "DESC"?)` — 누적. 문자열 overload 는 `obj.getChainValue` 로 컬럼 검색 (동적 정렬용).
- `.where(predicate: cols => WhereExprUnit[])` — 누적, AND 결합.
- `.search(cols => ExprUnit<string|undefined>[], text)` — `parseSearchQuery` 의 OR/AND(`+`)/NOT(`-`)/`"…"`/`*` 구문을 컬럼들에 LIKE 로 적용 (소문자 비교).
- `.groupBy(cols => ExprUnit[])` — `TFrom` → never.
- `.having(predicate)` — GROUP BY 후 필터, 누적 AND.

## JOIN / INCLUDE

```ts
.join(as, (qr, cols) => Queryable)        // 1:N — { ..., [as]?: R[] }
.joinSingle(as, (qr, cols) => Queryable)  // N:1 또는 1:1 — { ..., [as]?: R }
.include(item => item.user.company)       // PathProxy 기반 자동 JOIN (TableBuilder 기반만)
```

- 콜백의 `qr: JoinQueryable` 은 `.from(table)` / `.select(customCols)` / `.union(...queries)` 제공.
- `.include` 는 `TableBuilder.relations` 정의를 따라 FK/RelationKey(=joinSingle) 또는 FKT/RelationKeyTarget(=join, `single:true` 면 joinSingle) 으로 풀림. 동일 경로 중복 호출은 무시. 다단계(`a.b.c`)는 부모 객체 안으로 nested 됨.
- PathProxy 는 ColumnPrimitive 필드 접근을 컴파일 에러로 막아 관계 키만 허용.

## Subquery / UNION / Recursive CTE

- `.wrap()` — 현재 Queryable 을 서브쿼리로 감싼 새 Queryable. `distinct()`/`groupBy()` 후 `count()` 직전에 필요.
- `Queryable.union(q1, q2, ...)` (static) — UNION (중복 제거). 2개 미만 throw. 첫 query 의 컬럼 구조 사용.
- `.recursive(fn: (cte: RecursiveQueryable<TData>) => Queryable<TData>)` — WITH RECURSIVE 생성. 콜백 안에서 `cte.from(table)` 한 결과에 `self` 프로퍼티(현재 CTE 자기 참조)가 부여됨. `.union(...)` 도 가능.

## 실행 (SELECT)

- `await qr.execute(): Promise<TData[]>`
- `await qr.single(): Promise<TData | undefined>` — 2개 이상이면 throw.
- `await qr.first(): Promise<TData | undefined>` — 내부 `top(1)`.
- `await qr.count(fn?): Promise<number>` — `distinct`/`groupBy` 후 직접 호출시 throw → `wrap()` 필요.
- `await qr.exists(): Promise<boolean>` — `top(1)` 으로 행 존재 확인.

## CUD (TFrom = TableBuilder 필요)

```ts
await q.insert(records);
const [{ id }] = await q.insert([{...}], ["id"]);             // OUTPUT

await q.insertIfNotExists(record);                            // WHERE 조건과 결합
await q.insertIfNotExists(record, ["id"]);                    // 단건 반환

await q2.insertInto(TargetTable);                             // INSERT INTO ... SELECT
await q2.insertInto(TargetTable, ["id"]);

await q.update(cols => ({ name: expr.val("string", "x") }));
await q.update(cols => ({...}), ["id"]);

await q.delete();
await q.delete(["id", "name"]);

await q.upsert(updateFn);                                     // UPDATE 또는 INSERT (existsSelectQuery=현재 where)
await q.upsert(updateFn, ["id"]);
await q.upsert(updateFn, insertFn);
await q.upsert(updateFn, insertFn, ["id"]);
```

- `insert(records)` 는 records 0건이면 noop. MSSQL 1000행 제한을 위해 청크 분할(`CHUNK_SIZE=1000`) — 각 청크는 별도 `executeDefs` 호출, OUTPUT 도 누적.
- `insert` 의 records 에 autoIncrement 컬럼 값이 명시되면 자동으로 `overrideIdentity` 켜짐.
- CUD 는 `TFrom` 이 `TableBuilder` 일 때만 — 아니면 `_getCudOutputDef` 에서 throw. ViewBuilder/Queryable 합성/Union 후엔 사용 불가.
- `await q.switchFk(enabled)` — TableBuilder/ViewBuilder 기반에서 FK on/off (트랜잭션 내 사용 가능).

## QueryDef 생성기 (실행 없이 def 만)

`getSelectQueryDef()`, `getInsertQueryDef(records, output?)`, `getInsertIfNotExistsQueryDef(record, output?)`, `getInsertIntoQueryDef(target, output?)`, `getUpdateQueryDef(recordFwd, output?)`, `getDeleteQueryDef(output?)`, `getUpsertQueryDef(updateFn, insertFn, output?)`, `getResultMeta(outputColumns?)`.

## 타입

`QueryableRecord<TData>` — `TData` 의 원시 필드를 `ExprUnit<T>`, 중첩 객체/배열은 재귀로 감싼 형태. `where`/`select` 콜백 인자 타입.

`QueryableWriteRecord<TData>` — `ExprInput<T>` (= `ExprUnit<T> | T`) 으로, `update`/`upsert` 의 record 값 입력 타입.

`UnwrapQueryableRecord<R>` — `.select` 결과를 다시 DataRecord 로 역추론.

`PathProxy<T>` — `.include` 인자 타입. 비-ColumnPrimitive 필드만 노출.

## 보조 함수

```ts
queryable(db, tableOrView, as?)   // Queryable factory 생성. DbContext.queryable 의 내부 구현
getMatchedPrimaryKeys(fkCols, targetTable)  // include 가 FK 컬럼과 대상 PK 매칭
```
