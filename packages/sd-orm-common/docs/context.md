# Context

Database context management for connections, transactions, migrations, and schema initialization.

**Source:** `src/DbContext.ts`

## Class: DbContext (abstract)

Abstract base class for database context. Subclass this to define your application's database with `Queryable` and `StoredProcedure` members.

### Constructor

```typescript
constructor(executor: IDbContextExecutor | undefined, opt: TDbContextOption)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `executor` | `IDbContextExecutor \| undefined` | The executor that performs actual database operations |
| `opt` | `TDbContextOption` | Database configuration options (dialect, database, schema) |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `status` | `"ready" \| "connect" \| "transact"` | Current connection status. Starts as `"ready"`, transitions to `"connect"` on connection, and `"transact"` during a transaction |
| `lastConnectionDateTime` | `DateTime \| undefined` | Timestamp of the last connection or transaction event |
| `prepareDefs` | `TQueryDef[]` | Accumulated query definitions for batch execution via `executePreparedAsync()` |
| `qb` | `QueryBuilder` | Query builder instance for the configured dialect |
| `qh` | `QueryHelper` | Query helper instance for the configured dialect |
| `opt` | `TDbContextOption` | Database configuration options |
| `systemMigration` | `Queryable<this, SystemMigration>` | Queryable for the built-in `_migration` system table |
| `tableDefs` | `ITableDef[]` (getter) | All table definitions collected from `Queryable` and `StoredProcedure` members |

### Abstract Members

| Member | Type | Description |
|--------|------|-------------|
| `migrations` | `Type<IDbMigration>[]` (getter) | Array of migration classes to apply, ordered by class name |

### Connection Methods

#### connectAsync

Opens a connection, begins a transaction, executes the callback, commits on success or rolls back on error, then closes the connection.

```typescript
async connectAsync<R>(fn: () => Promise<R>, isolationLevel?: ISOLATION_LEVEL): Promise<R>
```

#### connectWithoutTransactionAsync

Opens a connection without starting a transaction, executes the callback, then closes.

```typescript
async connectWithoutTransactionAsync<R>(callback: () => Promise<R>): Promise<R>
```

#### transAsync

Begins a new transaction within an already-connected context. Throws if already in a transaction.

```typescript
async transAsync<R>(fn: () => Promise<R>, isolationLevel?: ISOLATION_LEVEL): Promise<R>
```

### Query Execution Methods

#### executeDefsAsync

Executes an array of query definitions and returns results. Each definition produces one result array.

```typescript
async executeDefsAsync(
  defs: TQueryDef[],
  options?: (IQueryResultParseOption | undefined)[],
): Promise<any[][]>
```

#### executeParametrizedAsync

Executes a raw parameterized SQL query.

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

Performs a bulk insert into a table using the driver's bulk insert mechanism.

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

| Method | Signature | Return Type | Description |
|--------|-----------|-------------|-------------|
| `getIsDbExistsAsync` | `(database?: string)` | `Promise<boolean>` | Check if a database exists (non-SQLite only) |
| `getIsTableExistsAsync` | `(tableNameDef: IQueryTableNameDef)` | `Promise<boolean>` | Check if a table exists |
| `getTableInfosAsync` | `(database: string, schema?: string)` | `Promise<{schema: string, name: string}[]>` | List tables in a database |
| `getTableColumnInfosAsync` | `(database: string, schema: string, table: string)` | `Promise<{name, dataType, length?, precision?, digits?, nullable, autoIncrement}[]>` | Get column info for a table |
| `getTablePkColumnNamesAsync` | `(database: string, schema: string, table: string)` | `Promise<string[]>` | Get primary key column names |
| `getTableFksAsync` | `(database: string, schema: string, table: string)` | `Promise<{name, sourceColumnNames, targetSchemaName, targetTableName}[]>` | Get foreign keys for a table |
| `getTableIndexesAsync` | `(database: string, schema: string, table: string)` | `Promise<{name, columns: {name, orderBy}[]}[]>` | Get indexes for a table |
| `getTableDefinitions` | `()` | `ITableDef[]` | Get table definitions from all Queryable members |

### Initialization and Migration

#### initializeAsync

Creates or migrates the database schema.

```typescript
async initializeAsync(
  dbs?: string[],
  force?: boolean,
): Promise<"creation" | "migration" | undefined>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `dbs` | `string[] \| undefined` | Database names to initialize (defaults to `opt.database`) |
| `force` | `boolean \| undefined` | If `true`, drops and recreates all tables |

Returns:
- `"creation"` -- first-time setup, all tables created
- `"migration"` -- pending migrations were applied
- `undefined` -- already up-to-date

#### truncateTable

Truncates a table by name.

```typescript
async truncateTable(table: string): Promise<void>
```

### Schema DDL Helper Methods

These methods generate `TQueryDef` objects for use in migrations:

| Method | Signature | Description |
|--------|-----------|-------------|
| `getCreateTablesFullQueryDefsFromTableDef` | `(tableDefs: ITableDef[]) => TQueryDef[][]` | Full DDL: create tables + foreign keys + indexes |
| `getCreateTableQueryDefFromTableDef` | `(tableDef: ITableDef) => TQueryDef` | Create a single table, view, or procedure |
| `getCreateFksQueryDefsFromTableDef` | `(tableDef: ITableDef) => TQueryDef[]` | Create foreign keys and their indexes for a table |
| `getCreateIndexesQueryDefsFromTableDef` | `(tableDef: ITableDef) => TQueryDef[]` | Create indexes for a table |
| `getAddColumnQueryDefFromTableDef` | `(tableDef: ITableDef, columnName: string) => TQueryDef` | Add a column |
| `getModifyColumnQueryDefFromTableDef` | `(tableDef: ITableDef, columnName: string) => TQueryDef` | Modify a column |
| `getModifyPkQueryDefFromTableDef` | `(tableDef: ITableDef, columnNames: string[]) => TQueryDef[]` | Drop and re-add primary key |
| `getAddFkQueryDefFromTableDef` | `(tableDef: ITableDef, fkName: string) => TQueryDef` | Add a foreign key |
| `getRemoveFkQueryDefFromTableDef` | `(tableDef: ITableDef, fkName: string) => TQueryDef` | Remove a foreign key |
| `getCreateIndexQueryDefFromTableDef` | `(tableDef: ITableDef, indexName: string) => TQueryDef` | Create an index |
| `getDropIndexQueryDefFromTableDef` | `(tableDef: ITableDef, indexName: string) => TQueryDef` | Drop an index |
| `getTableNameDef` | `(tableDef: ITableDef) => IQueryTableNameDef` | Convert `ITableDef` to `IQueryTableNameDef` |

## Type: TDbContextOption

Discriminated union for database context configuration.

```typescript
type TDbContextOption = IDefaultDbContextOption | ISqliteDbContextOption;
```

## Interface: IDefaultDbContextOption

Configuration for MySQL, MSSQL, or MSSQL-Azure dialects.

| Field | Type | Description |
|-------|------|-------------|
| `dialect` | `"mysql" \| "mssql" \| "mssql-azure"` | Database dialect |
| `database` | `string \| undefined` | Default database name |
| `schema` | `string \| undefined` | Default schema name |

## Interface: ISqliteDbContextOption

Configuration for SQLite dialect.

| Field | Type | Description |
|-------|------|-------------|
| `dialect` | `"sqlite"` | Database dialect (always `"sqlite"`) |
