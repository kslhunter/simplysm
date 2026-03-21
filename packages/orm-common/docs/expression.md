# Expression

Dialect-independent SQL expression builder. Generates JSON AST (`Expr`) instead of SQL strings, which `QueryBuilder` converts to each DBMS dialect.

Source: `src/expr/expr-unit.ts`, `src/expr/expr.ts`

## ExprUnit

Type-safe expression wrapper. Tracks expression return type using TypeScript generics.

```typescript
class ExprUnit<TPrimitive extends ColumnPrimitive> {
  readonly $infer!: TPrimitive;
  readonly dataType: ColumnPrimitiveStr;
  readonly expr: Expr;

  /** Strip undefined from the type (non-null assertion) */
  get n(): ExprUnit<NonNullable<TPrimitive>>;

  constructor(dataType: ColumnPrimitiveStr, expr: Expr);
}
```

## WhereExprUnit

Expression wrapper for WHERE clause conditions.

```typescript
class WhereExprUnit {
  readonly expr: WhereExpr;
  constructor(expr: WhereExpr);
}
```

## ExprInput

Input type that accepts either an `ExprUnit` or a literal value.

```typescript
type ExprInput<TPrimitive extends ColumnPrimitive> = ExprUnit<TPrimitive> | TPrimitive;
```

## SwitchExprBuilder

Builder interface returned by `expr.switch()` for CASE WHEN expressions.

```typescript
interface SwitchExprBuilder<TPrimitive extends ColumnPrimitive> {
  case(condition: WhereExprUnit, then: ExprInput<TPrimitive>): SwitchExprBuilder<TPrimitive>;
  default(value: ExprInput<TPrimitive>): ExprUnit<TPrimitive>;
}
```

---

## expr

The main expression builder object. All methods return `ExprUnit` or `WhereExprUnit`.

### Value Creation

| Method | Signature | Description |
|--------|-----------|-------------|
| `val` | `val<TStr>(dataType: TStr, value: T): ExprUnit` | Wrap literal value as expression |
| `col` | `col<TStr>(dataType: ColumnPrimitiveStr, ...path: string[]): ExprUnit` | Column reference (internal use) |
| `raw` | `raw<T>(dataType: T): (strings, ...values) => ExprUnit` | Raw SQL tagged template (escape hatch) |

```typescript
expr.val("string", "active")
expr.val("number", 100)
expr.val("DateTime", DateTime.now())

// Raw SQL
expr.raw("string")`JSON_EXTRACT(${u.metadata}, '$.email')`
```

### Comparison Operators (WHERE)

| Method | SQL | Description |
|--------|-----|-------------|
| `eq(source, target)` | `<=>` / `IS NULL OR =` | Equality (NULL-safe) |
| `gt(source, target)` | `>` | Greater than |
| `lt(source, target)` | `<` | Less than |
| `gte(source, target)` | `>=` | Greater than or equal |
| `lte(source, target)` | `<=` | Less than or equal |
| `between(source, from?, to?)` | `BETWEEN` | Range (undefined = unbounded) |

```typescript
db.user().where((u) => [
  expr.eq(u.status, "active"),
  expr.gte(u.age, 18),
  expr.between(u.score, 60, 100),
])
```

### NULL Check

| Method | SQL | Description |
|--------|-----|-------------|
| `null(source)` | `IS NULL` | Check if value is NULL |

### String Search (WHERE)

| Method | SQL | Description |
|--------|-----|-------------|
| `like(source, pattern)` | `LIKE ... ESCAPE '\'` | Pattern matching (`%`, `_` wildcards) |
| `regexp(source, pattern)` | `REGEXP` | Regular expression matching |

### IN / EXISTS (WHERE)

| Method | SQL | Description |
|--------|-----|-------------|
| `in(source, values)` | `IN (...)` | Value list inclusion |
| `inQuery(source, query)` | `IN (SELECT ...)` | Subquery inclusion (single column) |
| `exists(query)` | `EXISTS (SELECT ...)` | Subquery existence check |

