# Query Builder

## `createQueryBuilder`

Generate a `QueryBuilderBase` instance matching the given dialect.

```typescript
function createQueryBuilder(dialect: Dialect): QueryBuilderBase;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `dialect` | `Dialect` | Database dialect (`"mysql"`, `"mssql"`, `"postgresql"`) |

## `QueryBuilderBase`

Abstract base class that renders `QueryDef` JSON AST to dialect-specific SQL strings. Implements dispatch logic identical across all dialects; dialect-specific rendering is handled by subclasses.

```typescript
abstract class QueryBuilderBase {
  protected abstract expr: ExprRendererBase;

  build(def: QueryDef): QueryBuildResult;
}
```

| Method | Description |
|--------|-------------|
| `build()` | Render a `QueryDef` to SQL. Dispatches to the appropriate method by `def.type`. |

## `ExprRendererBase`

Abstract base class for rendering `Expr` and `WhereExpr` JSON AST nodes to dialect-specific SQL strings. Each dialect (MySQL, MSSQL, PostgreSQL) extends this class with its own implementations.

```typescript
abstract class ExprRendererBase {
  render(expr: Expr): string;
  renderWhere(expr: WhereExpr): string;
}
```

| Method | Description |
|--------|-------------|
| `render()` | Render a value expression to SQL |
| `renderWhere()` | Render a WHERE expression to SQL |

## `MysqlQueryBuilder`

MySQL-specific query builder. Extends `QueryBuilderBase`.

```typescript
class MysqlQueryBuilder extends QueryBuilderBase { ... }
```

## `MysqlExprRenderer`

MySQL-specific expression renderer. Extends `ExprRendererBase`.

```typescript
class MysqlExprRenderer extends ExprRendererBase { ... }
```

## `MssqlQueryBuilder`

MSSQL-specific query builder. Extends `QueryBuilderBase`.

```typescript
class MssqlQueryBuilder extends QueryBuilderBase { ... }
```

## `MssqlExprRenderer`

MSSQL-specific expression renderer. Extends `ExprRendererBase`.

```typescript
class MssqlExprRenderer extends ExprRendererBase { ... }
```

## `PostgresqlQueryBuilder`

PostgreSQL-specific query builder. Extends `QueryBuilderBase`.

```typescript
class PostgresqlQueryBuilder extends QueryBuilderBase { ... }
```

## `PostgresqlExprRenderer`

PostgreSQL-specific expression renderer. Extends `ExprRendererBase`.

```typescript
class PostgresqlExprRenderer extends ExprRendererBase { ... }
```
