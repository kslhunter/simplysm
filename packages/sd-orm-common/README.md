# @simplysm/sd-orm-common

Simplysm ORM common module — contracts, decorators, query building primitives, and the `Queryable` LINQ-style API shared between all ORM implementations (Node.js, browser, service).

## Installation

```bash
yarn add @simplysm/sd-orm-common
```

---

## Main Modules

### DbContext

Abstract base class for all database contexts. Subclass it and declare `Queryable` and `StoredProcedure` fields for each table/procedure, and a `migrations` getter.

```typescript
import { DbContext, Table, Column, Queryable } from "@simplysm/sd-orm-common";

@Table({ description: "Order" })
class Order {
  @Column({ primaryKey: 1, description: "ID", autoIncrement: true })
  id!: number;

  @Column({ description: "Name" })
  name!: string;
}

class AppDb extends DbContext {
  get migrations() {
    return [];
  }
  order = new Queryable(this, Order);
}
```

#### Constructor

```typescript
constructor(executor: IDbContextExecutor | undefined, opt: TDbContextOption)
```

`executor` is injected by `sd-orm-node` or `sd-service-client`; pass `undefined` when building query defs without executing.

#### Properties

| Property                 | Type                                 | Description                                                        |
| ------------------------ | ------------------------------------ | ------------------------------------------------------------------ |
| `status`                 | `"ready" \| "connect" \| "transact"` | Current connection state                                           |
| `lastConnectionDateTime` | `DateTime \| undefined`              | Timestamp of the last connection                                   |
| `prepareDefs`            | `TQueryDef[]`                        | Accumulated query defs for batch execution                         |
| `qb`                     | `QueryBuilder`                       | Low-level SQL string builder                                       |
| `qh`                     | `QueryHelper`                        | High-level expression helpers                                      |
| `systemMigration`        | `Queryable<this, SystemMigration>`   | Migration record table accessor                                    |
| `tableDefs`              | `ITableDef[]`                        | All table/procedure definitions registered on the context (getter) |

#### Connection Methods

```typescript
// Opens a connection, runs callback without a transaction, then closes.
connectWithoutTransactionAsync<R>(callback: () => Promise<R>): Promise<R>

// Opens a connection, begins a transaction, runs fn, commits (or rolls back on error), closes.
connectAsync<R>(fn: () => Promise<R>, isolationLevel?: ISOLATION_LEVEL): Promise<R>

// Begins a new transaction within an already-open connection.
transAsync<R>(fn: () => Promise<R>, isolationLevel?: ISOLATION_LEVEL): Promise<R>
```

#### Execution Methods

```typescript
// Executes an array of TQueryDef objects.
executeDefsAsync(defs: TQueryDef[], options?: (IQueryResultParseOption | undefined)[]): Promise<any[][]>

// Executes a parameterized raw SQL query.
executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]>

// Executes all pending prepareDefs and clears the queue.
executePreparedAsync(): Promise<void>

// High-performance bulk insert via the underlying driver.
bulkInsertAsync(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void>

// High-performance bulk upsert (MySQL only).
bulkUpsertAsync(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void>
```

#### Introspection Methods

```typescript
getIsDbExistsAsync(database?: string): Promise<boolean>
getIsTableExistsAsync(tableNameDef: IQueryTableNameDef): Promise<boolean>
getTableInfosAsync(database: string, schema?: string): Promise<{ schema: string; name: string }[]>
getTableColumnInfosAsync(database, schema, table): Promise<{ name, dataType, length?, precision?, digits?, nullable, autoIncrement }[]>
getTablePkColumnNamesAsync(database, schema, table): Promise<string[]>
getTableFksAsync(database, schema, table): Promise<{ name, sourceColumnNames, targetSchemaName, targetTableName }[]>
getTableIndexesAsync(database, schema, table): Promise<{ name, columns: { name, orderBy }[] }[]>
truncateTable(table: string): Promise<void>
```

#### Table Definition Helpers

```typescript
// Returns all Queryable/StoredProcedure ITableDef objects from the context instance.
getTableDefinitions(): ITableDef[]
```

#### Schema Generation Methods

Used internally and during migrations. All return `TQueryDef` values that can be passed to `executeDefsAsync`.

```typescript
getCreateTablesFullQueryDefsFromTableDef(tableDefs: ITableDef[]): TQueryDef[][]
getCreateTableQueryDefFromTableDef(tableDef: ITableDef): TQueryDef
getCreateFksQueryDefsFromTableDef(tableDef: ITableDef): TQueryDef[]
getCreateIndexesQueryDefsFromTableDef(tableDef: ITableDef): TQueryDef[]
getAddColumnQueryDefFromTableDef(tableDef: ITableDef, columnName: string): TQueryDef
getModifyColumnQueryDefFromTableDef(tableDef: ITableDef, columnName: string): TQueryDef
getModifyPkQueryDefFromTableDef(tableDef: ITableDef, columnNames: string[]): TQueryDef[]
getAddFkQueryDefFromTableDef(tableDef: ITableDef, fkName: string): TQueryDef
getRemoveFkQueryDefFromTableDef(tableDef: ITableDef, fkName: string): TQueryDef
getCreateIndexQueryDefFromTableDef(tableDef: ITableDef, indexName: string): TQueryDef
getDropIndexQueryDefFromTableDef(tableDef: ITableDef, indexName: string): TQueryDef
getTableNameDef(tableDef: ITableDef): IQueryTableNameDef
```