```typescript
db.user().where((u) => [
  expr.in(u.status, ["active", "pending"]),
  expr.exists(
    db.order().where((o) => [expr.eq(o.userId, u.id)])
  ),
])
```

### Logical Operators (WHERE)

| Method | SQL | Description |
|--------|-----|-------------|
| `not(arg)` | `NOT (...)` | Negate a condition |
| `and(conditions)` | `... AND ...` | All conditions must be true |
| `or(conditions)` | `... OR ...` | At least one must be true |

### String Functions (SELECT)

| Method | SQL | Description |
|--------|-----|-------------|
| `concat(...args)` | `CONCAT(...)` | String concatenation (NULL-safe) |
| `left(source, length)` | `LEFT(...)` | Extract from left |
| `right(source, length)` | `RIGHT(...)` | Extract from right |
| `trim(source)` | `TRIM(...)` | Remove whitespace |
| `padStart(source, length, fill)` | `LPAD(...)` | Left padding |
| `replace(source, from, to)` | `REPLACE(...)` | String replacement |
| `upper(source)` | `UPPER(...)` | Uppercase |
| `lower(source)` | `LOWER(...)` | Lowercase |
| `length(source)` | `CHAR_LENGTH(...)` | Character count |
| `byteLength(source)` | `OCTET_LENGTH(...)` | Byte count |
| `substring(source, start, length?)` | `SUBSTRING(...)` | Extract substring (1-based) |
| `indexOf(source, search)` | `LOCATE(...)`/`CHARINDEX(...)` | Find position (1-based, 0 if not found) |

```typescript
db.user().select((u) => ({
  fullName: expr.concat(u.firstName, " ", u.lastName),
  initial: expr.left(u.name, 1),
  email: expr.lower(u.email),
}))
```

### Numeric Functions (SELECT)

| Method | SQL | Description |
|--------|-----|-------------|
| `abs(source)` | `ABS(...)` | Absolute value |
| `round(source, digits)` | `ROUND(...)` | Round to N digits |
| `ceil(source)` | `CEILING(...)` | Ceiling |
| `floor(source)` | `FLOOR(...)` | Floor |

### Date Functions (SELECT)

| Method | SQL | Description |
|--------|-----|-------------|
| `year(source)` | `YEAR(...)` | Extract year |
| `month(source)` | `MONTH(...)` | Extract month (1-12) |
| `day(source)` | `DAY(...)` | Extract day (1-31) |
| `hour(source)` | `HOUR(...)` | Extract hour (0-23) |
| `minute(source)` | `MINUTE(...)` | Extract minute (0-59) |
| `second(source)` | `SECOND(...)` | Extract second (0-59) |
| `isoWeek(source)` | `WEEK(..., 3)` | ISO week number (1-53) |
| `isoWeekStartDate(source)` | (computed) | Monday of the week |
| `isoYearMonth(source)` | (computed) | First day of the month |
| `dateDiff(unit, from, to)` | `DATEDIFF(...)` | Date difference |
| `dateAdd(unit, source, value)` | `DATEADD(...)` | Add to date |
| `formatDate(source, format)` | `DATE_FORMAT(...)` | Format date as string |

`DateUnit` values: `"year"`, `"month"`, `"day"`, `"hour"`, `"minute"`, `"second"`

```typescript
db.user().select((u) => ({
  age: expr.dateDiff("year", u.birthDate, expr.val("DateOnly", DateOnly.today())),
  expiresAt: expr.dateAdd("month", u.startDate, 12),
}))
```

### Conditional Functions (SELECT)

| Method | SQL | Description |
|--------|-----|-------------|
| `coalesce(...args)` | `COALESCE(...)` | First non-null value |
| `nullIf(source, value)` | `NULLIF(...)` | Return NULL if equal |
| `is(condition)` | (computed) | Transform WHERE to boolean column |
| `switch<T>()` | `CASE WHEN ... END` | CASE WHEN builder |
| `if(condition, then, else_)` | `IF(...)`/`IIF(...)` | Ternary conditional |

