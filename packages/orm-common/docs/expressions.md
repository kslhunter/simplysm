# Expressions

## `expr`

Dialect-independent SQL expression builder. Generates JSON AST nodes (`Expr`) that are later rendered by a dialect-specific `QueryBuilderBase`. Used inside `where`, `select`, `orderBy`, `groupBy`, and `having` callbacks.

```typescript
import { expr } from "@simplysm/orm-common";

db.user()
  .where((u) => [
    expr.eq(u.status, "active"),
    expr.gt(u.age, 18),
  ])
  .select((u) => ({
    fullName: expr.concat(u.firstName, " ", u.lastName),
    age: expr.dateDiff("year", u.birthDate, expr.val("DateOnly", DateOnly.today())),
  }));
```

### Value expressions

| Method | SQL | Description |
|---|---|---|
| `expr.col(...path)` | `alias.column` | Column reference |
| `expr.val(type, value)` | literal | Typed literal value |
| `expr.raw(sql, ...params)` | raw SQL | Raw SQL fragment with `{0}`, `{1}` placeholders |
| `expr.toExpr(value)` | — | Convert any value to `ExprUnit` |

### Comparison (WHERE) expressions — return `WhereExprUnit`

| Method | SQL |
|---|---|
| `expr.eq(a, b)` | `a = b` (NULL-safe) |
| `expr.gt(a, b)` | `a > b` |
| `expr.lt(a, b)` | `a < b` |
| `expr.gte(a, b)` | `a >= b` |
| `expr.lte(a, b)` | `a <= b` |
| `expr.between(a, from?, to?)` | `a BETWEEN from AND to` |
| `expr.null(a)` | `a IS NULL` |
| `expr.like(a, pattern)` | `a LIKE pattern` |
| `expr.regexp(a, pattern)` | `a REGEXP pattern` |
| `expr.in(a, values[])` | `a IN (...)` |
| `expr.inQuery(a, queryable)` | `a IN (subquery)` |
| `expr.exists(queryable)` | `EXISTS (subquery)` |

### Logical expressions — return `WhereExprUnit`

| Method | SQL |
|---|---|
| `expr.not(condition)` | `NOT condition` |
| `expr.and(conditions[])` | `cond1 AND cond2 ...` |
| `expr.or(conditions[])` | `cond1 OR cond2 ...` |

### String functions — return `ExprUnit<string>`

| Method | SQL |
|---|---|
| `expr.concat(...args)` | `CONCAT(...)` |
| `expr.left(src, len)` | `LEFT(src, len)` |
| `expr.right(src, len)` | `RIGHT(src, len)` |
| `expr.trim(src)` | `TRIM(src)` |
| `expr.padStart(src, len, fill)` | `LPAD(src, len, fill)` |
| `expr.replace(src, from, to)` | `REPLACE(src, from, to)` |
| `expr.upper(src)` | `UPPER(src)` |
| `expr.lower(src)` | `LOWER(src)` |
| `expr.length(src)` | `CHAR_LENGTH(src)` |
| `expr.byteLength(src)` | `LENGTH / DATALENGTH(src)` |
| `expr.substring(src, start, len?)` | `SUBSTRING(src, start, len)` |
| `expr.indexOf(src, search)` | `LOCATE / CHARINDEX(...)` |

### Number functions — return `ExprUnit<number>`

| Method | SQL |
|---|---|
| `expr.abs(a)` | `ABS(a)` |
| `expr.round(a, digits)` | `ROUND(a, digits)` |
| `expr.ceil(a)` | `CEIL(a)` |
| `expr.floor(a)` | `FLOOR(a)` |
| `expr.add(a, b)` | `a + b` |
| `expr.sub(a, b)` | `a - b` |
| `expr.mul(a, b)` | `a * b` |
| `expr.div(a, b)` | `a / b` |
| `expr.mod(a, b)` | `a % b` |

### Date functions

| Method | SQL | Return type |
|---|---|---|
| `expr.year(a)` | `YEAR(a)` | `ExprUnit<number>` |
| `expr.month(a)` | `MONTH(a)` | `ExprUnit<number>` |
| `expr.day(a)` | `DAY(a)` | `ExprUnit<number>` |
| `expr.hour(a)` | `HOUR(a)` | `ExprUnit<number>` |
| `expr.minute(a)` | `MINUTE(a)` | `ExprUnit<number>` |
| `expr.second(a)` | `SECOND(a)` | `ExprUnit<number>` |
| `expr.isoWeek(a)` | ISO week number | `ExprUnit<number>` |
| `expr.isoWeekStartDate(a)` | ISO week start date | `ExprUnit<DateOnly>` |
| `expr.isoYearMonth(a)` | YYYYMM number | `ExprUnit<number>` |
| `expr.dateDiff(sep, from, to)` | `DATEDIFF` | `ExprUnit<number>` |
| `expr.dateAdd(sep, src, val)` | `DATEADD` | `ExprUnit<DateTime \| DateOnly>` |
| `expr.formatDate(src, format)` | `FORMAT / DATE_FORMAT` | `ExprUnit<string>` |

