# Expression

## `ExprUnit`

Type-safe expression wrapper. Tracks expression return type using TypeScript generics.

```typescript
class ExprUnit<TPrimitive extends ColumnPrimitive> {
  readonly $infer!: TPrimitive;
  get n(): ExprUnit<NonNullable<TPrimitive>>;
  constructor(readonly dataType: ColumnPrimitiveStr, readonly expr: Expr);
}
```

| Property | Type | Description |
|----------|------|-------------|
| `$infer` | `TPrimitive` | Type inference marker (not used at runtime) |
| `n` | `ExprUnit<NonNullable<TPrimitive>>` | Non-nullable version of this expression |
| `dataType` | `ColumnPrimitiveStr` | Column data type name |
| `expr` | `Expr` | Internal expression AST |

## `WhereExprUnit`

Expression wrapper for WHERE clause conditions.

```typescript
class WhereExprUnit {
  constructor(readonly expr: WhereExpr);
}
```

## `ExprInput`

Input type that accepts `ExprUnit` or literal values.

```typescript
type ExprInput<TPrimitive extends ColumnPrimitive> = ExprUnit<TPrimitive> | TPrimitive;
```

## `SwitchExprBuilder`

CASE/WHEN expression builder interface.

```typescript
interface SwitchExprBuilder<TPrimitive extends ColumnPrimitive> {
  case(condition: WhereExprUnit, then: ExprInput<TPrimitive>): SwitchExprBuilder<TPrimitive>;
  default(value: ExprInput<TPrimitive>): ExprUnit<TPrimitive>;
}
```

## `expr`

Dialect-independent SQL expression builder. Generates JSON AST (`Expr`) instead of SQL strings, which `QueryBuilder` converts to each DBMS (MySQL, MSSQL, PostgreSQL).

