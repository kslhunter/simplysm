# @simplysm/orm-common

Simplysm Package - ORM Module (common)

Dialect-independent ORM for MySQL, MSSQL, and PostgreSQL. Provides schema definition, type-safe query building, expression construction, and query rendering without any direct database dependency. Actual database execution is handled by `@simplysm/orm-node`.

## Installation

```bash
npm install @simplysm/orm-common
```

## API Overview

### Core
| API | Type | Description |
|-----|------|-------------|
| `defineDbContext` | function | Create a DbContext definition (blueprint) |
| `createDbContext` | function | Create a DbContext instance from definition + executor |
| `DbContextDef` | interface | DbContext definition (schema metadata, no runtime state) |
| `DbContextBase` | interface | Internal interface used by Queryable/Executable |
| `DbContextStatus` | type | Connection status: `"ready" \| "connect" \| "transact"` |
| `DbContextInstance` | type | Full DbContext instance with accessors and methods |
| `DbContextConnectionMethods` | interface | connect/connectWithoutTransaction/transaction methods |
| `DbContextDdlMethods` | interface | DDL execution and QueryDef generation methods |
| `DbTransactionError` | class | Standardized transaction error with error codes |
| `DbErrorCode` | enum | Transaction error codes (NO_ACTIVE_TRANSACTION, DEADLOCK, etc.) |

-> See [docs/core.md](./docs/core.md) for details.

### Queryable / Executable
| API | Type | Description |
|-----|------|-------------|
| `Queryable` | class | Type-safe query builder (SELECT/INSERT/UPDATE/DELETE) |
| `queryable` | function | Factory to create Queryable accessor for DbContext |
| `Executable` | class | Stored procedure execution wrapper |
| `executable` | function | Factory to create Executable accessor for DbContext |
| `parseSearchQuery` | function | Parse search query string to SQL LIKE patterns |
| `ParsedSearchQuery` | interface | Search query parsing result (or/must/not arrays) |

-> See [docs/queryable.md](./docs/queryable.md) for details.

### Expression
| API | Type | Description |
|-----|------|-------------|
| `expr` | object | Dialect-independent SQL expression builder |
| `ExprUnit` | class | Type-safe expression wrapper |
| `WhereExprUnit` | class | WHERE clause expression wrapper |
| `ExprInput` | type | Input type accepting ExprUnit or literal |
| `SwitchExprBuilder` | interface | CASE/WHEN expression builder |

-> See [docs/expression.md](./docs/expression.md) for details.

### Schema Builders
| API | Type | Description |
|-----|------|-------------|
| `Table` | function | Table builder factory |
| `TableBuilder` | class | Table definition builder (columns, PK, indexes, relations) |
| `View` | function | View builder factory |
| `ViewBuilder` | class | View definition builder (query, relations) |
| `Procedure` | function | Procedure builder factory |
| `ProcedureBuilder` | class | Stored procedure definition builder |
| `ColumnBuilder` | class | Column definition builder (type, nullable, default) |
| `createColumnFactory` | function | Column type factory (int, varchar, datetime, etc.) |
| `IndexBuilder` | class | Index definition builder |
| `createIndexFactory` | function | Index factory |
| `ForeignKeyBuilder` | class | FK relation builder (N:1, creates DB constraint) |
| `ForeignKeyTargetBuilder` | class | FK reverse-reference builder (1:N) |
| `RelationKeyBuilder` | class | Logical relation builder (N:1, no DB FK) |
| `RelationKeyTargetBuilder` | class | Logical reverse-reference builder (1:N, no DB FK) |
| `createRelationFactory` | function | Relation builder factory |
| `_Migration` | const | Built-in system migration table |
| `ColumnBuilderRecord` | type | Column builder record type |
| `RelationBuilderRecord` | type | Relation builder record type |
| `InferColumns` | type | Infer value types from column builders |
| `InferColumnExprs` | type | Infer expression input types |
| `InferInsertColumns` | type | INSERT type inference |
| `InferUpdateColumns` | type | UPDATE type inference |
| `RequiredInsertKeys` | type | Required column keys for INSERT |
| `OptionalInsertKeys` | type | Optional column keys for INSERT |
| `DataToColumnBuilderRecord` | type | Data record to column builder record |
| `InferDeepRelations` | type | Deep relation type inference |
| `ExtractRelationTarget` | type | Extract N:1 relation target type |
| `ExtractRelationTargetResult` | type | Extract 1:N relation target type |