#### Database Initialization

```typescript
// Creates DB, tables, PKs, FKs, indexes, and runs migrations.
// Returns "creation", "migration", or undefined (already up to date).
initializeAsync(dbs?: string[], force?: boolean): Promise<"creation" | "migration" | undefined>
```

#### Type Exports

```typescript
export type TDbContextOption = IDefaultDbContextOption | ISqliteDbContextOption;

export interface IDefaultDbContextOption {
  dialect: "mysql" | "mssql" | "mssql-azure";
  database?: string;
  schema?: string;
}

export interface ISqliteDbContextOption {
  dialect: "sqlite";
}
```

---

### Decorators

Property and class decorators that register table/column metadata via `reflect-metadata`.

#### `@Table`

Class decorator. Registers table-level metadata.

```typescript
import { Table } from "@simplysm/sd-orm-common";

@Table({
  description: "Product",
  database: "MyDb",   // optional — overrides DbContext default
  schema: "dbo",      // optional
  name: "TBL_Product", // optional — defaults to class name
})
class Product { ... }
```

Options:

| Field         | Type                 | Description                                  |
| ------------- | -------------------- | -------------------------------------------- |
| `description` | `string`             | Required human-readable label                |
| `database`    | `string?`            | Override database name                       |
| `schema`      | `string?`            | Override schema name                         |
| `name`        | `string?`            | Override table name (defaults to class name) |
| `view`        | `(db) => Queryable?` | Define as a DB view                          |
| `procedure`   | `string?`            | Define as a stored procedure (SQL body)      |

#### `@Column`

Property decorator. Registers a column.

```typescript
@Column({ description: "Product ID", primaryKey: 1, autoIncrement: true })
id!: number;

@Column({ description: "Product Name", nullable: true })
name?: string;

@Column({ description: "Price", dataType: { type: "DECIMAL", precision: 18, digits: 2 } })
price!: number;
```

Options:

| Field           | Type              | Description                                      |
| --------------- | ----------------- | ------------------------------------------------ |
| `description`   | `string`          | Required human-readable label                    |
| `name`          | `string?`         | Override column name (defaults to property name) |
| `dataType`      | `TSdOrmDataType?` | Override inferred type                           |
| `nullable`      | `boolean?`        | Whether the column allows NULL                   |
| `autoIncrement` | `boolean?`        | Identity / auto-increment column                 |
| `primaryKey`    | `number?`         | PK order (1 = first)                             |

#### `@ForeignKey`

Property decorator for a FK navigation property.

```typescript
@ForeignKey(["categoryId"], () => Category, "Category")
category?: Category;
```

Signature:

```typescript
ForeignKey<T>(
  columnNames: (keyof T)[],
  targetTypeFwd: () => Type<any>,
  description: string,
): TPropertyDecoratorReturn<Partial<T>>
```

#### `@ForeignKeyTarget`

Property decorator for the inverse side of a FK.

```typescript
@ForeignKeyTarget(() => Product, "category", "Products", "single")
products?: Product | Product[];
```

Signature:

```typescript
ForeignKeyTarget<T, P>(
  sourceTypeFwd: () => Type<P>,
  foreignKeyPropertyKey: keyof P,
  description: string,
  multiplicity?: "single",
): TPropertyDecoratorReturn<T>
```

Pass `"single"` to treat it as a one-to-one relation (maps to `joinSingle` instead of `join`).

#### `@Index`

Property decorator to create a DB index on one or more columns. Apply to each column that participates, using the same `name` to group them into a composite index.

```typescript
@Index({ name: "IDX_order_date", order: 1, orderBy: "DESC", unique: false })
orderDate!: DateOnly;

@Index({ name: "IDX_order_date", order: 2 })
customerId!: number;
```

Options:

| Field     | Type               | Default       |
| --------- | ------------------ | ------------- |
| `name`    | `string?`          | Property name |
| `order`   | `number?`          | `1`           |
| `orderBy` | `"ASC" \| "DESC"?` | `"ASC"`       |
| `unique`  | `boolean?`         | `false`       |

#### `@ReferenceKey` / `@ReferenceKeyTarget`

Same API as `@ForeignKey` / `@ForeignKeyTarget` but for logical (non-enforced) references. Used when the DB FK constraint is intentionally omitted.

```typescript
@ReferenceKey(["auditUserId"], () => User, "Audit User")
auditUser?: User;

@ReferenceKeyTarget(() => Order, "auditUser", "Orders")
orders?: Order[];
```

---

### Queryable

The LINQ-style fluent query builder. Wraps a `DbContext` and a table type.

```typescript
import { Queryable } from "@simplysm/sd-orm-common";

// Typically accessed through the DbContext property:
const orders = db.order;

// Or constructed directly:
const q = new Queryable(db, Order);
```

#### Construction

