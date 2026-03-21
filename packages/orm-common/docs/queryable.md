# Queryable / Executable

Type-safe query builder and stored procedure executor.

Source: `src/exec/queryable.ts`, `src/exec/executable.ts`, `src/exec/search-parser.ts`

## Queryable

Immutable chaining query builder for SELECT, INSERT, UPDATE, DELETE, and UPSERT operations. Each method returns a new `Queryable` instance.

```typescript
class Queryable<TData extends DataRecord, TFrom extends TableBuilder<any, any> | never> {
  constructor(readonly meta: QueryableMeta<TData>);
  // ... chaining and execution methods
}
```

### Column Selection

#### select

Specify columns to SELECT. Returns a new column structure.

```typescript
select<R extends Record<string, any>>(
  fn: (columns: QueryableRecord<TData>) => R,
): Queryable<UnwrapQueryableRecord<R>, never>;
```

```typescript
db.user().select((u) => ({
  userName: u.name,
  userEmail: u.email,
}))
```

#### distinct

Apply DISTINCT to remove duplicate rows.

```typescript
distinct(): Queryable<TData, never>;
```

#### lock

Apply row lock (FOR UPDATE) for exclusive access within a transaction.

```typescript
lock(): Queryable<TData, TFrom>;
```

### Pagination

#### top

Select only the top N rows (can be used without ORDER BY).

```typescript
top(count: number): Queryable<TData, TFrom>;
```

#### limit

Set LIMIT/OFFSET for pagination. Requires a preceding `orderBy()`.

```typescript
limit(skip: number, take: number): Queryable<TData, TFrom>;
```

### Sorting

#### orderBy

Add an ORDER BY clause. Multiple calls apply in order.

```typescript
orderBy(
  fn: (columns: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>,
  orderBy?: "ASC" | "DESC",
): Queryable<TData, TFrom>;
```

```typescript
db.user()
  .orderBy((u) => u.name)
  .orderBy((u) => u.age, "DESC")
```

### Filtering

#### where

Add a WHERE condition. Multiple calls are combined with AND.

```typescript
where(
  predicate: (columns: QueryableRecord<TData>) => WhereExprUnit[],
): Queryable<TData, TFrom>;
```

```typescript
db.user()
  .where((u) => [expr.eq(u.isActive, true)])
  .where((u) => [expr.gte(u.age, 18)])
```

#### search

Perform text search across multiple columns. Supports OR, +must, and -exclude syntax.

```typescript
search(
  fn: (columns: QueryableRecord<TData>) => ExprUnit<string | undefined>[],
  searchText: string,
): Queryable<TData, TFrom>;
```

```typescript
db.user()
  .search((u) => [u.name, u.email], "John Doe -withdrawn")
```

### Grouping

#### groupBy

Add a GROUP BY clause.

```typescript
groupBy(
  fn: (columns: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>[],
): Queryable<TData, never>;
```

#### having

Add a HAVING clause (filtering after GROUP BY).

```typescript
having(
  predicate: (columns: QueryableRecord<TData>) => WhereExprUnit[],
): Queryable<TData, never>;
```

```typescript
db.order()
  .select((o) => ({
    userId: o.userId,
    totalAmount: expr.sum(o.amount),
  }))
  .groupBy((o) => [o.userId])
  .having((o) => [expr.gte(o.totalAmount, 10000)])
```

### Joins

#### join

LEFT OUTER JOIN for 1:N relations (result added as array).

```typescript
join<A extends string, R extends DataRecord>(
  as: A,
  fn: (qr: JoinQueryable, cols: QueryableRecord<TData>) => Queryable<R, any>,
): Queryable<TData & { [K in A]?: R[] }, TFrom>;
```

```typescript
db.user()
  .join("posts", (qr, u) =>
    qr.from(Post).where((p) => [expr.eq(p.userId, u.id)])
  )
// Result: { id, name, posts: [{ id, title }, ...] }
```

#### joinSingle

LEFT OUTER JOIN for N:1 or 1:1 relations (result added as single object).

```typescript
joinSingle<A extends string, R extends DataRecord>(
  as: A,
  fn: (qr: JoinQueryable, cols: QueryableRecord<TData>) => Queryable<R, any>,
): Queryable<TData & { [K in A]?: R }, TFrom>;
```

```typescript
db.post()
  .joinSingle("user", (qr, p) =>
    qr.from(User).where((u) => [expr.eq(u.id, p.userId)])
  )
// Result: { id, title, user: { id, name } | undefined }
```

#### include

Automatically JOIN related tables based on FK/FKT relations defined in `TableBuilder`.

```typescript
include(fn: (item: PathProxy<TData>) => PathProxy<any>): Queryable<TData, TFrom>;
```

```typescript
// Single relation
db.post().include((p) => p.author)

// Nested relation
db.post().include((p) => p.author.company)

// Multiple relations
db.user()
  .include((u) => u.company)
  .include((u) => u.posts)
```

