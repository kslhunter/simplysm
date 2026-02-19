# DbContext Functional Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Convert `orm-common`'s class-based `DbContext` to functional `defineDbContext` + `createDbContext` pattern.

**Architecture:** Introduce a `DbContextBase` interface for internal dependencies (queryable, executable, ViewBuilder), then implement `defineDbContext` (blueprint factory) and `createDbContext` (instance factory) that composes connection management, DDL methods, and queryable accessors into a plain object. DDL logic is internally separated into `ddl/` modules but exposed on the db instance for API compatibility.

**Tech Stack:** TypeScript, Vitest

---

### Task 1: Define core types (DbContextBase, DbContextDef)

**Files:**
- Create: `packages/orm-common/src/types/db-context-def.ts`

**Step 1: Write the failing test**

```typescript
// packages/orm-common/tests/db-context/define-db-context.spec.ts
import { describe, expect, it } from "vitest";
import type { DbContextBase, DbContextDef } from "../../src/types/db-context-def";

describe("DbContext types", () => {
  it("DbContextBase interface has required members", () => {
    // Type-level test: verify the interface exists with correct shape
    const base: DbContextBase = {
      status: "ready",
      database: "test",
      schema: undefined,
      getNextAlias: () => "T1",
      resetAliasCounter: () => {},
      executeDefs: async () => [[]],
      getQueryDefObjectName: () => ({ database: "test", name: "test" }),
    };
    expect(base.status).toBe("ready");
    expect(base.getNextAlias()).toBe("T1");
  });

  it("DbContextDef has meta property", () => {
    const def: DbContextDef<{}, {}> = {
      meta: {
        tables: {},
        views: {},
        procedures: {},
        migrations: [],
      },
    };
    expect(def.meta.tables).toEqual({});
    expect(def.meta.migrations).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/orm-common/tests/db-context/define-db-context.spec.ts --run --project=node`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
// packages/orm-common/src/types/db-context-def.ts
import type { TableBuilder } from "../schema/table-builder";
import type { ViewBuilder } from "../schema/view-builder";
import type { ProcedureBuilder } from "../schema/procedure-builder";
import type { ColumnBuilder, ColumnBuilderRecord } from "../schema/factory/column-builder";
import type { ForeignKeyBuilder } from "../schema/factory/relation-builder";
import type { IndexBuilder } from "../schema/factory/index-builder";
import type { DataRecord, DbContextExecutor, IsolationLevel, Migration, ResultMeta } from "./db";
import type { QueryDef, QueryDefObjectName } from "./query-def";

/**
 * DbContext core interface
 *
 * Internal interface used by Queryable, Executable, and ViewBuilder.
 * Both the old DbContext class and new createDbContext return objects
 * that satisfy this interface.
 */
export interface DbContextBase {
  status: DbContextStatus;
  readonly database: string | undefined;
  readonly schema: string | undefined;
  getNextAlias(): string;
  resetAliasCounter(): void;
  executeDefs<T = DataRecord>(defs: QueryDef[], resultMetas?: (ResultMeta | undefined)[]): Promise<T[][]>;
  getQueryDefObjectName(tableOrView: TableBuilder<any, any> | ViewBuilder<any, any, any>): QueryDefObjectName;
}

export type DbContextStatus = "ready" | "connect" | "transact";

/**
 * DbContext definition (blueprint)
 *
 * Created by defineDbContext(). Contains schema metadata but no runtime state.
 */
export interface DbContextDef<
  TTables extends Record<string, TableBuilder<any, any>>,
  TViews extends Record<string, ViewBuilder<any, any, any>>,
  TProcedures extends Record<string, ProcedureBuilder<any, any>> = {},
> {
  readonly meta: {
    readonly tables: TTables;
    readonly views: TViews;
    readonly procedures: TProcedures;
    readonly migrations: Migration[];
  };
}

/**
 * Full DbContext instance type (created by createDbContext)
 *
 * Extends DbContextBase with queryable accessors, DDL methods,
 * and connection/transaction management.
 */
export type DbContextInstance<TDef extends DbContextDef<any, any, any>> =
  DbContextBase & DbContextConnectionMethods & DbContextDdlMethods & {
    // Auto-mapped table queryable accessors
    [K in keyof TDef["meta"]["tables"]]: () => import("../exec/queryable").Queryable<
      TDef["meta"]["tables"][K]["$infer"],
      TDef["meta"]["tables"][K]
    >;
  } & {
    // Auto-mapped view queryable accessors
    [K in keyof TDef["meta"]["views"]]: () => import("../exec/queryable").Queryable<
      TDef["meta"]["views"][K]["$infer"],
      never
    >;
  } & {
    // Auto-mapped procedure executable accessors
    [K in keyof TDef["meta"]["procedures"]]: () => import("../exec/executable").Executable<
      TDef["meta"]["procedures"][K]["$params"],
      TDef["meta"]["procedures"][K]["$returns"]
    >;
  } & {
    // System table
    systemMigration: () => import("../exec/queryable").Queryable<{ code: string }, any>;
    // Initialization
    initialize(options?: { dbs?: string[]; force?: boolean }): Promise<void>;
  };

export interface DbContextConnectionMethods {
  connect<R>(fn: () => Promise<R>, isolationLevel?: IsolationLevel): Promise<R>;
  connectWithoutTransaction<R>(callback: () => Promise<R>): Promise<R>;
  trans<R>(fn: () => Promise<R>, isolationLevel?: IsolationLevel): Promise<R>;
}

