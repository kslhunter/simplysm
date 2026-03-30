# Types

Core type definitions for the ORM.

## Database Types

### Dialect

```typescript
type Dialect = "mysql" | "mssql" | "postgresql";
```

Supported database dialects. MySQL 8.0.14+, MSSQL 2012+, PostgreSQL 9.0+.

### dialects

```typescript
const dialects: Dialect[] = ["mysql", "mssql", "postgresql"];
```

Array of all supported dialects. Useful for parameterized tests.

### IsolationLevel

```typescript
type IsolationLevel = "READ_UNCOMMITTED" | "READ_COMMITTED" | "REPEATABLE_READ" | "SERIALIZABLE";
```

### DataRecord

```typescript
type DataRecord = {
  [key: string]: ColumnPrimitive | DataRecord | DataRecord[];
};
```

Recursive query result type. Supports nested relations via include/join.

### DbContextExecutor

```typescript
interface DbContextExecutor {
  connect(): Promise<void>;
  close(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  executeDefs<T = DataRecord>(
    defs: QueryDef[],
    resultMetas?: (ResultMeta | undefined)[],
  ): Promise<T[][]>;
}
```

Query execution interface. Implemented by `NodeDbContextExecutor` (server) or service client executors.

### ResultMeta

```typescript
interface ResultMeta {
  columns: Record<string, ColumnPrimitiveStr>;
  joins: Record<string, { isSingle: boolean }>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `columns` | `Record<string, ColumnPrimitiveStr>` | Column name to type name mapping |
| `joins` | `Record<string, { isSingle: boolean }>` | JOIN alias to single/array flag |

### Migration

```typescript
interface Migration {
  name: string;
  up: (db: DbContextBase & DbContextDdlMethods) => Promise<void>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Unique migration name (timestamp recommended) |
| `up` | `(db) => Promise<void>` | Migration execution function |

### QueryBuildResult

```typescript
interface QueryBuildResult {
  sql: string;
  resultSetIndex?: number;
  resultSetStride?: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sql` | `string` | Generated SQL string |
| `resultSetIndex` | `number?` | Index of result set to use |
| `resultSetStride` | `number?` | Extract every Nth result set |

## DbContext Types

### DbContextDef

```typescript
interface DbContextDef<TTables, TViews, TProcedures> {
  readonly meta: {
    readonly tables: TTables;
    readonly views: TViews;
    readonly procedures: TProcedures;
    readonly migrations: Migration[];
  };
}
```

DbContext blueprint created by `defineDbContext()`. Contains only schema metadata, no runtime state.

### DbContextBase

```typescript
interface DbContextBase {
  status: DbContextStatus;
  readonly database: string | undefined;
  readonly schema: string | undefined;
  getNextAlias(): string;
  resetAliasCounter(): void;
  executeDefs<T = DataRecord>(defs: QueryDef[], resultMetas?: (ResultMeta | undefined)[]): Promise<T[][]>;
  getQueryDefObjectName(tableOrView: TableBuilder | ViewBuilder): QueryDefObjectName;
  switchFk(table: QueryDefObjectName, enabled: boolean): Promise<void>;
}
```

Core interface used internally by Queryable, Executable, and ViewBuilder.

### DbContextStatus

```typescript
type DbContextStatus = "ready" | "connect" | "transact";
```

### DbContextInstance

```typescript
type DbContextInstance<TDef extends DbContextDef<any, any, any>> =
  DbContextBase &
  DbContextConnectionMethods &
  DbContextDdlMethods &
  { [K in keyof TDef["meta"]["tables"]]: () => Queryable<...> } &
  { [K in keyof TDef["meta"]["views"]]: () => Queryable<...> } &
  { [K in keyof TDef["meta"]["procedures"]]: () => Executable<...> } &
  { _migration: () => Queryable<{ code: string }, any> } &
  { initialize(options?: { dbs?: string[]; force?: boolean }): Promise<void> };
```

Full DbContext instance type returned by `createDbContext()`. Includes queryable accessors for all tables/views, executable accessors for all procedures, connection methods, DDL methods, and `initialize()`.

### DbContextConnectionMethods

```typescript
interface DbContextConnectionMethods {
  connect<TResult>(fn: () => Promise<TResult>, isolationLevel?: IsolationLevel): Promise<TResult>;
  connectWithoutTransaction<TResult>(callback: () => Promise<TResult>): Promise<TResult>;
  transaction<TResult>(fn: () => Promise<TResult>, isolationLevel?: IsolationLevel): Promise<TResult>;
}
```

### DbContextDdlMethods

See [Core - DDL Execution Methods](./core.md#ddl-execution-methods) and [Core - DDL QueryDef Generators](./core.md#ddl-querydef-generators) for the full list of 18 DDL execution methods and 22 QueryDef generator methods.

## Column Types

### DataType

```typescript
type DataType =
  | { type: "int" }
  | { type: "bigint" }
  | { type: "float" }
  | { type: "double" }
  | { type: "decimal"; precision: number; scale?: number }
  | { type: "varchar"; length: number }
  | { type: "char"; length: number }
  | { type: "text" }
  | { type: "binary" }
  | { type: "boolean" }
  | { type: "datetime" }
  | { type: "date" }
  | { type: "time" }
  | { type: "uuid" };
```

SQL data type definition. Used in ColumnBuilder metadata, CAST expressions, and DDL generation.

### ColumnPrimitive

```typescript
type ColumnPrimitive = string | number | boolean | DateTime | DateOnly | Time | Uuid | Bytes | undefined;
```

All storable column primitive types. `undefined` represents SQL NULL.

### ColumnPrimitiveStr

```typescript
type ColumnPrimitiveStr = "string" | "number" | "boolean" | "DateTime" | "DateOnly" | "Time" | "Uuid" | "Bytes";
```

### ColumnPrimitiveMap

```typescript
type ColumnPrimitiveMap = {
  string: string;
  number: number;
  boolean: boolean;
  DateTime: DateTime;
  DateOnly: DateOnly;
  Time: Time;
  Uuid: Uuid;
  Bytes: Bytes;
};
```

### ColumnMeta

```typescript
interface ColumnMeta {
  type: ColumnPrimitiveStr;
  dataType: DataType;
  autoIncrement?: boolean;
  nullable?: boolean;
  default?: ColumnPrimitive;
  description?: string;
}
```

### dataTypeStrToColumnPrimitiveStr

```typescript
const dataTypeStrToColumnPrimitiveStr: Record<DataType["type"], ColumnPrimitiveStr>
```

Maps SQL type names to TypeScript type names. For example: `"int"` -> `"number"`, `"datetime"` -> `"DateTime"`, `"varchar"` -> `"string"`.

### InferColumnPrimitiveFromDataType

```typescript
type InferColumnPrimitiveFromDataType<TDataType extends DataType> = ColumnPrimitiveMap[...]
```

Infers the TypeScript type from a DataType definition.

### inferColumnPrimitiveStr

```typescript
function inferColumnPrimitiveStr(value: ColumnPrimitive): ColumnPrimitiveStr
```

Infers the ColumnPrimitiveStr from a runtime value. Throws for unknown types.

## Column Builder Types

### ColumnBuilderRecord

```typescript
type ColumnBuilderRecord = Record<string, ColumnBuilder<ColumnPrimitive, ColumnMeta>>;
```

### InferColumns

```typescript
type InferColumns<TBuilders extends ColumnBuilderRecord> = {
  [K in keyof TBuilders]: TBuilders[K] extends ColumnBuilder<infer V, any> ? V : never;
};
```

Extracts runtime value types from a column builder record.

### InferColumnExprs

```typescript
type InferColumnExprs<TBuilders extends ColumnBuilderRecord> = {
  [K in keyof TBuilders]: TBuilders[K] extends ColumnBuilder<infer V, any> ? ExprInput<V> : never;
};
```

### InferInsertColumns

```typescript
type InferInsertColumns<TBuilders> = Pick<InferColumns<TBuilders>, RequiredInsertKeys<TBuilders>> &
  Partial<Pick<InferColumns<TBuilders>, OptionalInsertKeys<TBuilders>>>;
```

INSERT type: required columns are required, autoIncrement/nullable/default columns are optional.

### InferUpdateColumns

```typescript
type InferUpdateColumns<TBuilders> = Partial<InferColumns<TBuilders>>;
```

UPDATE type: all columns are optional.

### RequiredInsertKeys

```typescript
type RequiredInsertKeys<TBuilders> = /* columns without autoIncrement, nullable, or default */
```

### OptionalInsertKeys

```typescript
type OptionalInsertKeys<TBuilders> = Exclude<keyof TBuilders, RequiredInsertKeys<TBuilders>>;
```

### DataToColumnBuilderRecord

```typescript
type DataToColumnBuilderRecord<TData extends DataRecord> = {
  [K in keyof TData as TData[K] extends ColumnPrimitive ? K : never]: ColumnBuilder<TData[K], any>;
};
```

## Relation Types

### RelationBuilderRecord

```typescript
type RelationBuilderRecord = Record<string,
  ForeignKeyBuilder<any, any> | ForeignKeyTargetBuilder<any, any> |
  RelationKeyBuilder<any, any> | RelationKeyTargetBuilder<any, any>>;
```

### InferDeepRelations

```typescript
type InferDeepRelations<TRelations extends RelationBuilderRecord> = {
  [K in keyof TRelations]?: ExtractRelationTarget<TRelations[K]> | ExtractRelationTargetResult<TRelations[K]>;
};
```

All relations are optional (loaded only via `include()`).

### ExtractRelationTarget

```typescript
type ExtractRelationTarget<TRelation> = /* Extracts N:1 target type (single object) */
```

For FK/RelationKey relations, extracts `InferColumns<TCols> & InferDeepRelations<TRels>` of the target table.

### ExtractRelationTargetResult

```typescript
type ExtractRelationTargetResult<TRelation> = /* Extracts 1:N target type (array or single) */
```

For FKTarget/RelationKeyTarget relations, extracts an array type (or single object if `isSingle: true`).

## Expression Types

### DateUnit

```typescript
type DateUnit = "year" | "month" | "day" | "hour" | "minute" | "second";
```

### WhereExpr

```typescript
type WhereExpr =
  | ExprEq | ExprGt | ExprLt | ExprGte | ExprLte | ExprBetween
  | ExprIsNull | ExprLike | ExprRegexp
  | ExprIn | ExprInQuery | ExprExists
  | ExprNot | ExprAnd | ExprOr;
```

Union of all WHERE-clause expression types (comparison + logical).

### Expr

```typescript
type Expr =
  | ExprColumn | ExprValue | ExprRaw
  | ExprConcat | ExprLeft | ExprRight | ExprTrim | ExprPadStart | ExprReplace
  | ExprUpper | ExprLower | ExprLength | ExprByteLength | ExprSubstring | ExprIndexOf
  | ExprAbs | ExprRound | ExprCeil | ExprFloor
  | ExprYear | ExprMonth | ExprDay | ExprHour | ExprMinute | ExprSecond
  | ExprIsoWeek | ExprIsoWeekStartDate | ExprIsoYearMonth
  | ExprDateDiff | ExprDateAdd | ExprFormatDate
  | ExprCoalesce | ExprNullIf | ExprIs | ExprSwitch | ExprIf
  | ExprCount | ExprSum | ExprAvg | ExprMax | ExprMin
  | ExprGreatest | ExprLeast | ExprRowNum | ExprRandom | ExprCast
  | ExprWindow | ExprSubquery;
```

Union of all expression types (value, string, number, date, conditional, aggregate, window, system).

### WinFn

```typescript
type WinFn =
  | WinFnRowNumber | WinFnRank | WinFnDenseRank | WinFnNtile
  | WinFnLag | WinFnLead | WinFnFirstValue | WinFnLastValue
  | WinFnSum | WinFnAvg | WinFnCount | WinFnMin | WinFnMax;
```

### WinSpec

```typescript
interface WinSpec {
  partitionBy?: Expr[];
  orderBy?: [Expr, ("ASC" | "DESC")?][];
}
```

## QueryDef Types

### QueryDefObjectName

```typescript
interface QueryDefObjectName {
  database?: string;
  schema?: string;
  name: string;
}
```

DB object name. MySQL: `database.name`, MSSQL: `database.schema.name`, PostgreSQL: `schema.name`.

### QueryDef

```typescript
type QueryDef =
  // DML
  | SelectQueryDef | InsertQueryDef | InsertIfNotExistsQueryDef | InsertIntoQueryDef
  | UpdateQueryDef | DeleteQueryDef | UpsertQueryDef
  // DDL
  | ClearSchemaQueryDef | CreateTableQueryDef | DropTableQueryDef | RenameTableQueryDef
  | TruncateQueryDef | AddColumnQueryDef | DropColumnQueryDef | ModifyColumnQueryDef
  | RenameColumnQueryDef | DropPrimaryKeyQueryDef | AddPrimaryKeyQueryDef
  | AddForeignKeyQueryDef | DropForeignKeyQueryDef | AddIndexQueryDef | DropIndexQueryDef
  | CreateViewQueryDef | DropViewQueryDef | CreateProcQueryDef | DropProcQueryDef
  // Utils/Meta
  | ExecProcQueryDef | SwitchFkQueryDef | SchemaExistsQueryDef;
```

### DDL_TYPES

```typescript
const DDL_TYPES: readonly DdlType[]
```

Array of all DDL query type strings. Used for blocking DDL inside transactions.

### DdlType

```typescript
type DdlType = "clearSchema" | "createTable" | "dropTable" | "renameTable" | "truncate"
  | "addColumn" | "dropColumn" | "modifyColumn" | "renameColumn"
  | "dropPrimaryKey" | "addPrimaryKey" | "addForeignKey" | "dropForeignKey"
  | "addIndex" | "dropIndex" | "createView" | "dropView" | "createProc" | "dropProc";
```

### DML QueryDef Interfaces

| Interface | type field | Key fields |
|-----------|-----------|-------------|
| `SelectQueryDef` | `"select"` | `from`, `as`, `select`, `distinct`, `top`, `lock`, `where`, `joins`, `orderBy`, `limit`, `groupBy`, `having`, `with` |
| `SelectQueryDefJoin` | `"select"` | Extends SelectQueryDef + `isSingle` |
| `InsertQueryDef` | `"insert"` | `table`, `records`, `overrideIdentity`, `output` |
| `InsertIfNotExistsQueryDef` | `"insertIfNotExists"` | `table`, `record`, `existsSelectQuery`, `output` |
| `InsertIntoQueryDef` | `"insertInto"` | `table`, `recordsSelectQuery`, `output` |
| `UpdateQueryDef` | `"update"` | `table`, `as`, `record`, `top`, `where`, `joins`, `limit`, `output` |
| `DeleteQueryDef` | `"delete"` | `table`, `as`, `top`, `where`, `joins`, `limit`, `output` |
| `UpsertQueryDef` | `"upsert"` | `table`, `existsSelectQuery`, `insertRecord`, `updateRecord`, `output` |
| `ExecProcQueryDef` | `"execProc"` | `procedure`, `params` |

### DDL QueryDef Interfaces

| Interface | type field | Key fields |
|-----------|-----------|-------------|
| `ClearSchemaQueryDef` | `"clearSchema"` | `database`, `schema` |
| `CreateTableQueryDef` | `"createTable"` | `table`, `columns`, `primaryKey` |
| `DropTableQueryDef` | `"dropTable"` | `table` |
| `RenameTableQueryDef` | `"renameTable"` | `table`, `newName` |
| `TruncateQueryDef` | `"truncate"` | `table` |
| `AddColumnQueryDef` | `"addColumn"` | `table`, `column` |
| `DropColumnQueryDef` | `"dropColumn"` | `table`, `column` |
| `ModifyColumnQueryDef` | `"modifyColumn"` | `table`, `column` |
| `RenameColumnQueryDef` | `"renameColumn"` | `table`, `column`, `newName` |
| `AddPrimaryKeyQueryDef` | `"addPrimaryKey"` | `table`, `columns` |
| `DropPrimaryKeyQueryDef` | `"dropPrimaryKey"` | `table` |
| `AddForeignKeyQueryDef` | `"addForeignKey"` | `table`, `foreignKey` |
| `DropForeignKeyQueryDef` | `"dropForeignKey"` | `table`, `foreignKey` |
| `AddIndexQueryDef` | `"addIndex"` | `table`, `index` |
| `DropIndexQueryDef` | `"dropIndex"` | `table`, `index` |
| `CreateViewQueryDef` | `"createView"` | `view`, `queryDef` |
| `DropViewQueryDef` | `"dropView"` | `view` |
| `CreateProcQueryDef` | `"createProc"` | `procedure`, `params`, `returns`, `query` |
| `DropProcQueryDef` | `"dropProc"` | `procedure` |

### Utility QueryDef Interfaces

| Interface | type field | Key fields |
|-----------|-----------|-------------|
| `SwitchFkQueryDef` | `"switchFk"` | `table`, `enabled` |
| `SchemaExistsQueryDef` | `"schemaExists"` | `database`, `schema` |

### CudOutputDef

```typescript
interface CudOutputDef {
  columns: string[];
  pkColNames: string[];
  aiColName?: string;
}
```

OUTPUT clause definition for INSERT/UPDATE/DELETE.