### Subqueries

#### wrap

Wrap the current Queryable as a subquery. Required when using `count()` after `distinct()` or `groupBy()`.

```typescript
wrap(): Queryable<TData, never>;
```

#### union (static)

Combine multiple Queryables with UNION (removes duplicates). Requires at least 2 queryables.

```typescript
static union<TData extends DataRecord>(
  ...queries: Queryable<TData, any>[]
): Queryable<TData, never>;
```

```typescript
const combined = Queryable.union(
  db.user().where((u) => [expr.eq(u.type, "admin")]),
  db.user().where((u) => [expr.eq(u.type, "manager")]),
);
```

### Recursive CTE

#### recursive

Generate a recursive CTE (Common Table Expression) for hierarchical data.

```typescript
recursive(
  fn: (qr: RecursiveQueryable<TData>) => Queryable<TData, any>,
): Queryable<TData, never>;
```

```typescript
db.employee()
  .where((e) => [expr.null(e.managerId)])
  .recursive((cte) =>
    cte.from(Employee)
      .where((e) => [expr.eq(e.managerId, e.self![0].id)])
  )
```

### Execution Methods

#### execute

Execute a SELECT query and return the result array.

```typescript
async execute(): Promise<TData[]>;
```

#### single

Return a single result. Throws if more than one result is returned.

```typescript
async single(): Promise<TData | undefined>;
```

#### first

Return the first result (only the first even if multiple exist).

```typescript
async first(): Promise<TData | undefined>;
```

#### count

Return the number of result rows. Cannot be called directly after `distinct()` or `groupBy()` -- use `wrap()` first.

```typescript
async count(
  fn?: (cols: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>,
): Promise<number>;
```

#### exists

Check whether any data matching the conditions exists.

```typescript
async exists(): Promise<boolean>;
```

### Mutation Methods

#### insert

Execute an INSERT query. Automatically splits into chunks of 1000 for MSSQL.

```typescript
async insert(records: TFrom["$inferInsert"][]): Promise<void>;
async insert<K extends keyof TFrom["$inferColumns"] & string>(
  records: TFrom["$inferInsert"][],
  outputColumns: K[],
): Promise<Pick<TFrom["$inferColumns"], K>[]>;
```

```typescript
// Simple insert
await db.user().insert([{ name: "Alice", createdAt: DateTime.now() }]);

// Insert with output
const [inserted] = await db.user().insert(
  [{ name: "Alice" }],
  ["id"],
);
```

#### insertIfNotExists

INSERT only if no data matches the current WHERE condition.

```typescript
async insertIfNotExists(record: TFrom["$inferInsert"]): Promise<void>;
async insertIfNotExists<K extends keyof TFrom["$inferColumns"] & string>(
  record: TFrom["$inferInsert"],
  outputColumns: K[],
): Promise<Pick<TFrom["$inferColumns"], K>>;
```

#### insertInto

INSERT INTO ... SELECT -- insert the current SELECT results into another table.

```typescript
async insertInto<TTable extends TableBuilder<DataToColumnBuilderRecord<TData>, any>>(
  targetTable: TTable,
): Promise<void>;
async insertInto<TTable, TOut extends keyof TTable["$inferColumns"] & string>(
  targetTable: TTable,
  outputColumns: TOut[],
): Promise<Pick<TData, TOut>[]>;
```

#### update

Execute an UPDATE query.

```typescript
async update(
  recordFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>,
): Promise<void>;
async update<K extends keyof TFrom["$columns"] & string>(
  recordFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>,
  outputColumns: K[],
): Promise<Pick<TFrom["$columns"], K>[]>;
```

```typescript
await db.user()
  .where((u) => [expr.eq(u.id, 1)])
  .update((u) => ({
    name: expr.val("string", "New Name"),
  }));
```

#### delete

Execute a DELETE query.

```typescript
async delete(): Promise<void>;
async delete<K extends keyof TFrom["$columns"] & string>(
  outputColumns: K[],
): Promise<Pick<TFrom["$columns"], K>[]>;
```

#### upsert

Execute an UPSERT (UPDATE or INSERT) query.

```typescript
async upsert(
  updateFn: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>,
): Promise<void>;
async upsert<U extends QueryableWriteRecord<TFrom["$inferUpdate"]>>(
  updateFn: (cols: QueryableRecord<TData>) => U,
  insertFn: (updateRecord: U) => QueryableWriteRecord<TFrom["$inferInsert"]>,
): Promise<void>;
```

```typescript
// Same data for update and insert
await db.user()
  .where((u) => [expr.eq(u.email, "test@test.com")])
  .upsert(() => ({
    name: expr.val("string", "Test"),
    email: expr.val("string", "test@test.com"),
  }));

// Different data for update vs insert
await db.user()
  .where((u) => [expr.eq(u.email, "test@test.com")])
  .upsert(
    () => ({ loginCount: expr.val("number", 1) }),
    (update) => ({ ...update, email: expr.val("string", "test@test.com") }),
  );
```

