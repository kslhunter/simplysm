# Query Builder

Converts `QueryDef` AST objects into dialect-specific SQL strings for MySQL, MSSQL, and PostgreSQL.

## API Reference

### `createQueryBuilder(dialect)`

Factory function that returns a dialect-specific `QueryBuilderBase` instance.

```typescript
function createQueryBuilder(dialect: Dialect): QueryBuilderBase
```

**Parameters:**
- `dialect` -- `"mysql"` | `"mssql"` | `"postgresql"`

**Returns:** `MysqlQueryBuilder` | `MssqlQueryBuilder` | `PostgresqlQueryBuilder`

---

### `QueryBuilderBase`

Abstract base class for SQL rendering. Contains shared logic and dispatches to dialect-specific implementations.

#### `build(def)`

Convert any `QueryDef` to SQL.

```typescript
build(def: QueryDef): QueryBuildResult
```

**QueryBuildResult:**

```typescript
interface QueryBuildResult {
  sql: string;
  resultSetIndex?: number;    // Which result set to read (for multi-statement queries)
  resultSetStride?: number;   // Read every Nth result set
}
```

---

### `ExprRendererBase`

Abstract base class for rendering `Expr` AST nodes to SQL strings.

#### Key Methods

| Method | Description |
|--------|-------------|
| `render(expr)` | Render any Expr or WhereExpr to SQL string |
| `renderWhere(exprs)` | Render array of WhereExpr joined with AND |
| `wrap(name)` | Wrap identifier (MySQL: `` `name` ``, MSSQL: `[name]`, PostgreSQL: `"name"`) |
| `escapeString(value)` | Escape string for SQL literal |
| `escapeValue(value)` | Escape any value to appropriate SQL literal |

---

### Dialect Implementations

#### `MysqlQueryBuilder` / `MysqlExprRenderer`

MySQL 8.0.14+ specific SQL generation.

- Identifier quoting: `` `name` ``
- NULL-safe equality: `<=>`
- LATERAL JOIN support
- `LIMIT offset, count` syntax

#### `MssqlQueryBuilder` / `MssqlExprRenderer`

Microsoft SQL Server 2012+ specific SQL generation.

- Identifier quoting: `[name]`
- Three-part naming: `[database].[schema].[name]`
- `CROSS APPLY` / `OUTER APPLY` instead of LATERAL
- `OFFSET ... FETCH NEXT` for pagination
- `IDENTITY_INSERT` handling

#### `PostgresqlQueryBuilder` / `PostgresqlExprRenderer`

PostgreSQL 9.0+ specific SQL generation.

- Identifier quoting: `"name"`
- `LATERAL` JOIN support
- `LIMIT ... OFFSET` syntax
- `RETURN QUERY` for procedures

---

### Supported QueryDef Types

The query builder handles all `QueryDef` union types:

#### DML

| Type | Description |
|------|-------------|
| `select` | SELECT query |
| `insert` | INSERT query |
| `insertIfNotExists` | Conditional INSERT |
| `insertInto` | INSERT INTO ... SELECT |
| `update` | UPDATE query |
| `delete` | DELETE query |
| `upsert` | INSERT or UPDATE (MERGE) |

#### DDL -- Table

| Type | Description |
|------|-------------|
| `createTable` | CREATE TABLE |
| `dropTable` | DROP TABLE |
| `renameTable` | RENAME TABLE |
| `truncate` | TRUNCATE TABLE |

#### DDL -- Column

| Type | Description |
|------|-------------|
| `addColumn` | ALTER TABLE ADD COLUMN |
| `dropColumn` | ALTER TABLE DROP COLUMN |
| `modifyColumn` | ALTER TABLE MODIFY COLUMN |
| `renameColumn` | ALTER TABLE RENAME COLUMN |

#### DDL -- Constraints

| Type | Description |
|------|-------------|
| `addPrimaryKey` | ADD PRIMARY KEY |
| `dropPrimaryKey` | DROP PRIMARY KEY |
| `addForeignKey` | ADD FOREIGN KEY |
| `dropForeignKey` | DROP FOREIGN KEY |
| `addIndex` | CREATE INDEX |
| `dropIndex` | DROP INDEX |

#### DDL -- View/Procedure

| Type | Description |
|------|-------------|
| `createView` | CREATE VIEW |
| `dropView` | DROP VIEW |
| `createProc` | CREATE PROCEDURE |
| `dropProc` | DROP PROCEDURE |
| `execProc` | EXECUTE PROCEDURE |

#### Utility

| Type | Description |
|------|-------------|
| `clearSchema` | Drop all objects in schema |
| `schemaExists` | Check schema existence |
| `switchFk` | Enable/disable FK constraints |

---

## Usage Examples

### Build SQL from QueryDef

```typescript
import { createQueryBuilder } from "@simplysm/orm-common";

const builder = createQueryBuilder("mysql");
const result = builder.build({
  type: "select",
  from: { database: "mydb", name: "User" },
  as: "T1",
  select: {
    id: { type: "column", path: ["T1", "id"] },
    name: { type: "column", path: ["T1", "name"] },
  },
  where: [{
    type: "eq",
    source: { type: "column", path: ["T1", "status"] },
    target: { type: "value", value: "active" },
  }],
});

console.log(result.sql);
// SELECT `T1`.`id` AS `id`, `T1`.`name` AS `name`
// FROM `mydb`.`User` AS `T1`
// WHERE `T1`.`status` <=> 'active'
```

### Multi-dialect Testing

```typescript
import { createQueryBuilder, dialects } from "@simplysm/orm-common";

for (const dialect of dialects) {
  const builder = createQueryBuilder(dialect);
  const result = builder.build(queryDef);
  console.log(`[${dialect}] ${result.sql}`);
}
```
