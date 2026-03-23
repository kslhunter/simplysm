# Queryable

Fluent, chainable query API for building and executing database queries. Each method returns a new `Queryable` instance (immutable chaining pattern).

## Class: Queryable\<D extends DbContext, T\>

**Source:** `src/query/queryable/Queryable.ts`

### Constructor Overloads

```typescript
// Create from a table type
new Queryable(db: D, tableType: Type<T>, as?: string)

// Clone an existing Queryable
new Queryable(db: D, cloneQueryable: Queryable<D, T>)

// Clone with a new entity
new Queryable(db: D, cloneQueryable: Queryable<D, any>, entity: TEntity<T>)

// Internal: create with explicit entity and defs (for wrapping)
new Queryable(db: D, tableType: Type<T> | undefined, as: string | undefined, entity: TEntity<T>, defs: IQueryableDef)
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `db` | `D` | The parent DbContext |
| `tableType` | `Type<T> \| undefined` | The table model class (undefined after wrapping) |
| `tableDef` | `ITableDef \| undefined` | Table definition metadata (undefined after wrapping) |
| `tableName` | `string` (getter) | Fully qualified table name |
| `tableDescription` | `string` (getter) | Table description from decorator |
| `tableNameDef` | `IQueryTableNameDef` (getter) | Table name definition object |

### Filtering

#### where

Adds a WHERE clause. Multiple `where()` calls are combined with AND.

```typescript
where(predicate: (entity: TEntity<T>) => TEntityValueOrQueryableOrArray<D, any>[]): Queryable<D, T>
```

```typescript
db.employee.where((e) => [db.qh.equal(e.departmentId, 1)])
db.employee.where((e) => [db.qh.greaterThen(e.age, 30), db.qh.equal(e.active, true)])
```

#### search

Adds a text search filter across multiple columns. Supports prefixes: `==` for regex match, `<>` for regex not-match. Space-separated terms produce AND-combined LIKE conditions.

```typescript
search(
  fwd: (entity: TEntity<T>) => TEntityValue<String | string | undefined>[],
  searchText: string,
): Queryable<D, T>
```

```typescript
db.employee.search((e) => [e.name, e.email], "john")
db.employee.search((e) => [e.name], "==^J.*n$")  // Regex match
```

### Projection

#### select

Projects the query result to a custom shape.

```typescript
select<A, B extends TEntityUnwrap<A>>(fwd: (entity: TEntity<T>) => A): Queryable<D, B>
select<R>(fwd: (entity: TEntity<T>) => TSelectEntity<R>): Queryable<D, R>
```

```typescript
db.employee.select((e) => ({ id: e.id, fullName: db.qh.concat(e.firstName, " ", e.lastName) }))
```

#### selectByType

Projects the query result to match the columns of another table type.

```typescript
selectByType<A>(tableType: Type<A>): Queryable<D, A>
```

#### ofType

Casts the queryable to a different type (type-level only, no runtime effect).

```typescript
ofType<A>(): Queryable<D, A>
```

### Ordering

#### orderBy

Adds an ORDER BY clause. Accepts a lambda or a dot-separated column chain string (auto-includes via FK metadata).

```typescript
orderBy(fwd: (entity: TEntity<T>) => TEntityValue<TQueryValue>, desc?: boolean): Queryable<D, T>
orderBy(columnChain: string, desc?: boolean): Queryable<D, T>
```

```typescript
db.employee.orderBy((e) => e.name)
db.employee.orderBy((e) => e.createdAt, true)  // DESC
db.employee.orderBy("department.name")          // Via FK chain
```

#### clearOrderBy

Removes all ORDER BY clauses.

```typescript
clearOrderBy(): Queryable<D, T>
```

### Pagination and Limiting

#### top

Limits the result to the first N rows.

```typescript
top(count: number): Queryable<D, T>
```

#### limit

Skips and takes rows (requires ORDER BY).

```typescript
limit(skip: number, take: number): Queryable<D, T>
```

#### sample

Returns a random sample of rows (MSSQL only via `TABLESAMPLE`).

```typescript
sample(rowCount: number): Queryable<D, T>
```

### Distinct

```typescript
distinct(): Queryable<D, T>
```

### Locking

#### lock

Adds a lock hint (`WITH (UPDLOCK)` in MSSQL, `FOR UPDATE` in MySQL).

```typescript
lock(): Queryable<D, T>
```

### Grouping

#### groupBy

Groups query results.

```typescript
groupBy(fwd: (entity: TEntity<T>) => TEntityValue<TQueryValue>[]): Queryable<D, T>
```

#### having

Adds a HAVING clause (used after `groupBy`).

```typescript
having(predicate: (entity: TEntity<T>) => TEntityValueOrQueryableOrArray<D, any>[]): Queryable<D, T>
```

### Joins

#### join

Adds a LEFT JOIN that returns an **array** of matching rows.

```typescript
join<A extends string, J, R>(
  joinTypeOrQrs: Type<J> | Queryable<D, J>[],
  as: A,
  fwd: (qr: Queryable<D, J>, en: TEntity<T>) => Queryable<D, R>,
): Queryable<D, Omit<T, A> & { [K in A]: R[] }>
```

```typescript
db.employee.join(Department, "dept", (jqr, e) =>
  jqr.where((d) => [db.qh.equal(d.id, e.departmentId)])
)
```

#### joinSingle

Adds a LEFT JOIN that returns a **single** matching row (or undefined).

```typescript
joinSingle<A extends string, J, R>(
  joinTypeOrQrs: Type<J> | Queryable<D, J>[],
  as: A,
  fwd: (qr: Queryable<D, J>, en: TEntity<T>) => Queryable<D, R>,
): Queryable<D, T & { [K in A]?: R }>
```

#### include

Automatically joins a related table via foreign key metadata.

```typescript
include(arg: (entity: TIncludeEntity<T>) => TIncludeEntity<any> | TIncludeEntity<any>[]): Queryable<D, T>
```

```typescript
db.employee.include((e) => e.department)
db.employee.include((e) => e.department.company)  // Chained include
```

#### includeByTableChainedName

Like `include`, but accepts a dot-separated string of FK property names.

```typescript
includeByTableChainedName(tableChainedName: string): Queryable<D, T>
```

### Pivot / Unpivot

#### pivot

Pivots rows into columns.

```typescript
pivot<V extends TQueryValue, P extends string>(
  valueFwd: (entity: TEntity<T>) => TEntityValue<V>,
  valueDupFwd: (value: TEntityValue<V>) => TEntityValue<V>,
  emptyValue: V,
  pivotFwd: (entity: TEntity<T>) => TEntityValue<any>,
  pivotKeys: P[],
): Queryable<D, T & Record<P, V>>
```

#### unpivot

Unpivots columns into rows.

```typescript
unpivot<VC extends string, PC extends string, RT extends TQueryValue>(
  valueColumn: VC,
  pivotColumn: PC,
  pivotKeys: string[],
  resultType: Type<RT>,
): Queryable<D, T & Record<PC, string> & Record<VC, UnwrappedType<RT> | undefined>>
```

### Wrapping (Subquery)

#### wrap

Wraps the current query as a subquery (derived table). Useful for applying operations that require a subquery, such as `countAsync()` after `groupBy()`.

```typescript
wrap(): Queryable<D, T>
wrap<R extends Partial<T>>(tableType: Type<R>): Queryable<D, R>
```

### Static Methods

#### union

Creates a UNION ALL of multiple queryables.

```typescript
static union<ND extends DbContext, NT>(qrs: Queryable<ND, NT>[], as?: string): Queryable<ND, NT>
```

### Query Definition Methods

These methods return raw query definition objects (used internally and in advanced scenarios):

| Method | Signature | Description |
|--------|-----------|-------------|
| `getSelectQueryDef` | `() => ISelectQueryDef & { select: Record<string, TQueryBuilderValue> }` | Build the SELECT query definition |
| `getInsertQueryDef` | `(obj: TInsertObject<T>, outputColumns: (keyof T)[] \| undefined) => IInsertQueryDef` | Build an INSERT query definition |
| `getUpdateQueryDef` | `(obj: TUpdateObject<T>, outputColumns: (keyof T)[] \| undefined) => IUpdateQueryDef` | Build an UPDATE query definition |
| `getDeleteQueryDef` | `(outputColumns: (keyof T)[] \| undefined) => IDeleteQueryDef` | Build a DELETE query definition |
| `getInsertIfNotExistsQueryDef` | `(insertObj: TInsertObject<T>, outputColumns: (keyof T)[] \| undefined) => IInsertIfNotExistsQueryDef` | Build a conditional INSERT definition |
| `getUpsertQueryDef` | `(updateObj, insertObj, outputColumns, aiKeyName, pkColNames) => IUpsertQueryDef` | Build an UPSERT definition |

### Execution Methods

#### resultAsync

Executes the SELECT query and returns the result array.

```typescript
async resultAsync(): Promise<T[]>
```

#### singleAsync

Executes the query and returns a single result. Throws if more than one row is returned.

```typescript
async singleAsync(): Promise<T | undefined>
```

#### countAsync

Returns the count of rows. Optionally counts distinct values of a specific column.

```typescript
async countAsync(): Promise<number>
async countAsync(fwd: (entity: TEntity<T>) => TEntityValue<any>): Promise<number>
```

#### existsAsync

Returns whether any rows match the query.

```typescript
async existsAsync(): Promise<boolean>
```

### Mutation Methods

#### insertAsync

Inserts records. Optionally returns output columns (e.g., auto-incremented IDs).

```typescript
async insertAsync(records: TInsertObject<T>[]): Promise<void>
async insertAsync<OK extends keyof T>(records: TInsertObject<T>[], outputColumns: OK[]): Promise<{[K in OK]: T[K]}[]>
```

#### insertWithoutFkCheckAsync

Same as `insertAsync` but disables FK constraint checks during insert.

```typescript
async insertWithoutFkCheckAsync(records: TInsertObject<T>[]): Promise<void>
async insertWithoutFkCheckAsync<OK extends keyof T>(records: TInsertObject<T>[], outputColumns: OK[]): Promise<{[K in OK]: T[K]}[]>
```

#### updateAsync

Updates rows matching the current WHERE clause.

```typescript
async updateAsync(recordFwd: (entity: TEntity<T>) => TUpdateObject<T> | Promise<TUpdateObject<T>>): Promise<void>
async updateAsync<OK extends keyof T>(recordFwd: ..., outputColumns: OK[]): Promise<{[K in OK]: T[K]}[]>
```

#### deleteAsync

Deletes rows matching the current WHERE clause.

```typescript
async deleteAsync(): Promise<void>
async deleteAsync<OK extends keyof T>(outputColumns: OK[]): Promise<{[K in OK]: T[K]}[]>
```

#### upsertAsync

Inserts or updates (MERGE). Supports separate update and insert expressions, and optional output columns.

```typescript
// Same record for both insert and update
async upsertAsync(inAndUpsertFwd: (entity: TEntity<T>) => TInsertObject<T> | Promise<TInsertObject<T>>): Promise<void>
async upsertAsync<OK extends keyof T>(inAndUpsertFwd: ..., outputColumns: OK[]): Promise<{[K in OK]: T[K]}[]>

