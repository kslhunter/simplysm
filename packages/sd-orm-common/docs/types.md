# Types

Type definitions used across the ORM for data types, table definitions, query definitions, and entity types.

## Data Types

**Source:** `src/types.ts`

### TSdOrmDataType

Union type for specifying SQL data types on columns (used in `@Column({ dataType: ... })`).

```typescript
type TSdOrmDataType =
  | ISdOrmDataTypeOfText
  | ISdOrmDataTypeOfDecimal
  | ISdOrmDataTypeOfString
  | ISdOrmDataTypeOfFixString
  | ISdOrmDataTypeOfBinary;
```

### ISdOrmDataTypeOfText

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"TEXT"` | Discriminant. Maps to `NTEXT` (MSSQL) or `LONGTEXT` (MySQL) |

### ISdOrmDataTypeOfDecimal

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"DECIMAL"` | Discriminant |
| `precision` | `number` | Total number of digits |
| `digits` | `number \| undefined` | Number of digits after the decimal point |

### ISdOrmDataTypeOfString

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"STRING"` | Discriminant |
| `length` | `number \| "MAX" \| undefined` | Max character length. Maps to `NVARCHAR(n)` (MSSQL) or `VARCHAR(n)` (MySQL). `"MAX"` maps to `NVARCHAR(MAX)` or `LONGTEXT` |

### ISdOrmDataTypeOfFixString

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"FIXSTRING"` | Discriminant |
| `length` | `number` | Fixed character length. Maps to `NCHAR(n)` |

