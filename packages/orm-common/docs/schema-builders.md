# Schema Builders

Define database tables, views, and stored procedures with a fluent, type-safe API.

## API Reference

### `Table(name)`

Factory function that creates a `TableBuilder` for defining table schemas.

```typescript
function Table(name: string): TableBuilder<{}, {}>
```

#### TableBuilder Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `description(desc)` | `.description(desc: string)` | Set table description (DDL comment) |
| `database(db)` | `.database(db: string)` | Set database name |
| `schema(schema)` | `.schema(schema: string)` | Set schema name (MSSQL: `dbo`, PostgreSQL: `public`) |
| `columns(fn)` | `.columns((c) => ({...}))` | Define columns using column factory |
| `primaryKey(...cols)` | `.primaryKey("col1", "col2")` | Set primary key (single or composite) |
| `indexes(fn)` | `.indexes((i) => [...])` | Define indexes |
| `relations(fn)` | `.relations((r) => ({...}))` | Define relationships (FK, reverse FK, logical relations) |

#### Type Inference Properties

| Property | Description |
|----------|-------------|
| `$inferSelect` | Full type (columns + deep relations) |
| `$inferColumns` | Columns only |
| `$inferInsert` | Insert type (autoIncrement/nullable/default fields are optional) |
| `$inferUpdate` | Update type (all fields optional) |

---

### `View(name)`

Factory function that creates a `ViewBuilder` for defining database views.

```typescript
function View(name: string): ViewBuilder<any, {}, {}>
```

#### ViewBuilder Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `description(desc)` | `.description(desc: string)` | Set view description |
| `database(db)` | `.database(db: string)` | Set database name |
| `schema(schema)` | `.schema(schema: string)` | Set schema name |
| `query(viewFn)` | `.query((db) => db.table().select(...))` | Define view SELECT query |
| `relations(fn)` | `.relations((r) => ({...}))` | Define relationships (logical only, no FK) |

---

### `Procedure(name)`

Factory function that creates a `ProcedureBuilder` for defining stored procedures.

```typescript
function Procedure(name: string): ProcedureBuilder<never, never>
```

#### ProcedureBuilder Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `description(desc)` | `.description(desc: string)` | Set procedure description |
| `database(db)` | `.database(db: string)` | Set database name |
| `schema(schema)` | `.schema(schema: string)` | Set schema name |
| `params(fn)` | `.params((c) => ({...}))` | Define input parameters |
| `returns(fn)` | `.returns((c) => ({...}))` | Define return columns |
| `body(sql)` | `.body("SELECT ...")` | Set procedure body SQL |

---

### Column Factory

The column factory (`c`) is provided inside `.columns()` and `.params()`/`.returns()` callbacks.

#### Column Types

| Method | SQL Type | TypeScript Type | Notes |
|--------|----------|-----------------|-------|
| `c.int()` | INT | `number` | 4 bytes |
| `c.bigint()` | BIGINT | `number` | 8 bytes |
| `c.float()` | FLOAT | `number` | Single precision |
| `c.double()` | DOUBLE | `number` | Double precision |
| `c.decimal(p, s)` | DECIMAL(p,s) | `number` | Fixed-point |
| `c.varchar(len)` | VARCHAR(len) | `string` | Variable-length string |
| `c.char(len)` | CHAR(len) | `string` | Fixed-length string |
| `c.text()` | TEXT | `string` | Large text |
| `c.binary()` | BLOB/VARBINARY/BYTEA | `Bytes` | Binary data |
| `c.boolean()` | TINYINT(1)/BIT/BOOLEAN | `boolean` | |
| `c.datetime()` | DATETIME | `DateTime` | Date + time |
| `c.date()` | DATE | `DateOnly` | Date only |
| `c.time()` | TIME | `Time` | Time only |
| `c.uuid()` | BINARY(16)/UNIQUEIDENTIFIER/UUID | `Uuid` | |

#### Column Modifiers

| Method | Description |
|--------|-------------|
| `.autoIncrement()` | Auto-increment (optional in INSERT inference) |
| `.nullable()` | Allow NULL (adds `undefined` to type) |
| `.default(value)` | Set default value (optional in INSERT inference) |
| `.description(desc)` | Set column comment |

---

### Index Factory

The index factory (`i`) is provided inside `.indexes()` callbacks.

```typescript
i.index("col1", "col2")     // Create index on columns
  .unique()                  // Make unique
  .orderBy("ASC", "DESC")   // Set sort order per column
  .name("IX_Custom_Name")   // Custom index name
  .description("desc")      // Description
```

---

### Relation Factory

The relation factory (`r`) is provided inside `.relations()` callbacks.

| Method | Type | Description |
|--------|------|-------------|
| `r.foreignKey(cols, targetFn)` | N:1 | FK constraint created in DB |
| `r.foreignKeyTarget(targetFn, relName)` | 1:N | Reverse FK reference (array by default) |
| `r.relationKey(cols, targetFn)` | N:1 | Logical relation (no DB FK) |
| `r.relationKeyTarget(targetFn, relName)` | 1:N | Logical reverse reference |

Both `foreignKeyTarget` and `relationKeyTarget` support `.single()` to indicate a 1:1 relationship (returns single object instead of array).

---

## Usage Examples

### Complete Table Definition

```typescript
const User = Table("User")
  .database("mydb")
  .description("Application users")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    status: c.varchar(20).default("active"),
    createdAt: c.datetime().default("CURRENT_TIMESTAMP"),
  }))
  .primaryKey("id")
  .indexes((i) => [
    i.index("email").unique(),
    i.index("status", "createdAt").orderBy("ASC", "DESC"),
  ]);
```

### Table with Relations

```typescript
const Post = Table("Post")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    authorId: c.bigint(),
    title: c.varchar(200),
  }))
  .primaryKey("id")
  .relations((r) => ({
    author: r.foreignKey(["authorId"], () => User),
  }));

const User = Table("User")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
  }))
  .primaryKey("id")
  .relations((r) => ({
    posts: r.foreignKeyTarget(() => Post, "author"),
    profile: r.foreignKeyTarget(() => Profile, "user").single(),
  }));
```

### View Definition

```typescript
const ActiveUsers = View("ActiveUsers")
  .database("mydb")
  .query((db: MyDb) =>
    db.user()
      .where((u) => [expr.eq(u.status, "active")])
      .select((u) => ({ id: u.id, name: u.name, email: u.email }))
  );
```

### Procedure Definition

```typescript
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
```