// Separate update and insert records
async upsertAsync<U extends TUpdateObject<T>>(
  updateFwd: (entity: TEntity<T>) => U | Promise<U>,
  insertFwd: (updateRecord: U) => TInsertObject<T> | Promise<TInsertObject<T>>,
): Promise<void>
async upsertAsync<U, OK extends keyof T>(updateFwd: ..., insertFwd: ..., outputColumns: OK[]): Promise<{[K in OK]: T[K]}[]>
```

#### insertIntoAsync

Inserts the query results into another table (INSERT INTO ... SELECT).

```typescript
async insertIntoAsync(tableType: Type<T>, stopAutoIdentity?: boolean): Promise<void>
```

### Bulk Operations

#### bulkInsertAsync

Bulk-inserts records using the database driver's bulk insert mechanism.

```typescript
async bulkInsertAsync(records: TInsertObject<T>[]): Promise<void>
```

#### bulkUpsertAsync

Bulk upserts records (MySQL only).

```typescript
async bulkUpsertAsync(records: TInsertObject<T>[]): Promise<void>
```

### Prepared Statement Methods

These methods accumulate query definitions in `db.prepareDefs` for batch execution via `db.executePreparedAsync()`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `insertPrepare` | `(records: TInsertObject<T>[]) => void` | Prepare an insert |
| `insertWithoutFkCheckPrepare` | `(records: TInsertObject<T>[]) => void` | Prepare an insert without FK checks |
| `updatePrepare` | `(recordFwd: (entity: TEntity<T>) => TUpdateObject<T>) => void` | Prepare an update |
| `deletePrepare` | `() => void` | Prepare a delete |
| `upsertPrepare` | `<U>(updateObjOrFwd: U \| ((entity) => U), insertObjOrFwd?: ...) => void` | Prepare an upsert |
| `configIdentityInsert` | `(state: "on" \| "off") => void` | Prepare identity insert toggle (MSSQL) |

---

## Class: QueryUnit\<T\>

**Source:** `src/query/queryable/QueryUnit.ts`

Wraps a typed SQL expression fragment. Used as column references and computed values within queries.

### Constructor

```typescript
constructor(type: Type<T | WrappedType<T>> | undefined, query: any)
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `Type<T \| WrappedType<T>> \| undefined` | The TypeScript type of the wrapped value |
| `query` | `any` (getter) | The underlying SQL expression |

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `notNull` | `() => QueryUnit<NonNullable<T>>` | Assert the value is non-null (type narrowing only, no runtime effect) |
| `nullable` | `() => QueryUnit<T \| undefined>` | Widen the type to nullable (type narrowing only, no runtime effect) |

