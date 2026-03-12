# Queryable

Chainable query builder for constructing type-safe SELECT, INSERT, UPDATE, DELETE, JOIN, GROUP BY, UNION, and recursive CTE queries.

## API Reference

### `Queryable<TData, TFrom>`

The core query builder class. Created automatically from DbContext table/view accessors (e.g., `db.user()`).

- `TData` -- Data type of the query result
- `TFrom` -- Source table builder (required for CUD operations; `never` for views/subqueries)

---

### SELECT / Projection

#### `.select(fn)`

Specify columns to SELECT with optional transformations.

```typescript
select<R>(fn: (columns) => R): Queryable<UnwrapQueryableRecord<R>, never>
```

```typescript
db.user().select((u) => ({
  userName: u.name,
  upperEmail: expr.upper(u.email),
}))
```

#### `.distinct()`

Apply DISTINCT to remove duplicate rows.

```typescript
db.user().select((u) => ({ name: u.name })).distinct()
```

#### `.lock()`

Apply row lock (`FOR UPDATE`) within a transaction.

```typescript
db.user().where((u) => [expr.eq(u.id, 1)]).lock()
```

---

### Filtering

#### `.where(predicate)`

Add WHERE conditions. Multiple calls are combined with AND.

```typescript
where(predicate: (columns) => WhereExprUnit[]): Queryable<TData, TFrom>
```

```typescript
db.user()
  .where((u) => [expr.eq(u.status, "active")])
  .where((u) => [expr.gte(u.age, 18)])
```

#### `.search(fn, searchText)`

Full-text search using LIKE patterns. Supports `+required`, `-excluded`, `"exact phrase"`, and `*wildcard` syntax.

```typescript
db.user().search((u) => [u.name, u.email], 'John +active -deleted')
```

---

### Sorting and Pagination

#### `.orderBy(fn, direction?)`

Add ORDER BY. Multiple calls add additional sort columns.

```typescript
db.user()
  .orderBy((u) => u.name)
  .orderBy((u) => u.createdAt, "DESC")
```

#### `.top(count)`

Select only top N rows. Can be used without ORDER BY.

```typescript
db.user().top(10)
```

#### `.limit(skip, take)`

Set LIMIT/OFFSET for pagination. Requires `orderBy()` first.

```typescript
db.user()
  .orderBy((u) => u.createdAt)
  .limit(0, 20) // first 20 rows
```

---

### Grouping

#### `.groupBy(fn)`

Add GROUP BY clause.

```typescript
db.order()
  .select((o) => ({
    userId: o.userId,
    totalAmount: expr.sum(o.amount),
  }))
  .groupBy((o) => [o.userId])
```

#### `.having(predicate)`

Add HAVING clause (filter after GROUP BY).

```typescript
db.order()
  .select((o) => ({
    userId: o.userId,
    totalAmount: expr.sum(o.amount),
  }))
  .groupBy((o) => [o.userId])
  .having((o) => [expr.gte(o.totalAmount, 10000)])
```

---

### JOIN

#### `.join(as, fn)` -- 1:N JOIN

LEFT OUTER JOIN that adds results as an array property.

```typescript
db.user().join("posts", (qr, u) =>
  qr.from(Post).where((p) => [expr.eq(p.authorId, u.id)])
)
// Result: { id, name, posts: [{ id, title }, ...] }
```

#### `.joinSingle(as, fn)` -- N:1 / 1:1 JOIN

LEFT OUTER JOIN that adds results as a single object property.

```typescript
db.post().joinSingle("author", (qr, p) =>
  qr.from(User).where((u) => [expr.eq(u.id, p.authorId)])
)
// Result: { id, title, author: { id, name } | undefined }
```

#### `.include(fn)` -- Automatic Relation JOIN

Automatically JOIN based on relations defined in `TableBuilder.relations()`.

```typescript
// Single relation
db.post().include((p) => p.author)

// Nested relation
db.post().include((p) => p.author.company)

// Multiple relations (chain include calls)
db.user()
  .include((u) => u.company)
  .include((u) => u.posts)
```

---

### Subquery and UNION

#### `.wrap()`

Wrap current Queryable as a subquery. Required before `count()` after `distinct()` or `groupBy()`.

```typescript
const count = await db.user()
  .select((u) => ({ name: u.name }))
  .distinct()
  .wrap()
  .count();
```

#### `Queryable.union(...queries)`

Combine multiple Queryables with UNION ALL.

```typescript
const combined = Queryable.union(
  db.user().where((u) => [expr.eq(u.type, "admin")]),
  db.user().where((u) => [expr.eq(u.type, "manager")]),
);
```

---

### Recursive CTE

#### `.recursive(fn)`

Build recursive Common Table Expressions for hierarchical data.

