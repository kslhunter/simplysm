# Types

## Database types

### `Dialect`

```typescript
type Dialect = "mysql" | "mssql" | "postgresql";
```

### `dialects`

Array of all supported dialects. Useful for parameterized tests.

```typescript
const dialects: Dialect[] = ["mysql", "mssql", "postgresql"];
```

### `QueryBuildResult`

Return type of `QueryBuilderBase.build()`.

```typescript
interface QueryBuildResult {
  sql: string;
  resultSetIndex?: number;   // Which result set to use (default: 0)
  resultSetStride?: number;  // For multi-statement queries (MySQL multi-insert)
}
```

### `IsolationLevel`

```typescript
type IsolationLevel =
  | "READ_UNCOMMITTED"
  | "READ_COMMITTED"
  | "REPEATABLE_READ"
  | "SERIALIZABLE";
```

### `DataRecord`

Recursive type for query result rows, supporting nested relationships.

```typescript
type DataRecord = {
  [key: string]: ColumnPrimitive | DataRecord | DataRecord[];
};
```

### `DbContextExecutor`

Interface that must be implemented by query executors (e.g., `NodeDbContextExecutor` in `orm-node`).

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

### `ResultMeta`

Metadata used by `parseQueryResult` to type-parse flat DB result rows into nested TypeScript objects.

```typescript
interface ResultMeta {
  columns: Record<string, ColumnPrimitiveStr>; // column name → type name
  joins: Record<string, { isSingle: boolean }>; // join alias → 1:1 or 1:N
}
```

### `Migration`

Defines a single schema migration step.

```typescript
interface Migration {
  name: string; // Unique migration name (timestamp recommended)
  up: (db: DbContextBase & DbContextDdlMethods) => Promise<void>;
}
```

---

## Column types

### `DataType`

Union of all supported SQL column type descriptors.

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

### `ColumnPrimitive`

Union of all TypeScript types that can be stored in a column (`string | number | boolean | DateTime | DateOnly | Time | Uuid | Bytes | undefined`).

### `ColumnPrimitiveStr`

String literal union of TypeScript type names: `"string" | "number" | "boolean" | "DateTime" | "DateOnly" | "Time" | "Uuid" | "Bytes"`.

### `ColumnPrimitiveMap`

Map from `ColumnPrimitiveStr` to the actual TypeScript type.

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

### `dataTypeStrToColumnPrimitiveStr`

Constant lookup table mapping SQL data type names to `ColumnPrimitiveStr`.

```typescript
import { dataTypeStrToColumnPrimitiveStr } from "@simplysm/orm-common";

dataTypeStrToColumnPrimitiveStr["datetime"]; // "DateTime"
```

### `inferColumnPrimitiveStr(value)`

Infers the `ColumnPrimitiveStr` type name from a runtime value.

```typescript
import { inferColumnPrimitiveStr } from "@simplysm/orm-common";

inferColumnPrimitiveStr("hello");        // "string"
inferColumnPrimitiveStr(123);            // "number"
inferColumnPrimitiveStr(new DateTime()); // "DateTime"
```

### `InferColumnPrimitiveFromDataType<TDataType>`

Type-level helper: maps a `DataType` to its TypeScript type.

```typescript
type T = InferColumnPrimitiveFromDataType<{ type: "varchar"; length: 100 }>; // string
```

### `ColumnMeta`

Runtime column metadata stored in `ColumnBuilder.meta`.

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

### `ColumnBuilderRecord`

```typescript
type ColumnBuilderRecord = Record<string, ColumnBuilder<ColumnPrimitive, ColumnMeta>>;
```

### `InferColumns<TBuilders>`

Infers the column value type map from a `ColumnBuilderRecord`.

```typescript
type UserRow = InferColumns<typeof User.$columns>;
// { id: number; name: string; email: string | undefined; }
```

### `InferColumnExprs<TBuilders>`

Infers `ExprInput` types from a `ColumnBuilderRecord` (for use with procedure parameters).

### `InferInsertColumns<TBuilders>`

INSERT type: required-only columns are required; auto-increment, nullable, and default columns are optional.

### `InferUpdateColumns<TBuilders>`

UPDATE type: all columns are optional.

### `RequiredInsertKeys<TBuilders>` / `OptionalInsertKeys<TBuilders>`

Utility types extracting required vs. optional key names for INSERT.

### `DataToColumnBuilderRecord<TData>`