---

## Class: StoredProcedure\<D extends DbContext, T\>

**Source:** `src/query/StoredProcedure.ts`

Executes stored procedures defined with the `@Table({ procedure: ... })` decorator.

### Constructor

```typescript
constructor(db: D, tableType: Type<T>)
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `db` | `D` | The parent DbContext |
| `tableType` | `Type<T>` | The stored procedure's table type |

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `execAsync` | `(obj: TInsertObject<T>) => Promise<void>` | Execute the stored procedure with the given parameters |

---

## Entity Type Aliases

**Source:** `src/query/queryable/types.ts`

### TEntityValue\<T\>

A query value or a `QueryUnit` wrapping it.

```typescript
type TEntityValue<T extends TQueryValue> = T | QueryUnit<T>;
```

### TEntityValueOrQueryable\<D, T\>

A value, `QueryUnit`, or sub-`Queryable`.

```typescript
type TEntityValueOrQueryable<D extends DbContext, T extends TQueryValue> =
  | TEntityValue<T>
  | Queryable<D, T>;
```

### TEntityValueOrQueryableOrArray\<D, T\>

Recursive union including arrays (used for complex WHERE predicates).

```typescript
type TEntityValueOrQueryableOrArray<D extends DbContext, T extends TQueryValue> =
  | TEntityValueOrQueryable<D, T>
  | TEntityValueOrQueryableOrArray<D, T>[];
