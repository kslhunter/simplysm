# Schema Builders

## `Table(name)`

Factory function that creates a `TableBuilder` with a fluent API for defining a database table's columns, primary key, indexes, and relationships.

```typescript
import { Table } from "@simplysm/orm-common";

const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    status: c.varchar(20).default("active"),
  }))
  .primaryKey("id")
  .indexes((i) => [
    i.index("email").unique(),
  ]);
```

---

## `TableBuilder<TColumns, TRelations>`

Immutable builder class for table schema definitions. All methods return a new `TableBuilder` instance.

| Method | Description |
|---|---|
| `description(desc)` | Set table description (DDL comment) |
| `database(db)` | Set database name |
| `schema(schema)` | Set schema name (MSSQL/PostgreSQL) |
| `columns(fn)` | Define columns via column factory |
| `primaryKey(...columns)` | Set primary key columns |
| `indexes(fn)` | Define indexes via index factory |
| `relations(fn)` | Define relationships via relation factory |

**Type inference properties**

| Property | Type | Description |
|---|---|---|
| `$infer` | `InferColumns<TColumns> & InferDeepRelations<TRelations>` | Full row type (columns + relations) |
| `$inferColumns` | `InferColumns<TColumns>` | Column-only row type |
| `$inferInsert` | `InferInsertColumns<TColumns>` | INSERT type (auto-increment/nullable/default fields optional) |
| `$inferUpdate` | `InferUpdateColumns<TColumns>` | UPDATE type (all fields optional) |

---

## `View(name)`

Factory function that creates a `ViewBuilder`.

```typescript
import { View } from "@simplysm/orm-common";

const ActiveUsers = View("ActiveUsers")
  .database("mydb")
  .query((db: MyDb) =>
    db.user()
      .where((u) => [expr.eq(u.status, "active")])
      .select((u) => ({ id: u.id, name: u.name }))
  );
```

---

## `ViewBuilder<TDbContext, TData, TRelations>`

Immutable builder class for database view schema definitions.

| Method | Description |
|---|---|
| `description(desc)` | Set view description |
| `database(db)` | Set database name |
| `schema(schema)` | Set schema name |
| `query(viewFn)` | Define view query as a `Queryable` |
| `relations(fn)` | Define relationships |

---

## `Procedure(name)`

Factory function that creates a `ProcedureBuilder`.

```typescript
import { Procedure } from "@simplysm/orm-common";

const GetUserById = Procedure("GetUserById")
  .database("mydb")
  .params((c) => ({ userId: c.bigint() }))
  .returns((c) => ({ id: c.bigint(), name: c.varchar(100) }))
  .body("SELECT id, name FROM User WHERE id = userId");
```

---

## `ProcedureBuilder<TParams, TReturns>`

Immutable builder class for stored procedure schema definitions.

| Method | Description |
|---|---|
| `description(desc)` | Set procedure description |
| `database(db)` | Set database name |
| `schema(schema)` | Set schema name |
| `params(fn)` | Define input parameters via column factory |
| `returns(fn)` | Define return columns via column factory |
| `body(sql)` | Set procedure body SQL |

---

## `ColumnBuilder<TValue, TMeta>`

Column definition builder. Created by the column factory passed to `TableBuilder.columns()`, `ProcedureBuilder.params()`, and `ProcedureBuilder.returns()`.

| Method | Description |
|---|---|
| `autoIncrement()` | Mark column as auto-increment |
| `nullable()` | Allow NULL (adds `undefined` to TypeScript type) |
| `default(value)` | Set default value |
| `description(desc)` | Set column description (DDL comment) |

---

## `createColumnFactory()`

Returns a column factory object with methods for each supported SQL data type. Used inside `columns()`, `params()`, and `returns()` callbacks.

**Supported column types**

