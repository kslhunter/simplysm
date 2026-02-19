# DbContext Functional Refactoring Design

## Overview

Convert `orm-common`'s class-based `DbContext` to a functional pattern using `defineDbContext` + `createDbContext` factory functions, aligning with the project's ongoing functional refactoring direction (e.g., service-server's `defineService`).

## Goals

- **Consistency**: Align with `Table()`, `View()`, `defineService()` factory function patterns
- **DX improvement**: Replace class inheritance with config object — simpler, less boilerplate
- **Type safety**: Auto-infer queryable types from `tables` config — no manual `queryable(this, User)` declarations
- **Extensibility**: Compose DDL logic separately; DbContext core focuses on connection/transaction/query

## Design

### 1. Definition (`defineDbContext`)

Defines the database schema blueprint. Called once, produces a `DbContextDef`.

```typescript
// Before (class-based)
class MyDb extends DbContext {
  readonly user = queryable(this, User);
  readonly post = queryable(this, Post);
  readonly migrations: Migration[] = [
    { name: "20240101_add_status", up: async (db) => { ... } },
  ];
}

// After (functional)
const MyDb = defineDbContext({
  tables: {
    user: User,       // TableBuilder
    post: Post,       // TableBuilder
  },
  views: {
    userSummary: UserSummary,   // ViewBuilder (optional)
  },
  migrations: [
    { name: "20240101_add_status", up: async (db) => { ... } },
  ],
});
```

**Key changes:**
- `class extends DbContext` → `defineDbContext()` call
- `queryable(this, User)` → declared in `tables` property
- No `this` reference — `defineDbContext` handles context binding internally
- Type inference: queryable types auto-derived from `tables` keys and `TableBuilder` generics

### 2. Instance Creation (`createDbContext`)

Creates a runtime instance with executor and database options. Called per-connection.

```typescript
const db = createDbContext(MyDb, executor, { database: "mydb", schema: "public" });
```

The `db` object provides:

```typescript
// Queryable access (auto-generated from tables config)
db.user()              // → Queryable<{ id: bigint; name: string }, typeof User>
db.post()              // → Queryable<{ id: bigint; title: string }, typeof Post>
db.systemMigration()   // → Built-in migration tracking table

// Connection / Transaction
await db.connect(fn, isolationLevel?)
await db.connectWithoutTransaction(fn)
await db.trans(fn, isolationLevel?)

// DDL (same API as current — no breaking change)
await db.createTable(User)
await db.addColumn(tableDef, "status", c.varchar(20))
await db.addFk(tableDef, "author", ForeignKey(User, ["authorId"]))
await db.dropTable(tableDef)
// ... all existing DDL methods

// Query execution
await db.executeDefs(defs, resultMetas?)

// Initialization
await db.initialize({ force: true })

// State / Metadata
db.status       // "ready" | "connect" | "transact"
db.database     // string
db.schema       // string | undefined
```

**Implementation**: Returns a plain object (not a class instance). All methods are closures over internal state (executor, alias counter, status).

### 3. Type System

```typescript
// Core types
type DbContextDef<
  TTables extends Record<string, TableBuilder<any, any>>,
  TViews extends Record<string, ViewBuilder<any, any, any>> = {},
> = {
  readonly meta: {
    tables: TTables;
    views: TViews;
    migrations: Migration[];
  };
};

// Instance type — auto-maps tables to queryable methods
type DbContextInstance<TDef extends DbContextDef<any, any>> = {
  [K in keyof TDef["meta"]["tables"]]: () => Queryable<
    InferTableData<TDef["meta"]["tables"][K]>,
    TDef["meta"]["tables"][K]
  >;
} & {
  connect: <R>(fn: () => Promise<R>, isolationLevel?: IsolationLevel) => Promise<R>;
  connectWithoutTransaction: <R>(fn: () => Promise<R>) => Promise<R>;
  trans: <R>(fn: () => Promise<R>, isolationLevel?: IsolationLevel) => Promise<R>;
  executeDefs: <T = DataRecord>(defs: QueryDef[], resultMetas?: (ResultMeta | undefined)[]) => Promise<T[][]>;
  initialize: (options?: { dbs?: string[]; force?: boolean }) => Promise<void>;
  // DDL methods...
  createTable: (table: TableBuilder<any, any>) => Promise<void>;
  addColumn: (table: QueryDefObjectName, columnName: string, column: ColumnBuilder<any, any>) => Promise<void>;
  // ... remaining DDL methods
  status: DbContextStatus;
  database: string | undefined;
  schema: string | undefined;
};
```

**Type safety improvement**: Current pattern requires manual `queryable(this, User)` per table — type mismatch possible. Functional pattern infers all queryable types from the single `tables` config object.

### 4. DDL Internal Separation

DDL methods remain on the `db` object (no external API change), but implementation is split into separate modules:

```
orm-common/src/
├── define-db-context.ts       # defineDbContext() factory
├── create-db-context.ts       # createDbContext() factory
│                                (connection, transaction, state, queryable binding)
├── ddl/
│   ├── table-ddl.ts           # createTable, dropTable, renameTable, getCreate*QueryDef
│   ├── column-ddl.ts          # addColumn, dropColumn, modifyColumn, renameColumn
│   ├── relation-ddl.ts        # addPk, dropPk, addFk, dropFk, addIdx, dropIdx
│   ├── schema-ddl.ts          # clearSchema, schemaExists, truncate, switchFk
│   └── initialize.ts          # initialize() logic
├── exec/                      # (existing) queryable, executable
├── schema/                    # (existing) table-builder, view-builder, ...
└── types/                     # (existing) + DbContextDef, DbContextInstance types
```

`createDbContext` composes DDL functions into the returned `db` object.

### 5. Migration Support

No change in migration interface:

```typescript
const MyDb = defineDbContext({
  tables: { user: User, post: Post },
  migrations: [
    {
      name: "20240101_add_status",
      up: async (db) => {
        // db is DbContextInstance — DDL methods available
        await db.addColumn(
          { database: "mydb", name: "User" },
          "status",
          c.varchar(20).nullable(),
        );
      },
    },
  ],
});
```

### 6. SdOrm Integration (orm-node)

External API unchanged. Internal type changes only:

```typescript
// Before
class SdOrm<T extends DbContext> {
  constructor(private _dbContextType: Type<T>, config: DbConnConfig) {}
  async connect<R>(callback: (db: T) => Promise<R>): Promise<R> {
    const db = new this._dbContextType(executor, opts);
    return db.connect(() => callback(db));
  }
}

// After
class SdOrm<TDef extends DbContextDef<any, any>> {
  constructor(private _def: TDef, config: DbConnConfig) {}
  async connect<R>(callback: (db: DbContextInstance<TDef>) => Promise<R>): Promise<R> {
    const db = createDbContext(this._def, executor, opts);
    return db.connect(() => callback(db));
  }
}
```

Usage remains identical:
```typescript
const orm = new SdOrm(MyDb, config);
await orm.connect(async (db) => {
  const users = await db.user().result();
});
```

## Breaking Changes

| Area | Change | Impact |
|------|--------|--------|
| DbContext definition | `class extends` → `defineDbContext()` | **High** (all definition sites) |
| DbContext creation | `new MyDb(executor, opts)` → `createDbContext(MyDb, executor, opts)` | **Medium** (SdOrm internal) |
| Queryable usage | `db.user().result()` → same | None |
| DDL usage | `db.createTable()` → same | None |
| Migration | `up: (db) => { db.addColumn() }` → same | None |
| SdOrm | `new SdOrm(MyDb, config)` → same (type change only) | **Low** |

## Scope

- **In scope**: `orm-common` DbContext refactoring (define + create + DDL separation)
- **Out of scope**: SdOrm functional conversion (orm-node), Queryable/Executable refactoring

## Decisions

- DDL methods stay on `db` object (not standalone functions) — familiar API, minimal breaking change
- `defineDbContext` = schema blueprint, `createDbContext` = runtime instance — clear separation
- Internal DDL logic split into `ddl/` subdirectory for maintainability
- `abstract class DbContext` removed — replaced by plain object factory