Converts a `DataRecord` to a `ColumnBuilderRecord` (maps each primitive property to a `ColumnBuilder<T, any>`). Used by `insertInto`.

---

## Expression types

These types form the `Expr` and `WhereExpr` JSON AST produced by `expr.*` methods and consumed by `QueryBuilderBase`.

**Value expression types**: `ExprColumn`, `ExprValue`, `ExprRaw`

**Comparison types** (used in WHERE): `ExprEq`, `ExprGt`, `ExprLt`, `ExprGte`, `ExprLte`, `ExprBetween`, `ExprIsNull`, `ExprLike`, `ExprRegexp`, `ExprIn`, `ExprInQuery`, `ExprExists`

**Logical types**: `ExprNot`, `ExprAnd`, `ExprOr`

**String function types**: `ExprConcat`, `ExprLeft`, `ExprRight`, `ExprTrim`, `ExprPadStart`, `ExprReplace`, `ExprUpper`, `ExprLower`, `ExprLength`, `ExprByteLength`, `ExprSubstring`, `ExprIndexOf`

**Number function types**: `ExprAbs`, `ExprRound`, `ExprCeil`, `ExprFloor`

**Date function types**: `ExprYear`, `ExprMonth`, `ExprDay`, `ExprHour`, `ExprMinute`, `ExprSecond`, `ExprIsoWeek`, `ExprIsoWeekStartDate`, `ExprIsoYearMonth`, `ExprDateDiff`, `ExprDateAdd`, `ExprFormatDate`

**Conditional types**: `ExprIfNull`, `ExprNullIf`, `ExprIs`, `ExprSwitch`, `ExprIf`

**Aggregate types**: `ExprCount`, `ExprSum`, `ExprAvg`, `ExprMax`, `ExprMin`

**Other types**: `ExprGreatest`, `ExprLeast`, `ExprRowNum`, `ExprRandom`, `ExprCast`, `ExprWindow`, `ExprSubquery`

**Window function types**: `WinFnRowNumber`, `WinFnRank`, `WinFnDenseRank`, `WinFnNtile`, `WinFnLag`, `WinFnLead`, `WinFnFirstValue`, `WinFnLastValue`, `WinFnSum`, `WinFnAvg`, `WinFnCount`, `WinFnMin`, `WinFnMax`

**Union types**:

```typescript
// All value/function expressions
type Expr = ExprColumn | ExprValue | ExprRaw | /* ... all expression types */ ;

// Boolean expressions for WHERE/HAVING
type WhereExpr = ExprEq | ExprGt | /* ... comparison + logical types */ ;

// Window function union
type WinFn = WinFnRowNumber | WinFnRank | /* ... */ ;
```

```typescript
interface WinSpec {
  partitionBy?: Expr[];
  orderBy?: [Expr, ("ASC" | "DESC")?][];
}

type DateSeparator = "year" | "month" | "day" | "hour" | "minute" | "second";
```

---

## QueryDef types

These types form the complete query definition AST consumed by `QueryBuilderBase.build()` and `DbContextExecutor.executeDefs()`.

**Common**: `QueryDefObjectName`, `CudOutputDef`

**DML**: `SelectQueryDef`, `SelectQueryDefJoin`, `InsertQueryDef`, `InsertIfNotExistsQueryDef`, `InsertIntoQueryDef`, `UpdateQueryDef`, `DeleteQueryDef`, `UpsertQueryDef`

**DDL - Schema**: `ClearSchemaQueryDef`

**DDL - Table**: `CreateTableQueryDef`, `DropTableQueryDef`, `RenameTableQueryDef`, `TruncateQueryDef`

**DDL - Column**: `AddColumnQueryDef`, `DropColumnQueryDef`, `ModifyColumnQueryDef`, `RenameColumnQueryDef`

**DDL - Constraints**: `AddPkQueryDef`, `DropPkQueryDef`, `AddFkQueryDef`, `DropFkQueryDef`, `AddIdxQueryDef`, `DropIdxQueryDef`

**DDL - View/Procedure**: `CreateViewQueryDef`, `DropViewQueryDef`, `CreateProcQueryDef`, `DropProcQueryDef`, `ExecProcQueryDef`

**Utils**: `SwitchFkQueryDef`

**Meta**: `SchemaExistsQueryDef`

