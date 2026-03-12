# Expression Builder

The `expr` object provides a dialect-independent SQL expression AST builder. Expressions are compiled to SQL by the QueryBuilder for each target DBMS (MySQL, MSSQL, PostgreSQL).

## API Reference

### Value Creation

#### `expr.val(dataType, value)`

Wrap a literal value as an `ExprUnit`.

```typescript
expr.val("string", "active")
expr.val("number", 100)
expr.val("DateOnly", DateOnly.today())
```

#### `expr.col(dataType, ...path)`

Create a column reference (typically used internally; proxy objects in Queryable callbacks handle this automatically).

```typescript
expr.col("string", "T1", "name")
```

#### `expr.raw(dataType)\`template\``

Raw SQL expression (escape hatch). Interpolated values are automatically parameterized.

```typescript
db.user().select((u) => ({
  data: expr.raw("string")`JSON_EXTRACT(${u.metadata}, '$.email')`,
}))
```

---

### Comparison Operators (WHERE)

All comparison operators return `WhereExprUnit` for use in `.where()` callbacks.

| Method | SQL | Description |
|--------|-----|-------------|
| `expr.eq(source, target)` | `=` (NULL-safe) | Equality comparison |
| `expr.gt(source, target)` | `>` | Greater than |
| `expr.lt(source, target)` | `<` | Less than |
| `expr.gte(source, target)` | `>=` | Greater than or equal |
| `expr.lte(source, target)` | `<=` | Less than or equal |
| `expr.between(source, from?, to?)` | `BETWEEN` | Range comparison (undefined = unbounded) |

```typescript
db.user().where((u) => [
  expr.eq(u.status, "active"),
  expr.gte(u.age, 18),
  expr.between(u.score, 60, 100),
])
```

---

### NULL Check

#### `expr.null(source)`

Check if value is NULL (`IS NULL`).

```typescript
db.user().where((u) => [expr.null(u.deletedAt)])
```

---

### String Search (WHERE)

#### `expr.like(source, pattern)`

LIKE pattern matching. `%` matches any characters, `_` matches single character.

```typescript
db.user().where((u) => [expr.like(u.name, "John%")])
```

#### `expr.regexp(source, pattern)`

Regular expression matching. Syntax varies by DBMS.

```typescript
db.user().where((u) => [expr.regexp(u.email, "^[a-z]+@")])
```

---

### IN / EXISTS (WHERE)

#### `expr.in(source, values)`

Check if value is in a list.

```typescript
db.user().where((u) => [expr.in(u.status, ["active", "pending"])])
```

#### `expr.inQuery(source, query)`

Check if value is in a subquery result (subquery must SELECT a single column).

```typescript
db.user().where((u) => [
  expr.inQuery(
    u.id,
    db.order().where((o) => [expr.gt(o.amount, 1000)]).select((o) => ({ userId: o.userId })),
  ),
])
```

#### `expr.exists(query)`

Check if a subquery returns any rows.

```typescript
db.user().where((u) => [
  expr.exists(db.order().where((o) => [expr.eq(o.userId, u.id)])),
])
```

---

### Logical Operators (WHERE)

#### `expr.not(condition)`

Negate a condition.

```typescript
expr.not(expr.eq(u.status, "deleted"))
```

#### `expr.and(conditions)`

Combine conditions with AND (note: `.where()` arrays are implicitly AND-ed).

```typescript
expr.and([expr.eq(u.status, "active"), expr.gte(u.age, 18)])
```

#### `expr.or(conditions)`

Combine conditions with OR.

```typescript
expr.or([expr.eq(u.status, "active"), expr.eq(u.status, "pending")])
```

---

### String Functions (SELECT)

