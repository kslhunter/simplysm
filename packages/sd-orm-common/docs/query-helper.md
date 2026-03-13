# QueryHelper

Provides SQL expression helper methods for building WHERE clauses, computed fields, aggregations, and type conversions. Dialect-aware (MSSQL, MySQL, SQLite).

**Source:** `src/query/query-builder/QueryHelper.ts`

## Class: QueryHelper

```typescript
constructor(dialect: TDbContextOption["dialect"])
```

Accessible via `db.qh` on any `DbContext` instance.

## Comparison Operators

| Method | Signature | Description |
|---|---|---|
| `equal` | `(source, target) => TQueryBuilderValue` | Null-safe equality (`=` / `IS NULL`) |
| `notEqual` | `(source, target) => TQueryBuilderValue[]` | Null-safe inequality |
| `isNull` | `(source) => TQueryBuilderValue[]` | `IS NULL` check |
| `isNotNull` | `(source) => TQueryBuilderValue[]` | `IS NOT NULL` check |
| `isTrue` | `(source) => TQueryBuilderValue[]` | `IS NOT NULL AND = true` |
| `isFalse` | `(source) => TQueryBuilderValue[]` | `IS NULL OR = false` |
| `lessThen` | `(source, target) => TQueryBuilderValue[]` | `<` comparison |
| `lessThenOrEqual` | `(source, target) => TQueryBuilderValue[]` | `<=` comparison |
| `greaterThen` | `(source, target) => TQueryBuilderValue[]` | `>` comparison |
| `greaterThenOrEqual` | `(source, target) => TQueryBuilderValue[]` | `>=` comparison |
| `between` | `(source, from, to) => TQueryBuilderValue[]` | Range check (`>=` and `<=`) |

**Example:**

```typescript
db.employee.where((e) => [
  db.qh.equal(e.departmentId, 1),
  db.qh.greaterThen(e.age, 25),
  db.qh.between(e.hireDate, new DateOnly(2020, 1, 1), new DateOnly(2023, 12, 31)),
])
```

## String Matching

| Method | Signature | Description |
|---|---|---|
| `includes` | `(source, target) => TQueryBuilderValue[]` | `LIKE '%target%'` |
| `notIncludes` | `(source, target) => TQueryBuilderValue[]` | `NOT LIKE '%target%'` |
| `like` | `(source, target) => TQueryBuilderValue[]` | `LIKE target` |
| `notLike` | `(source, target) => TQueryBuilderValue[]` | `NOT LIKE target` |
| `regexp` | `(source, target) => TQueryBuilderValue[]` | `REGEXP target` |
| `notRegexp` | `(source, target) => TQueryBuilderValue[]` | `NOT REGEXP target` |
| `startsWith` | `(source, target) => TQueryBuilderValue[]` | `LIKE 'target%'` |
| `notStartsWith` | `(source, target) => TQueryBuilderValue[]` | `NOT LIKE 'target%'` |
| `endsWith` | `(source, target) => TQueryBuilderValue[]` | `LIKE '%target'` |
| `notEndsWith` | `(source, target) => TQueryBuilderValue[]` | `NOT LIKE '%target'` |

## Set Operators

| Method | Signature | Description |
|---|---|---|
| `in` | `(src, target[]) => TQueryBuilderValue[]` | `IN (...)` with null handling |
| `notIn` | `(src, target[]) => TQueryBuilderValue[]` | `NOT IN (...)` with null handling |

## Logical Operators

| Method | Signature | Description |
|---|---|---|
| `and` | `(args[]) => TQueryBuilderValue[]` | Combines expressions with `AND` |
| `or` | `(args[]) => TQueryBuilderValue[]` | Combines expressions with `OR` |

**Example:**

```typescript
db.employee.where((e) => [
  db.qh.or([
    db.qh.equal(e.role, "admin"),
    db.qh.and([db.qh.equal(e.role, "user"), db.qh.greaterThen(e.level, 5)]),
  ]),
])
```

## Field Expressions

### Raw Query

```typescript
query<T extends TQueryValue>(type: Type<WrappedType<T>>, texts: (string | QueryUnit<any>)[]): QueryUnit<T>
```

Build a raw SQL expression with a typed result.

### Value Wrapping

```typescript
val<T extends TQueryValue>(value: TEntityValue<T>, type?: Type<WrappedType<NonNullable<T>>>): QueryUnit<T>
```

Wrap a literal value as a `QueryUnit`.

### Conditional

```typescript
is(where: TQueryBuilderValue): QueryUnit<boolean>
```

Returns `true` if the condition matches, `false` otherwise (CASE WHEN wrapper).

### Date Functions

| Method | Signature | Description |
|---|---|---|
| `dateDiff` | `(separator, from, to) => QueryUnit<number>` | Difference between two dates (DATEDIFF/TIMESTAMPDIFF) |
| `dateAdd` | `(separator, from, value) => QueryUnit<T>` | Add interval to a date (DATEADD/DATE_ADD) |
| `dateToString` | `(value, code) => QueryUnit<string>` | Format date to string by MSSQL-style code |
| `year` | `(value) => QueryUnit<number>` | Extract year |
| `month` | `(value) => QueryUnit<number>` | Extract month |
| `day` | `(value) => QueryUnit<number>` | Extract day |
| `isoWeek` | `(value) => QueryUnit<number>` | ISO weekday number |
| `isoWeekStartDate` | `(value) => QueryUnit<T>` | Start date of the ISO week |
| `isoYearMonth` | `(value) => QueryUnit<T>` | First day of the ISO year-month |