export interface DbContextDdlMethods {
  createTable(table: TableBuilder<any, any>): Promise<void>;
  dropTable(table: QueryDefObjectName): Promise<void>;
  renameTable(table: QueryDefObjectName, newName: string): Promise<void>;
  createView(view: ViewBuilder<any, any, any>): Promise<void>;
  dropView(view: QueryDefObjectName): Promise<void>;
  createProc(procedure: ProcedureBuilder<any, any>): Promise<void>;
  dropProc(procedure: QueryDefObjectName): Promise<void>;
  addColumn(table: QueryDefObjectName, columnName: string, column: ColumnBuilder<any, any>): Promise<void>;
  dropColumn(table: QueryDefObjectName, column: string): Promise<void>;
  modifyColumn(table: QueryDefObjectName, columnName: string, column: ColumnBuilder<any, any>): Promise<void>;
  renameColumn(table: QueryDefObjectName, column: string, newName: string): Promise<void>;
  addPk(table: QueryDefObjectName, columns: string[]): Promise<void>;
  dropPk(table: QueryDefObjectName): Promise<void>;
  addFk(table: QueryDefObjectName, relationName: string, relationDef: ForeignKeyBuilder<any, any>): Promise<void>;
  addIdx(table: QueryDefObjectName, indexBuilder: IndexBuilder<string[]>): Promise<void>;
  dropFk(table: QueryDefObjectName, relationName: string): Promise<void>;
  dropIdx(table: QueryDefObjectName, columns: string[]): Promise<void>;
  clearSchema(params: { database: string; schema?: string }): Promise<void>;
  schemaExists(database: string, schema?: string): Promise<boolean>;
  truncate(table: QueryDefObjectName): Promise<void>;
  switchFk(table: QueryDefObjectName, switch_: "on" | "off"): Promise<void>;
  // QueryDef generators
  getCreateTableQueryDef(table: TableBuilder<any, any>): QueryDef;
  getCreateViewQueryDef(view: ViewBuilder<any, any, any>): QueryDef;
  getCreateProcQueryDef(procedure: ProcedureBuilder<any, any>): QueryDef;
  getCreateObjectQueryDef(builder: TableBuilder<any, any> | ViewBuilder<any, any, any> | ProcedureBuilder<any, any>): QueryDef;
  getDropTableQueryDef(table: QueryDefObjectName): QueryDef;
  getRenameTableQueryDef(table: QueryDefObjectName, newName: string): QueryDef;
  getDropViewQueryDef(view: QueryDefObjectName): QueryDef;
  getDropProcQueryDef(procedure: QueryDefObjectName): QueryDef;
  getAddColumnQueryDef(table: QueryDefObjectName, columnName: string, column: ColumnBuilder<any, any>): QueryDef;
  getDropColumnQueryDef(table: QueryDefObjectName, column: string): QueryDef;
  getModifyColumnQueryDef(table: QueryDefObjectName, columnName: string, column: ColumnBuilder<any, any>): QueryDef;
  getRenameColumnQueryDef(table: QueryDefObjectName, column: string, newName: string): QueryDef;
  getAddPkQueryDef(table: QueryDefObjectName, columns: string[]): QueryDef;
  getDropPkQueryDef(table: QueryDefObjectName): QueryDef;
  getAddFkQueryDef(table: QueryDefObjectName, relationName: string, relationDef: ForeignKeyBuilder<any, any>): QueryDef;
  getAddIdxQueryDef(table: QueryDefObjectName, indexBuilder: IndexBuilder<string[]>): QueryDef;
  getDropFkQueryDef(table: QueryDefObjectName, relationName: string): QueryDef;
  getDropIdxQueryDef(table: QueryDefObjectName, columns: string[]): QueryDef;
  getClearSchemaQueryDef(params: { database: string; schema?: string }): QueryDef;
  getSchemaExistsQueryDef(database: string, schema?: string): QueryDef;
  getTruncateQueryDef(table: QueryDefObjectName): QueryDef;
  getSwitchFkQueryDef(table: QueryDefObjectName, switch_: "on" | "off"): QueryDef;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/orm-common/tests/db-context/define-db-context.spec.ts --run --project=node`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/orm-common/src/types/db-context-def.ts packages/orm-common/tests/db-context/define-db-context.spec.ts
git commit -m "feat(orm-common): add DbContextBase and DbContextDef types"
```

---

### Task 2: Update internal dependencies to use DbContextBase

**Goal:** Change `queryable.ts`, `executable.ts`, and `view-builder.ts` to depend on `DbContextBase` interface instead of the `DbContext` class. This decouples them from the concrete class.

**Files:**
- Modify: `packages/orm-common/src/exec/queryable.ts`
- Modify: `packages/orm-common/src/exec/executable.ts`
- Modify: `packages/orm-common/src/schema/view-builder.ts`
- Modify: `packages/orm-common/src/types/db.ts` (Migration type)

**Step 1: Update queryable.ts**

Replace `import type { DbContext }` with `import type { DbContextBase }` and change all `DbContext` references:

- Line 16: `import type { DbContext } from "../db-context"` → `import type { DbContextBase } from "../types/db-context-def"`
- Line 39: `private readonly _db: DbContext` → `private readonly _db: DbContextBase`
- Line 1768: `db: DbContext` → `db: DbContextBase`
- Line 1882: `db: DbContext` → `db: DbContextBase`
- All other internal references to `DbContext` in this file → `DbContextBase`

**Step 2: Update executable.ts**

- Line 3: `import type { DbContext } from "../db-context"` → `import type { DbContextBase } from "../types/db-context-def"`
- Line 27: `private readonly _db: DbContext` → `private readonly _db: DbContextBase`
- Line 107: `db: DbContext` → `db: DbContextBase`

**Step 3: Update view-builder.ts**

- Line 1: `import type { DbContext } from "../db-context"` → `import type { DbContextBase } from "../types/db-context-def"`
- Line 47: `TDbContext extends DbContext` → `TDbContext extends DbContextBase`
- Line 138: `TDb extends DbContext` → `TDb extends DbContextBase`

**Step 4: Update Migration type in types/db.ts**

- Line 3: `import type { DbContext } from "../db-context"` → `import type { DbContextBase } from "./db-context-def"`
- Line 200: `up: (db: DbContext) => Promise<void>` → `up: (db: DbContextBase & import("./db-context-def").DbContextDdlMethods) => Promise<void>`

Note: Migration's `up` callback needs DDL methods, so the parameter type is `DbContextBase & DbContextDdlMethods`.

**Step 5: Run all existing tests to verify nothing breaks**

Run: `pnpm vitest packages/orm-common --run --project=node`
Expected: ALL PASS (DbContext class still satisfies DbContextBase interface via structural typing)

**Step 6: Run typecheck**

Run: `pnpm typecheck packages/orm-common`
Expected: PASS

**Step 7: Commit**

```bash
git add packages/orm-common/src/exec/queryable.ts packages/orm-common/src/exec/executable.ts packages/orm-common/src/schema/view-builder.ts packages/orm-common/src/types/db.ts
git commit -m "refactor(orm-common): decouple queryable/executable/ViewBuilder from DbContext class"
```

---

### Task 3: Extract DDL logic to ddl/ modules

**Goal:** Move all DDL-related methods from `db-context.ts` into standalone functions in `ddl/` directory. These functions take `DbContextBase` as first parameter. The old DbContext class will delegate to these functions.

**Files:**
- Create: `packages/orm-common/src/ddl/table-ddl.ts`
- Create: `packages/orm-common/src/ddl/column-ddl.ts`
- Create: `packages/orm-common/src/ddl/relation-ddl.ts`
- Create: `packages/orm-common/src/ddl/schema-ddl.ts`
- Create: `packages/orm-common/src/ddl/initialize.ts`
- Modify: `packages/orm-common/src/db-context.ts` (delegate to ddl functions)

**Step 1: Create ddl/table-ddl.ts**

Extract from `db-context.ts`: `getCreateTableQueryDef`, `getCreateViewQueryDef`, `getCreateProcQueryDef`, `getCreateObjectQueryDef`, `getDropTableQueryDef`, `getRenameTableQueryDef`, `getDropViewQueryDef`, `getDropProcQueryDef`.

Each function takes a `DbContextBase` as first parameter (only when it needs `database`/`schema`).

```typescript
// packages/orm-common/src/ddl/table-ddl.ts
import type { DbContextBase } from "../types/db-context-def";
import type { TableBuilder } from "../schema/table-builder";
import type { ViewBuilder } from "../schema/view-builder";
import type { ProcedureBuilder } from "../schema/procedure-builder";
import type { ColumnBuilderRecord } from "../schema/factory/column-builder";
import type {
  QueryDef,
  QueryDefObjectName,
  DropTableQueryDef,
  RenameTableQueryDef,
  DropViewQueryDef,
  DropProcQueryDef,
} from "../types/query-def";

export function getCreateTableQueryDef(db: DbContextBase, table: TableBuilder<any, any>): QueryDef {
  // Move logic from DbContext.getCreateTableQueryDef
  const columns = table.meta.columns as ColumnBuilderRecord | undefined;
  if (columns == null) {
    throw new Error(`테이블 '${table.meta.name}'에 컬럼이 없습니다.`);
  }
  return {
    type: "createTable",
    table: db.getQueryDefObjectName(table),
    columns: Object.entries(columns).map(([key, col]) => ({
      name: key,
      dataType: col.meta.dataType,
      autoIncrement: col.meta.autoIncrement,
      nullable: col.meta.nullable,
      default: col.meta.default,
    })),
    primaryKey: table.meta.primaryKey,
  };
}

// getCreateViewQueryDef, getCreateProcQueryDef — same pattern
// getCreateObjectQueryDef — dispatcher
// getDropTableQueryDef, getRenameTableQueryDef, getDropViewQueryDef, getDropProcQueryDef — pure data

export function getDropTableQueryDef(table: QueryDefObjectName): DropTableQueryDef {
  return { type: "dropTable", table };
}

// ... similar for all other QueryDef generators
```

**Step 2: Create ddl/column-ddl.ts**

Extract: `getAddColumnQueryDef`, `getDropColumnQueryDef`, `getModifyColumnQueryDef`, `getRenameColumnQueryDef`.

**Step 3: Create ddl/relation-ddl.ts**

Extract: `getAddPkQueryDef`, `getDropPkQueryDef`, `getAddFkQueryDef`, `getAddIdxQueryDef`, `getDropFkQueryDef`, `getDropIdxQueryDef`.

**Step 4: Create ddl/schema-ddl.ts**

Extract: `getClearSchemaQueryDef`, `getSchemaExistsQueryDef`, `getTruncateQueryDef`, `getSwitchFkQueryDef`.

**Step 5: Create ddl/initialize.ts**

Extract the `initialize()` method and `_createAllObjects()`, `_validateRelations()`, `_getBuilders()`, `_isTableNotExistsError()` logic.

The `initialize` function needs access to:
- DDL execution (via `DbContextBase.executeDefs`)
- Table/View/Procedure builders (from `DbContextDef.meta`)
- Migration queryable (`systemMigration`)
- All DDL query def generators

```typescript
// packages/orm-common/src/ddl/initialize.ts
import type { DbContextBase } from "../types/db-context-def";
import type { DbContextDef } from "../types/db-context-def";
import type { Queryable } from "../exec/queryable";
// ... imports

export async function initialize(
  db: DbContextBase & { systemMigration: () => Queryable<{ code: string }, any> },
  def: DbContextDef<any, any, any>,
  options?: { dbs?: string[]; force?: boolean },
): Promise<void> {
  // Move logic from DbContext.initialize
  // Use standalone DDL functions instead of this.getXxxQueryDef()
}
```

**Step 6: Update db-context.ts to delegate to ddl functions**

Update each method in DbContext to call the corresponding ddl function. This verifies the extraction is correct.

```typescript
// Example: in db-context.ts
import { getCreateTableQueryDef as _getCreateTableQueryDef } from "./ddl/table-ddl";

getCreateTableQueryDef(table: TableBuilder<any, any>): QueryDef {
  return _getCreateTableQueryDef(this, table);
}
```

**Step 7: Run all tests**

Run: `pnpm vitest packages/orm-common --run --project=node`
Expected: ALL PASS

**Step 8: Run typecheck**

Run: `pnpm typecheck packages/orm-common`
Expected: PASS

**Step 9: Commit**

```bash
git add packages/orm-common/src/ddl/ packages/orm-common/src/db-context.ts
git commit -m "refactor(orm-common): extract DDL logic to ddl/ modules"
```

---

### Task 4: Implement defineDbContext

**Files:**
- Create: `packages/orm-common/src/define-db-context.ts`
- Test: `packages/orm-common/tests/db-context/define-db-context.spec.ts` (extend existing)

**Step 1: Write the failing test**

Add to `packages/orm-common/tests/db-context/define-db-context.spec.ts`:

```typescript
import { defineDbContext } from "../../src/define-db-context";
import { User } from "../setup/models/User";
import { Post } from "../setup/models/Post";
import { ActiveUsers } from "../setup/views/ActiveUsers";

describe("defineDbContext", () => {
  it("creates a DbContextDef with tables", () => {
    const MyDb = defineDbContext({
      tables: { user: User, post: Post },
    });

    expect(MyDb.meta.tables.user).toBe(User);
    expect(MyDb.meta.tables.post).toBe(Post);
    expect(MyDb.meta.migrations).toEqual([]);
  });

  it("creates a DbContextDef with views", () => {
    const MyDb = defineDbContext({
      tables: { user: User },
      views: { activeUsers: ActiveUsers },
    });

    expect(MyDb.meta.views.activeUsers).toBe(ActiveUsers);
  });

  it("creates a DbContextDef with migrations", () => {
    const migrations = [{ name: "test", up: async () => {} }];
    const MyDb = defineDbContext({
      tables: { user: User },
      migrations,
    });

    expect(MyDb.meta.migrations).toBe(migrations);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/orm-common/tests/db-context/define-db-context.spec.ts --run --project=node`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// packages/orm-common/src/define-db-context.ts
import type { TableBuilder } from "./schema/table-builder";
import type { ViewBuilder } from "./schema/view-builder";
import type { ProcedureBuilder } from "./schema/procedure-builder";
import type { Migration } from "./types/db";
import type { DbContextDef } from "./types/db-context-def";

export function defineDbContext<
  TTables extends Record<string, TableBuilder<any, any>> = {},
  TViews extends Record<string, ViewBuilder<any, any, any>> = {},
  TProcedures extends Record<string, ProcedureBuilder<any, any>> = {},
>(config: {
  tables?: TTables;
  views?: TViews;
  procedures?: TProcedures;
  migrations?: Migration[];
}): DbContextDef<TTables, TViews, TProcedures> {
  return {
    meta: {
      tables: (config.tables ?? {}) as TTables,
      views: (config.views ?? {}) as TViews,
      procedures: (config.procedures ?? {}) as TProcedures,
      migrations: config.migrations ?? [],
    },
  };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/orm-common/tests/db-context/define-db-context.spec.ts --run --project=node`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/orm-common/src/define-db-context.ts packages/orm-common/tests/db-context/define-db-context.spec.ts
git commit -m "feat(orm-common): implement defineDbContext factory"
```

---

### Task 5: Implement createDbContext

**Goal:** The core factory that creates a full db instance from a `DbContextDef`, executor, and options. This is the most complex task — it composes connection management, DDL, queryable binding, and initialization into a single plain object.

**Files:**
- Create: `packages/orm-common/src/create-db-context.ts`
- Test: `packages/orm-common/tests/db-context/create-db-context.spec.ts`

**Step 1: Write the failing test**

```typescript
// packages/orm-common/tests/db-context/create-db-context.spec.ts
import { describe, expect, it } from "vitest";
import { defineDbContext } from "../../src/define-db-context";
import { createDbContext } from "../../src/create-db-context";
import { User } from "../setup/models/User";
import { Post } from "../setup/models/Post";
import { MockExecutor } from "../setup/MockExecutor";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils";

const TestDb = defineDbContext({
  tables: { user: User, post: Post },
});

describe("createDbContext", () => {
  it("creates instance with queryable accessors", () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
      schema: "TestSchema",
    });

    expect(db.database).toBe("TestDb");
    expect(db.schema).toBe("TestSchema");
    expect(db.status).toBe("ready");
    expect(typeof db.user).toBe("function");
    expect(typeof db.post).toBe("function");
  });

  it("queryable generates correct QueryDef", () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
      schema: "TestSchema",
    });

    const def = db.user().getSelectQueryDef();
    expect(def).toEqual({
      type: "select",
      as: "T1",
      from: { database: "TestDb", schema: "TestSchema", name: "User" },
    });
  });

  it("alias counter increments across queryable calls", () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
      schema: "TestSchema",
    });

    const userDef = db.user().getSelectQueryDef();
    const postDef = db.post().getSelectQueryDef();
    expect(userDef.as).toBe("T1");
    expect(postDef.as).toBe("T2");
  });

  it("DDL methods exist on instance", () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
    });

    // QueryDef generators
    expect(typeof db.getCreateTableQueryDef).toBe("function");
    expect(typeof db.getAddColumnQueryDef).toBe("function");
    expect(typeof db.getClearSchemaQueryDef).toBe("function");

    // Execution methods
    expect(typeof db.createTable).toBe("function");
    expect(typeof db.addColumn).toBe("function");
  });

  it("DDL QueryDef generators produce correct output", () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
      schema: "TestSchema",
    });

    const clearDef = db.getClearSchemaQueryDef({ database: "TestDb", schema: "TestSchema" });
    expect(clearDef).toEqual({
      type: "clearSchema",
      database: "TestDb",
      schema: "TestSchema",
    });
  });

  it("connect/trans methods exist", () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
    });

    expect(typeof db.connect).toBe("function");
    expect(typeof db.connectWithoutTransaction).toBe("function");
    expect(typeof db.trans).toBe("function");
  });

  it("connect manages status lifecycle", async () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
    });

    expect(db.status).toBe("ready");
    await db.connect(async () => {
      expect(db.status).toBe("transact");
    });
    expect(db.status).toBe("ready");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/orm-common/tests/db-context/create-db-context.spec.ts --run --project=node`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// packages/orm-common/src/create-db-context.ts
import type { DbContextDef, DbContextBase, DbContextStatus, DbContextInstance } from "./types/db-context-def";
import type { DataRecord, DbContextExecutor, IsolationLevel, ResultMeta } from "./types/db";
import type { QueryDef, QueryDefObjectName } from "./types/query-def";
import { DDL_TYPES } from "./types/query-def";
import { DbErrorCode, DbTransactionError } from "./errors/db-transaction-error";
import { TableBuilder } from "./schema/table-builder";
import { ViewBuilder } from "./schema/view-builder";
import { ProcedureBuilder } from "./schema/procedure-builder";
import { queryable, Queryable } from "./exec/queryable";
import { executable } from "./exec/executable";
import { objClearUndefined } from "@simplysm/core-common";
import { SystemMigration } from "./models/system-migration";

// DDL imports
import { getCreateTableQueryDef, getCreateViewQueryDef, getCreateProcQueryDef, getCreateObjectQueryDef, getDropTableQueryDef, getRenameTableQueryDef, getDropViewQueryDef, getDropProcQueryDef } from "./ddl/table-ddl";
import { getAddColumnQueryDef, getDropColumnQueryDef, getModifyColumnQueryDef, getRenameColumnQueryDef } from "./ddl/column-ddl";
import { getAddPkQueryDef, getDropPkQueryDef, getAddFkQueryDef, getAddIdxQueryDef, getDropFkQueryDef, getDropIdxQueryDef } from "./ddl/relation-ddl";
import { getClearSchemaQueryDef, getSchemaExistsQueryDef, getTruncateQueryDef, getSwitchFkQueryDef } from "./ddl/schema-ddl";
import { initialize } from "./ddl/initialize";

import type { ColumnBuilder } from "./schema/factory/column-builder";
import type { ForeignKeyBuilder } from "./schema/factory/relation-builder";
import type { IndexBuilder } from "./schema/factory/index-builder";

export function createDbContext<TDef extends DbContextDef<any, any, any>>(
  def: TDef,
  executor: DbContextExecutor,
  opt: { database: string; schema?: string },
): DbContextInstance<TDef> {
  // ── Internal state ──
  let aliasCounter = 0;
  let status: DbContextStatus = "ready";

  // ── DbContextBase implementation ──
  const base: DbContextBase = {
    get status() { return status; },
    set status(v: DbContextStatus) { status = v; },
    get database() { return opt.database; },
    get schema() { return opt.schema; },
    getNextAlias() { return `T${++aliasCounter}`; },
    resetAliasCounter() { aliasCounter = 0; },
    executeDefs<T = DataRecord>(defs: QueryDef[], resultMetas?: (ResultMeta | undefined)[]): Promise<T[][]> {
      if (status === "transact" && defs.some((d) => (DDL_TYPES as readonly string[]).includes(d.type))) {
        throw new Error("TRANSACTION 상태에서는 DDL을 실행할 수 없습니다.");
      }
      return executor.executeDefs(defs, resultMetas);
    },
    getQueryDefObjectName(tableOrView: TableBuilder<any, any> | ViewBuilder<any, any, any>): QueryDefObjectName {
      return objClearUndefined({
        database: tableOrView.meta.database ?? opt.database,
        schema: tableOrView.meta.schema ?? opt.schema,
        name: tableOrView.meta.name,
      });
    },
  };

  // ── Connection management ──
  // Copy connect/connectWithoutTransaction/trans logic from db-context.ts
  // using `base`, `executor`, `status` closures instead of `this`

  // ── Queryable accessors ──
  const queryableAccessors: Record<string, () => Queryable<any, any>> = {};
  for (const [key, tableOrView] of Object.entries(def.meta.tables)) {
    queryableAccessors[key] = queryable(base, tableOrView);
  }
  for (const [key, view] of Object.entries(def.meta.views)) {
    queryableAccessors[key] = queryable(base, view);
  }

  // ── Executable accessors ──
  const executableAccessors: Record<string, () => any> = {};
  for (const [key, proc] of Object.entries(def.meta.procedures)) {
    executableAccessors[key] = executable(base, proc);
  }

  // ── System table ──
  const systemMigrationAccessor = queryable(base, SystemMigration);

  // ── Compose all into single object ──
  const db = {
    ...base,
    ...queryableAccessors,
    ...executableAccessors,

    systemMigration: systemMigrationAccessor,

    // Connection methods (inline the logic from db-context.ts connect/connectWithoutTransaction/trans)
    async connect<R>(fn: () => Promise<R>, isolationLevel?: IsolationLevel): Promise<R> {
      // validateRelations logic
      base.resetAliasCounter();
      await executor.connect();
      status = "connect";
      await executor.beginTransaction(isolationLevel);
      status = "transact";
      let result: R;
      try {
        result = await fn();
        await executor.commitTransaction();
        status = "connect";
      } catch (err) {
        try {
          await executor.rollbackTransaction();
          status = "connect";
        } catch (err1) {
          if (err1 instanceof DbTransactionError) {
            if (err1.code !== DbErrorCode.NO_ACTIVE_TRANSACTION) {
              await executor.close();
              status = "ready";
              throw err1;
            }
          } else {
            await executor.close();
            status = "ready";
            throw err1;
          }
        }
        await executor.close();
        status = "ready";
        throw err;
      }
      await executor.close();
      status = "ready";
      return result;
    },

    async connectWithoutTransaction<R>(callback: () => Promise<R>): Promise<R> {
      base.resetAliasCounter();
      await executor.connect();
      status = "connect";
      let result: R;
      try {
        result = await callback();
      } catch (err) {
        await executor.close();
        status = "ready";
        throw err;
      }
      await executor.close();
      status = "ready";
      return result;
    },

    async trans<R>(fn: () => Promise<R>, isolationLevel?: IsolationLevel): Promise<R> {
      if (status === "transact") {
        throw new Error("이미 TRANSACTION 상태입니다.");
      }
      await executor.beginTransaction(isolationLevel);
      status = "transact";
      let result: R;
      try {
        result = await fn();
        await executor.commitTransaction();
        status = "connect";
      } catch (err) {
        try {
          await executor.rollbackTransaction();
          status = "connect";
        } catch (err1) {
          if (err1 instanceof DbTransactionError) {
            if (err1.code !== DbErrorCode.NO_ACTIVE_TRANSACTION) {
              throw err1;
            }
          } else {
            throw err1;
          }
          status = "connect";
        }
        throw err;
      }
      return result;
    },

    // ── DDL methods (delegate to ddl/ functions) ──
    async createTable(table: TableBuilder<any, any>) { await base.executeDefs([getCreateTableQueryDef(base, table)]); },
    async dropTable(table: QueryDefObjectName) { await base.executeDefs([getDropTableQueryDef(table)]); },
    async renameTable(table: QueryDefObjectName, newName: string) { await base.executeDefs([getRenameTableQueryDef(table, newName)]); },
    async createView(view: ViewBuilder<any, any, any>) { await base.executeDefs([getCreateViewQueryDef(base, view)]); },
    async dropView(view: QueryDefObjectName) { await base.executeDefs([getDropViewQueryDef(view)]); },
    async createProc(procedure: ProcedureBuilder<any, any>) { await base.executeDefs([getCreateProcQueryDef(base, procedure)]); },
    async dropProc(procedure: QueryDefObjectName) { await base.executeDefs([getDropProcQueryDef(procedure)]); },
    async addColumn(table: QueryDefObjectName, columnName: string, column: ColumnBuilder<any, any>) { await base.executeDefs([getAddColumnQueryDef(table, columnName, column)]); },
    async dropColumn(table: QueryDefObjectName, column: string) { await base.executeDefs([getDropColumnQueryDef(table, column)]); },
    async modifyColumn(table: QueryDefObjectName, columnName: string, column: ColumnBuilder<any, any>) { await base.executeDefs([getModifyColumnQueryDef(table, columnName, column)]); },
    async renameColumn(table: QueryDefObjectName, column: string, newName: string) { await base.executeDefs([getRenameColumnQueryDef(table, column, newName)]); },
    async addPk(table: QueryDefObjectName, columns: string[]) { await base.executeDefs([getAddPkQueryDef(table, columns)]); },
    async dropPk(table: QueryDefObjectName) { await base.executeDefs([getDropPkQueryDef(table)]); },
    async addFk(table: QueryDefObjectName, relationName: string, relationDef: ForeignKeyBuilder<any, any>) { await base.executeDefs([getAddFkQueryDef(base, table, relationName, relationDef)]); },
    async addIdx(table: QueryDefObjectName, indexBuilder: IndexBuilder<string[]>) { await base.executeDefs([getAddIdxQueryDef(table, indexBuilder)]); },
    async dropFk(table: QueryDefObjectName, relationName: string) { await base.executeDefs([getDropFkQueryDef(table, relationName)]); },
    async dropIdx(table: QueryDefObjectName, columns: string[]) { await base.executeDefs([getDropIdxQueryDef(table, columns)]); },
    async clearSchema(params: { database: string; schema?: string }) { await base.executeDefs([getClearSchemaQueryDef(params)]); },
    async schemaExists(database: string, schema?: string) { const r = await base.executeDefs([getSchemaExistsQueryDef(database, schema)]); return r[0].length > 0; },
    async truncate(table: QueryDefObjectName) { await base.executeDefs([getTruncateQueryDef(table)]); },
    async switchFk(table: QueryDefObjectName, switch_: "on" | "off") { await base.executeDefs([getSwitchFkQueryDef(table, switch_)]); },

    // QueryDef generators (delegate)
    getCreateTableQueryDef: (table: TableBuilder<any, any>) => getCreateTableQueryDef(base, table),
    getCreateViewQueryDef: (view: ViewBuilder<any, any, any>) => getCreateViewQueryDef(base, view),
    getCreateProcQueryDef: (procedure: ProcedureBuilder<any, any>) => getCreateProcQueryDef(base, procedure),
    getCreateObjectQueryDef: (builder: any) => getCreateObjectQueryDef(base, builder),
    getDropTableQueryDef,
    getRenameTableQueryDef,
    getDropViewQueryDef,
    getDropProcQueryDef,
    getAddColumnQueryDef,
    getDropColumnQueryDef,
    getModifyColumnQueryDef,
    getRenameColumnQueryDef,
    getAddPkQueryDef,
    getDropPkQueryDef,
    getAddFkQueryDef: (table: QueryDefObjectName, relationName: string, relationDef: ForeignKeyBuilder<any, any>) =>
      getAddFkQueryDef(base, table, relationName, relationDef),
    getAddIdxQueryDef,
    getDropFkQueryDef,
    getDropIdxQueryDef,
    getClearSchemaQueryDef,
    getSchemaExistsQueryDef,
    getTruncateQueryDef,
    getSwitchFkQueryDef,

    // Initialize
    async initialize(options?: { dbs?: string[]; force?: boolean }) {
      await initialize(db as any, def, options);
    },
  };

  return db as DbContextInstance<TDef>;
}
```

Note: The above is pseudo-code showing the structure. The actual implementation should:
1. Copy the exact `connect`/`connectWithoutTransaction`/`trans` logic from `db-context.ts` (lines 202-364)
2. Include the `_validateRelations` call at the start of connect methods
3. Properly type all method signatures

**Step 4: Run tests**

Run: `pnpm vitest packages/orm-common/tests/db-context/ --run --project=node`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/orm-common/src/create-db-context.ts packages/orm-common/tests/db-context/create-db-context.spec.ts
git commit -m "feat(orm-common): implement createDbContext factory"
```

---

### Task 6: Update exports and add backward compatibility

**Files:**
- Modify: `packages/orm-common/src/index.ts`
- Modify: `packages/orm-common/src/db-context.ts` (keep as deprecated alias)

**Step 1: Update index.ts**

Add new exports alongside existing ones:

```typescript
// New functional API
export { defineDbContext } from "./define-db-context";
export { createDbContext } from "./create-db-context";
export type {
  DbContextBase,
  DbContextDef,
  DbContextInstance,
  DbContextConnectionMethods,
  DbContextDdlMethods,
} from "./types/db-context-def";

// Keep old export (still works via structural typing)
export { DbContext } from "./db-context";
export type { DbContextStatus } from "./types/db-context-def";
```

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/orm-common`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/orm-common/src/index.ts
git commit -m "feat(orm-common): export defineDbContext and createDbContext"
```

---

### Task 7: Migrate TestDbContext to functional pattern

**Goal:** Convert the test setup to use `defineDbContext` + `createDbContext`, then verify all 36 test files still pass.

**Files:**
- Modify: `packages/orm-common/tests/setup/TestDbContext.ts`

**Step 1: Convert TestDbContext**

```typescript
// packages/orm-common/tests/setup/TestDbContext.ts
import "@simplysm/core-common";
import { defineDbContext } from "../../src/define-db-context";
import { createDbContext } from "../../src/create-db-context";
import { Post } from "./models/Post";
import { Company } from "./models/Company";
import { Sales } from "./models/Sales";
import { MonthlySales } from "./models/MonthlySales";
import { Employee } from "./models/Employee";
import { ActiveUsers } from "./views/ActiveUsers";
import { UserSummary } from "./views/UserSummary";
import { MockExecutor } from "./MockExecutor";
import { User } from "./models/User";
import { GetUserById } from "./procedure/GetUserById";
import { GetAllUsers } from "./procedure/GetAllUsers";

const TestDbDef = defineDbContext({
  tables: {
    company: Company,
    user: User,
    post: Post,
    sales: Sales,
    monthlySales: MonthlySales,
    employee: Employee,
  },
  views: {
    activeUsers: ActiveUsers,
    userSummary: UserSummary,
  },
  procedures: {
    getUserById: GetUserById,
    getAllUsers: GetAllUsers,
  },
});

export type TestDbContext = ReturnType<typeof createTestDbContext>;

export function createTestDbContext() {
  return createDbContext(TestDbDef, new MockExecutor(), {
    database: "TestDb",
    schema: "TestSchema",
  });
}

// Backward compatibility: keep class-like constructor behavior
export class TestDbContext {
  // This is a factory disguised as a class for minimal test changes
  // Tests do `new TestDbContext()` → returns the functional instance
  constructor() {
    return createTestDbContext() as any;
  }
}
```

Wait — we can't have both a type and class with the same name. Simpler approach: just make TestDbContext a function that all tests call.

Actually, the cleanest approach: since all test files do `const db = new TestDbContext()`, we can make `TestDbContext` a class that wraps `createDbContext` internally. But that defeats the purpose.

Better: Update all test files to call `createTestDbContext()` instead of `new TestDbContext()`.

```typescript
// packages/orm-common/tests/setup/TestDbContext.ts
import "@simplysm/core-common";
import { defineDbContext } from "../../src/define-db-context";
import { createDbContext } from "../../src/create-db-context";
// ... imports

export const TestDbDef = defineDbContext({
  tables: {
    company: Company,
    user: User,
    post: Post,
    sales: Sales,
    monthlySales: MonthlySales,
    employee: Employee,
  },
  views: {
    activeUsers: ActiveUsers,
    userSummary: UserSummary,
  },
  procedures: {
    getUserById: GetUserById,
    getAllUsers: GetAllUsers,
  },
});

export function createTestDb() {
  return createDbContext(TestDbDef, new MockExecutor(), {
    database: "TestDb",
    schema: "TestSchema",
  });
}
```

**Step 2: Update all test files**

All 36 test files in `packages/orm-common/tests/` that import `TestDbContext` need:
- Change import: `import { TestDbContext } from "../setup/TestDbContext"` → `import { createTestDb } from "../setup/TestDbContext"`
- Change usage: `new TestDbContext()` → `createTestDb()`

This is a mechanical find-and-replace across ~36 files.

**Step 3: Run all tests**

Run: `pnpm vitest packages/orm-common --run --project=node`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add packages/orm-common/tests/
git commit -m "test(orm-common): migrate tests to defineDbContext/createDbContext"
```

---

### Task 8: Update orm-node SdOrm

**Files:**
- Modify: `packages/orm-node/src/sd-orm.ts`

**Step 1: Update SdOrm to accept DbContextDef**

```typescript
// packages/orm-node/src/sd-orm.ts
import { createDbContext, type DbContextDef, type DbContextInstance, type IsolationLevel } from "@simplysm/orm-common";
import type { DbConnConfig } from "./types/db-conn";
import { NodeDbContextExecutor } from "./node-db-context-executor";

export interface SdOrmOptions {
  database?: string;
  schema?: string;
}

export class SdOrm<TDef extends DbContextDef<any, any, any>> {
  constructor(
    readonly dbContextDef: TDef,
    readonly config: DbConnConfig,
    readonly options?: SdOrmOptions,
  ) {}

  async connect<R>(
    callback: (conn: DbContextInstance<TDef>) => Promise<R>,
    isolationLevel?: IsolationLevel,
  ): Promise<R> {
    const db = this._createDbContext();
    return db.connect(async () => callback(db), isolationLevel);
  }

  async connectWithoutTransaction<R>(
    callback: (conn: DbContextInstance<TDef>) => Promise<R>,
  ): Promise<R> {
    const db = this._createDbContext();
    return db.connectWithoutTransaction(async () => callback(db));
  }

  private _createDbContext(): DbContextInstance<TDef> {
    const database = this.options?.database ?? ("database" in this.config ? this.config.database : undefined);
    const schema = this.options?.schema ?? ("schema" in this.config ? this.config.schema : undefined);

    return createDbContext(this.dbContextDef, new NodeDbContextExecutor(this.config), {
      database,
      schema,
    });
  }
}
```

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/orm-node`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/orm-node/src/sd-orm.ts
git commit -m "refactor(orm-node): update SdOrm to use DbContextDef"
```

---

### Task 9: Update service-client OrmClientConnector

**Files:**
- Modify: `packages/service-client/src/features/orm/orm-client-connector.ts`
- Modify: `packages/service-client/src/features/orm/orm-connect-config.ts`

**Step 1: Update OrmConnectConfig**

```typescript
// packages/service-client/src/features/orm/orm-connect-config.ts
import type { DbContextDef } from "@simplysm/orm-common";
import type { DbConnOptions } from "@simplysm/service-common";

export interface OrmConnectConfig<TDef extends DbContextDef<any, any, any>> {
  dbContextDef: TDef;
  connOpt: DbConnOptions & { configName: string };
  dbContextOpt?: {
    database: string;
    schema: string;
  };
}
```

**Step 2: Update OrmClientConnector**

```typescript
// packages/service-client/src/features/orm/orm-client-connector.ts
import { OrmClientDbContextExecutor } from "./orm-client-db-context-executor";
import type { OrmConnectConfig } from "./orm-connect-config";
import { createDbContext, type DbContextDef, type DbContextInstance } from "@simplysm/orm-common";
import type { ServiceClient } from "../../service-client";

export class OrmClientConnector {
  constructor(private readonly _serviceClient: ServiceClient) {}

  async connect<TDef extends DbContextDef<any, any, any>, R>(
    config: OrmConnectConfig<TDef>,
    callback: (conn: DbContextInstance<TDef>) => Promise<R> | R,
  ): Promise<R> {
    const executor = new OrmClientDbContextExecutor(this._serviceClient, config.connOpt);
    const info = await executor.getInfo();
    const db = createDbContext(config.dbContextDef, executor, {
      database: config.dbContextOpt?.database ?? info.database,
      schema: config.dbContextOpt?.schema ?? info.schema,
    });
    return db.connect(async () => {
      try {
        return await callback(db);
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.includes("a parent row: a foreign key constraint") ||
            err.message.includes("conflicted with the REFERENCE"))
        ) {
          err.message = "경고! 연결된 작업에 의한 처리 거부. 후속작업 확인요망";
        }
        throw err;
      }
    });
  }