```typescript
db.employee()
  .where((e) => [expr.null(e.managerId)]) // base case: root nodes
  .recursive((cte) =>
    cte.from(Employee)
      .where((e) => [expr.eq(e.managerId, e.self[0].id)])
  )
```

---

### Execution -- SELECT

#### `.execute()`

Execute SELECT and return result array.

```typescript
const users: User[] = await db.user()
  .where((u) => [expr.eq(u.isActive, true)])
  .execute();
```

#### `.single()`

Return single result. Throws if more than one result.

```typescript
const user = await db.user()
  .where((u) => [expr.eq(u.id, 1)])
  .single();
// returns User | undefined
```

#### `.first()`

Return first result (ignores additional results).

```typescript
const latest = await db.user()
  .orderBy((u) => u.createdAt, "DESC")
  .first();
```

#### `.count(fn?)`

Return row count. Cannot be used directly after `distinct()` or `groupBy()` (use `wrap()` first).

```typescript
const count = await db.user()
  .where((u) => [expr.eq(u.isActive, true)])
  .count();
```

#### `.exists()`

Check if any matching rows exist.

```typescript
const hasAdmin = await db.user()
  .where((u) => [expr.eq(u.role, "admin")])
  .exists();
```

---

### Execution -- INSERT

#### `.insert(records, outputColumns?)`

Insert records. Automatically chunks into batches of 1000 (MSSQL limit).

```typescript
// Simple insert
await db.user().insert([
  { name: "Alice", email: "alice@test.com" },
  { name: "Bob" },
]);

// Insert with output (get auto-generated IDs)
const inserted = await db.user().insert(
  [{ name: "Alice" }],
  ["id"],
);
// inserted[0].id
```

#### `.insertIfNotExists(record, outputColumns?)`

Insert only if WHERE condition matches no rows.

```typescript
await db.user()
  .where((u) => [expr.eq(u.email, "test@test.com")])
  .insertIfNotExists({ name: "Test", email: "test@test.com" });
```

#### `.insertInto(targetTable, outputColumns?)`

INSERT INTO ... SELECT (copy current query results into another table).

```typescript
await db.user()
  .select((u) => ({ name: u.name, createdAt: u.createdAt }))
  .where((u) => [expr.eq(u.isArchived, false)])
  .insertInto(ArchivedUser);
```

---

### Execution -- UPDATE

#### `.update(recordFn, outputColumns?)`

Update matching rows. The callback receives current column values for reference.

```typescript
await db.user()
  .where((u) => [expr.eq(u.id, 1)])
  .update(() => ({
    name: expr.val("string", "New Name"),
  }));
```

---

### Execution -- DELETE

#### `.delete(outputColumns?)`

Delete matching rows.

```typescript
await db.user()
  .where((u) => [expr.eq(u.status, "deleted")])
  .delete();
```

---

### Execution -- UPSERT

#### `.upsert(record, outputColumns?)`

INSERT or UPDATE (MERGE pattern). Requires a WHERE condition to check existence.

```typescript
await db.user()
  .where((u) => [expr.eq(u.email, "test@test.com")])
  .upsert({
    insert: { name: "Test", email: "test@test.com" },
    update: { name: expr.val("string", "Updated") },
  });
```

---

### QueryDef Accessors

Each execution method has a corresponding `get*QueryDef()` method that returns the raw `QueryDef` without executing it:

- `getSelectQueryDef()` -- Returns `SelectQueryDef`
- `getInsertQueryDef(records, outputColumns?)` -- Returns `InsertQueryDef`
- `getInsertIfNotExistsQueryDef(record, outputColumns?)` -- Returns `InsertIfNotExistsQueryDef`
- `getInsertIntoQueryDef(targetTable, outputColumns?)` -- Returns `InsertIntoQueryDef`
- `getResultMeta(outputColumns?)` -- Returns `ResultMeta` for type parsing

---

## Usage Examples

### Complex Query with Multiple Features

```typescript
const result = await db.order()
  .include((o) => o.customer)
  .where((o) => [
    expr.gte(o.createdAt, expr.val("DateTime", startDate)),
    expr.eq(o.status, "completed"),
  ])
  .select((o) => ({
    orderId: o.id,
    customerName: o.customer.name,
    total: o.totalAmount,
  }))
  .orderBy((o) => o.total, "DESC")
  .limit(0, 50)
  .execute();
```

### Aggregation with GROUP BY

```typescript
const stats = await db.order()
  .select((o) => ({
    month: expr.month(o.createdAt),
    year: expr.year(o.createdAt),
    totalRevenue: expr.sum(o.amount),
    orderCount: expr.count(),
  }))
  .groupBy((o) => [o.month, o.year])
  .orderBy((o) => o.year)
  .orderBy((o) => o.month)
  .execute();
```
