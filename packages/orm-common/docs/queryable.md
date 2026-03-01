# Queryable / Executable

## `Queryable<TData, TFrom>`

Type-safe query builder for SELECT, INSERT, UPDATE, DELETE, and UPSERT operations on a single table or view. Instances are created by the `() => Queryable` accessors on a `DbContextInstance`, or via the `queryable()` factory.

```typescript
import { Queryable } from "@simplysm/orm-common";

// Obtain a Queryable from DbContext
const qr = db.user();

// Chain operations
const users = await db.user()
  .where((u) => [expr.eq(u.isActive, true)])
  .orderBy((u) => u.name)
  .limit(0, 20)
  .result();
```

### Query shaping methods (all return a new `Queryable`)

| Method | Description |
|---|---|
| `select(fn)` | Map columns to a new shape |
| `distinct()` | Apply DISTINCT |
| `lock()` | Apply FOR UPDATE lock |
| `top(count)` | Select only top N rows |
| `limit(skip, take)` | OFFSET / LIMIT pagination (requires `orderBy` first) |
| `orderBy(fn, dir?)` | Add ORDER BY column (chainable) |
| `where(predicate)` | Add WHERE conditions (AND-combined when chained) |
| `search(fn, searchText)` | Full-text search with `parseSearchQuery` syntax |
| `groupBy(fn)` | GROUP BY columns |
| `having(predicate)` | HAVING conditions after GROUP BY |
| `join(as, fwd)` | LEFT OUTER JOIN — result added as array property |
| `joinSingle(as, fwd)` | LEFT OUTER JOIN — result added as single object property |
| `include(fn)` | Auto-join via relation definitions (FK/FKT/RelationKey) |
| `wrap()` | Wrap current query as a subquery |
| `recursive(fwd)` | Build a recursive CTE |

### Static method

| Method | Description |
|---|---|
| `Queryable.union(...queries)` | UNION ALL of multiple Queryables |

### Execution methods

| Method | Return | Description |
|---|---|---|
| `result()` | `Promise<TData[]>` | Execute SELECT, return all rows |
| `single()` | `Promise<TData \| undefined>` | Return one row; throw if more than one |
| `first()` | `Promise<TData \| undefined>` | Return first row |
| `count(fwd?)` | `Promise<number>` | Return row count |
| `exists()` | `Promise<boolean>` | Return true if any rows match |
| `insert(records, outputColumns?)` | `Promise<void \| TData[]>` | INSERT records |
| `insertIfNotExists(record, outputColumns?)` | `Promise<void \| TData>` | INSERT if WHERE condition finds no match |
| `insertInto(targetTable, outputColumns?)` | `Promise<void \| TData[]>` | INSERT INTO … SELECT |
| `update(recordFwd, outputColumns?)` | `Promise<void \| TData[]>` | UPDATE matching rows |
| `delete(outputColumns?)` | `Promise<void \| TData[]>` | DELETE matching rows |
| `upsert(record, outputColumns?)` | `Promise<void \| TData>` | INSERT or UPDATE (MERGE) |

### QueryDef generators (for use with `executeDefs` directly)

| Method | Description |
|---|---|
| `getSelectQueryDef()` | Returns `SelectQueryDef` |
| `getInsertQueryDef(records, outputColumns?)` | Returns `InsertQueryDef` |
| `getInsertIfNotExistsQueryDef(record, outputColumns?)` | Returns `InsertIfNotExistsQueryDef` |
| `getInsertIntoQueryDef(targetTable, outputColumns?)` | Returns `InsertIntoQueryDef` |
| `getUpdateQueryDef(recordFwd, outputColumns?)` | Returns `UpdateQueryDef` |
| `getDeleteQueryDef(outputColumns?)` | Returns `DeleteQueryDef` |
| `getUpsertQueryDef(record, outputColumns?)` | Returns `UpsertQueryDef` |
| `getResultMeta(outputColumns?)` | Returns `ResultMeta` for type-safe parsing |

---

## `queryable(db, tableOrView, alias?)`

Factory function that returns a `() => Queryable` accessor. Used internally by `createDbContext`.

```typescript
import { queryable } from "@simplysm/orm-common";

const getUserQr = queryable(db, User);
const users = await getUserQr().result();
```

---

## `Executable<TParams, TReturns>`

Stored procedure execution wrapper. Created by the `() => Executable` accessors on a `DbContextInstance`, or via the `executable()` factory.

```typescript
import { Executable } from "@simplysm/orm-common";

// Via DbContext
const result = await db.getUserById().execute({ userId: 1n });
```

### Methods

| Method | Description |
|---|---|
| `execute(params)` | Execute the procedure and return result sets |
| `getExecProcQueryDef(params?)` | Return the `ExecProcQueryDef` without executing |

---

## `executable(db, builder)`

Factory function that returns a `() => Executable` accessor. Used internally by `createDbContext`.

```typescript
import { executable } from "@simplysm/orm-common";

const getUser = executable(db, GetUserById);
const result = await getUser().execute({ userId: 1n });
```

---

## `parseSearchQuery(searchText)`

Parses a search query string into SQL LIKE patterns split into `or`, `must`, and `not` groups.

### Search syntax

| Syntax | Meaning |
|---|---|
| `term1 term2` | OR (either term matches) |
| `+term` | Required (AND) |
| `-term` | Excluded (NOT) |
| `"exact phrase"` | Exact match (required) |
| `*` | Wildcard (`app*` → `app%`) |
| `\\`, `\*`, `\%`, `\"`, `\+`, `\-` | Literal characters |

```typescript
import { parseSearchQuery } from "@simplysm/orm-common";

const parsed = parseSearchQuery('apple "delicious fruit" -banana +strawberry');
// {
//   or: ["%apple%"],
//   must: ["%delicious fruit%", "%strawberry%"],
//   not: ["%banana%"]
// }
```

**Returns** `ParsedSearchQuery`

```typescript
interface ParsedSearchQuery {
  or: string[];   // LIKE patterns — any match counts (OR)
  must: string[]; // LIKE patterns — all must match (AND)
  not: string[];  // LIKE patterns — none must match (NOT)
}
```

---

## `parseQueryResult(rawResults, meta)`

Transforms flat database result rows into nested TypeScript objects using `ResultMeta` type information. Handles JOIN result deduplication and 1:N grouping.

```typescript
import { parseQueryResult } from "@simplysm/orm-common";

const result = await parseQueryResult(rawRows, meta);
```

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `rawResults` | `Record<string, unknown>[]` | Raw flat rows from the DB driver |
| `meta` | `ResultMeta` | Type and JOIN structure information |

**Returns** `Promise<TRecord[] | undefined>` — `undefined` if the input is empty or all rows parse to empty objects.

---

## Related types

- [`ResultMeta`](./types.md#resultmeta)
- [`DataRecord`](./types.md#datarecord)
- [`SelectQueryDef` and other QueryDef types](./types.md#querydef-types)
