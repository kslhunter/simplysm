# @simplysm/sd-orm-common

Platform-neutral ORM foundation for the Simplysm framework. Provides database context management, a fluent query builder, decorator-based schema definitions, and type-safe queryable abstractions that work across MySQL, MSSQL, MSSQL-Azure, and SQLite dialects.

## Installation

```bash
npm install @simplysm/sd-orm-common
```

**Peer dependency:** `@simplysm/sd-core-common`

## API Overview

### Context

| API | Type | Description |
|-----|------|-------------|
| `DbContext` | Abstract class | Base database context managing connections, transactions, migrations, and schema initialization |
| `TDbContextOption` | Type alias | Union of `IDefaultDbContextOption \| ISqliteDbContextOption` |
| `IDefaultDbContextOption` | Interface | Options for MySQL/MSSQL/MSSQL-Azure dialects |
| `ISqliteDbContextOption` | Interface | Options for SQLite dialect |

-> See [docs/context.md](./docs/context.md) for details.

### Decorators

| API | Type | Description |
|-----|------|-------------|
| `Table` | Decorator | Marks a class as a database table/view/procedure |
| `Column` | Decorator | Defines a column on a table class |
| `ForeignKey` | Decorator | Defines a foreign key relationship |
| `ForeignKeyTarget` | Decorator | Defines the target side of a foreign key relationship |
| `Index` | Decorator | Defines an index on a column |
| `ReferenceKey` | Decorator | Defines a reference key (non-enforced relationship) |
| `ReferenceKeyTarget` | Decorator | Defines the target side of a reference key |

-> See [docs/decorators.md](./docs/decorators.md) for details.

### Connections

| API | Type | Description |
|-----|------|-------------|
| `IDbConn` | Interface | Database connection with transaction support |
| `TDbConnConf` | Type alias | Union of `IDefaultDbConnConf \| ISqliteDbConnConf` |
| `IDefaultDbConnConf` | Interface | Connection config for MySQL/MSSQL/MSSQL-Azure |
| `ISqliteDbConnConf` | Interface | Connection config for SQLite |
| `ISOLATION_LEVEL` | Type alias | Transaction isolation levels |
| `IDbContextExecutor` | Interface | Abstraction for executing query definitions |
| `IQueryResultParseOption` | Interface | Options for parsing raw query results |

-> See [docs/connections.md](./docs/connections.md) for details.

### Query Builder

| API | Type | Description |
|-----|------|-------------|
| `QueryBuilder` | Class | Converts query definition objects into dialect-specific SQL strings |
| `QueryHelper` | Class | Provides SQL expression helpers (comparisons, aggregations, string/date functions) |
| `CaseQueryHelper` | Class | Builds SQL CASE expressions with conditional predicates |
| `CaseWhenQueryHelper` | Class | Builds SQL CASE WHEN expressions with value matching |

-> See [docs/query-builder.md](./docs/query-builder.md) for details.

### Queryable

| API | Type | Description |
|-----|------|-------------|
| `Queryable` | Class | Fluent query API for building and executing SELECT/INSERT/UPDATE/DELETE operations |
| `QueryUnit` | Class | Wraps a typed SQL expression fragment |
| `StoredProcedure` | Class | Executes stored procedures |
| `TEntityValue` | Type alias | A value or `QueryUnit` wrapper |
| `TEntityValueOrQueryable` | Type alias | A value, `QueryUnit`, or sub-`Queryable` |
| `TEntityValueOrQueryableOrArray` | Type alias | Recursive union including arrays |
| `TEntity` | Type alias | Maps entity properties to `QueryUnit` wrappers |
| `TSelectEntity` | Type alias | Entity shape for select projections |
| `TEntityUnwrap` | Type alias | Unwraps `QueryUnit` types back to plain values |
| `TIncludeEntity` | Type alias | Entity shape for include/join navigation |
| `IQueryableDef` | Interface | Internal queryable definition (from, join, where, etc.) |
| `TQueryValuePropertyNames` | Type alias | Extracts property names that are query values |
| `TUndefinedPropertyNames` | Type alias | Extracts property names that may be undefined |
| `TOnlyQueryValueProperty` | Type alias | Picks only query-value properties from a type |
| `TInsertObject` | Type alias | Object shape for insert operations |
| `TUpdateObject` | Type alias | Object shape for update operations |

-> See [docs/queryable.md](./docs/queryable.md) for details.

### Types

