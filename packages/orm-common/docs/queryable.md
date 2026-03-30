# Queryable / Executable

Type-safe query builder and stored procedure executor.

## Queryable

```typescript
class Queryable<TData extends DataRecord, TFrom extends TableBuilder<any, any> | never> {
  constructor(readonly meta: QueryableMeta<TData>);
}
```

Fluent query builder for composing SELECT, INSERT, UPDATE, DELETE, and UPSERT queries. All methods return new Queryable instances (immutable chaining).

- `TData` - Query result data type
- `TFrom` - Source table (required for CUD operations, `never` for read-only)

### Option Methods (SELECT / DISTINCT / LOCK)

| Method | Signature | Description |
|--------|-----------|-------------|
| `select` | `<R>(fn: (cols: QueryableRecord<TData>) => R) => Queryable<UnwrapQueryableRecord<R>, never>` | Specify columns to SELECT |
| `distinct` | `() => Queryable<TData, never>` | Apply DISTINCT |
| `lock` | `() => Queryable<TData, TFrom>` | Apply FOR UPDATE row lock |

### Restrict Methods (TOP / LIMIT)

| Method | Signature | Description |
|--------|-----------|-------------|
| `top` | `(count: number) => Queryable<TData, TFrom>` | Select top N rows |
| `limit` | `(skip: number, take: number) => Queryable<TData, TFrom>` | Pagination (requires orderBy) |

### Sorting (ORDER BY)

| Method | Signature | Description |
|--------|-----------|-------------|
| `orderBy` | `(fn: (cols) => ExprUnit, orderBy?: "ASC" \| "DESC") => Queryable<TData, TFrom>` | Add sort condition (stackable) |

### Filtering (WHERE)

| Method | Signature | Description |
|--------|-----------|-------------|
| `where` | `(predicate: (cols) => WhereExprUnit[]) => Queryable<TData, TFrom>` | Add WHERE conditions (stackable, AND) |
| `search` | `(fn: (cols) => ExprUnit<string\|undefined>[], searchText: string) => Queryable<TData, TFrom>` | Full-text search across columns |

### Grouping (GROUP BY / HAVING)

| Method | Signature | Description |
|--------|-----------|-------------|
| `groupBy` | `(fn: (cols) => ExprUnit[]) => Queryable<TData, never>` | Group by columns |
| `having` | `(predicate: (cols) => WhereExprUnit[]) => Queryable<TData, never>` | Filter groups |

### JOIN

| Method | Signature | Description |
|--------|-----------|-------------|
| `join` | `<A, R>(as: A, fn: (qr: JoinQueryable, cols) => Queryable<R, any>) => Queryable<TData & { [K in A]?: R[] }, TFrom>` | LEFT OUTER JOIN (1:N, result as array) |
| `joinSingle` | `<A, R>(as: A, fn: (qr: JoinQueryable, cols) => Queryable<R, any>) => Queryable<TData & { [K in A]?: R }, TFrom>` | LEFT OUTER JOIN (N:1 or 1:1, result as single object) |
| `include` | `(fn: (item: PathProxy<TData>) => PathProxy) => Queryable<TData, TFrom>` | Auto-JOIN based on TableBuilder FK/FKT relations |

### Subquery / Union

| Method | Signature | Description |
|--------|-----------|-------------|
| `wrap` | `() => Queryable<TData, never>` | Wrap as subquery (needed for count after distinct/groupBy) |
| `Queryable.union` (static) | `(...queries: Queryable<TData, any>[]) => Queryable<TData, never>` | Combine queries with UNION (min 2) |

### Recursive CTE

| Method | Signature | Description |
|--------|-----------|-------------|
| `recursive` | `(fn: (cte: RecursiveQueryable<TData>) => Queryable<TData, any>) => Queryable<TData, never>` | Generate recursive CTE (WITH RECURSIVE) |

### Execution (SELECT)

| Method | Signature | Description |
|--------|-----------|-------------|
| `execute` | `() => Promise<TData[]>` | Execute SELECT and return results |
| `single` | `() => Promise<TData \| undefined>` | Return single result (throws if > 1) |
| `first` | `() => Promise<TData \| undefined>` | Return first result |
| `count` | `(fn?: (cols) => ExprUnit) => Promise<number>` | Count rows (throws after distinct/groupBy without wrap) |
| `exists` | `() => Promise<boolean>` | Check if any matching data exists |

### QueryDef Getters (SELECT)

| Method | Signature | Description |
|--------|-----------|-------------|
| `getSelectQueryDef` | `() => SelectQueryDef` | Get the SELECT QueryDef AST |
| `getResultMeta` | `(outputColumns?: string[]) => ResultMeta` | Get result parsing metadata |

### INSERT

| Method | Signature | Description |
|--------|-----------|-------------|
| `insert` | `(records: TFrom["$inferInsert"][]) => Promise<void>` | Insert records (auto-chunks per 1000) |
| `insert` | `(records, outputColumns: K[]) => Promise<Pick<...>[]>` | Insert with output columns |
| `insertIfNotExists` | `(record: TFrom["$inferInsert"]) => Promise<void>` | Insert if WHERE condition has no match |
| `insertIfNotExists` | `(record, outputColumns: K[]) => Promise<Pick<...>>` | Insert if not exists with output |
| `insertInto` | `(targetTable: TableBuilder) => Promise<void>` | INSERT INTO ... SELECT |
| `insertInto` | `(targetTable, outputColumns: K[]) => Promise<Pick<...>[]>` | INSERT INTO ... SELECT with output |

### UPDATE / DELETE