```typescript
// From a table type:
new Queryable(db, TableType)

// Clone:
new Queryable(db, existingQueryable)

// Union of multiple queryables:
Queryable.union(queryables: Queryable<D, T>[], as?: string): Queryable<D, T>
```

#### Public Properties

| Property           | Type                     | Description                                       |
| ------------------ | ------------------------ | ------------------------------------------------- |
| `db`               | `D`                      | The bound `DbContext` instance                    |
| `tableType`        | `Type<T> \| undefined`   | The table class (undefined after `wrap()`)        |
| `tableDef`         | `ITableDef \| undefined` | Table metadata (undefined after `wrap()`)         |
| `tableName`        | `string`                 | Fully-qualified SQL table name (getter)           |
| `tableDescription` | `string`                 | Human-readable description from `@Table` (getter) |
| `tableNameDef`     | `IQueryTableNameDef`     | Raw name def used in query building (getter)      |

#### Selection

```typescript
// Project to a new shape:
.select(entity => ({ id: entity.id, name: entity.name }))

// Select all columns of a specific type:
.selectByType(OtherTableType)

// Cast entity type without changing query:
.ofType<NewType>()
```

#### Filtering

```typescript
.where(entity => [db.qh.equal(entity.status, "active")])
.distinct()
.top(10)
.sample(100)   // TABLESAMPLE (MSSQL only)
```

#### Sorting and Paging

```typescript
.orderBy(entity => entity.createdAt, /* desc= */ true)
.orderBy("relation.fieldName")  // with auto-include
.clearOrderBy()
.limit(skip, take)
```

#### Grouping

```typescript
.groupBy(entity => [entity.category])
.having(entity => [db.qh.greaterThen(db.qh.count(), 0)])
```

#### Joining

```typescript
// One-to-many join:
.join(RelatedType, "alias", (q, en) => q.where(item => [db.qh.equal(item.parentId, en.id)]))

// One-to-one join (joinSingle):
.joinSingle(RelatedType, "alias", (q, en) => q.where(item => [db.qh.equal(item.id, en.relatedId)]))

// Auto-join via FK/FKT decoration:
.include(entity => entity.relation)
.include(entity => entity.relation.nested)
.includeByTableChainedName("relation.nested")
```

#### Pivot / Unpivot

```typescript
.pivot(
  entity => entity.value,
  value => db.qh.sum(value),
  0,
  entity => entity.pivotKey,
  ["key1", "key2"],
)

.unpivot("valueColumn", "pivotColumn", ["key1", "key2"], Number)
```

#### Search

Applies a full-text `LIKE`/regex search across multiple fields. Prefix the search text with `==` for regex, `<>` for negation.

```typescript
.search(entity => [entity.name, entity.description], "hello world")
```

#### Wrapping (subquery)

```typescript
// Wrap the current query as a subquery:
.wrap()

// Wrap and re-map to a specific type:
.wrap(SomeType)
```

#### Lock (pessimistic)

```typescript
.lock()   // Adds WITH (UPDLOCK) on MSSQL, FOR UPDATE on MySQL
```

#### Execution Methods

```typescript
// Returns all matching rows:
resultAsync(): Promise<T[]>

// Returns the single matching row (throws if > 1):
singleAsync(): Promise<T | undefined>

// Returns total count:
countAsync(): Promise<number>
countAsync(fwd: entity => value): Promise<number>  // COUNT(DISTINCT ...)

// Returns true if any rows exist:
existsAsync(): Promise<boolean>

// INSERT one or more records (returns output columns if specified):
insertAsync(records: TInsertObject<T>[]): Promise<void>
insertAsync(records: TInsertObject<T>[], outputColumns: OK[]): Promise<{ [K in OK]: T[K] }[]>

// INSERT skipping FK checks:
insertWithoutFkCheckAsync(records, outputColumns?)

// INSERT from current SELECT into another table:
insertIntoAsync(tableType: Type<T>, stopAutoIdentity?: boolean): Promise<void>

// Bulk INSERT (high performance, no FK check or identity toggle):
bulkInsertAsync(records: TInsertObject<T>[]): Promise<void>

// Bulk UPSERT (MySQL only):
bulkUpsertAsync(records: TInsertObject<T>[]): Promise<void>

// UPDATE matching rows:
updateAsync(recordFwd: entity => TUpdateObject<T>): Promise<void>
updateAsync(recordFwd, outputColumns: OK[]): Promise<{ [K in OK]: T[K] }[]>

// DELETE matching rows:
deleteAsync(): Promise<void>
deleteAsync(outputColumns: OK[]): Promise<{ [K in OK]: T[K] }[]>

// UPSERT (insert or update):
upsertAsync(inAndUpsertFwd: entity => TInsertObject<T>): Promise<void>
upsertAsync(updateFwd, insertFwd): Promise<void>
upsertAsync(updateFwd, insertFwd, outputColumns): Promise<{ [K in OK]: T[K] }[]>
```

#### Prepare (deferred execution)

Accumulates query defs in `db.prepareDefs`; execute with `db.executePreparedAsync()`.