| API | Type | Description |
|-----|------|-------------|
| `TSdOrmDataType` | Type alias | Union of ORM data type descriptors |
| `ISdOrmDataTypeOfText` | Interface | TEXT data type |
| `ISdOrmDataTypeOfDecimal` | Interface | DECIMAL data type with precision/digits |
| `ISdOrmDataTypeOfString` | Interface | STRING (VARCHAR/NVARCHAR) data type |
| `ISdOrmDataTypeOfFixString` | Interface | FIXSTRING (NCHAR) data type |
| `ISdOrmDataTypeOfBinary` | Interface | BINARY (VARBINARY) data type |
| `TQueryValue` | Type alias | All valid query value types (alias for `TFlatType`) |
| `TStrippedQueryValue` | Type alias | Unwrapped query value types |
| `ITableNameDef` | Interface | Table name with optional database/schema |
| `ITableDef` | Interface | Full table definition (columns, keys, indexes) |
| `IColumnDef` | Interface | Column definition |
| `IForeignKeyDef` | Interface | Foreign key definition |
| `IForeignKeyTargetDef` | Interface | Foreign key target definition |
| `IIndexDef` | Interface | Index definition |
| `IReferenceKeyDef` | Interface | Reference key definition |
| `IReferenceKeyTargetDef` | Interface | Reference key target definition |
| `IDbMigration` | Interface | Migration contract with `up()` method |
| `TQueryBuilderValue` | Type alias | Recursive value type used in query building |
| `TQueryDef` | Type alias | Discriminated union of all query definition types (33 variants) |
| `TDbDateSeparator` | Type alias | Date part separators for date functions |
| `IQueryTableNameDef` | Interface | Table name reference in queries |
| `IQueryColumnDef` | Interface | Column definition in queries |
| `IQueryPrimaryKeyDef` | Interface | Primary key column with sort order |
| `ISelectQueryDef` | Interface | SELECT query definition |
| `IJoinQueryDef` | Interface | JOIN query definition |
| `IInsertQueryDef` | Interface | INSERT query definition |
| `IInsertIntoQueryDef` | Interface | INSERT INTO ... SELECT query definition |
| `IUpdateQueryDef` | Interface | UPDATE query definition |
| `IDeleteQueryDef` | Interface | DELETE query definition |
| `IInsertIfNotExistsQueryDef` | Interface | Conditional insert query definition |
| `IUpsertQueryDef` | Interface | UPSERT (merge) query definition |
| `ITruncateTableQueryDef` | Interface | TRUNCATE query definition |
| `ICreateTableQueryDef` | Interface | CREATE TABLE query definition |
| `ICreateViewQueryDef` | Interface | CREATE VIEW query definition |
| `ICreateProcedureQueryDef` | Interface | CREATE PROCEDURE query definition |
| `IExecuteProcedureQueryDef` | Interface | EXEC procedure query definition |
| `ICreateDatabaseIfNotExistsQueryDef` | Interface | CREATE DATABASE query definition |
| `IClearDatabaseIfExistsQueryDef` | Interface | Clear database query definition |
| `IGetDatabaseInfoDef` | Interface | Get database info query definition |
| `IGetTableInfosDef` | Interface | Get table list query definition |
| `IGetTableInfoDef` | Interface | Get single table info query definition |
| `IGetTableColumnInfosDef` | Interface | Get column info query definition |
| `IGetTablePrimaryKeysDef` | Interface | Get primary keys query definition |
| `IGetTableForeignKeysDef` | Interface | Get foreign keys query definition |
| `IGetTableIndexesDef` | Interface | Get indexes query definition |
| `IDropTableQueryDef` | Interface | DROP TABLE query definition |
| `IAddColumnQueryDef` | Interface | ADD COLUMN query definition |
| `IRemoveColumnQueryDef` | Interface | DROP COLUMN query definition |
| `IModifyColumnQueryDef` | Interface | ALTER COLUMN query definition |
| `IRenameColumnQueryDef` | Interface | RENAME COLUMN query definition |
| `IDropPrimaryKeyQueryDef` | Interface | DROP PRIMARY KEY query definition |
| `IAddPrimaryKeyQueryDef` | Interface | ADD PRIMARY KEY query definition |
| `IAddForeignKeyQueryDef` | Interface | ADD FOREIGN KEY query definition |
| `IRemoveForeignKeyQueryDef` | Interface | DROP FOREIGN KEY query definition |
| `ICreateIndexQueryDef` | Interface | CREATE INDEX query definition |
| `IDropIndexQueryDef` | Interface | DROP INDEX query definition |
| `IConfigIdentityInsertQueryDef` | Interface | IDENTITY_INSERT toggle query definition |
| `IConfigForeignKeyCheckQueryDef` | Interface | Foreign key check toggle query definition |

-> See [docs/types.md](./docs/types.md) for details.

### Utilities

| API | Type | Description |
|-----|------|-------------|
| `DbDefUtils` | Class | Manages table metadata via `Reflect.metadata` |
| `SdOrmUtils` | Class | Query value type detection, string escaping, and result parsing |

-> See [docs/utils.md](./docs/utils.md) for details.

### Models

| API | Type | Description |
|-----|------|-------------|
| `SystemMigration` | Class | Built-in `_migration` table entity tracking applied migrations |

-> See [docs/models.md](./docs/models.md) for details.

## Usage Examples

### Define a Model

```typescript
import { Table, Column, ForeignKey, Index } from "@simplysm/sd-orm-common";

@Table({ description: "Employee" })
class Employee {
  @Column({ primaryKey: 1, autoIncrement: true, description: "ID" })
  id!: number;

  @Column({ description: "Name" })
  name!: string;

  @Column({ description: "Department ID" })
  departmentId!: number;

  @Index()
  @Column({ nullable: true, description: "Email" })
  email?: string;

  @ForeignKey(["departmentId"], () => Department, "Department FK")
  department?: Department;
}
```

### Query Data

```typescript
// Select with where, orderBy, and projection
const results = await db.employee
  .where((e) => [db.qh.equal(e.name, "John")])
  .orderBy((e) => e.name)
  .select((e) => ({ id: e.id, name: e.name }))
  .resultAsync();

// Join
const joined = await db.employee
  .include((e) => e.department)
  .resultAsync();

// Insert
await db.employee.insertAsync([{ name: "Alice", departmentId: 1 }]);

// Update
await db.employee
  .where((e) => [db.qh.equal(e.id, 1)])
  .updateAsync(() => ({ name: "Bob" }));

// Delete
await db.employee
  .where((e) => [db.qh.equal(e.id, 1)])
  .deleteAsync();
```

### Connect and Transact

```typescript
await db.connectAsync(async () => {
  // All operations here run within a transaction
  await db.employee.insertAsync([{ name: "Charlie", departmentId: 2 }]);
  await db.employee
    .where((e) => [db.qh.equal(e.name, "Charlie")])
    .updateAsync(() => ({ departmentId: 3 }));
});
```
