# `Queryable`

> **읽어야 하는 상황**: SELECT/INSERT/UPDATE/DELETE/UPSERT 쿼리를 체이닝으로 구성하고 실행할 때. JOIN, include, 재귀 CTE, UNION, 페이지네이션 등 포함. 표현식 작성은 [`expr`](../expression/expr.md) 참조.

SELECT/INSERT/UPDATE/DELETE/UPSERT 체인 빌더. 메서드 체이닝으로 쿼리를 구성하고 `execute()` 계열 메서드로 실행한다. `DbContext.queryable()`로 등록된 프로퍼티를 호출하면 반환된다.

```typescript
export class Queryable<
  TData extends DataRecord,
  TFrom extends TableBuilder<any, any> | never,
> {
  constructor(readonly meta: QueryableMeta<TData>);
}
```

`TFrom`은 CUD(INSERT/UPDATE/DELETE) 연산에 필요한 TableBuilder 타입이다. VIEW 기반이거나 `select()`로 변환된 경우 `never`가 되어 CUD 메서드를 사용할 수 없다.

## Members

### SELECT 옵션

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `select(fn)` | method | `Queryable<R, never>` | SELECT할 column 지정. fn이 반환한 구조로 결과 타입 변환 |
| `distinct()` | method | `Queryable<TData, never>` | DISTINCT 중복 제거 |
| `lock()` | method | `Queryable<TData, TFrom>` | FOR UPDATE 행 잠금 |

### 범위 제한

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `top(count)` | method | `Queryable<TData, TFrom>` | 상위 N개 행만 선택 |
| `limit(skip, take)` | method | `Queryable<TData, TFrom>` | LIMIT/OFFSET 페이지네이션. `orderBy()` 후에만 사용 가능 |

### 정렬

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `orderBy(fn, direction?)` | method | `Queryable<TData, TFrom>` | 정렬 조건 추가. 여러 번 호출 시 순서대로 적용. 함수 또는 chain path 문자열 |

### WHERE 조건

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `where(predicate)` | method | `Queryable<TData, TFrom>` | WHERE 조건 추가. 여러 번 호출 시 AND로 결합 |
| `search(fn, searchText)` | method | `Queryable<TData, TFrom>` | 텍스트 검색. `parseSearchQuery` 구문 지원 |

### GROUP BY / HAVING

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `groupBy(fn)` | method | `Queryable<TData, never>` | GROUP BY 절 추가 |
| `having(predicate)` | method | `Queryable<TData, never>` | HAVING 조건 추가 |

### JOIN

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `join(as, fn)` | method | `Queryable<TData & { [as]?: R[] }, TFrom>` | 1:N LEFT OUTER JOIN. 결과에 배열로 추가 |
| `joinSingle(as, fn)` | method | `Queryable<...>` | N:1 또는 1:1 LEFT OUTER JOIN. 결과에 단일 객체로 추가 |
| `include(fn)` | method | `Queryable<TData, TFrom>` | 테이블 관계 정의 기반 자동 JOIN. 중첩 경로 지원 (`p.user.company`) |

### 서브쿼리 / UNION

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `wrap()` | method | `Queryable<TData, never>` | 현재 쿼리를 서브쿼리로 래핑. `distinct()`/`groupBy()` 후 `count()` 사용 시 필요 |
| `static union(...queries)` | static | `Queryable<TData, never>` | 여러 Queryable을 UNION으로 결합 (중복 제거). 최소 2개 필요 |

### 재귀 CTE

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `recursive(fn)` | method | `Queryable<TData, never>` | WITH RECURSIVE CTE 생성. 계층 구조 쿼리에 사용 |

### SELECT 실행

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `execute()` | method | `Promise<TData[]>` | SELECT 실행, 결과 배열 반환 |
| `single()` | method | `Promise<TData \| undefined>` | 단일 결과 반환. 2개 이상이면 에러 |
| `first()` | method | `Promise<TData \| undefined>` | 첫 번째 결과만 반환 |
| `count(fn?)` | method | `Promise<number>` | 행 수 반환. `distinct()`/`groupBy()` 후에는 `wrap()` 필요 |
| `exists()` | method | `Promise<boolean>` | 조건에 일치하는 데이터 존재 여부 |

### INSERT

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `insert(records)` | method | `Promise<void>` | INSERT 실행. MSSQL 1000행 제한으로 자동 청크 분할 |
| `insert(records, outputColumns)` | method | `Promise<Pick<...>[]>` | INSERT 후 지정한 column 값 반환 |
| `insertIfNotExists(record)` | method | `Promise<void>` | WHERE 조건에 일치하는 데이터가 없을 때만 INSERT |
| `insertInto(targetTable)` | method | `Promise<void>` | INSERT INTO ... SELECT |

### UPDATE

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `update(recordFn)` | method | `Promise<void>` | UPDATE 실행 |
| `update(recordFn, outputColumns)` | method | `Promise<Pick<...>[]>` | UPDATE 후 지정한 column 값 반환 |

### DELETE

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `delete()` | method | `Promise<void>` | DELETE 실행 |
| `delete(outputColumns)` | method | `Promise<Pick<...>[]>` | DELETE 후 지정한 column 값 반환 |