```typescript
insertPrepare(records: TInsertObject<T>[]): void
insertWithoutFkCheckPrepare(records: TInsertObject<T>[]): void
updatePrepare(recordFwd: entity => TUpdateObject<T>): void
deletePrepare(): void
upsertPrepare(updateObjOrFwd, insertObjOrFwd?): void
configIdentityInsert(state: "on" | "off"): void
```

#### Query Def Accessors (advanced)

Return raw query definition objects for manual orchestration.

```typescript
getSelectQueryDef(): ISelectQueryDef & { select: Record<string, TQueryBuilderValue> }
getInsertQueryDef(obj, outputColumns): IInsertQueryDef
getUpdateQueryDef(obj, outputColumns): IUpdateQueryDef
getInsertIfNotExistsQueryDef(insertObj, outputColumns): IInsertIfNotExistsQueryDef
getUpsertQueryDef(updateObj, insertObj, outputColumns, aiKeyName, pkColNames): IUpsertQueryDef
getDeleteQueryDef(outputColumns): IDeleteQueryDef
```

---

### QueryUnit

A typed wrapper around a SQL expression fragment. Produced by `QueryHelper` methods. Used as values inside `select`, `where`, `orderBy`, etc.

```typescript
import { QueryUnit } from "@simplysm/sd-orm-common";

// Constructed internally — you rarely create QueryUnit directly.
// Use QueryHelper methods like db.qh.val(), db.qh.query(), etc.
```

```typescript
class QueryUnit<T> {
  constructor(type: Type<T | WrappedType<T>> | undefined, query: any);

  readonly type: Type<T | WrappedType<T>> | undefined;
  get query(): any;

  // Type-cast helpers (no runtime effect, TypeScript only):
  notNull(): QueryUnit<NonNullable<T>>;
  nullable(): QueryUnit<T | undefined>;
}
```

---

### QueryHelper

Expression builder that produces `TQueryBuilderValue` or `QueryUnit<T>` fragments. Accessed via `db.qh`.

```typescript
import { QueryHelper } from "@simplysm/sd-orm-common";
// Use via db.qh — do not construct directly in most cases.
```

#### Comparison

```typescript
qh.equal(source, target); // source = target (NULL-safe)
qh.notEqual(source, target); // source != target (NULL-safe)
qh.isNull(source); // source IS NULL
qh.isNotNull(source); // source IS NOT NULL
qh.isFalse(source); // IS NULL OR = 0
qh.isTrue(source); // IS NOT NULL AND = 1
qh.lessThen(source, target); // <
qh.lessThenOrEqual(source, target); // <=
qh.greaterThen(source, target); // >
qh.greaterThenOrEqual(source, target); // >=
qh.between(source, from, to); // >= from AND <= to
```

#### String Matching

```typescript
qh.includes(source, target); // LIKE '%target%'
qh.notIncludes(source, target); // NOT LIKE '%target%'
qh.like(source, target); // LIKE target
qh.notLike(source, target); // NOT LIKE target
qh.startsWith(source, target); // LIKE 'target%'
qh.notStartsWith(source, target);
qh.endsWith(source, target); // LIKE '%target'
qh.notEndsWith(source, target);
qh.regexp(source, target); // REGEXP target
qh.notRegexp(source, target);
```

#### Set Operators

```typescript
qh.in(src, [val1, val2]); // src IN (...)
qh.notIn(src, [val1, val2]); // src NOT IN (...)
```

#### Logical Combinators

```typescript
qh.and([expr1, expr2]); // expr1 AND expr2
qh.or([expr1, expr2]); // expr1 OR expr2
```

#### Scalar / Field Expressions

```typescript
qh.val(value, type?)               // Wrap a literal as a QueryUnit
qh.query(type, texts)              // Build a QueryUnit from raw SQL fragments
qh.is(whereExpr)                   // CASE WHEN expr THEN 1 ELSE 0 END → QueryUnit<boolean>
qh.ifNull(source, ...targets)      // ISNULL / IFNULL coalesce chain
qh.cast(src, targetType)           // CONVERT / CAST
```

#### Date / Time

```typescript
qh.dateDiff(separator, from, to); // DATEDIFF / TIMESTAMPDIFF → number
qh.dateAdd(separator, from, value); // DATEADD / DATE_ADD → same type as from
qh.dateToString(value, code); // CONVERT(NVARCHAR, value, code) or DATE_FORMAT
qh.year(value); // YEAR()
qh.month(value); // MONTH()
qh.day(value); // DAY()
qh.isoWeek(value); // ISO weekday number
qh.isoWeekStartDate(value); // First day of ISO week
qh.isoYearMonth(value); // First day of ISO month for the ISO week
```

Date separator values (`TDbDateSeparator`): `"year" | "quarter" | "month" | "day" | "week" | "hour" | "minute" | "second" | "millisecond" | "microsecond" | "nanosecond"`.

#### String Functions

```typescript
qh.concat(...args); // Dialect-aware concatenation
qh.left(src, num); // LEFT(src, num)
qh.right(src, num); // RIGHT(src, num)
qh.padStart(src, length, fill); // RIGHT(fill+src, length)
qh.trim(src); // LTRIM(RTRIM(src))
qh.replace(src, from, to); // REPLACE()
qh.toUpperCase(src); // UPPER()
qh.toLowerCase(src); // LOWER()
qh.dataLength(src); // DATALENGTH / LENGTH (bytes)
qh.stringLength(src); // LEN / CHAR_LENGTH (characters)
```

