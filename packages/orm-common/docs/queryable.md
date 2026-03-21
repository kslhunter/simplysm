# Queryable / Executable

## `Queryable`

Type-safe query builder class. Constructs SELECT, INSERT, UPDATE, DELETE queries on tables/views in a chaining manner.

```typescript
class Queryable<
  TData extends DataRecord,
  TFrom extends TableBuilder<any, any> | never,
> {
  constructor(readonly meta: QueryableMeta<TData>);

  // SELECT / DISTINCT / LOCK
  select<R extends Record<string, any>>(
    fn: (columns: QueryableRecord<TData>) => R,
  ): Queryable<UnwrapQueryableRecord<R>, never>;
  distinct(): Queryable<TData, never>;
  lock(): Queryable<TData, TFrom>;

  // TOP / LIMIT
  top(count: number): Queryable<TData, TFrom>;
  limit(skip: number, take: number): Queryable<TData, TFrom>;

  // ORDER BY
  orderBy(
    fn: (columns: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>,
    orderBy?: "ASC" | "DESC",
  ): Queryable<TData, TFrom>;

  // WHERE
  where(predicate: (columns: QueryableRecord<TData>) => WhereExprUnit[]): Queryable<TData, TFrom>;
  search(
    fn: (columns: QueryableRecord<TData>) => ExprUnit<string | undefined>[],
    searchText: string,
  ): Queryable<TData, TFrom>;

  // GROUP BY / HAVING
  groupBy<R extends Record<string, any>>(
    fn: (columns: QueryableRecord<TData>) => R,
  ): Queryable<UnwrapQueryableRecord<R>, never>;
  having(predicate: (columns: QueryableRecord<TData>) => WhereExprUnit[]): Queryable<TData, TFrom>;

  // JOIN
  join<TKey extends string, TJoinData extends DataRecord>(
    key: TKey,
    joinFn: (j: JoinQueryable) => Queryable<TJoinData, any>,
    on?: (own: QueryableRecord<TData>, join: QueryableRecord<TJoinData>) => WhereExprUnit[],
  ): Queryable<TData & { [K in TKey]?: TJoinData[] }, TFrom>;
  joinSingle<TKey extends string, TJoinData extends DataRecord>(
    key: TKey,
    joinFn: (j: JoinQueryable) => Queryable<TJoinData, any>,
    on?: (own: QueryableRecord<TData>, join: QueryableRecord<TJoinData>) => WhereExprUnit[],
  ): Queryable<TData & { [K in TKey]?: TJoinData }, TFrom>;
  include<TKey extends string & keyof TData>(key: TKey): Queryable<TData, TFrom>;

  // RECURSIVE
  recursive<TBaseData extends DataRecord>(
    baseQueryFn: (q: Queryable<TData, TFrom>) => Queryable<TBaseData, any>,
    recursiveBodyFn: (cte: RecursiveQueryable<TBaseData>) => Queryable<any, any>,
  ): Queryable<TBaseData, never>;

  // EXECUTE (SELECT)
  execute(): Promise<TData[]>;
  single(): Promise<TData | undefined>;
  count(): Promise<number>;
  exists(): Promise<boolean>;

  // QueryDef generation
  getSelectQueryDef(): SelectQueryDef;
  getResultMeta(): ResultMeta;

  // CUD (requires TFrom to be TableBuilder)
  insert(records: TFrom["$inferInsert"][], options?: { overrideIdentity?: boolean }): Promise<TFrom["$inferColumns"][]>;
  insertIfNotExists(record: TFrom["$inferInsert"][]): Promise<TFrom["$inferColumns"][]>;
  insertInto(subQuery: Queryable<any, any>, options?: { overrideIdentity?: boolean }): Promise<TFrom["$inferColumns"][]>;
  update(fn: (columns: QueryableRecord<TData>) => Partial<...>): Promise<TFrom["$inferColumns"][]>;
  upsert(insertRecord: TFrom["$inferInsert"], updateFn: (columns: ...) => Partial<...>): Promise<TFrom["$inferColumns"][]>;
  delete(): Promise<TFrom["$inferColumns"][]>;
}
```

