# Query Builder

Render `QueryDef` JSON AST to dialect-specific SQL strings.

Source: `src/query-builder/query-builder.ts`, `src/query-builder/base/query-builder-base.ts`, `src/query-builder/base/expr-renderer-base.ts`, `src/query-builder/mysql/`, `src/query-builder/mssql/`, `src/query-builder/postgresql/`

## createQueryBuilder

Factory function that returns a dialect-specific `QueryBuilderBase` implementation.

```typescript
function createQueryBuilder(dialect: Dialect): QueryBuilderBase;
```

| Dialect | QueryBuilder | ExprRenderer |
|---------|-------------|--------------|
| `"mysql"` | `MysqlQueryBuilder` | `MysqlExprRenderer` |
| `"mssql"` | `MssqlQueryBuilder` | `MssqlExprRenderer` |
| `"postgresql"` | `PostgresqlQueryBuilder` | `PostgresqlExprRenderer` |

**Example:**

```typescript
import { createQueryBuilder } from "@simplysm/orm-common";

const builder = createQueryBuilder("mysql");
const result = builder.build(queryDef);
console.log(result.sql);
```

---

## QueryBuilderBase

Abstract base class for `QueryDef` to SQL rendering. Implements common dispatch logic and rendering helpers.

```typescript
abstract class QueryBuilderBase {
  /**
   * Main entry point: dispatch to the appropriate method based on def.type
   */
  build(def: QueryDef): QueryBuildResult;
}
```

### Design Principles

- Method names match `def.type` for dynamic dispatch
- Only 100% dialect-identical logic is implemented in the base class
- Any dialect-specific behavior is declared as `abstract`

### Common Render Methods (implemented)

| Method | Description |
|--------|-------------|
| `renderWhere(wheres)` | Render WHERE clause |
| `renderOrderBy(orderBy)` | Render ORDER BY clause |
| `renderGroupBy(groupBy)` | Render GROUP BY clause |
| `renderHaving(having)` | Render HAVING clause |
| `renderJoins(joins)` | Render all JOIN clauses |
| `renderFrom(from)` | Render FROM clause source (table, subquery, union, CTE reference) |
| `needsLateral(join)` | Detect if JOIN needs LATERAL/CROSS APPLY |

### Abstract Methods (implemented per dialect)

**DML:**
- `select(def: SelectQueryDef): QueryBuildResult`
- `insert(def: InsertQueryDef): QueryBuildResult`
- `insertIfNotExists(def: InsertIfNotExistsQueryDef): QueryBuildResult`
- `insertInto(def: InsertIntoQueryDef): QueryBuildResult`
- `update(def: UpdateQueryDef): QueryBuildResult`
- `delete(def: DeleteQueryDef): QueryBuildResult`
- `upsert(def: UpsertQueryDef): QueryBuildResult`

**DDL - Table:**
- `createTable(def)`, `dropTable(def)`, `renameTable(def)`, `truncate(def)`

**DDL - Column:**
- `addColumn(def)`, `dropColumn(def)`, `modifyColumn(def)`, `renameColumn(def)`

**DDL - Constraint:**
- `addPrimaryKey(def)`, `dropPrimaryKey(def)`, `addForeignKey(def)`, `dropForeignKey(def)`, `addIndex(def)`, `dropIndex(def)`

**DDL - View/Procedure:**
- `createView(def)`, `dropView(def)`, `createProc(def)`, `dropProc(def)`, `execProc(def)`

**Utils:**
- `clearSchema(def)`, `schemaExists(def)`, `switchFk(def)`

---

## ExprRendererBase

Abstract base class for `Expr`/`WhereExpr` to SQL rendering. Implements dispatch logic.

```typescript
abstract class ExprRendererBase {
  constructor(protected buildSelect: (def: SelectQueryDef) => string);

  /** Render a single expression to SQL */
  render(expr: Expr | WhereExpr): string;

  /** Render multiple WHERE expressions joined with AND */
  renderWhere(exprs: WhereExpr[]): string;

  /** Wrap identifier (table/column name) */
  abstract wrap(name: string): string;

  /** Escape string value for SQL literals */
  abstract escapeString(value: string): string;

  /** Escape any value to SQL literal */
  abstract escapeValue(value: unknown): string;
}
```

### Abstract Methods (per category)

**Value:** `column`, `value`, `raw`

**Comparison:** `eq`, `gt`, `lt`, `gte`, `lte`, `between`, `null`, `like`, `regexp`, `in`, `inQuery`, `exists`

**Logic:** `not`, `and`, `or`

**String:** `concat`, `left`, `right`, `trim`, `padStart`, `replace`, `upper`, `lower`, `length`, `byteLength`, `substring`, `indexOf`

**Number:** `abs`, `round`, `ceil`, `floor`

**Date:** `year`, `month`, `day`, `hour`, `minute`, `second`, `isoWeek`, `isoWeekStartDate`, `isoYearMonth`, `dateDiff`, `dateAdd`, `formatDate`

**Condition:** `coalesce`, `nullIf`, `is`, `switch`, `if`

**Aggregate:** `count`, `sum`, `avg`, `max`, `min`

**Other:** `greatest`, `least`, `rowNum`, `random`, `cast`

**Window:** `window`

**System:** `subquery`

---

## Dialect Implementations

### MysqlQueryBuilder / MysqlExprRenderer

MySQL-specific implementation.

- Identifier wrapping: `` `name` ``
- NULL-safe equality: `<=>`
- LATERAL JOIN support
- UUID stored as `BINARY(16)`
- BOOLEAN mapped to `TINYINT(1)`

### MssqlQueryBuilder / MssqlExprRenderer

Microsoft SQL Server-specific implementation.

- Identifier wrapping: `[name]`
- NULL-safe equality: `(source IS NULL AND target IS NULL) OR source = target`
- CROSS APPLY for lateral joins
- `TOP` and `OFFSET...FETCH` for pagination
- `IDENTITY_INSERT` for explicit AI column values
- UUID mapped to `UNIQUEIDENTIFIER`

### PostgresqlQueryBuilder / PostgresqlExprRenderer

PostgreSQL-specific implementation.

- Identifier wrapping: `"name"`
- NULL-safe equality: `IS NOT DISTINCT FROM`
- LATERAL JOIN support
- `LIMIT...OFFSET` for pagination
- UUID as native `UUID` type
- `RETURN QUERY` in stored procedures

---

## Usage

Typically used internally by `DbContextExecutor` implementations. Direct usage:

```typescript
import { createQueryBuilder } from "@simplysm/orm-common";

const builder = createQueryBuilder("mysql");

// Build from a Queryable
const qr = db.user()
  .where((u) => [expr.eq(u.status, "active")])
  .orderBy((u) => u.name);

const queryDef = qr.getSelectQueryDef();
const result = builder.build(queryDef);
// result.sql: "SELECT ... FROM `mydb`.`User` AS `T1` WHERE ..."
```