| Method | SQL | Description |
|--------|-----|-------------|
| `expr.concat(...args)` | `CONCAT` | Concatenate strings (NULL treated as empty) |
| `expr.left(source, length)` | `LEFT` | Extract left N characters |
| `expr.right(source, length)` | `RIGHT` | Extract right N characters |
| `expr.trim(source)` | `TRIM` | Remove leading/trailing whitespace |
| `expr.padStart(source, length, fill)` | `LPAD` | Left-pad string |
| `expr.replace(source, from, to)` | `REPLACE` | Replace occurrences |
| `expr.upper(source)` | `UPPER` | Convert to uppercase |
| `expr.lower(source)` | `LOWER` | Convert to lowercase |
| `expr.length(source)` | `CHAR_LENGTH` | Character count |
| `expr.byteLength(source)` | `OCTET_LENGTH` | Byte count |
| `expr.substring(source, start, length?)` | `SUBSTRING` | Extract substring (1-based index) |
| `expr.indexOf(source, search)` | `LOCATE/CHARINDEX` | Find position (1-based, 0 if not found) |

```typescript
db.user().select((u) => ({
  fullName: expr.concat(u.firstName, " ", u.lastName),
  initial: expr.left(u.name, 1),
  phone: expr.replace(u.phone, "-", ""),
}))
```

---

### Numeric Functions (SELECT)

| Method | SQL | Description |
|--------|-----|-------------|
| `expr.abs(source)` | `ABS` | Absolute value |
| `expr.round(source, digits)` | `ROUND` | Round to N decimal places |
| `expr.ceil(source)` | `CEILING` | Round up |
| `expr.floor(source)` | `FLOOR` | Round down |

```typescript
db.product().select((p) => ({
  price: expr.round(p.price, 2),
  absDiscount: expr.abs(p.discount),
}))
```

---

### Date Functions (SELECT)

#### Extraction

| Method | SQL | Returns |
|--------|-----|---------|
| `expr.year(source)` | `YEAR` | Year (4-digit) |
| `expr.month(source)` | `MONTH` | Month (1-12) |
| `expr.day(source)` | `DAY` | Day (1-31) |
| `expr.hour(source)` | `HOUR` | Hour (0-23) |
| `expr.minute(source)` | `MINUTE` | Minute (0-59) |
| `expr.second(source)` | `SECOND` | Second (0-59) |
| `expr.isoWeek(source)` | `WEEK` | ISO week number (1-53) |
| `expr.isoWeekStartDate(source)` | -- | Monday of the week |
| `expr.isoYearMonth(source)` | -- | First day of the month |

#### Arithmetic

| Method | SQL | Description |
|--------|-----|-------------|
| `expr.dateDiff(unit, from, to)` | `DATEDIFF` | Difference between dates |
| `expr.dateAdd(unit, source, value)` | `DATEADD` | Add interval to date |
| `expr.formatDate(source, format)` | `DATE_FORMAT` | Format date as string |

**DateUnit values:** `"year"` | `"month"` | `"day"` | `"hour"` | `"minute"` | `"second"`

```typescript
db.user().select((u) => ({
  age: expr.dateDiff("year", u.birthDate, expr.val("DateOnly", DateOnly.today())),
  expiresAt: expr.dateAdd("month", u.startDate, 12),
  birthYear: expr.year(u.birthDate),
}))
```

---

### Conditional Functions (SELECT)

#### `expr.coalesce(...args)`

Return first non-null value (`COALESCE`).

```typescript
expr.coalesce(u.nickname, u.name, "Guest")
```

#### `expr.nullIf(source, value)`

Return NULL if source equals value (`NULLIF`).

```typescript
expr.nullIf(u.bio, "") // empty string -> NULL
```

#### `expr.is(condition)`

Convert WHERE expression to boolean value for SELECT.

```typescript
db.user().select((u) => ({
  isActive: expr.is(expr.eq(u.status, "active")),
}))
```

#### `expr.switch<T>()`

CASE WHEN expression builder (chaining API).

```typescript
db.user().select((u) => ({
  grade: expr.switch<string>()
    .case(expr.gte(u.score, 90), "A")
    .case(expr.gte(u.score, 80), "B")
    .default("C"),
}))
```