#### Math

```typescript
qh.abs(src);
qh.round(arg, len);
qh.ceil(arg);
qh.floor(arg);
qh.greatest(...args);
qh.greater(source, target); // @deprecated — use greatest()
```

#### Aggregate Functions

```typescript
qh.count(arg?)                     // COUNT(*) or COUNT(DISTINCT arg)
qh.sum(arg)                        // SUM()
qh.avg(arg)                        // AVG()
qh.max(unit)                       // MAX()
qh.min(unit)                       // MIN()
qh.exists(arg)                     // true if COUNT > 0
qh.notExists(arg)                  // true if COUNT = 0
```

#### Window Function

```typescript
qh.rowIndex(
  orderBy: [value, "asc" | "desc"][],
  groupBy?: value[],
): QueryUnit<number>               // ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)
```

#### CASE Expression

```typescript
// Searched CASE:
qh.case(predicate, thenValue).case(pred2, then2).else(elseValue);

// Simple CASE (equality):
qh.caseWhen(sourceValue).when(matchValue, thenValue).else(elseValue);
```

#### Type Mapping

```typescript
qh.type(type); // Convert TypeScript type → SQL type string
qh.mysqlConvertType(type); // MySQL CONVERT() type name
```

Type mapping table:

| TypeScript | MSSQL              | MySQL          | SQLite             |
| ---------- | ------------------ | -------------- | ------------------ |
| `String`   | `NVARCHAR(255)`    | `VARCHAR(255)` | `NVARCHAR(255)`    |
| `Number`   | `BIGINT`           | `BIGINT`       | `INTEGER`          |
| `Boolean`  | `BIT`              | `BOOLEAN`      | `BIT`              |
| `DateTime` | `DATETIME2`        | `DATETIME`     | `DATETIME2`        |
| `DateOnly` | `DATE`             | `DATE`         | `DATE`             |
| `Time`     | `TIME`             | `TIME`         | `TIME`             |
| `Uuid`     | `UNIQUEIDENTIFIER` | `CHAR(38)`     | `UNIQUEIDENTIFIER` |
| `Buffer`   | `VARBINARY(MAX)`   | `LONGBLOB`     | `VARBINARY(MAX)`   |

#### Query Value Helpers

```typescript
// Convert a TEntityValue to a SQL string (or ISelectQueryDef for subqueries):
qh.getQueryValue(value): string | ISelectQueryDef

// Convert a TEntityValue to a native value for bulk operations:
qh.getBulkInsertQueryValue(value): any
```

---

### CaseQueryHelper

Fluent builder for a searched CASE expression. Returned by `qh.case()`.

```typescript
import { CaseQueryHelper } from "@simplysm/sd-orm-common";
// Access via: db.qh.case(predicate, thenValue)
```

```typescript
class CaseQueryHelper<T extends TQueryValue> {
  case(
    predicate: TEntityValue<boolean | Boolean> | TQueryBuilderValue,
    then: TEntityValue<T>,
  ): this;
  else(then: TEntityValue<T>): QueryUnit<T>;
}
```

Example:

```typescript
const label = db.qh
  .case(db.qh.equal(entity.status, "A"), "Active")
  .case(db.qh.equal(entity.status, "I"), "Inactive")
  .else("Unknown");
```

---

### CaseWhenQueryHelper

Fluent builder for a simple (equality) CASE expression. Returned by `qh.caseWhen()`.

```typescript
import { CaseWhenQueryHelper } from "@simplysm/sd-orm-common";
// Access via: db.qh.caseWhen(sourceValue)
```

```typescript
class CaseWhenQueryHelper<T extends TQueryValue> {
  when(arg: TEntityValue<TQueryValue>, then: TEntityValue<T>): CaseWhenQueryHelper<T>;
  else(then: TEntityValue<T>): QueryUnit<T>;
}
```

Example:

```typescript
const label = db.qh
  .caseWhen(entity.status)
  .when("A", "Active")
  .when("I", "Inactive")
  .else("Unknown");
```

---

### QueryBuilder

Low-level class that converts `TQueryDef` objects to SQL strings. Dialect-aware (mysql / mssql / mssql-azure / sqlite). Accessed via `db.qb`.

```typescript
import { QueryBuilder } from "@simplysm/sd-orm-common";
const qb = new QueryBuilder("mssql");
```

#### Properties

| Property | Type          | Description                       |
| -------- | ------------- | --------------------------------- |
| `qh`     | `QueryHelper` | QueryHelper bound to same dialect |

#### Table Name Utilities

```typescript
qb.wrap(name: string): string                          // [name] or `name`
qb.getTableName(def: IQueryTableNameDef): string       // fully-qualified [db].[schema].[table]
qb.getTableNameWithoutDatabase(def): string            // [schema].[table]
qb.getTableNameChain(def): string[]                    // array of name parts
qb.getQueryOfQueryValue(queryValue: TQueryBuilderValue): string
```

