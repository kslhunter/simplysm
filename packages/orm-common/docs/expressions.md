# Expressions (expr)

The `expr` object generates Dialect-independent SQL expressions. It creates JSON AST instead of SQL strings, which the `QueryBuilder` converts for each DBMS.

## Comparison Expressions (WHERE)

| Method | SQL | Description |
|--------|-----|------|
| `expr.eq(a, b)` | `a = b` (NULL-safe) | Equality comparison |
| `expr.gt(a, b)` | `a > b` | Greater than |
| `expr.lt(a, b)` | `a < b` | Less than |
| `expr.gte(a, b)` | `a >= b` | Greater than or equal |
| `expr.lte(a, b)` | `a <= b` | Less than or equal |
| `expr.between(a, from, to)` | `a BETWEEN from AND to` | Range (unbounded in direction if undefined) |
| `expr.null(a)` | `a IS NULL` | NULL check |
| `expr.like(a, pattern)` | `a LIKE pattern` | Pattern matching |
| `expr.regexp(a, pattern)` | `a REGEXP pattern` | Regex matching |
| `expr.in(a, values)` | `a IN (v1, v2, ...)` | Value list comparison |
| `expr.inQuery(a, query)` | `a IN (SELECT ...)` | Subquery comparison |
| `expr.exists(query)` | `EXISTS (SELECT ...)` | Subquery existence |

## Logical Expressions (WHERE)

| Method | SQL | Description |
|--------|-----|------|
| `expr.and(conditions)` | `(c1 AND c2 AND ...)` | All conditions met |
| `expr.or(conditions)` | `(c1 OR c2 OR ...)` | At least one condition met |
| `expr.not(condition)` | `NOT (condition)` | Negate condition |

## String Expressions

| Method | SQL | Description |
|--------|-----|------|
| `expr.concat(...args)` | `CONCAT(a, b, ...)` | String concatenation |
| `expr.left(s, n)` | `LEFT(s, n)` | Extract n chars from left |
| `expr.right(s, n)` | `RIGHT(s, n)` | Extract n chars from right |
| `expr.trim(s)` | `TRIM(s)` | Trim whitespace from both sides |
| `expr.padStart(s, n, fill)` | `LPAD(s, n, fill)` | Left padding |
| `expr.replace(s, from, to)` | `REPLACE(s, from, to)` | String replacement |
| `expr.upper(s)` | `UPPER(s)` | Convert to uppercase |
| `expr.lower(s)` | `LOWER(s)` | Convert to lowercase |
| `expr.length(s)` | `CHAR_LENGTH(s)` | Character count |
| `expr.byteLength(s)` | `OCTET_LENGTH(s)` | Byte count |
| `expr.substring(s, start, len)` | `SUBSTRING(s, start, len)` | Substring extraction (1-based) |
| `expr.indexOf(s, search)` | `LOCATE(search, s)` | Find position (1-based, 0 if not found) |

## Numeric Expressions

| Method | SQL | Description |
|--------|-----|------|
| `expr.abs(n)` | `ABS(n)` | Absolute value |
| `expr.round(n, digits)` | `ROUND(n, digits)` | Round |
| `expr.ceil(n)` | `CEILING(n)` | Ceiling |
| `expr.floor(n)` | `FLOOR(n)` | Floor |

## Date Expressions

| Method | SQL | Description |
|--------|-----|------|
| `expr.year(d)` | `YEAR(d)` | Extract year |
| `expr.month(d)` | `MONTH(d)` | Extract month (1~12) |
| `expr.day(d)` | `DAY(d)` | Extract day (1~31) |
| `expr.hour(d)` | `HOUR(d)` | Extract hour (0~23) |
| `expr.minute(d)` | `MINUTE(d)` | Extract minute (0~59) |
| `expr.second(d)` | `SECOND(d)` | Extract second (0~59) |
| `expr.isoWeek(d)` | `WEEK(d, 3)` | ISO week (1~53) |
| `expr.isoWeekStartDate(d)` | - | ISO week start date (Monday) |
| `expr.isoYearMonth(d)` | - | First day of the month |
| `expr.dateDiff(sep, from, to)` | `DATEDIFF(sep, from, to)` | Date difference |
| `expr.dateAdd(sep, source, value)` | `DATEADD(sep, value, source)` | Add to date |
| `expr.formatDate(d, format)` | `DATE_FORMAT(d, format)` | Date formatting |