  async connectWithoutTransaction<TDef extends DbContextDef<any, any, any>, R>(
    config: OrmConnectConfig<TDef>,
    callback: (conn: DbContextInstance<TDef>) => Promise<R> | R,
  ): Promise<R> {
    const executor = new OrmClientDbContextExecutor(this._serviceClient, config.connOpt);
    const info = await executor.getInfo();
    const db = createDbContext(config.dbContextDef, executor, {
      database: config.dbContextOpt?.database ?? info.database,
      schema: config.dbContextOpt?.schema ?? info.schema,
    });
    return db.connectWithoutTransaction(async () => callback(db));
  }
}
```

**Step 3: Run typecheck**

Run: `pnpm typecheck packages/service-client`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/service-client/src/features/orm/
git commit -m "refactor(service-client): update OrmClientConnector to use DbContextDef"
```

---

### Task 10: Update integration tests

**Files:**
- Modify: `tests/orm/src/escape-integration.spec.ts`
- Modify: `tests/orm/src/db-context/mysql-db-context.spec.ts`
- Modify: `tests/orm/src/db-context/postgresql-db-context.spec.ts`
- Modify: `tests/orm/src/db-context/mssql-db-context.spec.ts`

**Step 1: Convert each test's DbContext from class to defineDbContext**