| Method | SQL Type | TypeScript Type |
|---|---|---|
| `c.int()` | INT | `number` |
| `c.bigint()` | BIGINT | `number` |
| `c.float()` | FLOAT | `number` |
| `c.double()` | DOUBLE | `number` |
| `c.decimal(precision, scale?)` | DECIMAL(p, s) | `number` |
| `c.varchar(length)` | VARCHAR(n) | `string` |
| `c.char(length)` | CHAR(n) | `string` |
| `c.text()` | TEXT / LONGTEXT | `string` |
| `c.binary()` | LONGBLOB / VARBINARY(MAX) / BYTEA | `Bytes` |
| `c.boolean()` | TINYINT(1) / BIT / BOOLEAN | `boolean` |
| `c.datetime()` | DATETIME | `DateTime` |
| `c.date()` | DATE | `DateOnly` |
| `c.time()` | TIME | `Time` |
| `c.uuid()` | BINARY(16) / UNIQUEIDENTIFIER / UUID | `Uuid` |

---

## `IndexBuilder<TKeys>`

Index definition builder. Created by the index factory passed to `TableBuilder.indexes()`.

| Method | Description |
|---|---|
| `name(name)` | Set custom index name |
| `unique()` | Mark as unique index |
| `orderBy(...dirs)` | Set per-column sort direction (`"ASC"` or `"DESC"`) |
| `description(desc)` | Set index description |

---

## `createIndexFactory<TColumnKey>()`

Returns an index factory used inside `TableBuilder.indexes()` callbacks.

```typescript
Table("User")
  .indexes((i) => [
    i.index("email").unique(),
    i.index("name", "createdAt").orderBy("ASC", "DESC"),
  ]);
```

---

## `ForeignKeyBuilder<TOwner, TTargetFn>`

N:1 foreign key relationship builder. Creates a real DB FK constraint. Used inside `TableBuilder.relations()`.

```typescript
const Post = Table("Post")
  .relations((r) => ({
    author: r.foreignKey(["authorId"], () => User),
  }));
```

| Method | Description |
|---|---|
| `description(desc)` | Set relationship description |

---

## `ForeignKeyTargetBuilder<TTargetTableFn, TIsSingle>`

1:N back-reference builder. Defines the inverse side of a `ForeignKeyBuilder` relationship.

```typescript
const User = Table("User")
  .relations((r) => ({
    posts: r.foreignKeyTarget(() => Post, "author"),
    profile: r.foreignKeyTarget(() => Profile, "user").single(),
  }));
```

| Method | Description |
|---|---|
| `description(desc)` | Set relationship description |
| `single()` | Mark as 1:1 (single object instead of array) |

---

## `RelationKeyBuilder<TOwner, TTargetFn>`

N:1 logical relationship builder. Same as `ForeignKeyBuilder` but does **not** create a DB FK constraint. Can be used on views.

```typescript
const UserSummary = View("UserSummary")
  .query(...)
  .relations((r) => ({
    company: r.relationKey(["companyId"], () => Company),
  }));
```

| Method | Description |
|---|---|
| `description(desc)` | Set relationship description |

---

## `RelationKeyTargetBuilder<TTargetTableFn, TIsSingle>`

1:N back-reference builder (no DB FK). Same as `ForeignKeyTargetBuilder` but without a FK constraint.

| Method | Description |
|---|---|
| `description(desc)` | Set relationship description |
| `single()` | Mark as 1:1 |

---

## `createRelationFactory<TOwner, TColumnKey>(ownerFn)`

Returns a relation factory used inside `TableBuilder.relations()` and `ViewBuilder.relations()` callbacks.

- Tables get access to: `foreignKey`, `foreignKeyTarget`, `relationKey`, `relationKeyTarget`
- Views get access to: `relationKey`, `relationKeyTarget` only

---

## Related types

- [`ColumnMeta`](./types.md#columnmeta)
- [`ColumnBuilderRecord`](./types.md#columnbuilderrecord)
- [`InferColumns`](./types.md#infercolumns)
- [`InferInsertColumns`](./types.md#inferinsertcolumns)
- [`InferUpdateColumns`](./types.md#inferupdatecolumns)
- [`RelationBuilderRecord`](./types.md#relationbuilderrecord)
- [`InferDeepRelations`](./types.md#inferdeeprelations)
- [`ExtractRelationTarget`](./types.md#extractrelationtarget)
- [`ExtractRelationTargetResult`](./types.md#extractrelationtargetresult)