-> See [docs/schema-builders.md](./docs/schema-builders.md) for details.

### Query Builder
| API | Type | Description |
|-----|------|-------------|
| `createQueryBuilder` | function | Create dialect-specific QueryBuilder |
| `QueryBuilderBase` | class | Abstract QueryDef-to-SQL renderer |
| `ExprRendererBase` | class | Abstract expression-to-SQL renderer |
| `MysqlQueryBuilder` | class | MySQL query builder |
| `MysqlExprRenderer` | class | MySQL expression renderer |
| `MssqlQueryBuilder` | class | MSSQL query builder |
| `MssqlExprRenderer` | class | MSSQL expression renderer |
| `PostgresqlQueryBuilder` | class | PostgreSQL query builder |
| `PostgresqlExprRenderer` | class | PostgreSQL expression renderer |

-> See [docs/query-builder.md](./docs/query-builder.md) for details.

### Types
| API | Type | Description |
|-----|------|-------------|
| `Dialect` | type | Database dialect (`"mysql" \| "mssql" \| "postgresql"`) |
| `dialects` | const | List of all supported dialects |
| `IsolationLevel` | type | Transaction isolation level |
| `DataRecord` | type | Query result data record (supports nesting) |
| `DbContextExecutor` | interface | DB connection and query executor interface |
| `QueryBuildResult` | interface | Built SQL string + metadata |
| `ResultMeta` | interface | Result transformation metadata |
| `Migration` | interface | Database migration definition |
| `DataType` | type | SQL data type definition (14 variants) |
| `ColumnPrimitiveMap` | type | TypeScript type name to actual type mapping |
| `ColumnPrimitiveStr` | type | Column primitive type name |
| `ColumnPrimitive` | type | All column-storable primitive types |
| `ColumnMeta` | interface | Column metadata |
| `DateUnit` | type | Date operation unit |
| `QueryDefObjectName` | interface | DB object name (database.schema.name) |
| `QueryDef` | type | All query definition union type |
| `SelectQueryDef` | interface | SELECT query definition |
| `InsertQueryDef` | interface | INSERT query definition |
| `UpdateQueryDef` | interface | UPDATE query definition |
| `DeleteQueryDef` | interface | DELETE query definition |
| `UpsertQueryDef` | interface | UPSERT query definition |
| `DDL_TYPES` | const | DDL type constants |
| `Expr` | type | All expression union type |
| `WhereExpr` | type | WHERE clause expression union type |
| `WinFn` | type | Window function union type |
| `WinSpec` | interface | Window specification (OVER clause) |
| `parseQueryResult` | function | Transform raw DB results to typed objects |
| `inferColumnPrimitiveStr` | function | Infer ColumnPrimitiveStr from runtime value |
| `dataTypeStrToColumnPrimitiveStr` | const | SQL type to TypeScript type mapping |

-> See [docs/types.md](./docs/types.md) and [docs/utilities.md](./docs/utilities.md) for details.

## Usage Examples

### Define Schema and Query

```typescript
import { Table, defineDbContext, createDbContext, expr } from "@simplysm/orm-common";

// Define tables
const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    status: c.varchar(20).default("active"),
  }))
  .primaryKey("id")
  .indexes((i) => [i.index("email").unique()]);

const Post = Table("Post")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    authorId: c.bigint(),
    title: c.varchar(200),
  }))
  .primaryKey("id")
  .relations((r) => ({
    author: r.foreignKey(["authorId"], () => User),
  }));

// Define DbContext
const MyDb = defineDbContext({
  tables: { user: User, post: Post },
});

// Create instance and query
const db = createDbContext(MyDb, executor, { database: "mydb" });

await db.connect(async () => {
  // SELECT with WHERE
  const activeUsers = await db.user()
    .where((u) => [expr.eq(u.status, "active")])
    .orderBy((u) => u.name)
    .execute();

  // INSERT
  await db.user().insert([{ name: "John", email: "john@test.com" }]);

  // JOIN with include
  const posts = await db.post()
    .include((p) => p.author)
    .execute();
});
```