### Key Methods

| Method | Description |
|--------|-------------|
| `select()` | Specify columns to SELECT |
| `distinct()` | Remove duplicate rows |
| `lock()` | Apply row lock (FOR UPDATE) |
| `top()` | Select only top N rows |
| `limit()` | Set LIMIT/OFFSET for pagination (requires `orderBy()`) |
| `orderBy()` | Add sorting condition (multiple calls apply in order) |
| `where()` | Add WHERE condition (multiple calls combined with AND) |
| `search()` | Perform text search with LIKE patterns |
| `groupBy()` | Group results |
| `having()` | Add HAVING condition |
| `join()` | LEFT JOIN with 1:N result (array) |
| `joinSingle()` | LEFT JOIN with 1:1 result (single object) |
| `include()` | Include pre-defined relation from schema |
| `recursive()` | Build recursive CTE query |
| `execute()` | Execute SELECT and return results |
| `single()` | Execute SELECT and return first result |
| `count()` | Return record count |
| `exists()` | Check if records exist |
| `insert()` | INSERT records |
| `insertIfNotExists()` | INSERT only if not exists |
| `insertInto()` | INSERT from subquery |
| `update()` | UPDATE matching records |
| `upsert()` | INSERT or UPDATE |
| `delete()` | DELETE matching records |

## `queryable`

Factory function to create a Queryable accessor for DbContext.

```typescript
function queryable<T extends TableBuilder<any, any> | ViewBuilder<any, any, any>>(
  db: DbContextBase,
  builder: T,
  alias?: string,
): () => Queryable<T["$inferSelect"], T extends TableBuilder<any, any> ? T : never>;
```

## `Executable`

Stored procedure execution wrapper class.

```typescript
class Executable<TParams extends ColumnBuilderRecord, TReturns extends ColumnBuilderRecord> {
  constructor(
    private readonly _db: DbContextBase,
    private readonly _builder: ProcedureBuilder<TParams, TReturns>,
  );

  getExecProcQueryDef(params?: InferColumnExprs<TParams>): {
    type: "execProc";
    procedure: { database?: string; schema?: string; name: string };
    params?: Record<string, Expr>;
  };

  execute(params: InferColumnExprs<TParams>): Promise<InferColumnExprs<TReturns>[][]>;
}
```

| Method | Description |
|--------|-------------|
| `getExecProcQueryDef()` | Generate procedure execution QueryDef |
| `execute()` | Execute the stored procedure |

## `executable`

Factory function to create an Executable accessor for DbContext.

```typescript
function executable<
  TParams extends ColumnBuilderRecord,
  TReturns extends ColumnBuilderRecord,
>(
  db: DbContextBase,
  builder: ProcedureBuilder<TParams, TReturns>,
): () => Executable<TParams, TReturns>;
```

## `parseSearchQuery`

Parse a search query string and convert to SQL LIKE patterns.

```typescript
function parseSearchQuery(searchText: string): ParsedSearchQuery;
```

### Search Syntax

| Syntax | Meaning | Example |
|--------|---------|---------|
| `term1 term2` | OR (one of them) | `apple banana` |
| `+term` | Required (AND) | `+apple +banana` |
| `-term` | Excluded (NOT) | `apple -banana` |
| `"exact phrase"` | Exact match (required) | `"delicious fruit"` |
| `*` | Wildcard | `app*` -> `app%` |

## `ParsedSearchQuery`

Search query parsing result.

```typescript
interface ParsedSearchQuery {
  or: string[];
  must: string[];
  not: string[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `or` | `string[]` | General search terms (OR condition) - LIKE pattern |
| `must` | `string[]` | Required search terms (AND condition, + prefix or quotes) - LIKE pattern |
| `not` | `string[]` | Excluded search terms (NOT condition, - prefix) - LIKE pattern |