`TDbDateSeparator`: `"year"` | `"quarter"` | `"month"` | `"day"` | `"week"` | `"hour"` | `"minute"` | `"second"` | `"millisecond"` | `"microsecond"` | `"nanosecond"`

### Null Handling

```typescript
ifNull<S, T>(source: TEntityValue<S>, ...targets: TEntityValue<T>[]): QueryUnit<S extends undefined ? T : S>
```

Returns the first non-null value (ISNULL/IFNULL). Supports chaining multiple fallbacks.

### CASE Expressions

```typescript
case<T>(predicate, then): CaseQueryHelper<T>
```

Starts a CASE WHEN expression. Chain with `.case(predicate, then)` and end with `.else(value)`.

```typescript
caseWhen<T>(arg: TEntityValue<TQueryValue>): CaseWhenQueryHelper<T>
```

Starts a CASE expression with equality matching. Chain with `.when(value, then)` and end with `.else(value)`.

**Example:**

```typescript
// CASE WHEN ... THEN ... ELSE ... END
db.qh.case<string>(db.qh.equal(e.type, "A"), "Alpha")
  .case(db.qh.equal(e.type, "B"), "Beta")
  .else("Other")

// CASE e.type WHEN 'A' THEN ... WHEN 'B' THEN ... ELSE ... END
db.qh.caseWhen<string>(e.type)
  .when("A", "Alpha")
  .when("B", "Beta")
  .else("Other")
```

### Math Functions

| Method | Signature | Description |
|---|---|---|
| `greatest` | `(...args) => QueryUnit<T>` | GREATEST of values |
| `abs` | `(src) => QueryUnit<number>` | Absolute value |
| `round` | `(arg, len) => QueryUnit<number>` | Round to N decimal places |
| `ceil` | `(arg) => QueryUnit<number>` | Ceiling |
| `floor` | `(arg) => QueryUnit<number>` | Floor |

### String Functions

| Method | Signature | Description |
|---|---|---|
| `concat` | `(...args) => QueryUnit<string>` | Concatenate strings (null-safe) |
| `left` | `(src, num) => QueryUnit<string>` | Left substring |
| `right` | `(src, num) => QueryUnit<string>` | Right substring |
| `padStart` | `(src, length, fillString) => QueryUnit<string>` | Left-pad a string |
| `trim` | `(src) => QueryUnit<string>` | Trim whitespace (LTRIM + RTRIM) |
| `replace` | `(src, from, to) => QueryUnit<string>` | Replace substring |
| `toUpperCase` | `(src) => QueryUnit<string>` | Convert to uppercase |
| `toLowerCase` | `(src) => QueryUnit<string>` | Convert to lowercase |
| `stringLength` | `(arg) => QueryUnit<number>` | Character length (LEN/CHAR_LENGTH) |
| `dataLength` | `(arg) => QueryUnit<number>` | Byte length (DATALENGTH/LENGTH) |

### Type Conversion

```typescript
cast<T extends TQueryValue>(src: TEntityValue<TQueryValue>, targetType: Type<WrappedType<T>>): QueryUnit<T>
```

Casts a value to another SQL type (CONVERT).

### Window Functions

```typescript
rowIndex(
  orderBy: [TEntityValue<TQueryValue>, "asc" | "desc"][],
  groupBy?: TEntityValue<TQueryValue>[],
): QueryUnit<number>
```

`ROW_NUMBER() OVER(PARTITION BY ... ORDER BY ...)`.

## Aggregate Functions

| Method | Signature | Description |
|---|---|---|
| `count` | `(arg?) => QueryUnit<number>` | COUNT(*) or COUNT(DISTINCT arg) |
| `sum` | `(arg) => QueryUnit<number \| undefined>` | SUM |
| `avg` | `(arg) => QueryUnit<number \| undefined>` | AVG |
| `max` | `(unit) => QueryUnit<T>` | MAX |
| `min` | `(unit) => QueryUnit<T>` | MIN |
| `exists` | `(arg) => QueryUnit<boolean>` | True if COUNT(DISTINCT arg) > 0 |
| `notExists` | `(arg) => QueryUnit<boolean>` | True if COUNT(DISTINCT arg) = 0 |

## Type Mapping

```typescript
type(type: Type<TQueryValue> | TSdOrmDataType | string | undefined): string
```

Converts a TypeScript type or `TSdOrmDataType` to the corresponding SQL type string for the current dialect.

| TypeScript Type | MSSQL | MySQL | SQLite |
|---|---|---|---|
| `String` | `NVARCHAR(255)` | `VARCHAR(255)` | `VARCHAR(255)` |
| `Number` | `BIGINT` | `BIGINT` | `INTEGER` |
| `Boolean` | `BIT` | `BOOLEAN` | `BIT` |
| `DateTime` | `DATETIME2` | `DATETIME` | `DATETIME2` |
| `DateOnly` | `DATE` | `DATE` | `DATE` |
| `Time` | `TIME` | `TIME` | `TIME` |
| `Uuid` | `UNIQUEIDENTIFIER` | `CHAR(38)` | `UNIQUEIDENTIFIER` |
| `Buffer` | `VARBINARY(MAX)` | `LONGBLOB` | `VARBINARY(MAX)` |
