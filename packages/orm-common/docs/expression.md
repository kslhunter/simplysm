# Expression DSL

Dialect-independent SQL expression builder. Generates JSON AST (`Expr`) instead of SQL strings. The QueryBuilder transforms the AST to target DBMS syntax.

## ExprUnit

```typescript
class ExprUnit<TPrimitive extends ColumnPrimitive> {
  readonly $infer!: TPrimitive;
  readonly dataType: ColumnPrimitiveStr;
  readonly expr: Expr;
  get n(): ExprUnit<NonNullable<TPrimitive>>;
  constructor(dataType: ColumnPrimitiveStr, expr: Expr);
}
```

Type-safe expression wrapper. Tracks the return type via the `TPrimitive` generic parameter.

| Member | Type | Description |
|--------|------|-------------|
| `$infer` | `TPrimitive` | Type inference helper (phantom type) |
| `dataType` | `ColumnPrimitiveStr` | Runtime type name (`"string"`, `"number"`, etc.) |
| `expr` | `Expr` | Underlying JSON AST expression |
| `n` | `ExprUnit<NonNullable<TPrimitive>>` | Getter that narrows nullable to non-nullable |

## WhereExprUnit

```typescript
class WhereExprUnit {
  readonly expr: WhereExpr;
  constructor(expr: WhereExpr);
}
```

WHERE clause expression wrapper. Returned by comparison and logical methods on `expr`.

## ExprInput

```typescript
type ExprInput<TPrimitive extends ColumnPrimitive> = ExprUnit<TPrimitive> | TPrimitive;
```

Accepts either an `ExprUnit` or a literal value. Literal values are automatically wrapped.

## SwitchExprBuilder

```typescript
interface SwitchExprBuilder<TPrimitive extends ColumnPrimitive> {
  case(condition: WhereExprUnit, then: ExprInput<TPrimitive>): SwitchExprBuilder<TPrimitive>;
  default(value: ExprInput<TPrimitive>): ExprUnit<TPrimitive>;
}
```

Fluent CASE WHEN builder. Chain `.case()` calls and terminate with `.default()`.

## expr Object

The `expr` object provides all expression-building methods. Methods are grouped by category below.

### Value Creation

| Method | Signature | Description |
|--------|-----------|-------------|
| `val` | `<TStr extends ColumnPrimitiveStr>(dataType: TStr, value: T) => ExprUnit` | Wrap a literal value into an ExprUnit |
| `col` | `<TStr extends ColumnPrimitiveStr>(dataType: ColumnPrimitiveStr, ...path: string[]) => ExprUnit` | Create a column reference |
| `raw` | `<T extends ColumnPrimitiveStr>(dataType: T) => (strings: TemplateStringsArray, ...values: ExprInput[]) => ExprUnit` | Raw SQL via tagged template literal; interpolated values become parameters |

### Comparison (WHERE)

| Method | Signature | SQL | Description |
|--------|-----------|-----|-------------|
| `eq` | `(source: ExprUnit<T>, target: ExprInput<T>) => WhereExprUnit` | `<=>` / `IS NULL OR =` | NULL-safe equality |
| `gt` | `(source: ExprUnit<T>, target: ExprInput<T>) => WhereExprUnit` | `>` | Greater than |
| `lt` | `(source: ExprUnit<T>, target: ExprInput<T>) => WhereExprUnit` | `<` | Less than |
| `gte` | `(source: ExprUnit<T>, target: ExprInput<T>) => WhereExprUnit` | `>=` | Greater than or equal |
| `lte` | `(source: ExprUnit<T>, target: ExprInput<T>) => WhereExprUnit` | `<=` | Less than or equal |
| `between` | `(source: ExprUnit<T>, from?: ExprInput<T>, to?: ExprInput<T>) => WhereExprUnit` | `BETWEEN` | Range comparison (undefined bounds omitted) |

### NULL Check (WHERE)

| Method | Signature | SQL | Description |
|--------|-----------|-----|-------------|
| `null` | `(source: ExprUnit<T>) => WhereExprUnit` | `IS NULL` | NULL check |

### String Search (WHERE)

| Method | Signature | SQL | Description |
|--------|-----------|-----|-------------|
| `like` | `(source: ExprUnit<string\|undefined>, pattern: ExprInput<string\|undefined>) => WhereExprUnit` | `LIKE ... ESCAPE '\'` | Pattern matching |
| `regexp` | `(source: ExprUnit<string\|undefined>, pattern: ExprInput<string\|undefined>) => WhereExprUnit` | `REGEXP` | Regex matching |

### IN / EXISTS (WHERE)