`sep` (DateSeparator): `"year" | "month" | "day" | "hour" | "minute" | "second"`

### Conditional expressions

| Method | SQL | Description |
|---|---|---|
| `expr.ifNull(...args)` | `COALESCE(...)` | First non-null value |
| `expr.nullIf(src, val)` | `NULLIF(src, val)` | NULL if equal |
| `expr.is(condition)` | `CASE WHEN … THEN 1 ELSE 0` | Convert boolean to number |
| `expr.switch(fn)` | `CASE WHEN … END` | Switch expression builder |
| `expr.if(condition, then, else?)` | `IIF / IF(…)` | Ternary |

`expr.switch` usage:
```typescript
expr.switch<string>()
  .case(expr.eq(u.status, "active"), "Active")
  .case(expr.eq(u.status, "inactive"), "Inactive")
  .default("Unknown")
```

### Aggregate functions — return `ExprUnit<number>`

| Method | SQL |
|---|---|
| `expr.count(col?)` | `COUNT(col)` or `COUNT(*)` |
| `expr.countDistinct(col)` | `COUNT(DISTINCT col)` |
| `expr.sum(col)` | `SUM(col)` |
| `expr.avg(col)` | `AVG(col)` |
| `expr.max(col)` | `MAX(col)` |
| `expr.min(col)` | `MIN(col)` |

### Window functions — return `ExprUnit`

```typescript
expr.window(fn, spec)
```

`fn` options: `rowNumber()`, `rank()`, `denseRank()`, `ntile(n)`, `lag(col, offset?, default?)`, `lead(col, offset?, default?)`, `firstValue(col)`, `lastValue(col)`, `sum(col)`, `avg(col)`, `count(col?)`, `min(col)`, `max(col)`

`spec`: `{ partitionBy?: ExprInput[], orderBy?: [ExprInput, ("ASC"|"DESC")?][] }`

### Subquery

| Method | Description |
|---|---|
| `expr.subquery(queryable, fn)` | Scalar subquery returning a single value |

### Other

| Method | SQL | Description |
|---|---|---|
| `expr.greatest(...args)` | `GREATEST(...)` | Maximum of values |
| `expr.least(...args)` | `LEAST(...)` | Minimum of values |
| `expr.rowNum()` | `ROW_NUMBER()` | Simple row number (no OVER) |
| `expr.random()` | `RAND() / RANDOM()` | Random number |
| `expr.cast(src, dataType)` | `CAST(src AS type)` | Type cast |

---

## `ExprUnit<TPrimitive>`

Type-safe wrapper around a SQL expression AST node (`Expr`). Tracks the TypeScript return type via the `TPrimitive` generic.

```typescript
import { ExprUnit } from "@simplysm/orm-common";

class ExprUnit<TPrimitive extends ColumnPrimitive> {
  readonly $infer: TPrimitive;
  readonly dataType: ColumnPrimitiveStr;
  readonly expr: Expr;

  /** Strip undefined from type (for nullable columns) */
  get n(): ExprUnit<NonNullable<TPrimitive>>;
}
```

---

## `WhereExprUnit`

Wrapper for WHERE clause AST nodes (`WhereExpr`). Used as the element type of arrays returned by `where()` and `having()` predicates.

```typescript
import { WhereExprUnit } from "@simplysm/orm-common";

class WhereExprUnit {
  readonly expr: WhereExpr;
}
```

---

## `ExprInput<TPrimitive>`

Union type accepting either an `ExprUnit<TPrimitive>` or a plain literal value of `TPrimitive`. Used as the parameter type for most `expr.*` methods so that literal values can be passed directly.

```typescript
type ExprInput<TPrimitive extends ColumnPrimitive> = ExprUnit<TPrimitive> | TPrimitive;
```

---

## Related types

See [Expression types in types.md](./types.md#expression-types) for the full `Expr`, `WhereExpr`, and `WinFn` union type definitions, as well as all individual expression node types (`ExprEq`, `ExprConcat`, `ExprWindow`, etc.).