#### DDL Methods

```typescript
qb.createDatabaseIfNotExists(def)
qb.clearDatabaseIfExists(def)
qb.createTable(def)
qb.createView(def)
qb.createProcedure(def)
qb.executeProcedure(def)
qb.dropTable(def)
qb.addColumn(def): string[]
qb.removeColumn(def): string
qb.modifyColumn(def): string[]
qb.renameColumn(def): string
qb.dropPrimaryKey(def): string
qb.addPrimaryKey(def): string
qb.addForeignKey(def): string
qb.removeForeignKey(def): string
qb.createIndex(def): string
qb.dropIndex(def): string
qb.configIdentityInsert(def): string
qb.configForeignKeyCheck(def): string
qb.truncateTable(def): string
```

#### Introspection Methods

```typescript
qb.getDatabaseInfo(def)
qb.getTableInfos(def?)
qb.getTableInfo(def)
qb.getTableColumnInfos(def)
qb.getTablePrimaryKeys(def)
qb.getTableForeignKeys(def)
qb.getTableIndexes(def)
```

#### DML Methods

```typescript
qb.select(def: ISelectQueryDef): string
qb.insert(def: IInsertQueryDef): string
qb.insertInto(def: IInsertIntoQueryDef): string
qb.update(def: IUpdateQueryDef): string
qb.delete(def: IDeleteQueryDef): string
qb.insertIfNotExists(def: IInsertIfNotExistsQueryDef): string
qb.upsert(def: IUpsertQueryDef): string
```

#### Generic Dispatcher

```typescript
// Dispatches to the correct method by def.type:
qb.query<T extends TQueryDef>(def: T): ReturnType<this[T["type"]]>
```

---

### StoredProcedure

Wrapper for stored procedure execution. Declare as a field on the `DbContext` subclass.

```typescript
import { StoredProcedure } from "@simplysm/sd-orm-common";

class AppDb extends DbContext {
  get migrations() {
    return [];
  }
  myProc = new StoredProcedure(this, MyProcedureClass);
}

// Execute:
await db.myProc.execAsync({ param1: "value", param2: 42 });
```

```typescript
class StoredProcedure<D extends DbContext, T> {
  constructor(db: D, tableType: Type<T>);
  readonly db: D;
  readonly tableType: Type<T>;
  execAsync(obj: TInsertObject<T>): Promise<void>;
}
```

---

### SystemMigration

Internal table model used to track applied migrations. Declared with the table name `_migration`.

```typescript
import { SystemMigration } from "@simplysm/sd-orm-common";
// Used internally by DbContext.initializeAsync.
```

```typescript
@Table({ name: "_migration", description: "Migration" })
class SystemMigration {
  @Column({ primaryKey: 1, description: "Code" })
  code!: string;
}
```

---

### DbDefUtils

Static utility class for reading and writing table definition metadata stored via `reflect-metadata`.

```typescript
import { DbDefUtils } from "@simplysm/sd-orm-common";

const tableDef = DbDefUtils.getTableDef(MyTable);
```

```typescript
class DbDefUtils {
  static getTableDef(tableType: Type<any>, throws?: boolean): ITableDef;
  static setTableDef(tableType: Type<any>, tableDef: ITableDef): void;
  static mergeTableDef(tableType: Type<any>, target: Partial<ITableDef>): void;
  static addColumnDef(tableType: Type<any>, def: IColumnDef): void;
  static addForeignKeyDef(tableType: Type<any>, def: IForeignKeyDef): void;
  static addForeignKeyTargetDef(tableType: Type<any>, def: IForeignKeyTargetDef): void;
  static addIndexDef(tableType: Type<any>, def: IIndexDef): void;
  static addReferenceKeyDef(tableType: Type<any>, def: IReferenceKeyDef): void;
  static addReferenceKeyTargetDef(tableType: Type<any>, def: IReferenceKeyTargetDef): void;
}
```

---

### SdOrmUtils

Static utility class for query value conversion, type detection, and result parsing.

```typescript
import { SdOrmUtils } from "@simplysm/sd-orm-common";
```

```typescript
class SdOrmUtils {
  // Escape single quotes for SQL strings.
  static replaceString(str: string): string;

  // Returns true if value can be used as a query value (primitive, QueryUnit, sd-core-common date/time types, Buffer).
  static canConvertToQueryValue(value: any): value is TEntityValue<TQueryValue>;

  // Returns the TypeScript constructor (Number, String, DateTime, etc.) for a given value.
  static getQueryValueType<T extends TQueryValue>(value: TEntityValue<T>): Type<T> | undefined;

  // Collects all QueryUnit/primitive fields from a TEntity tree.
  static getQueryValueFields<T>(entity: TEntity<T>, availableDepth?: number): TEntityValue<any>[];

  // Parses raw DB rows into a typed, nested object tree using IQueryResultParseOption.
  // yieldInterval controls how often the parser yields to the event loop (default: 50).
  static parseQueryResultAsync<T>(
    orgResults: any[],
    option?: IQueryResultParseOption,
    yieldInterval?: number,
  ): Promise<T[]>;
}
```

---