```typescript
const expr: {
  // Value creation
  val<TStr extends ColumnPrimitiveStr>(dataType: TStr, value): ExprUnit<...>;
  col<TStr extends ColumnPrimitiveStr>(dataType: ColumnPrimitiveStr, ...path: string[]): ExprUnit<...>;
  raw<T extends ColumnPrimitiveStr>(dataType: T): (strings: TemplateStringsArray, ...values: ExprInput<ColumnPrimitive>[]) => ExprUnit<...>;

  // Comparison (WHERE)
  eq<T extends ColumnPrimitive>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit;
  gt<T extends ColumnPrimitive>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit;
  lt<T extends ColumnPrimitive>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit;
  gte<T extends ColumnPrimitive>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit;
  lte<T extends ColumnPrimitive>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit;
  between<T extends ColumnPrimitive>(source: ExprUnit<T>, from?: ExprInput<T>, to?: ExprInput<T>): WhereExprUnit;
  isNull(arg: ExprUnit<ColumnPrimitive>): WhereExprUnit;
  like(source: ExprUnit<string | undefined>, pattern: ExprInput<string>): WhereExprUnit;
  regexp(source: ExprUnit<string | undefined>, pattern: ExprInput<string>): WhereExprUnit;
  in<T extends ColumnPrimitive>(source: ExprUnit<T>, values: ExprInput<T>[]): WhereExprUnit;
  inQuery<T extends ColumnPrimitive>(source: ExprUnit<T>, query: Queryable<any, any>): WhereExprUnit;
  exists(query: Queryable<any, any>): WhereExprUnit;

  // Logical
  not(condition: WhereExprUnit): WhereExprUnit;
  and(...conditions: WhereExprUnit[]): WhereExprUnit;
  or(...conditions: WhereExprUnit[]): WhereExprUnit;

  // String
  concat(...args: ExprInput<string | undefined>[]): ExprUnit<string>;
  left(source: ExprInput<string | undefined>, length: ExprInput<number>): ExprUnit<string>;
  right(source: ExprInput<string | undefined>, length: ExprInput<number>): ExprUnit<string>;
  trim(arg: ExprInput<string | undefined>): ExprUnit<string>;
  padStart(source: ExprInput<string | undefined>, length: ExprInput<number>, fillString: ExprInput<string>): ExprUnit<string>;
  replace(source: ExprInput<string | undefined>, from: ExprInput<string>, to: ExprInput<string>): ExprUnit<string>;
  upper(arg: ExprInput<string | undefined>): ExprUnit<string>;
  lower(arg: ExprInput<string | undefined>): ExprUnit<string>;
  length(arg: ExprInput<string | undefined>): ExprUnit<number>;
  byteLength(arg: ExprInput<string | undefined>): ExprUnit<number>;
  substring(source: ExprInput<string | undefined>, start: ExprInput<number>, length?: ExprInput<number>): ExprUnit<string>;
  indexOf(source: ExprInput<string | undefined>, search: ExprInput<string>): ExprUnit<number>;

  // Numeric
  abs(arg: ExprInput<number | undefined>): ExprUnit<number>;
  round(arg: ExprInput<number | undefined>, digits: number): ExprUnit<number>;
  ceil(arg: ExprInput<number | undefined>): ExprUnit<number>;
  floor(arg: ExprInput<number | undefined>): ExprUnit<number>;

  // Date
  year(arg: ExprInput<DateTime | DateOnly | undefined>): ExprUnit<number>;
  month(arg: ExprInput<DateTime | DateOnly | undefined>): ExprUnit<number>;
  day(arg: ExprInput<DateTime | DateOnly | undefined>): ExprUnit<number>;
  hour(arg: ExprInput<DateTime | undefined>): ExprUnit<number>;
  minute(arg: ExprInput<DateTime | undefined>): ExprUnit<number>;
  second(arg: ExprInput<DateTime | undefined>): ExprUnit<number>;
  isoWeek(arg: ExprInput<DateTime | DateOnly | undefined>): ExprUnit<number>;
  isoWeekStartDate(arg: ExprInput<DateTime | DateOnly | undefined>): ExprUnit<DateOnly>;
  isoYearMonth(arg: ExprInput<DateTime | DateOnly | undefined>): ExprUnit<string>;
  dateDiff(unit: DateUnit, from: ExprInput<ColumnPrimitive>, to: ExprInput<ColumnPrimitive>): ExprUnit<number>;
  dateAdd(unit: DateUnit, source: ExprInput<ColumnPrimitive>, value: ExprInput<number>): ExprUnit<DateTime>;
  formatDate(source: ExprInput<ColumnPrimitive>, format: string): ExprUnit<string>;

  // Conditional
  coalesce<T extends ColumnPrimitive>(...args: ExprInput<T | undefined>[]): ExprUnit<T>;
  nullIf<T extends ColumnPrimitive>(source: ExprInput<T>, value: ExprInput<T>): ExprUnit<T | undefined>;
  is(condition: WhereExprUnit): ExprUnit<number>;
  switch<T extends ColumnPrimitive>(dataType: ColumnPrimitiveStr): SwitchExprBuilder<T>;
  if<T extends ColumnPrimitive>(condition: WhereExprUnit, then: ExprInput<T>, elseVal?: ExprInput<T>): ExprUnit<T>;

  // Aggregate
  count(arg?: ExprUnit<ColumnPrimitive>, distinct?: boolean): ExprUnit<number>;
  sum(arg: ExprUnit<number | undefined>): ExprUnit<number>;
  avg(arg: ExprUnit<number | undefined>): ExprUnit<number>;
  max<T extends ColumnPrimitive>(arg: ExprUnit<T>): ExprUnit<T>;
  min<T extends ColumnPrimitive>(arg: ExprUnit<T>): ExprUnit<T>;

  // Other
  greatest<T extends ColumnPrimitive>(...args: ExprInput<T>[]): ExprUnit<T>;
  least<T extends ColumnPrimitive>(...args: ExprInput<T>[]): ExprUnit<T>;
  rowNum(): ExprUnit<number>;
  random(): ExprUnit<number>;
  cast<TDataType extends DataType>(source: ExprInput<ColumnPrimitive>, targetType: TDataType): ExprUnit<InferColumnPrimitiveFromDataType<TDataType>>;

  // Window
  window(fn: WinFn, spec?: WinSpecInput): ExprUnit<number>;

  // Subquery
  subquery<T extends ColumnPrimitive>(query: Queryable<any, any>, selectFn: (q: ...) => ExprUnit<T>): ExprUnit<T>;
};
```