### ISdOrmDataTypeOfBinary

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"BINARY"` | Discriminant |
| `length` | `number \| "MAX" \| undefined` | Max byte length. Maps to `VARBINARY(n)` or `LONGBLOB` (MySQL for `"MAX"`) |

### TQueryValue

All valid value types that can appear in queries. Alias for `TFlatType` from `@simplysm/sd-core-common`.

```typescript
type TQueryValue = TFlatType;
// Includes: string | number | boolean | undefined | String | Number | Boolean |
//           DateOnly | DateTime | Time | Uuid | Buffer
```

### TStrippedQueryValue

Unwrapped version of `TQueryValue` (primitive types only, without wrapper objects).

```typescript
type TStrippedQueryValue = UnwrappedType<TQueryValue>;
```

## Table Definition Types

**Source:** `src/types.ts`

### ITableNameDef

Base table name definition.

| Field | Type | Description |
|-------|------|-------------|
| `database` | `string \| undefined` | Database name |
| `schema` | `string \| undefined` | Schema name |
| `name` | `string` | Table name |

### ITableDef

Full table definition as stored in decorator metadata. Extends `ITableNameDef`.

| Field | Type | Description |
|-------|------|-------------|
| `database` | `string \| undefined` | Database name (inherited from `ITableNameDef`) |
| `schema` | `string \| undefined` | Schema name (inherited from `ITableNameDef`) |
| `name` | `string` | Table name (inherited from `ITableNameDef`) |
| `description` | `string` | Human-readable table description |
| `columns` | `IColumnDef[]` | Column definitions |
| `foreignKeys` | `IForeignKeyDef[]` | Foreign key definitions |
| `foreignKeyTargets` | `IForeignKeyTargetDef[]` | Foreign key target (reverse navigation) definitions |
| `indexes` | `IIndexDef[]` | Index definitions |
| `referenceKeys` | `IReferenceKeyDef[]` | Reference key definitions |
| `referenceKeyTargets` | `IReferenceKeyTargetDef[]` | Reference key target definitions |
| `view` | `((db: any) => Queryable<DbContext, any>) \| undefined` | View definition function |
| `procedure` | `string \| undefined` | Stored procedure body |

### IColumnDef

Column definition stored in metadata.

| Field | Type | Description |
|-------|------|-------------|
| `description` | `string \| undefined` | Column description |
| `propertyKey` | `string` | TypeScript property key on the class |
| `name` | `string` | Database column name |
| `dataType` | `Type<TQueryValue> \| TSdOrmDataType \| string \| undefined` | Explicit data type override |
| `nullable` | `boolean \| undefined` | Whether the column allows NULL |
| `autoIncrement` | `boolean \| undefined` | Whether the column auto-increments |
| `primaryKey` | `number \| undefined` | Primary key order (1-based) |
| `typeFwd` | `() => Type<TStrippedQueryValue>` | Forward function returning the TypeScript type (from `Reflect.getMetadata`) |

### IForeignKeyDef

Foreign key definition stored in metadata.

| Field | Type | Description |
|-------|------|-------------|
| `description` | `string \| undefined` | Relationship description |
| `propertyKey` | `string` | TypeScript property key for the FK navigation |
| `name` | `string` | Foreign key name |
| `columnPropertyKeys` | `string[]` | Property keys of the local columns forming the FK |
| `targetTypeFwd` | `() => Type<any>` | Forward function returning the target table class |

### IForeignKeyTargetDef

Foreign key target (reverse navigation) definition.

| Field | Type | Description |
|-------|------|-------------|
| `description` | `string \| undefined` | Relationship description |
| `propertyKey` | `string` | TypeScript property key for the reverse navigation |
| `name` | `string` | Target name |
| `sourceKeyPropertyKey` | `string` | The FK property key on the source class |
| `isSingle` | `boolean` | If `true`, navigation is a single object; otherwise an array |
| `sourceTypeFwd` | `() => Type<any>` | Forward function returning the source (child) table class |

### IIndexDef

Index definition stored in metadata.

| Field | Type | Description |
|-------|------|-------------|
| `description` | `string \| undefined` | Index description |
| `name` | `string` | Index name |
| `columns` | `{ columnPropertyKey: string, order: number, orderBy: "ASC" \| "DESC", unique: boolean }[]` | Index columns with ordering and uniqueness |

### IReferenceKeyDef

Reference key definition (logical FK without database constraint). Same structure as `IForeignKeyDef`.

| Field | Type | Description |
|-------|------|-------------|
| `description` | `string \| undefined` | Relationship description |
| `propertyKey` | `string` | TypeScript property key |
| `name` | `string` | Reference key name |
| `columnPropertyKeys` | `string[]` | Property keys of the local columns |
| `targetTypeFwd` | `() => Type<any>` | Forward function returning the target table class |

### IReferenceKeyTargetDef

Reference key target definition. Same structure as `IForeignKeyTargetDef`.

| Field | Type | Description |
|-------|------|-------------|
| `description` | `string \| undefined` | Relationship description |
| `propertyKey` | `string` | TypeScript property key |
| `name` | `string` | Target name |
| `sourceKeyPropertyKey` | `string` | The reference key property key on the source class |
| `isSingle` | `boolean` | If `true`, navigation is single; otherwise array |
| `sourceTypeFwd` | `() => Type<any>` | Forward function returning the source table class |

### IDbMigration

Contract for database migration classes.

| Field | Type | Description |
|-------|------|-------------|
| `up` | `(db: DbContext) => Promise<void>` | Method that applies the migration |

## Query Builder Types

**Source:** `src/query/query-builder/types.ts`

### TQueryBuilderValue

Recursive type for SQL expression values. Can be a string literal, a subquery definition, or a nested array.

```typescript
type TQueryBuilderValue = string | ISelectQueryDef | TQueryBuilderValue[];
```

### TQueryDef

Discriminated union of all 33 query definition types. The `type` field determines the operation.

```typescript
type TQueryDef =
  | (ISelectQueryDef & { type: "select" })
  | (IInsertIntoQueryDef & { type: "insertInto" })
  | (IInsertQueryDef & { type: "insert" })
  | (IUpdateQueryDef & { type: "update" })
  | (IDeleteQueryDef & { type: "delete" })
  | (IInsertIfNotExistsQueryDef & { type: "insertIfNotExists" })
  | (IUpsertQueryDef & { type: "upsert" })
  | (ITruncateTableQueryDef & { type: "truncateTable" })
  | (ICreateDatabaseIfNotExistsQueryDef & { type: "createDatabaseIfNotExists" })
  | (IClearDatabaseIfExistsQueryDef & { type: "clearDatabaseIfExists" })
  | (IGetDatabaseInfoDef & { type: "getDatabaseInfo" })
  | (IGetTableInfosDef & { type: "getTableInfos" })
  | (IGetTableInfoDef & { type: "getTableInfo" })
  | (IGetTableColumnInfosDef & { type: "getTableColumnInfos" })
  | (IGetTablePrimaryKeysDef & { type: "getTablePrimaryKeys" })
  | (IGetTableForeignKeysDef & { type: "getTableForeignKeys" })
  | (IGetTableIndexesDef & { type: "getTableIndexes" })
  | (ICreateTableQueryDef & { type: "createTable" })
  | (ICreateViewQueryDef & { type: "createView" })
  | (ICreateProcedureQueryDef & { type: "createProcedure" })
  | (IDropTableQueryDef & { type: "dropTable" })
  | (IAddColumnQueryDef & { type: "addColumn" })
  | (IRemoveColumnQueryDef & { type: "removeColumn" })
  | (IModifyColumnQueryDef & { type: "modifyColumn" })
  | (IRenameColumnQueryDef & { type: "renameColumn" })
  | (IDropPrimaryKeyQueryDef & { type: "dropPrimaryKey" })
  | (IAddPrimaryKeyQueryDef & { type: "addPrimaryKey" })
  | (IAddForeignKeyQueryDef & { type: "addForeignKey" })
  | (IRemoveForeignKeyQueryDef & { type: "removeForeignKey" })
  | (ICreateIndexQueryDef & { type: "createIndex" })
  | (IDropIndexQueryDef & { type: "dropIndex" })
  | (IConfigIdentityInsertQueryDef & { type: "configIdentityInsert" })
  | (IConfigForeignKeyCheckQueryDef & { type: "configForeignKeyCheck" })
  | (IExecuteProcedureQueryDef & { type: "executeProcedure" });