`DateSeparator`: `"year"`, `"month"`, `"day"`, `"hour"`, `"minute"`, `"second"`

## Conditional Expressions

| Method | SQL | Description |
|--------|-----|------|
| `expr.ifNull(a, b, ...)` | `COALESCE(a, b, ...)` | Return first non-null value |
| `expr.nullIf(a, b)` | `NULLIF(a, b)` | NULL if `a === b` |
| `expr.is(condition)` | `(condition)` | Convert WHERE to boolean |
| `expr.if(cond, then, else)` | `IF(cond, then, else)` | Ternary condition |
| `expr.switch()` | `CASE WHEN ... END` | Multiple condition branching |

```typescript
// CASE WHEN usage example
db.user().select((u) => ({
  grade: expr.switch<string>()
    .case(expr.gte(u.score, 90), "A")
    .case(expr.gte(u.score, 80), "B")
    .case(expr.gte(u.score, 70), "C")
    .default("F"),
}))
```

## Aggregate Expressions

| Method | SQL | Description |
|--------|-----|------|
| `expr.count(col?, distinct?)` | `COUNT(*)` / `COUNT(DISTINCT col)` | Row count |
| `expr.sum(col)` | `SUM(col)` | Sum |
| `expr.avg(col)` | `AVG(col)` | Average |
| `expr.max(col)` | `MAX(col)` | Maximum |
| `expr.min(col)` | `MIN(col)` | Minimum |
| `expr.greatest(...args)` | `GREATEST(a, b, ...)` | Greatest among multiple values |
| `expr.least(...args)` | `LEAST(a, b, ...)` | Least among multiple values |

## Window Functions

| Method | SQL | Description |
|--------|-----|------|
| `expr.rowNumber(spec)` | `ROW_NUMBER() OVER (...)` | Row number |
| `expr.rank(spec)` | `RANK() OVER (...)` | Rank (gaps on ties) |
| `expr.denseRank(spec)` | `DENSE_RANK() OVER (...)` | Dense rank (consecutive) |
| `expr.ntile(n, spec)` | `NTILE(n) OVER (...)` | Split into n groups |
| `expr.lag(col, spec, opts?)` | `LAG(col, offset) OVER (...)` | Previous row value |
| `expr.lead(col, spec, opts?)` | `LEAD(col, offset) OVER (...)` | Next row value |
| `expr.firstValue(col, spec)` | `FIRST_VALUE(col) OVER (...)` | First value |
| `expr.lastValue(col, spec)` | `LAST_VALUE(col) OVER (...)` | Last value |
| `expr.sumOver(col, spec)` | `SUM(col) OVER (...)` | Window sum |
| `expr.avgOver(col, spec)` | `AVG(col) OVER (...)` | Window average |
| `expr.countOver(spec, col?)` | `COUNT(*) OVER (...)` | Window count |
| `expr.minOver(col, spec)` | `MIN(col) OVER (...)` | Window minimum |
| `expr.maxOver(col, spec)` | `MAX(col) OVER (...)` | Window maximum |

`WinSpec`: `{ partitionBy?: [...], orderBy?: [[col, "ASC"|"DESC"], ...] }`

```typescript
// Window function usage example
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

## Other Expressions

| Method | SQL | Description |
|--------|-----|------|
| `expr.val(dataType, value)` | Literal | Wrap typed value |
| `expr.col(dataType, ...path)` | Column reference | Create column reference (internal) |
| `expr.raw(dataType)\`sql\`` | Raw SQL | Escape hatch for DBMS-specific functions |
| `expr.rowNum()` | - | Total row number |
| `expr.random()` | `RAND()` / `RANDOM()` | Random number 0~1 |
| `expr.cast(source, type)` | `CAST(source AS type)` | Type conversion |
| `expr.subquery(dataType, qr)` | `(SELECT ...)` | Scalar subquery |

```typescript
// Raw SQL (using DBMS-specific functions)
db.user().select((u) => ({
  name: u.name,
  data: expr.raw("string")`JSON_EXTRACT(${u.metadata}, '$.email')`,
}))

// Scalar subquery
db.user().select((u) => ({
  id: u.id,
  postCount: expr.subquery(
    "number",
    db.post()
      .where((p) => [expr.eq(p.userId, u.id)])
      .select(() => ({ cnt: expr.count() }))
  ),
}))
```