### Value Creation

| Method | Description |
|--------|-------------|
| `val()` | Wrap literal value as ExprUnit |
| `col()` | Generate column reference |
| `raw()` | Raw SQL expression (escape hatch, tagged template literal) |

### Comparison (WHERE)

| Method | SQL | Description |
|--------|-----|-------------|
| `eq()` | `=` | Equality comparison (NULL-safe) |
| `gt()` | `>` | Greater than |
| `lt()` | `<` | Less than |
| `gte()` | `>=` | Greater than or equal |
| `lte()` | `<=` | Less than or equal |
| `between()` | `BETWEEN` | Range comparison |
| `isNull()` | `IS NULL` | NULL check |
| `like()` | `LIKE` | Pattern matching |
| `regexp()` | `REGEXP` | Regular expression matching |
| `in()` | `IN` | Value list inclusion |
| `inQuery()` | `IN (SELECT)` | Subquery inclusion |
| `exists()` | `EXISTS` | Subquery existence |

### Logical

| Method | SQL | Description |
|--------|-----|-------------|
| `not()` | `NOT` | Logical negation |
| `and()` | `AND` | Logical conjunction |
| `or()` | `OR` | Logical disjunction |

### String Functions

| Method | SQL | Description |
|--------|-----|-------------|
| `concat()` | `CONCAT` | String concatenation |
| `left()` | `LEFT` | Extract left N characters |
| `right()` | `RIGHT` | Extract right N characters |
| `trim()` | `TRIM` | Remove leading/trailing whitespace |
| `padStart()` | `LPAD` | Left padding |
| `replace()` | `REPLACE` | String replacement |
| `upper()` | `UPPER` | Uppercase |
| `lower()` | `LOWER` | Lowercase |
| `length()` | `CHAR_LENGTH` | Character length |
| `byteLength()` | `LENGTH/DATALENGTH` | Byte length |
| `substring()` | `SUBSTRING` | Substring extraction |
| `indexOf()` | `LOCATE/CHARINDEX` | Find string position |

### Numeric Functions

| Method | SQL | Description |
|--------|-----|-------------|
| `abs()` | `ABS` | Absolute value |
| `round()` | `ROUND` | Rounding |
| `ceil()` | `CEIL` | Ceiling |
| `floor()` | `FLOOR` | Floor |

### Date Functions

| Method | SQL | Description |
|--------|-----|-------------|
| `year()` | `YEAR` | Extract year |
| `month()` | `MONTH` | Extract month |
| `day()` | `DAY` | Extract day |
| `hour()` | `HOUR` | Extract hour |
| `minute()` | `MINUTE` | Extract minute |
| `second()` | `SECOND` | Extract second |
| `isoWeek()` | `WEEK` | ISO week number |
| `isoWeekStartDate()` | - | ISO week start date |
| `isoYearMonth()` | - | ISO year-month (YYYYMM) |
| `dateDiff()` | `DATEDIFF` | Date difference |
| `dateAdd()` | `DATEADD` | Date arithmetic |
| `formatDate()` | `FORMAT/DATE_FORMAT` | Date formatting |

### Aggregate Functions

| Method | SQL | Description |
|--------|-----|-------------|
| `count()` | `COUNT` | Record count |
| `sum()` | `SUM` | Sum |
| `avg()` | `AVG` | Average |
| `max()` | `MAX` | Maximum |
| `min()` | `MIN` | Minimum |

### Window Functions

| Method | SQL | Description |
|--------|-----|-------------|
| `window()` | `OVER(...)` | Window function (rowNumber, rank, denseRank, ntile, lag, lead, firstValue, lastValue, sum, avg, count, min, max) |