### DDL Helper

#### switchFk

Enable or disable FK constraints on the table (usable within a transaction).

```typescript
async switchFk(enabled: boolean): Promise<void>;
```

### QueryDef Generators

These methods return the raw `QueryDef` JSON AST without executing:

- `getSelectQueryDef(): SelectQueryDef`
- `getInsertQueryDef(records, outputColumns?): InsertQueryDef`
- `getInsertIfNotExistsQueryDef(record, outputColumns?): InsertIfNotExistsQueryDef`
- `getInsertIntoQueryDef(targetTable, outputColumns?): InsertIntoQueryDef`
- `getUpdateQueryDef(recordFwd, outputColumns?): UpdateQueryDef`
- `getDeleteQueryDef(outputColumns?): DeleteQueryDef`
- `getUpsertQueryDef(updateRecordFn, insertRecordFn, outputColumns?): UpsertQueryDef`
- `getResultMeta(outputColumns?): ResultMeta`

---

## queryable (factory function)

Create a Queryable factory function for a table or view. A new alias is assigned on each call.

```typescript
function queryable<TBuilder extends TableBuilder<any, any> | ViewBuilder<any, any, any>>(
  db: DbContextBase,
  tableOrView: TBuilder,
  as?: string,
): () => Queryable<TBuilder["$inferSelect"], TBuilder extends TableBuilder<any, any> ? TBuilder : never>;
```

---

## getMatchedPrimaryKeys

Match FK column array with the target table's PK and return PK column name array.

```typescript
function getMatchedPrimaryKeys(
  fkCols: string[],
  targetTable: TableBuilder<any, any>,
): string[];
```

Throws if FK/PK column count does not match.

---

## Executable

Stored procedure execution wrapper.

```typescript
class Executable<
  TParams extends ColumnBuilderRecord,
  TReturns extends ColumnBuilderRecord,
> {
  getExecProcQueryDef(params?: InferColumnExprs<TParams>): ExecProcQueryDef;
  async execute(params: InferColumnExprs<TParams>): Promise<InferColumnExprs<TReturns>[][]>;
}
```

```typescript
const result = await db.getUserById().execute({ userId: 1n });
```

---

## executable (factory function)

Create an Executable factory function for a procedure.

```typescript
function executable<
  TParams extends ColumnBuilderRecord,
  TReturns extends ColumnBuilderRecord,
>(
  db: DbContextBase,
  builder: ProcedureBuilder<TParams, TReturns>,
): () => Executable<TParams, TReturns>;
```

---

## parseSearchQuery

Parse a search query string into SQL LIKE patterns.

```typescript
function parseSearchQuery(searchText: string): ParsedSearchQuery;
```

### ParsedSearchQuery

```typescript
interface ParsedSearchQuery {
  /** General search terms (OR condition) - LIKE pattern */
  or: string[];
  /** Required search terms (AND condition, + prefix or quotes) - LIKE pattern */
  must: string[];
  /** Excluded search terms (NOT condition, - prefix) - LIKE pattern */
  not: string[];
}
```

### Search Syntax

| Syntax | Meaning | Example |
|--------|---------|---------|
| `term1 term2` | OR (one of them) | `apple banana` |
| `+term` | Required (AND) | `+apple +banana` |
| `-term` | Excluded (NOT) | `apple -banana` |
| `"exact phrase"` | Exact match (required) | `"delicious fruit"` |
| `*` | Wildcard | `app*` -> `app%` |

### Escape Sequences

| Input | Meaning |
|-------|---------|
| `\\` | Literal `\` |
| `\*` | Literal `*` |
| `\%` | Literal `%` |
| `\"` | Literal `"` |
| `\+` | Literal `+` |
| `\-` | Literal `-` |

**Example:**

```typescript
parseSearchQuery('apple "delicious fruit" -banana +strawberry')
// {
//   or: ["%apple%"],
//   must: ["%delicious fruit%", "%strawberry%"],
//   not: ["%banana%"]
// }
```

---

## Type Helpers

| Type | Description |
|------|-------------|
| `QueryableRecord<TData>` | Maps `TData` fields to `ExprUnit` wrappers (for column references in callbacks) |
| `QueryableWriteRecord<TData>` | Maps `TData` fields to `ExprInput` (for UPDATE/INSERT value callbacks) |
| `NullableQueryableRecord<TData>` | Like `QueryableRecord` but all primitives are `| undefined` (LEFT JOIN null propagation) |
| `UnwrapQueryableRecord<R>` | Reverse-transform from `QueryableRecord` back to `DataRecord` |
| `PathProxy<TObject>` | Type-safe path proxy for `include()` -- only non-primitive fields are accessible |