```typescript
db.user().select((u) => ({
  displayName: expr.coalesce(u.nickname, u.name, "Guest"),
  isActive: expr.is(expr.eq(u.status, "active")),
  grade: expr.switch<string>()
    .case(expr.gte(u.score, 90), "A")
    .case(expr.gte(u.score, 80), "B")
    .default("C"),
}))
```

### Aggregate Functions (SELECT)

| Method | SQL | Description |
|--------|-----|-------------|
| `count(arg?, distinct?)` | `COUNT(...)` | Row count |
| `sum(arg)` | `SUM(...)` | Sum (NULL ignored) |
| `avg(arg)` | `AVG(...)` | Average (NULL ignored) |
| `max(arg)` | `MAX(...)` | Maximum value |
| `min(arg)` | `MIN(...)` | Minimum value |

### Other Functions (SELECT)

| Method | SQL | Description |
|--------|-----|-------------|
| `greatest(...args)` | `GREATEST(...)` | Greatest among values |
| `least(...args)` | `LEAST(...)` | Least among values |
| `rowNum()` | (computed) | Row number (no OVER) |
| `random()` | `RAND()`/`RANDOM()` | Random number (0-1) |
| `cast(source, targetType)` | `CAST(... AS ...)` | Type conversion |
| `subquery(dataType, queryable)` | `(SELECT ...)` | Scalar subquery |

```typescript
db.user().select((u) => ({
  id: u.id,
  postCount: expr.subquery("number",
    db.post()
      .where((p) => [expr.eq(p.userId, u.id)])
      .select(() => ({ cnt: expr.count() }))
  ),
}))
```

### Window Functions (SELECT)

All window functions accept a `WinSpecInput`:

```typescript
interface WinSpecInput {
  partitionBy?: ExprInput<ColumnPrimitive>[];
  orderBy?: [ExprInput<ColumnPrimitive>, ("ASC" | "DESC")?][];
}
```

| Method | SQL | Description |
|--------|-----|-------------|
| `rowNumber(spec)` | `ROW_NUMBER() OVER(...)` | Row number within partition |
| `rank(spec)` | `RANK() OVER(...)` | Rank (ties skip: 1,1,3) |
| `denseRank(spec)` | `DENSE_RANK() OVER(...)` | Dense rank (ties consecutive: 1,1,2) |
| `ntile(n, spec)` | `NTILE(n) OVER(...)` | Split into n groups |
| `lag(column, spec, options?)` | `LAG() OVER(...)` | Previous row value |
| `lead(column, spec, options?)` | `LEAD() OVER(...)` | Next row value |
| `firstValue(column, spec)` | `FIRST_VALUE() OVER(...)` | First value in frame |
| `lastValue(column, spec)` | `LAST_VALUE() OVER(...)` | Last value in frame |
| `sumOver(column, spec)` | `SUM() OVER(...)` | Window sum |
| `avgOver(column, spec)` | `AVG() OVER(...)` | Window average |
| `countOver(spec, column?)` | `COUNT() OVER(...)` | Window count |
| `minOver(column, spec)` | `MIN() OVER(...)` | Window minimum |
| `maxOver(column, spec)` | `MAX() OVER(...)` | Window maximum |

`lag` and `lead` options:
- `offset?: number` -- default 1
- `default?: ExprInput<T>` -- default value when no row exists

```typescript
db.order().select((o) => ({
  ...o,
  rowNum: expr.rowNumber({
    partitionBy: [o.userId],
    orderBy: [[o.createdAt, "DESC"]],
  }),
  runningTotal: expr.sumOver(o.amount, {
    partitionBy: [o.userId],
    orderBy: [[o.createdAt, "ASC"]],
  }),
}))
```

### Helper

| Method | Description |
|--------|-------------|
| `toExpr(value: ExprInput<ColumnPrimitive>): Expr` | Convert ExprInput to Expr JSON AST (internal use) |