## Types

### Data Type Definitions

```typescript
import {
  TSdOrmDataType,
  ISdOrmDataTypeOfText,
  ISdOrmDataTypeOfDecimal,
  ISdOrmDataTypeOfString,
  ISdOrmDataTypeOfFixString,
  ISdOrmDataTypeOfBinary,
} from "@simplysm/sd-orm-common";

// Use in @Column({ dataType: ... }) or qh.type():

{ type: "TEXT" }
{ type: "DECIMAL", precision: 18, digits?: 4 }   // digits is optional
{ type: "STRING", length: 500 }        // NVARCHAR(500)
{ type: "STRING", length: "MAX" }      // NVARCHAR(MAX)
{ type: "FIXSTRING", length: 10 }      // NCHAR(10)
{ type: "BINARY", length: 1024 }       // VARBINARY(1024)
{ type: "BINARY", length: "MAX" }      // VARBINARY(MAX)
```

### Query Value Types

```typescript
import { TQueryValue, TStrippedQueryValue } from "@simplysm/sd-orm-common";

// TQueryValue = TFlatType (string, number, boolean, Date, DateOnly, DateTime, Time, Uuid, Buffer, undefined, null, ...)
// TStrippedQueryValue = UnwrappedType<TQueryValue>
```

### Table / Column Definition Interfaces

```typescript
import {
  ITableNameDef,
  ITableDef,
  IColumnDef,
  IForeignKeyDef,
  IForeignKeyTargetDef,
  IIndexDef,
  IReferenceKeyDef,
  IReferenceKeyTargetDef,
  IDbMigration,
} from "@simplysm/sd-orm-common";
```

| Interface                | Description                                                           |
| ------------------------ | --------------------------------------------------------------------- |
| `ITableNameDef`          | `{ database?, schema?, name }`                                        |
| `ITableDef`              | Full table metadata (columns, FKs, indexes, referenceKeys, etc.)      |
| `IColumnDef`             | Column metadata including type forward (`typeFwd: () => Type<...>`)   |
| `IForeignKeyDef`         | FK definition (columns + target type)                                 |
| `IForeignKeyTargetDef`   | Inverse FK definition                                                 |
| `IIndexDef`              | Index definition (columns + order)                                    |
| `IReferenceKeyDef`       | Logical (non-enforced) FK definition                                  |
| `IReferenceKeyTargetDef` | Inverse logical FK definition                                         |
| `IDbMigration`           | `{ up(db: DbContext): Promise<void> }` — implement for each migration |

`ITableDef` shape:

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

`IColumnDef` shape:

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

### Entity Type Helpers

```typescript
import {
  TEntity,
  TSelectEntity,
  TEntityUnwrap,
  TIncludeEntity,
  TInsertObject,
  TUpdateObject,
  TEntityValue,
  TEntityValueOrQueryable,
  TEntityValueOrQueryableOrArray,
  IQueryableDef,
  TQueryValuePropertyNames,
  TUndefinedPropertyNames,
  TOnlyQueryValueProperty,
} from "@simplysm/sd-orm-common";
```

| Type                                   | Description                                                 |
| -------------------------------------- | ----------------------------------------------------------- | ---------------- |
| `TEntity<T>`                           | Maps each property to `QueryUnit<T[K]>` or nested `TEntity` |
| `TSelectEntity<T>`                     | Like `TEntity` but for select projections                   |
| `TEntityUnwrap<T>`                     | Unwraps `QueryUnit<A>` back to `A`                          |
| `TIncludeEntity<T>`                    | Non-optional version of `TEntity` for `include()` lambdas   |
| `TInsertObject<T>`                     | Only non-undefined scalar properties (required for insert)  |
| `TUpdateObject<T>`                     | All scalar properties optional (for update)                 |
| `TEntityValue<T>`                      | `T                                                          | QueryUnit<T>`    |
| `TEntityValueOrQueryable<D, T>`        | `TEntityValue<T>                                            | Queryable<D, T>` |
| `TEntityValueOrQueryableOrArray<D, T>` | Recursive union with arrays                                 |
| `IQueryableDef`                        | Internal query state object                                 |
| `TQueryValuePropertyNames<T>`          | Keys of `T` whose values are non-undefined query values     |
| `TUndefinedPropertyNames<T>`           | Keys of `T` whose values may be `undefined`                 |
| `TOnlyQueryValueProperty<T>`           | Picks only query-value-compatible properties from `T`       |

### IDbConn

Low-level connection interface implemented by driver packages (`sd-orm-node`). You normally never implement this directly.

```typescript
import {
  IDbConn,
  TDbConnConf,
  IDefaultDbConnConf,
  ISqliteDbConnConf,
  ISOLATION_LEVEL,
} from "@simplysm/sd-orm-common";
```

```typescript
interface IDbConn extends EventEmitter {
  config: TDbConnConf;
  isConnected: boolean;
  isOnTransaction: boolean;
  on(event: "close", listener: () => void): this;
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

Connection config:

```typescript
// MySQL / MSSQL:
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

// SQLite:
interface ISqliteDbConnConf {
  dialect: "sqlite";
  filePath: string;
}