**Union type**:
```typescript
type QueryDef =
  | SelectQueryDef | InsertQueryDef | UpdateQueryDef | DeleteQueryDef | UpsertQueryDef
  | InsertIfNotExistsQueryDef | InsertIntoQueryDef
  | ClearSchemaQueryDef
  | CreateTableQueryDef | DropTableQueryDef | RenameTableQueryDef | TruncateQueryDef
  | AddColumnQueryDef | DropColumnQueryDef | ModifyColumnQueryDef | RenameColumnQueryDef
  | AddPkQueryDef | DropPkQueryDef | AddFkQueryDef | DropFkQueryDef | AddIdxQueryDef | DropIdxQueryDef
  | CreateViewQueryDef | DropViewQueryDef | CreateProcQueryDef | DropProcQueryDef | ExecProcQueryDef
  | SwitchFkQueryDef | SchemaExistsQueryDef;
```

**DDL type constants**:

```typescript
// Array of all DDL QueryDef type strings (excludes switchFk)
const DDL_TYPES: readonly string[];

// Union type of DDL type strings
type DdlType = (typeof DDL_TYPES)[number];
```

---

## Relation builder types

### `RelationBuilderRecord`

```typescript
type RelationBuilderRecord = Record<
  string,
  | ForeignKeyBuilder<any, any>
  | ForeignKeyTargetBuilder<any, any>
  | RelationKeyBuilder<any, any>
  | RelationKeyTargetBuilder<any, any>
>;
```

### `ExtractRelationTarget<TRelation>`

Extracts the TypeScript row type of the referenced table from a `ForeignKeyBuilder` or `RelationKeyBuilder`.

### `ExtractRelationTargetResult<TRelation>`

Extracts the row type (single or array) from a `ForeignKeyTargetBuilder` or `RelationKeyTargetBuilder`.

### `InferDeepRelations<TRelations>`

Recursively infers optional relationship properties from a `RelationBuilderRecord`.

```typescript
type UserRelations = InferDeepRelations<typeof User.$relations>;
// { posts?: Post[]; profile?: Profile; }
```

---

## DbContextDef types

### `DbContextBase`

Core interface implemented internally by `createDbContext`. Used by `Queryable`, `Executable`, and `ViewBuilder` to execute queries.

```typescript
interface DbContextBase {
  status: DbContextStatus;
  readonly database: string | undefined;
  readonly schema: string | undefined;
  getNextAlias(): string;
  resetAliasCounter(): void;
  executeDefs<T>(defs: QueryDef[], resultMetas?: (ResultMeta | undefined)[]): Promise<T[][]>;
  getQueryDefObjectName(tableOrView: TableBuilder | ViewBuilder): QueryDefObjectName;
  switchFk(table: QueryDefObjectName, switch_: "on" | "off"): Promise<void>;
}
```

### `DbContextStatus`

```typescript
type DbContextStatus = "ready" | "connect" | "transact";
```

### `DbContextDef<TTables, TViews, TProcedures>`

Blueprint type returned by `defineDbContext()`.

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

### `DbContextInstance<TDef>`

Full runtime type of a database context created by `createDbContext()`. Extends `DbContextBase` with connection methods, DDL methods, and auto-mapped table/view/procedure accessors.

### `DbContextConnectionMethods`

Interface for `connect`, `connectWithoutTransaction`, and `trans`.

### `DbContextDdlMethods`

Interface listing all DDL execution methods and their corresponding QueryDef generator methods available on a `DbContextInstance`.

---

## Error types

### `DbTransactionError`

Error thrown by `DbContextExecutor` implementations to wrap DBMS-specific transaction errors with a standardized code.

```typescript
import { DbTransactionError, DbErrorCode } from "@simplysm/orm-common";

class DbTransactionError extends Error {
  readonly name = "DbTransactionError";
  readonly code: DbErrorCode;
  readonly originalError?: unknown;
}
```

### `DbErrorCode`

```typescript
enum DbErrorCode {
  NO_ACTIVE_TRANSACTION = "NO_ACTIVE_TRANSACTION",
  TRANSACTION_ALREADY_STARTED = "TRANSACTION_ALREADY_STARTED",
  DEADLOCK = "DEADLOCK",
  LOCK_TIMEOUT = "LOCK_TIMEOUT",
}
```

**Usage example**:

```typescript
import { DbTransactionError, DbErrorCode } from "@simplysm/orm-common";

try {
  await executor.rollbackTransaction();
} catch (err) {
  if (err instanceof DbTransactionError) {
    if (err.code === DbErrorCode.NO_ACTIVE_TRANSACTION) {
      return; // already rolled back, ignore
    }
  }
  throw err;
}
```