#### `expr.if(condition, then, else_)`

Simple IF/IIF expression.

```typescript
expr.if(expr.gte(u.age, 18), "adult", "minor")
```

---

### Aggregate Functions (SELECT)

All aggregate functions ignore NULL values. Return NULL only when all values are NULL or no rows.

| Method | SQL | Description |
|--------|-----|-------------|
| `expr.count(arg?, distinct?)` | `COUNT` | Row count (no arg = count all) |
| `expr.sum(arg)` | `SUM` | Sum of numeric column |
| `expr.avg(arg)` | `AVG` | Average of numeric column |
| `expr.max(arg)` | `MAX` | Maximum value |
| `expr.min(arg)` | `MIN` | Minimum value |

```typescript
db.order().select((o) => ({
  userId: o.userId,
  totalAmount: expr.sum(o.amount),
  orderCount: expr.count(),
  uniqueProducts: expr.count(o.productId, true),
  lastOrder: expr.max(o.createdAt),
})).groupBy((o) => [o.userId])
```

---

### Other Functions

| Method | SQL | Description |
|--------|-----|-------------|
| `expr.greatest(...args)` | `GREATEST` | Maximum of multiple values |
| `expr.least(...args)` | `LEAST` | Minimum of multiple values |
| `expr.rowNum()` | `ROW_NUMBER` | Simple row number |
| `expr.random()` | `RAND/RANDOM` | Random number |
| `expr.cast(source, targetType)` | `CAST` | Type conversion |

```typescript
expr.cast(u.id, { type: "varchar", length: 10 })
expr.greatest(u.score1, u.score2, u.score3)
```

---

### Window Functions

#### `expr.window(fn, spec?)`

Apply a window function with OVER clause.

**Window function types:**

| Function | Description |
|----------|-------------|
| `{ type: "rowNumber" }` | ROW_NUMBER() |
| `{ type: "rank" }` | RANK() |
| `{ type: "denseRank" }` | DENSE_RANK() |
| `{ type: "ntile", n }` | NTILE(n) |
| `{ type: "lag", column, offset?, default? }` | LAG() |
| `{ type: "lead", column, offset?, default? }` | LEAD() |
| `{ type: "firstValue", column }` | FIRST_VALUE() |
| `{ type: "lastValue", column }` | LAST_VALUE() |
| `{ type: "sum", column }` | Window SUM |
| `{ type: "avg", column }` | Window AVG |
| `{ type: "count", column? }` | Window COUNT |
| `{ type: "min", column }` | Window MIN |
| `{ type: "max", column }` | Window MAX |

**WinSpec:**

```typescript
{
  partitionBy?: ExprInput[],
  orderBy?: [ExprInput, ("ASC" | "DESC")?][],
}
```

```typescript
db.order().select((o) => ({
  id: o.id,
  rowNum: expr.window(
    { type: "rowNumber" },
    { partitionBy: [o.userId], orderBy: [[o.createdAt, "DESC"]] },
  ),
  runningTotal: expr.window(
    { type: "sum", column: o.amount },
    { partitionBy: [o.userId], orderBy: [[o.createdAt]] },
  ),
}))
```

---

### Subquery

#### `expr.subquery(query, fn)`

Scalar subquery for use in SELECT expressions.

```typescript
db.user().select((u) => ({
  name: u.name,
  postCount: expr.subquery(
    db.post().where((p) => [expr.eq(p.authorId, u.id)]),
    (q) => expr.count(q.id),
  ),
}))
```

---

### Helper Types

#### `ExprUnit<TPrimitive>`

Type-safe expression wrapper that tracks the return type via TypeScript generics. Access `.n` to assert non-nullable.

#### `WhereExprUnit`

Expression wrapper for WHERE clause conditions.

#### `ExprInput<TPrimitive>`

Union type accepting either `ExprUnit<T>` or a literal value of type `T`.

```typescript
type ExprInput<T> = ExprUnit<T> | T;
```
