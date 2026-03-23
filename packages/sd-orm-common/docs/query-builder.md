# Query Builder

SQL query construction layer: `QueryBuilder` converts definition objects to SQL strings, `QueryHelper` provides expression helpers, and `CaseQueryHelper`/`CaseWhenQueryHelper` build CASE expressions.

## Class: QueryBuilder

**Source:** `src/query/query-builder/QueryBuilder.ts`

Low-level SQL string generator that converts `TQueryDef` objects into executable SQL strings. Dialect-aware (MSSQL, MSSQL-Azure, MySQL, SQLite).

Accessible via `db.qb` on any `DbContext` instance.

### Constructor

```typescript
constructor(dialect: TDbContextOption["dialect"])
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `qh` | `QueryHelper` | Internal QueryHelper instance for the same dialect |

### Database Operations

| Method | Signature | Description |
|--------|-----------|-------------|
| `createDatabaseIfNotExists` | `(def: ICreateDatabaseIfNotExistsQueryDef) => string` | `CREATE DATABASE IF NOT EXISTS` |
| `clearDatabaseIfExists` | `(def: IClearDatabaseIfExistsQueryDef) => string` | Drop all tables, views, procedures, and constraints in a database |
| `getDatabaseInfo` | `(def: IGetDatabaseInfoDef) => string` | Query for database existence |

### Table Introspection

| Method | Signature | Description |
|--------|-----------|-------------|
| `getTableInfos` | `(def?: IGetTableInfosDef) => string` | List all tables (optionally filtered by schema) |
| `getTableInfo` | `(def: IGetTableInfoDef) => string` | Check if a specific table exists |
| `getTableColumnInfos` | `(def: IGetTableColumnInfosDef) => string` | Get column metadata for a table |
| `getTablePrimaryKeys` | `(def: IGetTablePrimaryKeysDef) => string` | Get primary key columns |
| `getTableForeignKeys` | `(def: IGetTableForeignKeysDef) => string` | Get foreign key definitions |
| `getTableIndexes` | `(def: IGetTableIndexesDef) => string` | Get index definitions |

### Schema DDL

| Method | Signature | Description |
|--------|-----------|-------------|
| `createTable` | `(def: ICreateTableQueryDef) => string` | `CREATE TABLE` with columns and primary keys |
| `createView` | `(def: ICreateViewQueryDef) => string` | `CREATE VIEW` from a SELECT definition |
| `createProcedure` | `(def: ICreateProcedureQueryDef) => string` | `CREATE PROCEDURE` |
| `executeProcedure` | `(def: IExecuteProcedureQueryDef) => string` | `EXEC procedure` |
| `dropTable` | `(def: IDropTableQueryDef) => string` | `DROP TABLE` |
| `addColumn` | `(def: IAddColumnQueryDef) => string[]` | `ALTER TABLE ADD column` (may return multiple statements for non-nullable with default) |
| `removeColumn` | `(def: IRemoveColumnQueryDef) => string` | `ALTER TABLE DROP COLUMN` |
| `modifyColumn` | `(def: IModifyColumnQueryDef) => string[]` | `ALTER TABLE ALTER/MODIFY COLUMN` (may return multiple statements) |
| `renameColumn` | `(def: IRenameColumnQueryDef) => string` | Rename a column (`sp_rename` for MSSQL, `ALTER TABLE RENAME COLUMN` for MySQL) |
| `dropPrimaryKey` | `(def: IDropPrimaryKeyQueryDef) => string` | Drop primary key constraint |
| `addPrimaryKey` | `(def: IAddPrimaryKeyQueryDef) => string` | Add primary key constraint |
| `addForeignKey` | `(def: IAddForeignKeyQueryDef) => string` | `ALTER TABLE ADD CONSTRAINT FOREIGN KEY` |
| `removeForeignKey` | `(def: IRemoveForeignKeyQueryDef) => string` | Drop foreign key constraint |
| `createIndex` | `(def: ICreateIndexQueryDef) => string` | `CREATE INDEX` (or `CREATE UNIQUE INDEX`) |
| `dropIndex` | `(def: IDropIndexQueryDef) => string` | `DROP INDEX` |

### DML Operations

| Method | Signature | Description |
|--------|-----------|-------------|
| `select` | `(def: ISelectQueryDef) => string` | Full SELECT query (joins, where, order, group, pivot, limit, etc.) |
| `insert` | `(def: IInsertQueryDef) => string` | `INSERT INTO ... VALUES` with optional OUTPUT |
| `insertInto` | `(def: IInsertIntoQueryDef) => string` | `INSERT INTO ... SELECT` |
| `update` | `(def: IUpdateQueryDef) => string` | `UPDATE ... SET ... WHERE` with optional join |
| `delete` | `(def: IDeleteQueryDef) => string` | `DELETE FROM ... WHERE` |
| `insertIfNotExists` | `(def: IInsertIfNotExistsQueryDef) => string` | Conditional insert (only if no matching row exists) |
| `upsert` | `(def: IUpsertQueryDef) => string` | MERGE (MSSQL) / INSERT ON DUPLICATE KEY UPDATE (MySQL) |
| `truncateTable` | `(def: ITruncateTableQueryDef) => string` | `TRUNCATE TABLE` (or `DELETE FROM` for SQLite) |

### Configuration

| Method | Signature | Description |
|--------|-----------|-------------|
| `configIdentityInsert` | `(def: IConfigIdentityInsertQueryDef) => string` | `SET IDENTITY_INSERT ON/OFF` (MSSQL only) |
| `configForeignKeyCheck` | `(def: IConfigForeignKeyCheckQueryDef) => string` | Enable/disable FK checks |

### Utility Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `wrap` | `(name: string) => string` | Wraps an identifier with dialect-specific quoting (`[name]` for MSSQL, `` `name` `` for MySQL/SQLite) |
| `getTableName` | `(def: IQueryTableNameDef) => string` | Returns a fully qualified table name string |
| `getTableNameWithoutDatabase` | `(def: IQueryTableNameDef) => string` | Returns table name without database prefix |
| `getTableNameChain` | `(def: IQueryTableNameDef) => string[]` | Returns table name components as an array |
| `getQueryOfQueryValue` | `(queryValue: TQueryBuilderValue) => string` | Recursively resolves a `TQueryBuilderValue` into a SQL string |
| `query` | `(def: TQueryDef) => string \| string[]` | Main dispatch: converts any `TQueryDef` into SQL string(s) based on the `type` discriminant |

---

## Class: QueryHelper

**Source:** `src/query/query-builder/QueryHelper.ts`

Provides SQL expression helper methods for building WHERE clauses, computed fields, aggregations, and type conversions. Dialect-aware.

Accessible via `db.qh` on any `DbContext` instance.

### Constructor

```typescript
constructor(dialect: TDbContextOption["dialect"])
```

### Comparison Operators

| Method | Signature | Description |
|--------|-----------|-------------|
| `equal` | `<T>(source: TEntityValue<T>, target: TEntityValue<T \| undefined>) => TQueryBuilderValue` | Null-safe equality (`=` or `IS NULL`; uses `<=>` on MySQL) |
| `notEqual` | `<T>(source: TEntityValue<T>, target: TEntityValue<T \| undefined>) => TQueryBuilderValue[]` | Null-safe inequality |
| `isNull` | `<T>(source: TEntityValue<T>) => TQueryBuilderValue[]` | `IS NULL` check |
| `isNotNull` | `<T>(source: TEntityValue<T>) => TQueryBuilderValue[]` | `IS NOT NULL` check |
| `isTrue` | `<T>(source: TEntityValue<T>) => TQueryBuilderValue[]` | `IS NOT NULL AND = true` |
| `isFalse` | `<T>(source: TEntityValue<T>) => TQueryBuilderValue[]` | `IS NULL OR = false` |
| `lessThen` | `<T>(source, target) => TQueryBuilderValue[]` | `<` comparison (strings, numbers, dates) |
| `lessThenOrEqual` | `<T>(source, target) => TQueryBuilderValue[]` | `<=` comparison |
| `greaterThen` | `<T>(source, target) => TQueryBuilderValue[]` | `>` comparison |
| `greaterThenOrEqual` | `<T>(source, target) => TQueryBuilderValue[]` | `>=` comparison |
| `between` | `<T>(source, from, to) => TQueryBuilderValue[]` | Range check (`>= from AND <= to`); skips null bounds |

### String Matching

| Method | Signature | Description |
|--------|-----------|-------------|
| `includes` | `(source, target) => TQueryBuilderValue[]` | `LIKE '%target%'` |
| `notIncludes` | `(source, target) => TQueryBuilderValue[]` | `NOT LIKE '%target%'` (null-safe) |
| `like` | `(source, target) => TQueryBuilderValue[]` | `LIKE target` |
| `notLike` | `(source, target) => TQueryBuilderValue[]` | `NOT LIKE target` (null-safe) |
| `regexp` | `(source, target) => TQueryBuilderValue[]` | `REGEXP target` |
| `notRegexp` | `(source, target) => TQueryBuilderValue[]` | `NOT REGEXP target` (null-safe) |
| `startsWith` | `(source, target) => TQueryBuilderValue[]` | `LIKE 'target%'` |
| `notStartsWith` | `(source, target) => TQueryBuilderValue[]` | `NOT LIKE 'target%'` |
| `endsWith` | `(source, target) => TQueryBuilderValue[]` | `LIKE '%target'` |
| `notEndsWith` | `(source, target) => TQueryBuilderValue[]` | `NOT LIKE '%target'` |

### Set Operators

| Method | Signature | Description |
|--------|-----------|-------------|
| `in` | `<P>(src: TEntityValue<P>, target: TEntityValue<P \| undefined>[]) => TQueryBuilderValue[]` | `IN (...)` with null handling |
| `notIn` | `<P>(src: TEntityValue<P>, target: TEntityValue<P \| undefined>[]) => TQueryBuilderValue[]` | `NOT IN (...)` with null handling |

### Logical Operators

| Method | Signature | Description |
|--------|-----------|-------------|
| `and` | `(args: TEntityValueOrQueryableOrArray<any, any>[]) => TQueryBuilderValue[]` | Combines expressions with `AND` |
| `or` | `(args: TEntityValueOrQueryableOrArray<any, any>[]) => TQueryBuilderValue[]` | Combines expressions with `OR` |

### Field Expressions

| Method | Signature | Description |
|--------|-----------|-------------|
| `query` | `<T>(type: Type<WrappedType<T>>, texts: (string \| QueryUnit<any>)[]) => QueryUnit<T>` | Build a raw SQL expression with a typed result |
| `val` | `<T>(value: TEntityValue<T>, type?) => QueryUnit<T>` | Wrap a literal value as a `QueryUnit` |
| `is` | `(where: TQueryBuilderValue) => QueryUnit<boolean>` | Returns `true`/`false` based on a condition (CASE WHEN wrapper) |

### Date Functions

| Method | Signature | Description |
|--------|-----------|-------------|
| `dateDiff` | `<T>(separator: TDbDateSeparator, from: TEntityValue<T \| 0>, to: TEntityValue<T \| 0>) => QueryUnit<number>` | Difference between two dates (DATEDIFF / TIMESTAMPDIFF) |
| `dateAdd` | `<T>(separator: TDbDateSeparator, from: TEntityValue<T>, value: TEntityValue<number>) => QueryUnit<T>` | Add interval to a date (DATEADD / DATE_ADD) |
| `dateToString` | `<T>(value: TEntityValue<T \| 0>, code: number) => QueryUnit<string>` | Format date to string by MSSQL-style code (supports 112, 120, 114) |
| `year` | `<T>(value: TEntityValue<T>) => QueryUnit<number>` | Extract year from DateTime/DateOnly |
| `month` | `<T>(value: TEntityValue<T>) => QueryUnit<number>` | Extract month from DateTime/DateOnly |
| `day` | `<T>(value: TEntityValue<T>) => QueryUnit<number>` | Extract day from DateTime/DateOnly |
| `isoWeek` | `<T>(value: TEntityValue<T>) => QueryUnit<number>` | ISO weekday number (1=Monday) |
| `isoWeekStartDate` | `<T>(value: TEntityValue<T>) => QueryUnit<T>` | Start date of the ISO week |
| `isoYearMonth` | `<T>(value: TEntityValue<T>) => QueryUnit<T>` | First day of the ISO year-month |

### Null Handling

| Method | Signature | Description |
|--------|-----------|-------------|
| `ifNull` | `<S, T>(source: TEntityValue<S>, ...targets: TEntityValue<T>[]) => QueryUnit<S extends undefined ? T : S>` | First non-null value (ISNULL / IFNULL). Supports chaining multiple fallbacks |

### CASE Expressions

| Method | Signature | Description |
|--------|-----------|-------------|
| `case` | `<T>(predicate, then) => CaseQueryHelper<T>` | Start a CASE WHEN expression. Chain `.case()` then `.else()` |
| `caseWhen` | `<T>(arg: TEntityValue<TQueryValue>) => CaseWhenQueryHelper<T>` | Start a CASE expression with equality matching. Chain `.when()` then `.else()` |

### Math Functions

| Method | Signature | Description |
|--------|-----------|-------------|
| `greatest` | `<T>(...args: TEntityValue<T>[]) => QueryUnit<T>` | GREATEST of values |
| `greater` | `<T>(source, target) => QueryUnit<T>` | **(deprecated)** Greater of two values (for MSSQL < 2022 without GREATEST) |
| `abs` | `(src: TEntityValue<number \| Number \| undefined>) => QueryUnit<number>` | Absolute value |
| `round` | `<T>(arg, len: number) => QueryUnit<number>` | Round to N decimal places |
| `ceil` | `<T>(arg) => QueryUnit<number>` | Ceiling |
| `floor` | `<T>(arg) => QueryUnit<number>` | Floor |

### String Functions

| Method | Signature | Description |
|--------|-----------|-------------|
| `concat` | `(...args) => QueryUnit<string>` | Concatenate strings (null-safe via IFNULL/ISNULL) |
| `left` | `(src, num) => QueryUnit<string>` | Left substring |
| `right` | `(src, num) => QueryUnit<string>` | Right substring |
| `padStart` | `(src, length: number, fillString: string) => QueryUnit<string>` | Left-pad a string |
| `trim` | `(src) => QueryUnit<string>` | Trim whitespace (LTRIM + RTRIM) |
| `replace` | `(src, from, to) => QueryUnit<string>` | Replace substring |
| `toUpperCase` | `(src) => QueryUnit<string>` | UPPER |
| `toLowerCase` | `(src) => QueryUnit<string>` | LOWER |
| `stringLength` | `(arg) => QueryUnit<number>` | Character length (LEN / CHAR_LENGTH) |
| `dataLength` | `<T>(arg) => QueryUnit<number>` | Byte length (DATALENGTH / LENGTH) |

### Type Conversion

| Method | Signature | Description |
|--------|-----------|-------------|
| `cast` | `<T>(src: TEntityValue<TQueryValue>, targetType: Type<WrappedType<T>>) => QueryUnit<T>` | Cast to another SQL type (CONVERT) |
| `type` | `(type: Type<TQueryValue> \| TSdOrmDataType \| string \| undefined) => string` | Convert a TypeScript type or `TSdOrmDataType` to dialect-specific SQL type string |
| `mysqlConvertType` | `(type: Type<TQueryValue>) => string` | MySQL-specific CONVERT target type |

#### Type Mapping Reference

| TypeScript Type | MSSQL | MySQL | SQLite |
|-----------------|-------|-------|--------|
| `String` | `NVARCHAR(255)` | `VARCHAR(255)` | `VARCHAR(255)` |
| `Number` | `BIGINT` | `BIGINT` | `INTEGER` |
| `Boolean` | `BIT` | `BOOLEAN` | `BIT` |
| `DateTime` | `DATETIME2` | `DATETIME` | `DATETIME2` |
| `DateOnly` | `DATE` | `DATE` | `DATE` |
| `Time` | `TIME` | `TIME` | `TIME` |
| `Uuid` | `UNIQUEIDENTIFIER` | `CHAR(38)` | `UNIQUEIDENTIFIER` |
| `Buffer` | `VARBINARY(MAX)` | `LONGBLOB` | `VARBINARY(MAX)` |

### Window Functions

| Method | Signature | Description |
|--------|-----------|-------------|
| `rowIndex` | `(orderBy: [TEntityValue<TQueryValue>, "asc" \| "desc"][], groupBy?: TEntityValue<TQueryValue>[]) => QueryUnit<number>` | `ROW_NUMBER() OVER(PARTITION BY ... ORDER BY ...)` |

### Aggregate Functions

| Method | Signature | Description |
|--------|-----------|-------------|
| `count` | `<T>(arg?: TEntityValue<T>) => QueryUnit<number>` | `COUNT(*)` or `COUNT(DISTINCT arg)` |
| `sum` | `<T>(arg: TEntityValue<T>) => QueryUnit<number \| undefined>` | SUM |
| `avg` | `<T>(arg: TEntityValue<T \| undefined>) => QueryUnit<number \| undefined>` | AVG |
| `max` | `<T>(unit: TEntityValue<T>) => QueryUnit<T>` | MAX (handles Boolean via CAST) |
| `min` | `<T>(unit: TEntityValue<T>) => QueryUnit<T>` | MIN (handles Boolean via CAST) |
| `exists` | `<T>(arg: TEntityValue<T>) => QueryUnit<boolean>` | True if `COUNT(DISTINCT arg) > 0` |
| `notExists` | `<T>(arg: TEntityValue<T>) => QueryUnit<boolean>` | True if `COUNT(DISTINCT arg) <= 0` |

### Value Resolution

| Method | Signature | Description |
|--------|-----------|-------------|
| `getQueryValue` | `(value: TEntityValue<any>) => string` | Resolve a value to its SQL string representation |
| `getQueryValue` | `(value: Queryable<any, any>) => ISelectQueryDef` | Resolve a Queryable to its SELECT definition |
| `getBulkInsertQueryValue` | `(value: TEntityValue<any>) => any` | Resolve a value for bulk insert (returns raw values, not SQL strings) |

---

## Class: CaseQueryHelper\<T extends TQueryValue\>

**Source:** `src/query/case/CaseQueryHelper.ts`

Builds `CASE WHEN predicate THEN value ... ELSE value END` expressions. Created via `db.qh.case()`.

### Constructor

```typescript
constructor(qh: QueryHelper, type: Type<T> | undefined)
```

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `case` | `(predicate: TEntityValue<boolean \| Boolean> \| TQueryBuilderValue, then: TEntityValue<T>) => this` | Add a WHEN clause with a predicate |
| `else` | `(then: TEntityValue<T>) => QueryUnit<T>` | End with ELSE and return the final `QueryUnit` |

**Example:**

```typescript
db.qh.case<string>(db.qh.equal(e.type, "A"), "Alpha")
  .case(db.qh.equal(e.type, "B"), "Beta")
  .else("Other")
```

---

## Class: CaseWhenQueryHelper\<T extends TQueryValue\>

**Source:** `src/query/case/CaseWhenQueryHelper.ts`

Builds `CASE expr WHEN value THEN result ... ELSE result END` expressions with value matching. Created via `db.qh.caseWhen()`.

### Constructor

```typescript
constructor(qh: QueryHelper, arg: TEntityValue<TQueryValue>)
```

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `when` | `(arg: TEntityValue<TQueryValue>, then: TEntityValue<T>) => CaseWhenQueryHelper<T>` | Add a WHEN value clause |
| `else` | `(then: TEntityValue<T>) => QueryUnit<T>` | End with ELSE and return the final `QueryUnit` |

**Example:**

```typescript
db.qh.caseWhen<string>(e.type)
  .when("A", "Alpha")
  .when("B", "Beta")
  .else("Other")
```