| Method | Signature | SQL | Description |
|--------|-----------|-----|-------------|
| `in` | `(source: ExprUnit<T>, values: ExprInput<T>[]) => WhereExprUnit` | `IN (...)` | List membership |
| `inQuery` | `(source: ExprUnit<T>, query: Queryable<...>) => WhereExprUnit` | `IN (SELECT ...)` | Subquery membership (single column) |
| `exists` | `(query: Queryable<any, any>) => WhereExprUnit` | `EXISTS (SELECT ...)` | Subquery existence check |

### Logical (WHERE)

| Method | Signature | SQL | Description |
|--------|-----------|-----|-------------|
| `not` | `(arg: WhereExprUnit) => WhereExprUnit` | `NOT (...)` | Negate condition |
| `and` | `(conditions: WhereExprUnit[]) => WhereExprUnit` | `... AND ...` | All conditions must match |
| `or` | `(conditions: WhereExprUnit[]) => WhereExprUnit` | `... OR ...` | At least one condition must match |

### String Functions (SELECT)

| Method | Signature | SQL | Description |
|--------|-----------|-----|-------------|
| `concat` | `(...args: ExprInput<string\|undefined>[]) => ExprUnit<string>` | `CONCAT(...)` | String concatenation (NULL becomes empty) |
| `left` | `(source, length) => ExprUnit<T>` | `LEFT(source, n)` | Left substring |
| `right` | `(source, length) => ExprUnit<T>` | `RIGHT(source, n)` | Right substring |
| `trim` | `(source) => ExprUnit<T>` | `TRIM(source)` | Remove leading/trailing whitespace |
| `padStart` | `(source, length, fillString) => ExprUnit<T>` | `LPAD(...)` | Left-pad to target length |
| `replace` | `(source, from, to) => ExprUnit<T>` | `REPLACE(...)` | String replacement |
| `upper` | `(source) => ExprUnit<T>` | `UPPER(source)` | Uppercase |
| `lower` | `(source) => ExprUnit<T>` | `LOWER(source)` | Lowercase |
| `length` | `(source) => ExprUnit<number>` | `CHAR_LENGTH(source)` | Character count |
| `byteLength` | `(source) => ExprUnit<number>` | `OCTET_LENGTH(source)` | Byte count |
| `substring` | `(source, start, length?) => ExprUnit<T>` | `SUBSTRING(source, start, length)` | Extract substring (1-based index) |
| `indexOf` | `(source, search) => ExprUnit<number>` | `LOCATE(search, source)` | Find position (1-based, 0 if not found) |

### Math Functions (SELECT)

| Method | Signature | SQL | Description |
|--------|-----------|-----|-------------|
| `abs` | `(source) => ExprUnit<T>` | `ABS(source)` | Absolute value |
| `round` | `(source, digits) => ExprUnit<T>` | `ROUND(source, digits)` | Round to N decimal places |
| `ceil` | `(source) => ExprUnit<T>` | `CEILING(source)` | Round up |
| `floor` | `(source) => ExprUnit<T>` | `FLOOR(source)` | Round down |

### Date Functions (SELECT)

| Method | Signature | SQL | Description |
|--------|-----------|-----|-------------|
| `year` | `(source) => ExprUnit<number>` | `YEAR(source)` | Extract year (4-digit) |
| `month` | `(source) => ExprUnit<number>` | `MONTH(source)` | Extract month (1-12) |
| `day` | `(source) => ExprUnit<number>` | `DAY(source)` | Extract day (1-31) |
| `hour` | `(source) => ExprUnit<number>` | `HOUR(source)` | Extract hour (0-23) |
| `minute` | `(source) => ExprUnit<number>` | `MINUTE(source)` | Extract minute (0-59) |
| `second` | `(source) => ExprUnit<number>` | `SECOND(source)` | Extract second (0-59) |
| `isoWeek` | `(source) => ExprUnit<number>` | `WEEK(source, 3)` | ISO week number (1-53) |
| `isoWeekStartDate` | `(source) => ExprUnit<T>` | Computed | Monday of the source date's week |
| `isoYearMonth` | `(source) => ExprUnit<T>` | Computed | First day of the source date's month |
| `dateDiff` | `(unit: DateUnit, from, to) => ExprUnit<number>` | `DATEDIFF(unit, from, to)` | Date difference (to - from) |
| `dateAdd` | `(unit: DateUnit, source, value) => ExprUnit<T>` | `DATEADD(unit, value, source)` | Add time to date |
| `formatDate` | `(source, format: string) => ExprUnit<string>` | `DATE_FORMAT(...)` | Format date as string |

### Conditional (SELECT)

