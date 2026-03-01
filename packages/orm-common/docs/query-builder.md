# Query Builder

## `createQueryBuilder(dialect)`

Creates a dialect-specific `QueryBuilderBase` instance that converts `QueryDef` AST nodes to SQL strings.

```typescript
import { createQueryBuilder } from "@simplysm/orm-common";

const builder = createQueryBuilder("mysql");
const { sql } = builder.build(queryDef);
```

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `dialect` | `"mysql" \| "mssql" \| "postgresql"` | Target database dialect |

**Returns** `QueryBuilderBase`

---

## `QueryBuilderBase`

Abstract base class for dialect-specific SQL generation. The primary public method is `build(def)`.

```typescript
import { QueryBuilderBase } from "@simplysm/orm-common";

abstract class QueryBuilderBase {
  build(def: QueryDef): QueryBuildResult;
}
```

Subclasses implement rendering for all `QueryDef` types (SELECT, INSERT, UPDATE, DELETE, UPSERT, all DDL, etc.).

---

## `ExprRendererBase`

Abstract base class for expression rendering. Converts `Expr` AST nodes to SQL strings.

```typescript
import { ExprRendererBase } from "@simplysm/orm-common";

abstract class ExprRendererBase {
  render(expr: Expr | WhereExpr): string;
  renderWhere(exprs: WhereExpr[]): string;
  abstract wrap(name: string): string;
  abstract escapeString(value: string): string;
  abstract escapeValue(value: unknown): string;
}
```

---

## `MysqlQueryBuilder`

MySQL dialect implementation of `QueryBuilderBase`.

```typescript
import { MysqlQueryBuilder } from "@simplysm/orm-common";
```

---

## `MysqlExprRenderer`

MySQL dialect implementation of `ExprRendererBase`.

```typescript
import { MysqlExprRenderer } from "@simplysm/orm-common";
```

---

## `MssqlQueryBuilder`

MSSQL dialect implementation of `QueryBuilderBase`.

```typescript
import { MssqlQueryBuilder } from "@simplysm/orm-common";
```

---

## `MssqlExprRenderer`

MSSQL dialect implementation of `ExprRendererBase`.

```typescript
import { MssqlExprRenderer } from "@simplysm/orm-common";
```

---

## `PostgresqlQueryBuilder`

PostgreSQL dialect implementation of `QueryBuilderBase`.

```typescript
import { PostgresqlQueryBuilder } from "@simplysm/orm-common";
```

---

## `PostgresqlExprRenderer`

PostgreSQL dialect implementation of `ExprRendererBase`.

```typescript
import { PostgresqlExprRenderer } from "@simplysm/orm-common";
```

---

## Related types

- [`QueryDef`](./types.md#querydef-types) — union of all query definition AST types
- [`QueryBuildResult`](./types.md#querybuildresult) — return type of `build()`
- [`Dialect`](./types.md#dialect) — `"mysql" | "mssql" | "postgresql"`
