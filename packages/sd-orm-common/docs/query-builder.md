# QueryBuilder

Low-level SQL string generator that converts `TQueryDef` objects into executable SQL strings. Dialect-aware (MSSQL, MySQL, SQLite).

**Source:** `src/query/query-builder/QueryBuilder.ts`

## Class: QueryBuilder

```typescript
constructor(dialect: TDbContextOption["dialect"])
```

Accessible via `db.qb` on any `DbContext` instance.

### Properties

| Property | Type | Description |
|---|---|---|
| `qh` | `QueryHelper` | Internal QueryHelper instance for the same dialect |

## Database Operations

| Method | Description |
|---|---|
| `createDatabaseIfNotExists(def)` | `CREATE DATABASE IF NOT EXISTS` |
| `clearDatabaseIfExists(def)` | Drop all tables and constraints in a database |
| `getDatabaseInfo(def)` | Query sys.databases / INFORMATION_SCHEMA for database existence |

## Table Introspection

| Method | Description |
|---|---|
| `getTableInfos(def?)` | List all tables (optionally filtered by schema) |
| `getTableInfo(def)` | Check if a specific table exists |
| `getTableColumnInfos(def)` | Get column metadata for a table |
| `getTablePrimaryKeys(def)` | Get primary key columns |
| `getTableForeignKeys(def)` | Get foreign key definitions |
| `getTableIndexes(def)` | Get index definitions |

## Schema DDL

| Method | Description |
|---|---|
| `createTable(def)` | `CREATE TABLE` with columns and primary keys |
| `createView(def)` | `CREATE VIEW` from a SELECT query |
| `createProcedure(def)` | `CREATE PROCEDURE` |
| `executeProcedure(def)` | `EXEC procedure` |
| `dropTable(def)` | `DROP TABLE` |
| `addColumn(def)` | `ALTER TABLE ADD column` (returns string[]) |
| `removeColumn(def)` | `ALTER TABLE DROP COLUMN` |
| `modifyColumn(def)` | `ALTER TABLE ALTER COLUMN` (returns string[]) |
| `renameColumn(def)` | `sp_rename` / `ALTER TABLE CHANGE COLUMN` |
| `dropPrimaryKey(def)` | Drop primary key constraint |
| `addPrimaryKey(def)` | Add primary key constraint |
| `addForeignKey(def)` | `ALTER TABLE ADD CONSTRAINT FOREIGN KEY` |
| `removeForeignKey(def)` | Drop foreign key constraint |
| `createIndex(def)` | `CREATE INDEX` |
| `dropIndex(def)` | `DROP INDEX` |
| `truncateTable(def)` | `TRUNCATE TABLE` / `DELETE FROM` (SQLite) |

## DML Operations

| Method | Description |
|---|---|
| `select(def)` | Builds a full SELECT query with joins, where, order, group, pivot, etc. |
| `insert(def)` | `INSERT INTO ... VALUES` with optional OUTPUT clause |
| `insertInto(def)` | `INSERT INTO ... SELECT` |
| `update(def)` | `UPDATE ... SET ... WHERE` with optional join support |
| `delete(def)` | `DELETE FROM ... WHERE` |
| `insertIfNotExists(def)` | Insert only if matching row does not exist |
| `upsert(def)` | MERGE (MSSQL) / INSERT ON DUPLICATE KEY UPDATE (MySQL) |

## Configuration

| Method | Description |
|---|---|
| `configIdentityInsert(def)` | `SET IDENTITY_INSERT ON/OFF` (MSSQL only) |
| `configForeignKeyCheck(def)` | Enable/disable FK checks (dialect-specific) |

## Utility Methods

### wrap

Wraps an identifier name with dialect-specific quoting (`[name]` for MSSQL, `` `name` `` for MySQL/SQLite).

```typescript
wrap(name: string): string
```

### getTableName

Returns a fully qualified table name string from a table name definition.

```typescript
getTableName(def: IQueryTableNameDef): string
```

### getTableNameWithoutDatabase

Returns a table name without the database prefix.

```typescript
getTableNameWithoutDatabase(def: IQueryTableNameDef): string
```

### getTableNameChain

Returns the components of a table name as an array.

```typescript
getTableNameChain(def: IQueryTableNameDef): string[]
```

### getQueryOfQueryValue

Recursively resolves a `TQueryBuilderValue` into a SQL string.

```typescript
getQueryOfQueryValue(queryValue: TQueryBuilderValue): string
```
