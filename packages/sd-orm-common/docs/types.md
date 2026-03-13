# Types

Type definitions used across the ORM.

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

| Variant | Properties | SQL Output (MSSQL / MySQL) |
|---|---|---|
| `{ type: "TEXT" }` | - | `NTEXT` / `LONGTEXT` |
| `{ type: "DECIMAL", precision, digits? }` | `precision: number`, `digits?: number` | `DECIMAL(p,d)` |
| `{ type: "STRING", length? }` | `length?: number \| "MAX"` | `NVARCHAR(n)` / `VARCHAR(n)` |
| `{ type: "FIXSTRING", length }` | `length: number` | `NCHAR(n)` |
| `{ type: "BINARY", length? }` | `length?: number \| "MAX"` | `VARBINARY(n)` / `LONGBLOB` |

### TQueryValue

Type alias for all value types that can appear in queries.

```typescript
type TQueryValue = TFlatType;
// Includes: string, number, boolean, undefined, String, Number, Boolean, DateOnly, DateTime, Time, Uuid, Buffer
```

### TStrippedQueryValue

Unwrapped version of `TQueryValue` (primitive types only).

```typescript
type TStrippedQueryValue = UnwrappedType<TQueryValue>;
```

## Table Definition Types

**Source:** `src/types.ts`

### ITableDef

Full table definition as stored in metadata.

```typescript
interface ITableDef extends ITableNameDef {
  description: string;
  columns: IColumnDef[];
  foreignKeys: IForeignKeyDef[];
  foreignKeyTargets: IForeignKeyTargetDef[];
  indexes: IIndexDef[];
  referenceKeys: IReferenceKeyDef[];
  referenceKeyTargets: IReferenceKeyTargetDef[];
  view?: (db: any) => Queryable<DbContext, any>;
  procedure?: string;
}
```

### ITableNameDef

```typescript
interface ITableNameDef {
  database?: string;
  schema?: string;
  name: string;
}
```

### IColumnDef

```typescript
interface IColumnDef {
  description?: string;
  propertyKey: string;
  name: string;
  dataType?: Type<TQueryValue> | TSdOrmDataType | string;
  nullable?: boolean;
  autoIncrement?: boolean;
  primaryKey?: number;
  typeFwd: () => Type<TStrippedQueryValue>;
}
```

### IForeignKeyDef

```typescript
interface IForeignKeyDef {
  description?: string;
  propertyKey: string;
  name: string;
  columnPropertyKeys: string[];
  targetTypeFwd: () => Type<any>;
}
```

### IForeignKeyTargetDef

```typescript
interface IForeignKeyTargetDef {
  description?: string;
  propertyKey: string;
  name: string;
  sourceKeyPropertyKey: string;
  isSingle: boolean;
  sourceTypeFwd: () => Type<any>;
}
```

### IIndexDef

```typescript
interface IIndexDef {
  description?: string;
  name: string;
  columns: {
    columnPropertyKey: string;
    order: number;
    orderBy: "ASC" | "DESC";
    unique: boolean;
  }[];
}
```

### IReferenceKeyDef / IReferenceKeyTargetDef

Same structure as `IForeignKeyDef` / `IForeignKeyTargetDef`.

### IDbMigration

```typescript
interface IDbMigration {
  up(db: DbContext): Promise<void>;
}
```

## Query Builder Types

**Source:** `src/query/query-builder/types.ts`

### TQueryDef

Discriminated union of all query definition types. The `type` field determines the operation.

```typescript
type TQueryDef =
  | { type: "select" } & ISelectQueryDef
  | { type: "insert" } & IInsertQueryDef
  | { type: "update" } & IUpdateQueryDef
  | { type: "delete" } & IDeleteQueryDef
  | { type: "upsert" } & IUpsertQueryDef
  | { type: "insertIfNotExists" } & IInsertIfNotExistsQueryDef
  | { type: "insertInto" } & IInsertIntoQueryDef
  | { type: "createTable" } & ICreateTableQueryDef
  | { type: "createView" } & ICreateViewQueryDef
  | { type: "dropTable" } & IDropTableQueryDef
  | { type: "addColumn" } & IAddColumnQueryDef
  | { type: "removeColumn" } & IRemoveColumnQueryDef
  | { type: "modifyColumn" } & IModifyColumnQueryDef
  | { type: "renameColumn" } & IRenameColumnQueryDef
  | { type: "createIndex" } & ICreateIndexQueryDef
  | { type: "dropIndex" } & IDropIndexQueryDef
  | { type: "addForeignKey" } & IAddForeignKeyQueryDef
  | { type: "removeForeignKey" } & IRemoveForeignKeyQueryDef
  | { type: "truncateTable" } & ITruncateTableQueryDef
  // ... and more (database ops, procedure ops, config ops)
```

### IQueryTableNameDef

```typescript
interface IQueryTableNameDef {
  database?: string;
  schema?: string;
  name: string;
}
```

### IQueryColumnDef

```typescript
interface IQueryColumnDef {
  name: string;
  dataType: Type<TQueryValue> | TSdOrmDataType | string;
  autoIncrement?: boolean;
  nullable?: boolean;
}
```