| Method | Signature | SQL | Description |
|--------|-----------|-----|-------------|
| `coalesce` | `(...args) => ExprUnit<T>` | `COALESCE(...)` | First non-null value |
| `nullIf` | `(source, value) => ExprUnit<T\|undefined>` | `NULLIF(source, value)` | Return NULL if source equals value |
| `is` | `(condition: WhereExprUnit) => ExprUnit<boolean>` | Condition as boolean | Convert WHERE expression to boolean column |
| `switch` | `<T>() => SwitchExprBuilder<T>` | `CASE WHEN ... END` | Fluent CASE WHEN builder |
| `if` | `(condition, then, else_) => ExprUnit<T>` | `IF(...)` / `IIF(...)` | Ternary conditional |

### Aggregate (SELECT)

| Method | Signature | SQL | Description |
|--------|-----------|-----|-------------|
| `count` | `(arg?, distinct?) => ExprUnit<number>` | `COUNT(...)` | Row count (all rows if arg omitted) |
| `sum` | `(arg) => ExprUnit<number\|undefined>` | `SUM(arg)` | Sum (NULL if all values NULL) |
| `avg` | `(arg) => ExprUnit<number\|undefined>` | `AVG(arg)` | Average (NULL if all values NULL) |
| `max` | `(arg) => ExprUnit<T\|undefined>` | `MAX(arg)` | Maximum value |
| `min` | `(arg) => ExprUnit<T\|undefined>` | `MIN(arg)` | Minimum value |

### Other (SELECT)

| Method | Signature | SQL | Description |
|--------|-----------|-----|-------------|
| `greatest` | `(...args) => ExprUnit<T>` | `GREATEST(...)` | Greatest of multiple values |
| `least` | `(...args) => ExprUnit<T>` | `LEAST(...)` | Least of multiple values |
| `rowNum` | `() => ExprUnit<number>` | `ROW_NUMBER` variant | Simple row numbering |
| `random` | `() => ExprUnit<number>` | `RAND()` / `RANDOM()` | Random number (0 to 1) |
| `cast` | `(source, targetType: DataType) => ExprUnit` | `CAST(source AS type)` | Type conversion |
| `subquery` | `(dataType, queryable) => ExprUnit` | `(SELECT ...)` | Scalar subquery in SELECT |

### Window Functions (SELECT)

| Method | Signature | SQL | Description |
|--------|-----------|-----|-------------|
| `rowNumber` | `(spec: WinSpecInput) => ExprUnit<number>` | `ROW_NUMBER() OVER (...)` | Row number within partition |
| `rank` | `(spec: WinSpecInput) => ExprUnit<number>` | `RANK() OVER (...)` | Rank (gaps after ties: 1,1,3) |
| `denseRank` | `(spec: WinSpecInput) => ExprUnit<number>` | `DENSE_RANK() OVER (...)` | Dense rank (no gaps: 1,1,2) |
| `ntile` | `(n: number, spec: WinSpecInput) => ExprUnit<number>` | `NTILE(n) OVER (...)` | Split into n groups |
| `lag` | `(column, spec, options?) => ExprUnit<T\|undefined>` | `LAG(...) OVER (...)` | Previous row value |
| `lead` | `(column, spec, options?) => ExprUnit<T\|undefined>` | `LEAD(...) OVER (...)` | Next row value |
| `firstValue` | `(column, spec) => ExprUnit<T\|undefined>` | `FIRST_VALUE(...) OVER (...)` | First value in partition |
| `lastValue` | `(column, spec) => ExprUnit<T\|undefined>` | `LAST_VALUE(...) OVER (...)` | Last value in partition |
| `sumOver` | `(column, spec) => ExprUnit<number\|undefined>` | `SUM(...) OVER (...)` | Window sum |
| `avgOver` | `(column, spec) => ExprUnit<number\|undefined>` | `AVG(...) OVER (...)` | Window average |
| `countOver` | `(spec, column?) => ExprUnit<number>` | `COUNT(...) OVER (...)` | Window count |
| `minOver` | `(column, spec) => ExprUnit<T\|undefined>` | `MIN(...) OVER (...)` | Window minimum |
| `maxOver` | `(column, spec) => ExprUnit<T\|undefined>` | `MAX(...) OVER (...)` | Window maximum |

**WinSpecInput** (window specification input):

```typescript
interface WinSpecInput {
  partitionBy?: ExprInput<ColumnPrimitive>[];
  orderBy?: [ExprInput<ColumnPrimitive>, ("ASC" | "DESC")?][];
}
```

**lag/lead options**:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `offset` | `number` | `1` | Number of rows to look back/forward |
| `default` | `ExprInput<T>` | `undefined` (NULL) | Default value when no row exists |

### Helper

| Method | Signature | Description |
|--------|-----------|-------------|
| `toExpr` | `(value: ExprInput<ColumnPrimitive>) => Expr` | Convert ExprInput to Expr JSON AST (internal use) |
