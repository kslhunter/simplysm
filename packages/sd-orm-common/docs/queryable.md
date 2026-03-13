# Queryable

Fluent, chainable query API for building and executing database queries. Each method returns a new `Queryable` instance (immutable chaining pattern).

**Source:** `src/query/queryable/Queryable.ts`

## Class: Queryable\<D extends DbContext, T\>

### Constructor

```typescript
// Create from a table type
new Queryable(db, TableClass)

// Create from a table type with alias
new Queryable(db, TableClass, "alias")
```

### Properties

| Property | Type | Description |
|---|---|---|
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

Adds a text search filter across multiple columns. Supports `==` prefix for regex match, `<>` prefix for regex not-match, and space-separated terms for AND-combined LIKE.

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

Casts the queryable to a different type (no runtime effect).

```typescript
ofType<A>(): Queryable<D, A>
```

### Ordering

#### orderBy

Adds an ORDER BY clause. Accepts a lambda or a dot-separated column chain string.

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

Skips and takes rows (for pagination).

```typescript
limit(skip: number, take: number): Queryable<D, T>
```

#### sample

Returns a random sample of rows.

```typescript
sample(rowCount: number): Queryable<D, T>
```

### Distinct

#### distinct

Applies DISTINCT to the query.

```typescript
distinct(): Queryable<D, T>
```

### Locking

#### lock

Adds a lock hint to the query (e.g., WITH (UPDLOCK) in MSSQL).

```typescript
lock(): Queryable<D, T>
```

### Grouping

#### groupBy

Groups the query results.

```typescript
groupBy(fwd: (entity: TEntity<T>) => TEntityValue<TQueryValue>[]): Queryable<D, T>
```

```typescript
db.employee
  .select((e) => ({ departmentId: e.departmentId, count: db.qh.count() }))
  .groupBy((e) => [e.departmentId])
```

#### having

Adds a HAVING clause (used after groupBy).

```typescript
having(predicate: (entity: TEntity<T>) => TEntityValueOrQueryableOrArray<D, any>[]): Queryable<D, T>
```

### Joins

#### join

Adds a LEFT JOIN that returns an array of matching rows.

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

Adds a LEFT JOIN that returns a single matching row (or undefined).

```typescript
joinSingle<A extends string, J, R>(
  joinTypeOrQrs: Type<J> | Queryable<D, J>[],
  as: A,
  fwd: (qr: Queryable<D, J>, en: TEntity<T>) => Queryable<D, R>,
): Queryable<D, T & { [K in A]?: R }>
```

#### include

Automatically joins a related table via foreign key metadata. Accepts a lambda that navigates the entity's FK properties.

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

Wraps the current query as a subquery (derived table).

```typescript
wrap(): Queryable<D, T>
wrap<R extends Partial<T>>(tableType: Type<R>): Queryable<D, R>
```

Useful for applying operations that require a subquery, such as `countAsync()` after `groupBy()`.

### Static Methods

#### union

Creates a UNION ALL of multiple queryables.

```typescript
static union<ND extends DbContext, NT>(qrs: Queryable<ND, NT>[], as?: string): Queryable<ND, NT>
```

### Execution Methods

#### resultAsync

Executes the SELECT query and returns the result array.

```typescript
async resultAsync(): Promise<T[]>
```

#### singleAsync

Executes the query and returns a single result (throws if more than one row).

```typescript
async singleAsync(): Promise<T | undefined>
```

#### countAsync

Returns the count of rows. Optionally counts distinct values of a column.

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
```

#### updateAsync

Updates rows matching the current WHERE clause.

```typescript
async updateAsync(recordFwd: (entity: TEntity<T>) => TUpdateObject<T>): Promise<void>
async updateAsync<OK extends keyof T>(recordFwd: ..., outputColumns: OK[]): Promise<{[K in OK]: T[K]}[]>
```

```typescript
await db.employee
  .where((e) => [db.qh.equal(e.id, 1)])
  .updateAsync(() => ({ name: "New Name" }));
```

#### deleteAsync

Deletes rows matching the current WHERE clause.

```typescript
async deleteAsync(): Promise<void>
async deleteAsync<OK extends keyof T>(outputColumns: OK[]): Promise<{[K in OK]: T[K]}[]>
```

#### upsertAsync

Inserts or updates (MERGE). Supports separate update and insert expressions.

```typescript
// Same record for both insert and update
async upsertAsync(inAndUpsertFwd: (entity: TEntity<T>) => TInsertObject<T>): Promise<void>

// Separate update and insert records
async upsertAsync<U extends TUpdateObject<T>>(
  updateFwd: (entity: TEntity<T>) => U,
  insertFwd: (updateRecord: U) => TInsertObject<T>,
): Promise<void>
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

| Method | Description |
|---|---|
| `insertPrepare(records)` | Prepare an insert |
| `insertWithoutFkCheckPrepare(records)` | Prepare an insert without FK checks |
| `updatePrepare(recordFwd)` | Prepare an update |
| `deletePrepare()` | Prepare a delete |
| `upsertPrepare(updateObjOrFwd, insertObjOrFwd?)` | Prepare an upsert |
| `configIdentityInsert(state)` | Prepare identity insert on/off (MSSQL) |

## Class: QueryUnit\<T\>

Represents a typed SQL expression value. Used as column references and computed values within queries.

**Source:** `src/query/queryable/QueryUnit.ts`

### Methods

| Method | Return Type | Description |
|---|---|---|
| `notNull()` | `QueryUnit<NonNullable<T>>` | Assert the value is non-null (type narrowing only) |
| `nullable()` | `QueryUnit<T \| undefined>` | Widen the type to nullable (type narrowing only) |

## Class: StoredProcedure\<D, T\>

Represents a stored procedure that can be executed.

**Source:** `src/query/StoredProcedure.ts`

```typescript
const proc = new StoredProcedure(db, MyProcedureClass);
await proc.execAsync({ param1: "value1", param2: 42 });
```