### UPSERT

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `upsert(updateFn)` | method | `Promise<void>` | WHERE 일치 시 UPDATE, 없으면 INSERT (updateFn이 두 작업에 동일 적용) |
| `upsert(updateFn, insertFn)` | method | `Promise<void>` | UPDATE/INSERT 각각 다른 데이터로 UPSERT |
| `upsert(updateFn, outputColumns)` | method | `Promise<Pick<...>[]>` | UPSERT 후 지정한 column 값 반환 |

### QueryDef 생성기

실행 없이 `QueryDef`만 반환. 테스트나 수동 실행에 사용.

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `getSelectQueryDef()` | method | `SelectQueryDef` | SELECT QueryDef 생성 |
| `getResultMeta(outputColumns?)` | method | `ResultMeta` | SELECT 결과 변환용 메타데이터 생성 |
| `getInsertQueryDef(records, outputColumns?)` | method | `InsertQueryDef` | INSERT QueryDef 생성 |
| `getInsertIfNotExistsQueryDef(record)` | method | `InsertIfNotExistsQueryDef` | INSERT IF NOT EXISTS QueryDef |
| `getInsertIntoQueryDef(targetTable)` | method | `InsertIntoQueryDef` | INSERT INTO QueryDef |
| `getUpdateQueryDef(recordFn, outputColumns?)` | method | `UpdateQueryDef` | UPDATE QueryDef |
| `getDeleteQueryDef(outputColumns?)` | method | `DeleteQueryDef` | DELETE QueryDef |
| `getUpsertQueryDef(updateFn, insertFn, outputColumns?)` | method | `UpsertQueryDef` | UPSERT QueryDef |
| `switchFk(enabled)` | method | `Promise<void>` | FK 제약조건 활성화/비활성화 |

## Related Types

### `queryable` (팩토리 함수)

`DbContext.queryable()`이 내부적으로 사용하는 팩토리 함수. 직접 호출할 일은 드물다.

```typescript
export function queryable<TBuilder extends TableBuilder<any, any> | ViewBuilder<any, any, any>>(
  db: DbContextBase,
  tableOrView: TBuilder,
  as?: string,
): () => Queryable<TBuilder["$inferSelect"], ...>;
```

### `getMatchedPrimaryKeys`

FK column 배열과 대상 테이블의 PK를 매칭하여 PK column 이름 배열을 반환한다.

```typescript
export function getMatchedPrimaryKeys(
  fkCols: string[],
  targetTable: TableBuilder<any, any>,
): string[];
```

### `QueryableRecord<TData>`

Queryable 콜백 내부에서 column을 참조할 때 사용하는 프록시 레코드 타입. 각 필드가 `ExprUnit`으로 래핑된다.

```typescript
export type QueryableRecord<TData extends DataRecord> = {
  [K in keyof TData]: TData[K] extends ColumnPrimitive
    ? ExprUnit<TData[K]>
    : ...;
};
```

### `QueryableWriteRecord<TData>`

UPDATE/UPSERT에서 레코드를 작성할 때 사용하는 타입. 각 필드가 `ExprInput<T>`(ExprUnit 또는 리터럴 값)로 받는다.

```typescript
export type QueryableWriteRecord<TData> = {
  [K in keyof TData]: TData[K] extends ColumnPrimitive ? ExprInput<TData[K]> : never;
};
```

### `UnwrapQueryableRecord<R>`

`select(fn)` 반환 타입에서 `ExprUnit<T>`를 `T`로 언래핑하여 실제 데이터 타입을 추론한다.

### `PathProxy<TObject>`

`include(fn)` 에서 관계 경로를 타입 안전하게 지정하기 위한 프록시 타입. `ColumnPrimitive` 필드는 접근 불가.

```typescript
export type PathProxy<TObject> = {
  [K in keyof TObject as TObject[K] extends ColumnPrimitive ? never : K]-?: PathProxy<...>;
};
```

## Usage

```typescript
// SELECT
const users = await db.user()
  .where((u) => [expr.eq(u.isActive, true), expr.gt(u.age, 18)])
  .select((u) => ({ id: u.id, fullName: expr.concat(u.name, " (", u.email, ")") }))
  .include((i) => i.company)
  .orderBy((u) => u.name)
  .limit(0, 20)
  .execute();

// INSERT
await db.user().insert([{ name: "Alice", createdAt: DateTime.now() }]);

// INSERT with output
const [inserted] = await db.user().insert([{ name: "Bob" }], ["id"]);

// UPDATE (column 참조)
await db.product()
  .update((p) => ({
    price: expr.mul(p.price, expr.val("number", 1.1)),
  }));

// UPSERT
await db.user()
  .where((u) => [expr.eq(u.email, "test@test.com")])
  .upsert(
    () => ({ loginCount: expr.val("number", 1) }),
    (update) => ({ ...update, email: expr.val("string", "test@test.com") }),
  );

// UNION
const combined = Queryable.union(
  db.user().where((u) => [expr.eq(u.type, "admin")]),
  db.user().where((u) => [expr.eq(u.type, "manager")]),
);

// 재귀 CTE (계층 구조)
const tree = await db.employee()
  .where((e) => [expr.null(e.managerId)])
  .recursive((cte) =>
    cte.from(Employee)
      .where((e) => [expr.eq(e.managerId, e.self[0].id)])
  )
  .execute();
```