type ISOLATION_LEVEL = "READ_UNCOMMITTED" | "READ_COMMITTED" | "REPEATABLE_READ" | "SERIALIZABLE";
```

### IDbContextExecutor

Bridge interface between `DbContext` and the transport layer. Implemented by `sd-orm-node` and `sd-service-client`.

```typescript
import { IDbContextExecutor, IQueryResultParseOption } from "@simplysm/sd-orm-common";
```

```typescript
interface IDbContextExecutor {
  getInfoAsync(): Promise<{ dialect; database?; schema? }>;
  connectAsync(): Promise<void>;
  beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void>;
  commitTransactionAsync(): Promise<void>;
  rollbackTransactionAsync(): Promise<void>;
  executeDefsAsync(
    defs: TQueryDef[],
    options?: (IQueryResultParseOption | undefined)[],
  ): Promise<any[][]>;
  executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]>;
  bulkInsertAsync(tableName, columnDefs, records): Promise<void>;
  bulkUpsertAsync(tableName, columnDefs, records): Promise<void>;
  closeAsync(): Promise<void>;
}

interface IQueryResultParseOption {
  columns?: Record<string, { dataType: string | undefined }>;
  joins?: Record<string, { isSingle: boolean }>;
}
```

### Query Definition Types

All types used to describe a single SQL operation. Passed to `executeDefsAsync`.

```typescript
import {
  TQueryDef,
  TQueryBuilderValue,
  TDbDateSeparator,
  IQueryTableNameDef,
  IQueryColumnDef,
  IQueryPrimaryKeyDef,
  ISelectQueryDef,
  IJoinQueryDef,
  IInsertQueryDef,
  IInsertIntoQueryDef,
  IUpdateQueryDef,
  IDeleteQueryDef,
  IInsertIfNotExistsQueryDef,
  IUpsertQueryDef,
  ITruncateTableQueryDef,
  ICreateTableQueryDef,
  ICreateViewQueryDef,
  ICreateProcedureQueryDef,
  IExecuteProcedureQueryDef,
  ICreateDatabaseIfNotExistsQueryDef,
  IClearDatabaseIfExistsQueryDef,
  IGetDatabaseInfoDef,
  IGetTableInfosDef,
  IGetTableInfoDef,
  IGetTableColumnInfosDef,
  IGetTablePrimaryKeysDef,
  IGetTableForeignKeysDef,
  IGetTableIndexesDef,
  IDropTableQueryDef,
  IAddColumnQueryDef,
  IRemoveColumnQueryDef,
  IModifyColumnQueryDef,
  IRenameColumnQueryDef,
  IDropPrimaryKeyQueryDef,
  IAddPrimaryKeyQueryDef,
  IAddForeignKeyQueryDef,
  IRemoveForeignKeyQueryDef,
  ICreateIndexQueryDef,
  IDropIndexQueryDef,
  IConfigIdentityInsertQueryDef,
  IConfigForeignKeyCheckQueryDef,
} from "@simplysm/sd-orm-common";
```

`TQueryDef` is the union of all operation interfaces tagged with a `type` discriminant, e.g.:

```typescript
{ type: "select", from: "...", where: [...], select: { ... } }
{ type: "insert", from: "...", record: { ... }, output: ["id"] }
{ type: "createTable", table: { database, schema, name }, columns: [...], primaryKeys: [...] }
// ... 30+ variants total
```

`TQueryBuilderValue` is the recursive value type used in query defs:

```typescript
type TQueryBuilderValue = string | ISelectQueryDef | TQueryBuilderValue[];
```

---

## Usage Example

```typescript
import {
  DbContext,
  Table,
  Column,
  ForeignKey,
  ForeignKeyTarget,
  Index,
  Queryable,
} from "@simplysm/sd-orm-common";

@Table({ description: "Category" })
class Category {
  @Column({ primaryKey: 1, description: "ID", autoIncrement: true })
  id!: number;

  @Column({ description: "Name" })
  name!: string;
}

@Table({ description: "Product" })
class Product {
  @Column({ primaryKey: 1, description: "ID", autoIncrement: true })
  id!: number;

  @Column({ description: "Name" })
  name!: string;

  @Column({ description: "Category ID" })
  categoryId!: number;

  @Column({ description: "Price", dataType: { type: "DECIMAL", precision: 18, digits: 2 } })
  price!: number;

  @Index({ name: "IDX_product_categoryId" })
  @ForeignKey(["categoryId"], () => Category, "Category")
  category?: Category;

  @ForeignKeyTarget(() => Category, "category", "Products")
  categories?: Product[];
}

class AppDb extends DbContext {
  get migrations() {
    return [];
  }
  category = new Queryable(this, Category);
  product = new Queryable(this, Product);
}

// Usage (executor injected by sd-orm-node or sd-service-client):
await db.connectAsync(async () => {
  const products = await db.product
    .include((en) => en.category)
    .where((en) => [db.qh.greaterThenOrEqual(en.price, 1000)])
    .orderBy((en) => en.name)
    .resultAsync();

  await db.product.insertAsync([{ name: "Widget", categoryId: 1, price: 9.99 }]);
});
```