Example for mysql:

```typescript
// Before
class TestDbContext extends DbContext {
  user = queryable(this, User);
}

// After
const TestDbDef = defineDbContext({ tables: { user: User } });
```

Then in test setup, replace `new TestDbContext(executor, opts)` with `createDbContext(TestDbDef, executor, opts)`.

**Step 2: Run integration tests (if Docker DB available)**

Run: `pnpm vitest --project=orm --run`

**Step 3: Commit**

```bash
git add tests/orm/
git commit -m "test(orm): migrate integration tests to defineDbContext/createDbContext"
```

---

### Task 11: Remove old DbContext class

**Files:**
- Delete: `packages/orm-common/src/db-context.ts` (or keep as thin re-export)
- Modify: `packages/orm-common/src/index.ts`

**Step 1: Remove DbContext class export**

Remove `export { DbContext }` from `index.ts`. The `DbContextStatus` type is now exported from `types/db-context-def.ts`.

If backward compatibility is needed for a transition period, keep `db-context.ts` as a thin wrapper that re-exports:

```typescript
// packages/orm-common/src/db-context.ts
/** @deprecated Use defineDbContext + createDbContext instead */
export { DbContextBase as DbContext } from "./types/db-context-def";
export type { DbContextStatus } from "./types/db-context-def";
```

**Step 2: Run all tests and typecheck**

Run: `pnpm vitest packages/orm-common --run --project=node && pnpm typecheck packages/orm-common`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add packages/orm-common/src/db-context.ts packages/orm-common/src/index.ts
git commit -m "refactor(orm-common): remove DbContext class, complete functional migration"
```

---

### Task 12: Update README.md

**Files:**
- Modify: `packages/orm-common/README.md`

**Step 1: Update documentation**

Update the README to reflect the new API:
- Replace `class MyDb extends DbContext` examples with `defineDbContext`/`createDbContext`
- Document `DbContextDef`, `DbContextInstance` types
- Add migration guide from class-based to functional

**Step 2: Commit**

```bash
git add packages/orm-common/README.md
git commit -m "docs(orm-common): update README for functional DbContext API"
```

---

### Task 13: Final verification

**Step 1: Run full test suite**

```bash
pnpm vitest --run --project=node
pnpm typecheck
pnpm lint packages/orm-common packages/orm-node packages/service-client
```

**Step 2: Verify no remaining class-based DbContext usage**

Search for `extends DbContext`, `new.*DbContext(`, `Type<.*DbContext>` patterns.

**Step 3: Final commit if any fixes needed**