### ISelectQueryDef

```typescript
interface ISelectQueryDef {
  from?: string | ISelectQueryDef | ISelectQueryDef[];
  as?: string;
  join?: IJoinQueryDef[];
  distinct?: true;
  where?: TQueryBuilderValue[];
  top?: number;
  groupBy?: TQueryBuilderValue[];
  having?: TQueryBuilderValue[];
  orderBy?: [TQueryBuilderValue, "ASC" | "DESC"][];
  limit?: [number, number];
  pivot?: { valueColumn, pivotColumn, pivotKeys };
  unpivot?: { valueColumn, pivotColumn, pivotKeys };
  lock?: boolean;
  sample?: number;
  select?: Record<string, TQueryBuilderValue>;
}
```

### TQueryBuilderValue

Recursive type for SQL expression values.

```typescript
type TQueryBuilderValue = string | ISelectQueryDef | TQueryBuilderValue[];
```

### TDbDateSeparator

```typescript
type TDbDateSeparator =
  | "year" | "quarter" | "month" | "day" | "week"
  | "hour" | "minute" | "second" | "millisecond" | "microsecond" | "nanosecond";
```

## Queryable Entity Types

**Source:** `src/query/queryable/types.ts`

### TEntity\<T\>

Maps a model type to its query entity form, where each column property becomes a `QueryUnit<T>`.

```typescript
type TEntity<T> = {
  [K in keyof T]-?: T[K] extends TQueryValue ? QueryUnit<T[K]>
    : T[K] extends (infer A)[] ? TEntity<A>[]
    : TEntity<T[K]>;
};
```

### TEntityValue\<T\>

A query value or a `QueryUnit` wrapping it.

```typescript
type TEntityValue<T extends TQueryValue> = T | QueryUnit<T>;
```

### TEntityUnwrap\<T\>

Unwraps `QueryUnit` types back to their plain value types.

```typescript
type TEntityUnwrap<T> = {
  [K in keyof T]: T[K] extends QueryUnit<infer A> ? A
    : T[K] extends (infer A)[] ? TEntityUnwrap<A>[]
    : T[K] extends TQueryValue ? T[K]
    : TEntityUnwrap<T[K]> | undefined;
};
```

### TInsertObject\<T\>

The type for insert records: only non-optional query-value properties are required; optional ones remain optional.

```typescript
type TInsertObject<T> = TOnlyQueryValueProperty<T>;
```

### TUpdateObject\<T\>

The type for update records: all query-value properties are optional and can be `QueryUnit` expressions.

```typescript
type TUpdateObject<T> = TOnlyQueryValueProperty<{
  [K in keyof T]?: T[K] | QueryUnit<T[K]> | QueryUnit<WrappedType<T[K]>>;
}>;
```

## Connection Types

**Source:** `src/IDbConn.ts`

### IDbConn

Interface for database connections.

```typescript
interface IDbConn extends EventEmitter {
  config: TDbConnConf;
  isConnected: boolean;
  isOnTransaction: boolean;
  connectAsync(): Promise<void>;
  closeAsync(): Promise<void>;
  beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void>;
  commitTransactionAsync(): Promise<void>;
  rollbackTransactionAsync(): Promise<void>;
  executeAsync(queries: string[]): Promise<any[][]>;
  executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]>;
  bulkInsertAsync(tableName, columnDefs, records): Promise<void>;
  bulkUpsertAsync(tableName, columnDefs, records): Promise<void>;
}
```

### TDbConnConf

```typescript
type TDbConnConf = IDefaultDbConnConf | ISqliteDbConnConf;

interface IDefaultDbConnConf {
  dialect: "mysql" | "mssql" | "mssql-azure";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  schema?: string;
  defaultIsolationLevel?: ISOLATION_LEVEL;
}

interface ISqliteDbConnConf {
  dialect: "sqlite";
  filePath: string;
}
```

### ISOLATION_LEVEL

```typescript
type ISOLATION_LEVEL = "READ_UNCOMMITTED" | "READ_COMMITTED" | "REPEATABLE_READ" | "SERIALIZABLE";
```

## Executor Types

**Source:** `src/IDbContextExecutor.ts`

### IDbContextExecutor

Interface that `DbContext` delegates to for actual database operations.

```typescript
interface IDbContextExecutor {
  getInfoAsync(): Promise<{ dialect, database?, schema? }>;
  connectAsync(): Promise<void>;
  beginTransactionAsync(isolationLevel?): Promise<void>;
  commitTransactionAsync(): Promise<void>;
  rollbackTransactionAsync(): Promise<void>;
  executeDefsAsync(defs, options?): Promise<any[][]>;
  executeParametrizedAsync(query, params?): Promise<any[][]>;
  bulkInsertAsync(tableName, columnDefs, records): Promise<void>;
  bulkUpsertAsync(tableName, columnDefs, records): Promise<void>;
  closeAsync(): Promise<void>;
}
```

### IQueryResultParseOption

```typescript
interface IQueryResultParseOption {
  columns?: Record<string, { dataType: string | undefined }>;
  joins?: Record<string, { isSingle: boolean }>;
}
```
