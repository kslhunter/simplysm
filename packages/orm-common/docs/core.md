# Core — defineDbContext, createDbContext

## `defineDbContext(config)`

Defines a database context blueprint from tables, views, procedures, and migrations. The returned `DbContextDef` object contains only metadata — no runtime state. The built-in `_Migration` system table is automatically added.

```typescript
import { defineDbContext, Table } from "@simplysm/orm-common";

const User = Table("User")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
  }))
  .primaryKey("id");

const MyDbDef = defineDbContext({
  tables: { user: User },
  migrations: [],
});
```

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `config.tables` | `Record<string, TableBuilder>` | Table definitions |
| `config.views` | `Record<string, ViewBuilder>` | View definitions |
| `config.procedures` | `Record<string, ProcedureBuilder>` | Procedure definitions |
| `config.migrations` | `Migration[]` | Ordered migration steps |

**Returns** `DbContextDef<TTables & { _migration }, TViews, TProcedures>`

---

## `createDbContext(def, executor, opt)`

Creates a fully operational `DbContextInstance` from a `DbContextDef` and an executor. The instance provides queryable/executable accessors for each registered table/view/procedure, as well as DDL methods and connection management.

```typescript
import { createDbContext } from "@simplysm/orm-common";

const db = createDbContext(MyDbDef, executor, { database: "mydb" });

await db.connect(async () => {
  const users = await db.user().result();
});
```

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `def` | `DbContextDef` | Definition created by `defineDbContext()` |
| `executor` | `DbContextExecutor` | Query executor implementation |
| `opt.database` | `string` | Database name |
| `opt.schema` | `string?` | Schema name (MSSQL: `dbo`, PostgreSQL: `public`) |

**Returns** `DbContextInstance<TDef>`

The returned instance has:
- Auto-mapped `() => Queryable` accessor for each table key
- Auto-mapped `() => Queryable` accessor for each view key
- Auto-mapped `() => Executable` accessor for each procedure key
- Connection management methods: `connect`, `connectWithoutTransaction`, `trans`
- DDL execution methods: `createTable`, `dropTable`, `addColumn`, etc.
- DDL QueryDef generator methods: `getCreateTableQueryDef`, etc.
- `initialize(options?)` — runs pending migrations

**Connection management methods**

| Method | Description |
|---|---|
| `connect(fn, isolationLevel?)` | Open connection, begin transaction, execute `fn`, commit. Auto-rollback on error. |
| `connectWithoutTransaction(fn)` | Open connection, execute `fn`, close. No transaction. |
| `trans(fn, isolationLevel?)` | Begin transaction on already-connected context. |

**DDL execution methods** (all return `Promise<void>` unless noted)

| Method | Description |
|---|---|
| `createTable(table)` | CREATE TABLE |
| `dropTable(table)` | DROP TABLE |
| `renameTable(table, newName)` | RENAME TABLE |
| `createView(view)` | CREATE VIEW |
| `dropView(view)` | DROP VIEW |
| `createProc(procedure)` | CREATE PROCEDURE |
| `dropProc(procedure)` | DROP PROCEDURE |
| `addColumn(table, columnName, column)` | ADD COLUMN |
| `dropColumn(table, column)` | DROP COLUMN |
| `modifyColumn(table, columnName, column)` | MODIFY COLUMN |
| `renameColumn(table, column, newName)` | RENAME COLUMN |
| `addPk(table, columns)` | ADD PRIMARY KEY |
| `dropPk(table)` | DROP PRIMARY KEY |
| `addFk(table, relationName, relationDef)` | ADD FOREIGN KEY |
| `dropFk(table, relationName)` | DROP FOREIGN KEY |
| `addIdx(table, indexBuilder)` | CREATE INDEX |
| `dropIdx(table, columns)` | DROP INDEX |
| `clearSchema(params)` | Drop all objects in schema |
| `schemaExists(database, schema?)` | Returns `Promise<boolean>` |
| `truncate(table)` | TRUNCATE TABLE |
| `switchFk(table, "on"\|"off")` | Enable/disable FK constraints |
| `initialize(options?)` | Run pending migrations |

---

## `_Migration`

Built-in system table used to track applied migrations. Automatically added to every `DbContextDef` by `defineDbContext()`. Accessible as `db._migration()` on any `DbContextInstance`.

```typescript
// Table definition (internal)
const _Migration = Table("_Migration")
  .columns((c) => ({ code: c.varchar(255) }))
  .primaryKey("code");
```

---

## Related types

- [`DbContextDef`](./types.md#dbcontextdef)
- [`DbContextInstance`](./types.md#dbcontextinstance)
- [`DbContextBase`](./types.md#dbcontextbase)
- [`DbContextStatus`](./types.md#dbcontextstatus)
- [`DbContextConnectionMethods`](./types.md#dbcontextconnectionmethods)
- [`DbContextDdlMethods`](./types.md#dbcontextddlmethods)
- [`DbContextExecutor`](./types.md#dbcontextexecutor)
- [`Migration`](./types.md#migration)