```

### TDbDateSeparator

Date part separators used in `dateDiff`, `dateAdd`, and related functions.

```typescript
type TDbDateSeparator =
  | "year" | "quarter" | "month" | "day" | "week"
  | "hour" | "minute" | "second" | "millisecond" | "microsecond" | "nanosecond";
```

### IQueryTableNameDef

Table name reference used in query definitions.

| Field | Type | Description |
|-------|------|-------------|
| `database` | `string \| undefined` | Database name |
| `schema` | `string \| undefined` | Schema name |
| `name` | `string` | Table name |

### IQueryColumnDef

Column definition used in DDL query definitions.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Column name |
| `dataType` | `Type<TQueryValue> \| TSdOrmDataType \| string` | Data type |
| `autoIncrement` | `boolean \| undefined` | Auto-increment flag |
| `nullable` | `boolean \| undefined` | Nullable flag |

### IQueryPrimaryKeyDef

Primary key column definition.

| Field | Type | Description |
|-------|------|-------------|
| `columnName` | `string` | Column name |
| `orderBy` | `"ASC" \| "DESC"` | Sort direction |

### ISelectQueryDef

SELECT query definition.

| Field | Type | Description |
|-------|------|-------------|
| `from` | `string \| ISelectQueryDef \| ISelectQueryDef[] \| undefined` | Source table name, subquery, or UNION of subqueries |
| `as` | `string \| undefined` | Table alias |
| `join` | `IJoinQueryDef[] \| undefined` | Join definitions |
| `distinct` | `true \| undefined` | Apply DISTINCT |
| `where` | `TQueryBuilderValue[] \| undefined` | WHERE conditions |
| `top` | `number \| undefined` | TOP N limit |
| `groupBy` | `TQueryBuilderValue[] \| undefined` | GROUP BY expressions |
| `having` | `TQueryBuilderValue[] \| undefined` | HAVING conditions |
| `orderBy` | `[TQueryBuilderValue, "ASC" \| "DESC"][] \| undefined` | ORDER BY columns |
| `limit` | `[number, number] \| undefined` | `[skip, take]` pagination |
| `pivot` | `{ valueColumn: TQueryBuilderValue, pivotColumn: TQueryBuilderValue, pivotKeys: string[] } \| undefined` | PIVOT configuration |
| `unpivot` | `{ valueColumn: TQueryBuilderValue, pivotColumn: TQueryBuilderValue, pivotKeys: string[] } \| undefined` | UNPIVOT configuration |
| `lock` | `boolean \| undefined` | Row locking |
| `sample` | `number \| undefined` | TABLESAMPLE row count |
| `select` | `Record<string, TQueryBuilderValue> \| undefined` | Selected columns/expressions |

### IJoinQueryDef

Extends `ISelectQueryDef` with a custom select flag.

| Field | Type | Description |
|-------|------|-------------|
| `isCustomSelect` | `boolean` | Whether the join uses a custom select projection |
| *(all ISelectQueryDef fields)* | | Inherited from `ISelectQueryDef` |

### IInsertQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `from` | `string` | Target table name |
| `record` | `Record<string, string>` | Column-value pairs |
| `output` | `string[] \| undefined` | Output column names |

### IInsertIntoQueryDef

Extends `ISelectQueryDef`. INSERT INTO ... SELECT.

| Field | Type | Description |
|-------|------|-------------|
| `select` | `Record<string, TQueryBuilderValue>` | Selected columns (required) |
| `target` | `string` | Target table name |
| *(all ISelectQueryDef fields)* | | Inherited |

### IUpdateQueryDef

Extends `ISelectQueryDef`.

| Field | Type | Description |
|-------|------|-------------|
| `from` | `string` | Target table name (required, overrides optional in parent) |
| `record` | `Record<string, string>` | Column-value pairs to update |
| `output` | `string[] \| undefined` | Output column names |
| *(all ISelectQueryDef fields)* | | Inherited (where, join, top, as) |

### IDeleteQueryDef

Extends `ISelectQueryDef`.

| Field | Type | Description |
|-------|------|-------------|
| `from` | `string` | Target table name |
| `output` | `string[] \| undefined` | Output column names |
| *(all ISelectQueryDef fields)* | | Inherited (where, join, top, as) |

### IInsertIfNotExistsQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `from` | `string` | Target table name |
| `as` | `string` | Table alias |
| `insertRecord` | `Record<string, string>` | Column-value pairs to insert |
| `where` | `TQueryBuilderValue[]` | Existence check conditions |
| `output` | `string[] \| undefined` | Output column names |

### IUpsertQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `from` | `string` | Target table name |
| `as` | `string` | Table alias |
| `updateRecord` | `Record<string, string>` | Column-value pairs for update |
| `insertRecord` | `Record<string, string>` | Column-value pairs for insert |
| `where` | `TQueryBuilderValue[]` | Match conditions |
| `output` | `string[] \| undefined` | Output column names |
| `aiKeyName` | `string \| undefined` | Auto-increment key name |
| `pkColNames` | `string[]` | Primary key column names |

### ITruncateTableQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `table` | `IQueryTableNameDef` | Table to truncate |

### ICreateTableQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `table` | `IQueryTableNameDef` | Table name definition |
| `columns` | `IQueryColumnDef[]` | Column definitions |
| `primaryKeys` | `IQueryPrimaryKeyDef[]` | Primary key columns |

### ICreateViewQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `table` | `IQueryTableNameDef` | View name definition |
| `queryDef` | `ISelectQueryDef` | SELECT query backing the view |

### ICreateProcedureQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `table` | `IQueryTableNameDef` | Procedure name definition |
| `columns` | `IQueryColumnDef[]` | Parameter definitions |
| `procedure` | `string` | Procedure body SQL |

### IExecuteProcedureQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `procedure` | `IQueryTableNameDef` | Procedure name definition |
| `record` | `Record<string, string>` | Parameter name-value pairs |

### ICreateDatabaseIfNotExistsQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `database` | `string` | Database name to create |

### IClearDatabaseIfExistsQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `database` | `string` | Database name to clear |

### IGetDatabaseInfoDef

| Field | Type | Description |
|-------|------|-------------|
| `database` | `string` | Database name to query |

### IGetTableInfosDef

| Field | Type | Description |
|-------|------|-------------|
| `database` | `string \| undefined` | Database name filter |
| `schema` | `string \| undefined` | Schema name filter |

### IGetTableInfoDef

| Field | Type | Description |
|-------|------|-------------|
| `table` | `IQueryTableNameDef` | Table to check existence |

### IGetTableColumnInfosDef

| Field | Type | Description |
|-------|------|-------------|
| `table` | `IQueryTableNameDef` | Table to get column info from |

### IGetTablePrimaryKeysDef

| Field | Type | Description |
|-------|------|-------------|
| `table` | `IQueryTableNameDef` | Table to get primary keys from |

### IGetTableForeignKeysDef

| Field | Type | Description |
|-------|------|-------------|
| `table` | `IQueryTableNameDef` | Table to get foreign keys from |

### IGetTableIndexesDef

| Field | Type | Description |
|-------|------|-------------|
| `table` | `IQueryTableNameDef` | Table to get indexes from |

### IDropTableQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `table` | `IQueryTableNameDef` | Table to drop |

### IAddColumnQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `table` | `IQueryTableNameDef` | Target table |
| `column` | `IQueryColumnDef & { defaultValue?: TQueryBuilderValue }` | Column to add, with optional default value |

### IRemoveColumnQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `table` | `IQueryTableNameDef` | Target table |
| `column` | `string` | Column name to remove |

### IModifyColumnQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `table` | `IQueryTableNameDef` | Target table |
| `column` | `IQueryColumnDef & { defaultValue?: TQueryBuilderValue }` | Column definition with optional default |

### IRenameColumnQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `table` | `IQueryTableNameDef` | Target table |
| `prevName` | `string` | Current column name |
| `nextName` | `string` | New column name |

### IDropPrimaryKeyQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `table` | `IQueryTableNameDef` | Target table |

### IAddPrimaryKeyQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `table` | `IQueryTableNameDef` | Target table |
| `columns` | `string[]` | Column names for the primary key |

### IAddForeignKeyQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `table` | `IQueryTableNameDef` | Source table |
| `foreignKey` | `{ name: string, fkColumns: string[], targetTable: IQueryTableNameDef, targetPkColumns: string[] }` | Foreign key definition |

### IRemoveForeignKeyQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `table` | `IQueryTableNameDef` | Source table |
| `foreignKey` | `string` | Foreign key name to remove |

### ICreateIndexQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `table` | `IQueryTableNameDef` | Target table |
| `index` | `{ name: string, columns: { name: string, orderBy: "ASC" \| "DESC", unique: boolean }[] }` | Index definition |

### IDropIndexQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `table` | `IQueryTableNameDef` | Target table |
| `index` | `string` | Index name to drop |

### IConfigIdentityInsertQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `table` | `IQueryTableNameDef` | Target table |
| `state` | `"on" \| "off"` | Whether to enable or disable identity insert |

### IConfigForeignKeyCheckQueryDef

| Field | Type | Description |
|-------|------|-------------|
| `table` | `IQueryTableNameDef` | Target table |
| `useCheck` | `boolean` | Whether to enable (`true`) or disable (`false`) FK checks |
