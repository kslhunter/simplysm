# Schema Definition

## Table Definition

Define table schema using the `Table()` factory function and Fluent API.

```typescript
import { Table } from "@simplysm/orm-common";

const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    isActive: c.boolean().default(true),
    createdAt: c.datetime(),
  }))
  .primaryKey("id")
  .indexes((i) => [
    i.index("email").unique(),
    i.index("name", "createdAt").orderBy("ASC", "DESC"),
  ]);
```

## Column Types

| Factory Method | SQL Type | TypeScript Type |
|--------------|----------|----------------|
| `c.int()` | INT | `number` |
| `c.bigint()` | BIGINT | `number` |
| `c.float()` | FLOAT | `number` |
| `c.double()` | DOUBLE | `number` |
| `c.decimal(p, s)` | DECIMAL(p, s) | `number` |
| `c.varchar(n)` | VARCHAR(n) | `string` |
| `c.char(n)` | CHAR(n) | `string` |
| `c.text()` | TEXT | `string` |
| `c.boolean()` | BOOLEAN / BIT / TINYINT(1) | `boolean` |
| `c.datetime()` | DATETIME | `DateTime` |
| `c.date()` | DATE | `DateOnly` |
| `c.time()` | TIME | `Time` |
| `c.uuid()` | UUID / UNIQUEIDENTIFIER / BINARY(16) | `Uuid` |
| `c.binary()` | BLOB / VARBINARY(MAX) / BYTEA | `Bytes` |

> **Important:** `c.int()` and `c.bigint()` both map to TypeScript `number`, **not** JavaScript's native `BigInt`.
> The names `int` / `bigint` refer to SQL data types (storage size), not JavaScript types.
> Do not use `BigInt` literals (e.g. `1n`) or the `bigint` TypeScript type with this ORM.

## Column Options

| Method | Description |
|--------|------|
| `.autoIncrement()` | Auto increment (optional on INSERT) |
| `.nullable()` | Allow NULL (adds `undefined` to type) |
| `.default(value)` | Set default value (optional on INSERT) |
| `.description(text)` | Column description (DDL comment) |

## Relationship Definition

Define relationships between tables to enable automatic JOINs via `include()`.

```typescript
const Post = Table("Post")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    authorId: c.bigint(),
    title: c.varchar(200),
    content: c.text(),
  }))
  .primaryKey("id")
  .relations((r) => ({
    // N:1 relationship - Post.authorId → User.id (creates DB FK)
    author: r.foreignKey(["authorId"], () => User),
  }));

const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
  }))
  .primaryKey("id")
  .relations((r) => ({
    // 1:N reverse reference - User ← Post.author
    posts: r.foreignKeyTarget(() => Post, "author"),

    // 1:1 relationship (single object)
    profile: r.foreignKeyTarget(() => Profile, "user").single(),
  }));
```

### Relationship Builder Types

| Method | Cardinality | Creates DB FK | Available For |
|--------|-----------|-----------|--------------|
| `r.foreignKey(cols, targetFn)` | N:1 | Yes | Table |
| `r.foreignKeyTarget(targetFn, relName)` | 1:N | - | Table |
| `r.relationKey(cols, targetFn)` | N:1 | No | Table, View |
| `r.relationKeyTarget(targetFn, relName)` | 1:N | - | Table, View |

Calling `.single()` on `foreignKeyTarget` / `relationKeyTarget` establishes a 1:1 relationship (returns single object instead of array).

## DbContext Configuration

Register tables and procedures by extending `DbContext`.

```typescript
import { DbContext, queryable, executable, expr } from "@simplysm/orm-common";

class MyDb extends DbContext {
  readonly user = queryable(this, User);
  readonly post = queryable(this, Post);
  readonly getUserById = executable(this, GetUserById);

  // Migration definitions
  readonly migrations = [
    {
      name: "20260101_add_status",
      up: async (db: MyDb) => {
        const c = createColumnFactory();
        await db.addColumn(
          { database: "mydb", name: "User" },
          "status",
          c.varchar(20).nullable(),
        );
      },
    },
  ];
}
```

## View Definition

```typescript
import { View, expr } from "@simplysm/orm-common";

const ActiveUsers = View("ActiveUsers")
  .database("mydb")
  .query((db: MyDb) =>
    db.user()
      .where((u) => [expr.eq(u.isActive, true)])
      .select((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
      }))
  );

// Define logical relationships on views (no DB FK)
const UserSummary = View("UserSummary")
  .database("mydb")
  .query((db: MyDb) =>
    db.user().select((u) => ({
      id: u.id,
      name: u.name,
      companyId: u.companyId,
    }))
  )
  .relations((r) => ({
    company: r.relationKey(["companyId"], () => Company),
  }));
```

## Procedure Definition

```typescript
import { Procedure, executable } from "@simplysm/orm-common";

const GetUserById = Procedure("GetUserById")
  .database("mydb")
  .params((c) => ({
    userId: c.bigint(),
  }))
  .returns((c) => ({
    id: c.bigint(),
    name: c.varchar(100),
    email: c.varchar(200),
  }))
  .body("SELECT id, name, email FROM User WHERE id = userId");

// Register in DbContext
class MyDb extends DbContext {
  readonly getUserById = executable(this, GetUserById);
}

// Invoke
const result = await db.getUserById().execute({ userId: 1 });
```

## Type Inference

`TableBuilder` automatically infers types from column definitions.

```typescript
const User = Table("User")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    status: c.varchar(20).default("active"),
  }))
  .primaryKey("id");

// $infer: Full type (columns + relations)
type UserData = typeof User.$infer;
// { id: number; name: string; email: string | undefined; status: string; }

// $inferInsert: For INSERT (autoIncrement/nullable/default are optional)
type UserInsert = typeof User.$inferInsert;
// { name: string; } & { id?: number; email?: string; status?: string; }

// $inferUpdate: For UPDATE (all fields optional)
type UserUpdate = typeof User.$inferUpdate;
// { id?: number; name?: string; email?: string; status?: string; }
```
