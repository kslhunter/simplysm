# Query Builder

Transforms `QueryDef` AST into dialect-specific SQL strings.

## createQueryBuilder

```typescript
function createQueryBuilder(dialect: Dialect): QueryBuilderBase
```

Factory function that creates a dialect-specific QueryBuilder instance.

| Parameter | Type | Description |
|-----------|------|-------------|
| `dialect` | `"mysql" \| "mssql" \| "postgresql"` | Target DBMS dialect |

Returns `MysqlQueryBuilder`, `MssqlQueryBuilder`, or `PostgresqlQueryBuilder`.

## QueryBuilderBase

```typescript
abstract class QueryBuilderBase {
  build(def: QueryDef): QueryBuildResult;
}
```

Abstract base class for rendering `QueryDef` AST to SQL. Implements common dispatch logic; dialect-specific differences are handled by abstract methods in subclasses.

| Method | Signature | Description |
|--------|-----------|-------------|
| `build` | `(def: QueryDef) => QueryBuildResult` | Convert any QueryDef to SQL |

`QueryBuildResult` contains:

| Field | Type | Description |
|-------|------|-------------|
| `sql` | `string` | Generated SQL string |
| `resultSetIndex` | `number?` | Result set index for multi-statement queries |
| `resultSetStride` | `number?` | Stride for extracting results from multi-statement queries |

## Dialect-Specific Query Builders

### MysqlQueryBuilder

```typescript
class MysqlQueryBuilder extends QueryBuilderBase
```

MySQL 8.0.14+ query builder. Handles MySQL-specific syntax such as backtick quoting, `<=>` for NULL-safe equality, `LIMIT ... OFFSET`, `LOAD DATA LOCAL INFILE`, etc.

### MssqlQueryBuilder

```typescript
class MssqlQueryBuilder extends QueryBuilderBase
```

MSSQL 2012+ query builder. Handles bracket quoting, `TOP`, `OFFSET ... FETCH NEXT`, `MERGE` for upsert, `SET IDENTITY_INSERT`, etc.

### PostgresqlQueryBuilder

```typescript
class PostgresqlQueryBuilder extends QueryBuilderBase
```

PostgreSQL 9.0+ query builder. Handles double-quote quoting, `LIMIT ... OFFSET`, `ON CONFLICT` for upsert, `COPY FROM STDIN`, etc.

## ExprRendererBase

```typescript
abstract class ExprRendererBase {
  renderExpr(expr: Expr): string;
  renderWhereExpr(expr: WhereExpr): string;
}
```

Abstract base class for rendering `Expr` and `WhereExpr` AST nodes to SQL fragments. Each QueryBuilder uses a corresponding ExprRenderer.

| Method | Signature | Description |
|--------|-----------|-------------|
| `renderExpr` | `(expr: Expr) => string` | Render a value/function expression to SQL |
| `renderWhereExpr` | `(expr: WhereExpr) => string` | Render a WHERE condition expression to SQL |

## Dialect-Specific Expression Renderers

### MysqlExprRenderer

```typescript
class MysqlExprRenderer extends ExprRendererBase
```

MySQL expression renderer. Uses `<=>` for NULL-safe equality, `IFNULL`, `LOCATE`, MySQL `DATE_FORMAT` patterns, etc.

### MssqlExprRenderer

```typescript
class MssqlExprRenderer extends ExprRendererBase
```

MSSQL expression renderer. Uses `IIF`, `CHARINDEX`, `FORMAT` for date formatting, `DATALENGTH` for byte length, etc.

### PostgresqlExprRenderer

```typescript
class PostgresqlExprRenderer extends ExprRendererBase
```

PostgreSQL expression renderer. Uses `IS NOT DISTINCT FROM` for NULL-safe equality, `POSITION`, `TO_CHAR` for date formatting, `OCTET_LENGTH`, etc.

## parseQueryResult

```typescript
async function parseQueryResult<TRecord>(
  rawResults: Record<string, unknown>[],
  meta: ResultMeta,
): Promise<TRecord[] | undefined>
```

Parses raw database query results into typed TypeScript objects. Handles:

- **Type conversion**: Converts raw values (strings, numbers) to proper TypeScript types (`DateTime`, `DateOnly`, `Uuid`, etc.) based on `ResultMeta.columns`
- **JOIN nesting**: Flattens `"posts.id"` keys into nested `{ posts: { id: ... } }` objects
- **Grouping**: Groups rows by non-JOIN columns, collecting JOIN data into arrays (1:N) or single objects (1:1)
- **Event loop yielding**: Yields to the event loop every 100 records for large result sets

| Parameter | Type | Description |
|-----------|------|-------------|
| `rawResults` | `Record<string, unknown>[]` | Raw DB result rows |
| `meta` | `ResultMeta` | Column types and JOIN structure info |

Returns `undefined` if the input is empty or all records parse to empty objects.

```typescript
// Simple type parsing
const raw = [{ id: "1", createdAt: "2026-01-07T10:00:00.000Z" }];
const meta = { columns: { id: "number", createdAt: "DateTime" }, joins: {} };
const result = await parseQueryResult(raw, meta);
// [{ id: 1, createdAt: DateTime(...) }]

// JOIN nesting
const raw = [
  { id: 1, name: "User1", "posts.id": 10, "posts.title": "Post1" },
  { id: 1, name: "User1", "posts.id": 11, "posts.title": "Post2" },
];
const meta = {
  columns: { id: "number", name: "string", "posts.id": "number", "posts.title": "string" },
  joins: { posts: { isSingle: false } },
};
const result = await parseQueryResult(raw, meta);
// [{ id: 1, name: "User1", posts: [{ id: 10, title: "Post1" }, { id: 11, title: "Post2" }] }]
```