```

### TEntity\<T\>

Maps an entity type so each column property becomes a `QueryUnit<T>`, arrays become `TEntity<A>[]`, and nested objects become `TEntity<T[K]>`.

```typescript
type TEntity<T> = {
  [K in keyof T]-?: T[K] extends TQueryValue
    ? QueryUnit<T[K]>
    : T[K] extends (infer A)[]
      ? TEntity<A>[]
      : TEntity<T[K]>;
};
```

### TSelectEntity\<T\>

Entity shape for select projections (non-required properties remain optional).

```typescript
type TSelectEntity<T> = {
  [K in keyof T]: T[K] extends TQueryValue
    ? QueryUnit<T[K]>
    : T[K] extends (infer A)[]
      ? TEntity<A>[]
      : TEntity<T[K]>;
};
```

### TEntityUnwrap\<T\>

Unwraps `QueryUnit` types back to plain values. Nested objects become optional.

```typescript
type TEntityUnwrap<T> = {
  [K in keyof T]: T[K] extends QueryUnit<infer A>
    ? A
    : T[K] extends (infer A)[]
      ? TEntityUnwrap<A>[]
      : T[K] extends TQueryValue
        ? T[K]
        : TEntityUnwrap<T[K]> | undefined;
};
```

### TIncludeEntity\<T\>

Entity shape for include/join navigation (all properties required).

```typescript
type TIncludeEntity<T> = {
  [K in keyof T]-?: T[K] extends TQueryValue
    ? QueryUnit<T[K]>
    : T[K] extends (infer A)[]
      ? TIncludeEntity<A>[]
      : TIncludeEntity<T[K]>;
};
```

### IQueryableDef

Internal queryable definition structure.

| Field | Type | Description |
|-------|------|-------------|
| `from` | `string \| ISelectQueryDef \| ISelectQueryDef[]` | Source table, subquery, or UNION of subqueries |
| `join` | `(IJoinQueryDef & { isSingle: boolean })[] \| undefined` | Join definitions with multiplicity |
| `distinct` | `true \| undefined` | Apply DISTINCT |
| `where` | `TQueryBuilderValue[] \| undefined` | WHERE conditions |
| `top` | `number \| undefined` | TOP N limit |
| `groupBy` | `TQueryBuilderValue[] \| undefined` | GROUP BY expressions |
| `having` | `TQueryBuilderValue[] \| undefined` | HAVING conditions |
| `orderBy` | `[TQueryBuilderValue, "ASC" \| "DESC"][] \| undefined` | ORDER BY columns and directions |
| `limit` | `[number, number] \| undefined` | `[skip, take]` for pagination |
| `pivot` | `{ valueColumn, pivotColumn, pivotKeys } \| undefined` | PIVOT configuration |
| `unpivot` | `{ valueColumn, pivotColumn, pivotKeys } \| undefined` | UNPIVOT configuration |
| `lock` | `boolean \| undefined` | Apply row locking |
| `sample` | `number \| undefined` | TABLESAMPLE row count |

### TQueryValuePropertyNames\<T\>

Extracts property names whose types are `TQueryValue` and not optional.

```typescript
type TQueryValuePropertyNames<T> = {
  [K in keyof T]: undefined extends T[K] ? never : T[K] extends TQueryValue ? K : never;
}[keyof T];
```

### TUndefinedPropertyNames\<T\>

Extracts property names whose types include `undefined`.

```typescript
type TUndefinedPropertyNames<T> = {
  [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];
```

### TOnlyQueryValueProperty\<T\>

Picks required query-value properties and makes optional ones `Partial`.

```typescript
type TOnlyQueryValueProperty<T> = Pick<T, TQueryValuePropertyNames<T>> &
  Partial<Pick<T, TUndefinedPropertyNames<T>>>;
```

### TInsertObject\<T\>

Object shape for insert operations: non-optional query-value properties required, optional ones remain optional.

```typescript
type TInsertObject<T> = TOnlyQueryValueProperty<T>;
```

### TUpdateObject\<T\>

Object shape for update operations: all query-value properties optional, values can be direct or `QueryUnit` expressions.

```typescript
type TUpdateObject<T> = TOnlyQueryValueProperty<{
  [K in keyof T]?: T[K] | QueryUnit<T[K]> | QueryUnit<WrappedType<T[K]>>;
}>;
```