| Method | Signature | Description |
|--------|-----------|-------------|
| `update` | `(recordFwd: (cols) => QueryableWriteRecord) => Promise<void>` | Update matching rows |
| `update` | `(recordFwd, outputColumns: K[]) => Promise<Pick<...>[]>` | Update with output |
| `delete` | `() => Promise<void>` | Delete matching rows |
| `delete` | `(outputColumns: K[]) => Promise<Pick<...>[]>` | Delete with output |

### UPSERT

| Method | Signature | Description |
|--------|-----------|-------------|
| `upsert` | `(updateFn: (cols) => WriteRecord) => Promise<void>` | Update or insert (same data) |
| `upsert` | `(updateFn, insertFn) => Promise<void>` | Update or insert (different data) |
| `upsert` | `(updateFn, insertFn?, outputColumns?) => Promise<Pick<...>[] \| void>` | With output columns |

### DDL Helper

| Method | Signature | Description |
|--------|-----------|-------------|
| `switchFk` | `(enabled: boolean) => Promise<void>` | Enable/disable FK constraints on this table |

## queryable (factory)

```typescript
function queryable<TBuilder extends TableBuilder<any, any> | ViewBuilder<any, any, any>>(
  db: DbContextBase,
  tableOrView: TBuilder,
  as?: string,
): () => Queryable<TBuilder["$inferSelect"], TBuilder extends TableBuilder ? TBuilder : never>
```

Creates a factory function that returns a new Queryable instance each time it is called. Each call allocates a fresh alias via `db.getNextAlias()`.

## Executable

```typescript
class Executable<TParams extends ColumnBuilderRecord, TReturns extends ColumnBuilderRecord> {
  constructor(db: DbContextBase, builder: ProcedureBuilder<TParams, TReturns>);
  getExecProcQueryDef(params?: InferColumnExprs<TParams>): { type: "execProc"; ... };
  async execute(params: InferColumnExprs<TParams>): Promise<InferColumnExprs<TReturns>[][]>;
}
```

Stored procedure execution wrapper.

| Method | Signature | Description |
|--------|-----------|-------------|
| `getExecProcQueryDef` | `(params?) => ExecProcQueryDef` | Build procedure execution QueryDef |
| `execute` | `(params) => Promise<T[][]>` | Execute the procedure |

## executable (factory)

```typescript
function executable<TParams, TReturns>(
  db: DbContextBase,
  builder: ProcedureBuilder<TParams, TReturns>,
): () => Executable<TParams, TReturns>
```

Creates a factory function that returns a new Executable instance.

## parseSearchQuery

```typescript
function parseSearchQuery(searchText: string): ParsedSearchQuery
```

Parses a search query string into SQL LIKE patterns.

| Syntax | Meaning | Example |
|--------|---------|---------|
| `term1 term2` | OR (match any) | `apple banana` |
| `+term` | Required (AND) | `+apple +banana` |
| `-term` | Exclude (NOT) | `apple -banana` |
| `"exact phrase"` | Exact match (required) | `"delicious fruit"` |
| `*` | Wildcard | `app*` becomes `app%` |

Escape sequences: `\\` (literal `\`), `\*`, `\%`, `\"`, `\+`, `\-`.

## ParsedSearchQuery

```typescript
interface ParsedSearchQuery {
  or: string[];    // OR conditions - LIKE patterns
  must: string[];  // AND conditions (+ prefix or quotes) - LIKE patterns
  not: string[];   // NOT conditions (- prefix) - LIKE patterns
}
```

## getMatchedPrimaryKeys

```typescript
function getMatchedPrimaryKeys(
  fkCols: string[],
  targetTable: TableBuilder<any, any>,
): string[]
```

Match FK column array with the target table's PK. Returns PK column name array. Throws if column counts do not match.

## QueryableRecord

```typescript
type QueryableRecord<TData extends DataRecord> = {
  [K in keyof TData]: TData[K] extends ColumnPrimitive
    ? ExprUnit<TData[K]>
    : TData[K] extends (infer U)[]
      ? U extends DataRecord ? QueryableRecord<U>[] : never
      : TData[K] extends DataRecord ? QueryableRecord<TData[K]> : ...
}
```

Maps each field of a DataRecord to its corresponding ExprUnit proxy. Used as the column accessor type in Queryable callbacks.

## QueryableWriteRecord

```typescript
type QueryableWriteRecord<TData> = {
  [K in keyof TData]: TData[K] extends ColumnPrimitive ? ExprInput<TData[K]> : never;
}
```

Maps each field to ExprInput for write operations (UPDATE, UPSERT).

## NullableQueryableRecord

```typescript
type NullableQueryableRecord<TData extends DataRecord> = { ... }
```

Like QueryableRecord but all primitive fields become `ExprUnit<T | undefined>`. Used for LEFT JOIN results where all columns may be NULL.

## UnwrapQueryableRecord

```typescript
type UnwrapQueryableRecord<R> = {
  [K in keyof R]: R[K] extends ExprUnit<infer T> ? T : ...
}
```

Reverse-maps QueryableRecord back to a plain DataRecord. Used internally by `select()` to infer the resulting data type.

## PathProxy

```typescript
type PathProxy<TObject> = {
  [K in keyof TObject as TObject[K] extends ColumnPrimitive ? never : K]-?: PathProxy<UnwrapArray<TObject[K]>>;
} & { readonly [PATH_SYMBOL]: string[] }
```

Type-safe proxy for `include()` that only exposes non-primitive (relation) fields. Property access builds a path array internally.

```typescript
// Only relation fields are accessible:
db.post().include((p) => p.author)         // OK - author is a relation
db.post().include((p) => p.author.company) // OK - nested relation
// db.post().include((p) => p.title)       // Compile error - title is string
```
