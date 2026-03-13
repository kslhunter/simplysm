# DbContext

Abstract base class for database context. Manages connections, transactions, schema initialization, and migrations. Subclass this to define your application's database.

**Source:** `src/DbContext.ts`

## Class: DbContext (abstract)

### Properties

| Property | Type | Description |
|---|---|---|
| `status` | `"ready" \| "connect" \| "transact"` | Current connection status |
| `lastConnectionDateTime` | `DateTime \| undefined` | Timestamp of the last connection event |
| `prepareDefs` | `TQueryDef[]` | Accumulated query definitions for batch execution |
| `qb` | `QueryBuilder` | Query builder instance for the configured dialect |
| `qh` | `QueryHelper` | Query helper instance for the configured dialect |
| `opt` | `TDbContextOption` | Database configuration options |
| `systemMigration` | `Queryable<this, SystemMigration>` | Queryable for the `_migration` system table |
| `tableDefs` | `ITableDef[]` (getter) | All table definitions from Queryable/StoredProcedure members |

### Abstract Members

| Member | Type | Description |
|---|---|---|
| `migrations` | `Type<IDbMigration>[]` | Array of migration classes to run, ordered by class name |

### Constructor

```typescript
constructor(executor: IDbContextExecutor | undefined, opt: TDbContextOption)
```

### Connection Methods

#### connectAsync

Opens a connection, begins a transaction, executes the callback, then commits or rolls back.

```typescript
async connectAsync<R>(fn: () => Promise<R>, isolationLevel?: ISOLATION_LEVEL): Promise<R>
```

#### connectWithoutTransactionAsync

Opens a connection without starting a transaction.

```typescript
async connectWithoutTransactionAsync<R>(callback: () => Promise<R>): Promise<R>
```

#### transAsync

Begins a new transaction within an existing connection (the context must already be connected).

```typescript
async transAsync<R>(fn: () => Promise<R>, isolationLevel?: ISOLATION_LEVEL): Promise<R>
```

### Query Execution Methods

#### executeDefsAsync

Executes an array of query definitions and returns results.

```typescript
async executeDefsAsync(
  defs: TQueryDef[],
  options?: (IQueryResultParseOption | undefined)[],
): Promise<any[][]>
```

#### executeParametrizedAsync

Executes a raw SQL query with optional parameters.

```typescript
async executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]>
```

#### executePreparedAsync

Executes all accumulated `prepareDefs` and clears them.

```typescript
async executePreparedAsync(): Promise<void>
```

### Bulk Operations

#### bulkInsertAsync

Performs a bulk insert into a table.

```typescript
async bulkInsertAsync(
  tableName: string,
  columnDefs: IQueryColumnDef[],
  records: Record<string, any>[],
): Promise<void>
```

#### bulkUpsertAsync

Performs a bulk upsert (insert or update) on a table.

```typescript
async bulkUpsertAsync(
  tableName: string,
  columnDefs: IQueryColumnDef[],
  records: Record<string, any>[],
): Promise<void>
```

### Schema Introspection Methods

| Method | Return Type | Description |
|---|---|---|
| `getIsDbExistsAsync(database?)` | `Promise<boolean>` | Check if a database exists |
| `getIsTableExistsAsync(tableNameDef)` | `Promise<boolean>` | Check if a table exists |
| `getTableInfosAsync(database, schema?)` | `Promise<{schema, name}[]>` | List tables in a database |
| `getTableColumnInfosAsync(database, schema, table)` | `Promise<{name, dataType, ...}[]>` | Get column info for a table |
| `getTablePkColumnNamesAsync(database, schema, table)` | `Promise<string[]>` | Get primary key column names |
| `getTableFksAsync(database, schema, table)` | `Promise<{name, sourceColumnNames, ...}[]>` | Get foreign keys |
| `getTableIndexesAsync(database, schema, table)` | `Promise<{name, columns}[]>` | Get indexes |

### Initialization and Migration

#### initializeAsync

Creates or migrates the database schema. Returns `"creation"` for first-time setup, `"migration"` when migrations were applied, or `undefined` if already up-to-date.

```typescript
async initializeAsync(
  dbs?: string[],
  force?: boolean,
): Promise<"creation" | "migration" | undefined>
```

- Without `force`: checks for pending migrations and runs them.
- With `force`: drops and recreates all tables, then records all migrations as applied.

#### truncateTable

Truncates a table by name.

```typescript
async truncateTable(table: string): Promise<void>
```

### Schema DDL Helper Methods

These methods generate `TQueryDef` objects for schema changes (used in migrations):

| Method | Description |
|---|---|
| `getCreateTablesFullQueryDefsFromTableDef(tableDefs)` | Full DDL: create tables + FKs + indexes |
| `getCreateTableQueryDefFromTableDef(tableDef)` | Create a single table/view/procedure |
| `getCreateFksQueryDefsFromTableDef(tableDef)` | Create foreign keys for a table |
| `getCreateIndexesQueryDefsFromTableDef(tableDef)` | Create indexes for a table |
| `getAddColumnQueryDefFromTableDef(tableDef, columnName)` | Add a column |
| `getModifyColumnQueryDefFromTableDef(tableDef, columnName)` | Modify a column |
| `getModifyPkQueryDefFromTableDef(tableDef, columnNames)` | Drop and re-add primary key |
| `getAddFkQueryDefFromTableDef(tableDef, fkName)` | Add a foreign key |
| `getRemoveFkQueryDefFromTableDef(tableDef, fkName)` | Remove a foreign key |
| `getCreateIndexQueryDefFromTableDef(tableDef, indexName)` | Create an index |
| `getDropIndexQueryDefFromTableDef(tableDef, indexName)` | Drop an index |
| `getTableNameDef(tableDef)` | Convert ITableDef to IQueryTableNameDef |

## Type: TDbContextOption

```typescript
type TDbContextOption = IDefaultDbContextOption | ISqliteDbContextOption;

interface IDefaultDbContextOption {
  dialect: "mysql" | "mssql" | "mssql-azure";
  database?: string;
  schema?: string;
}

interface ISqliteDbContextOption {
  dialect: "sqlite";
}
```

## Interface: IDbMigration

```typescript
interface IDbMigration {
  up(db: DbContext): Promise<void>;
}
```

## Usage Example

```typescript
class AppDbContext extends DbContext {
  get migrations() {
    return [Migration001, Migration002];
  }

  employee = new Queryable(this, Employee);
  department = new Queryable(this, Department);
}

const db = new AppDbContext(executor, { dialect: "mssql", database: "mydb", schema: "dbo" });

await db.connectAsync(async () => {
  await db.initializeAsync();
  const employees = await db.employee.resultAsync();
});
```
