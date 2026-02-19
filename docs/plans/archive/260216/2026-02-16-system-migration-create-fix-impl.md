# _Migration createAllObjects Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Fix `createAllObjects()` to include the migration tracking table, and rename `SystemMigration` → `_Migration`

**Architecture:** Rename the system table from `SystemMigration` to `_Migration`, then move it from a separate accessor in `createDbContext()` into `defineDbContext()`'s `tables` so `getBuilders()` → `createAllObjects()` naturally includes it.

**Tech Stack:** TypeScript, @simplysm/orm-common

---

### Task 1: Rename SystemMigration → _Migration and include in tables

**Files:**
- Modify: `packages/orm-common/src/models/system-migration.ts:3`
- Modify: `packages/orm-common/src/define-db-context.ts:1-25`
- Modify: `packages/orm-common/src/create-db-context.ts:12,364-365`
- Modify: `packages/orm-common/src/ddl/initialize.ts:34-35,38,69,75,89,98`
- Modify: `packages/orm-common/src/types/db-context-def.ts:74-76`
- Modify: `packages/orm-common/tests/db-context/create-db-context.spec.ts:195-201`

**Step 1: Update the model definition**

In `packages/orm-common/src/models/system-migration.ts`, rename the export and table name:

```typescript
import { Table } from "../schema/table-builder";

export const _Migration = Table("_Migration")
  .columns((c) => ({
    code: c.varchar(255),
  }))
  .description("System Migration Table")
  .primaryKey("code");
```

**Step 2: Include _Migration in defineDbContext()**

In `packages/orm-common/src/define-db-context.ts`, import `_Migration` and spread it into `tables`:

```typescript
import type { TableBuilder } from "./schema/table-builder";
import type { ViewBuilder } from "./schema/view-builder";
import type { ProcedureBuilder } from "./schema/procedure-builder";
import type { Migration } from "./types/db";
import type { DbContextDef } from "./types/db-context-def";
import { _Migration } from "./models/system-migration";

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
      tables: { ...(config.tables ?? {}), _migration: _Migration } as TTables,
      views: (config.views ?? {}) as TViews,
      procedures: (config.procedures ?? {}) as TProcedures,
      migrations: config.migrations ?? [],
    },
  };
}
```

**Step 3: Remove separate SystemMigration accessor from createDbContext()**

In `packages/orm-common/src/create-db-context.ts`:

- Remove the import on line 12: `import { SystemMigration } from "./models/system-migration";`
- Remove lines 364-365:
  ```
  // ── Add System table ──
  (db as any).systemMigration = queryable(db as any, SystemMigration);
  ```

**Step 4: Update DbContextInstance type**

In `packages/orm-common/src/types/db-context-def.ts`, rename `systemMigration` to `_migration` in the system table section (lines 74-76):

```typescript
  } & {
    // System table
    _migration: () => import("../exec/queryable").Queryable<{ code: string }, any>;
    // Initialization
    initialize(options?: { dbs?: string[]; force?: boolean }): Promise<void>;
  };
```

**Step 5: Update initialize.ts references**

In `packages/orm-common/src/ddl/initialize.ts`:

- Line 34: JSDoc `SystemMigration` → `_Migration`
- Line 35: JSDoc `SystemMigration` → `_Migration`
- Line 38: Type signature `systemMigration` → `_migration`
- Lines 69, 75, 89, 98: All `db.systemMigration()` → `db._migration()`

Full updated function signature and JSDoc:

```typescript
/**
 * ...
 * - **force=false** (기본):
 *   - _Migration 테이블 없음: 전체 생성 + 모든 migration 등록
 *   - _Migration 테이블 있음: 미적용 migration만 실행
 */
export async function initialize(
  db: DbContextBase & DbContextDdlMethods & { _migration: () => Queryable<{ code: string }, any> },
  def: DbContextDef<any, any, any>,
  options?: { dbs?: string[]; force?: boolean },
): Promise<void> {
```

All `db.systemMigration()` calls become `db._migration()`:
- Line 69: `await db._migration().insert(...)`
- Line 75: `appliedMigrations = await db._migration().result();`
- Line 89: `await db._migration().insert(...)`
- Line 98: `await db._migration().insert([{ code: migration.name }]);`

**Step 6: Update test**

In `packages/orm-common/tests/db-context/create-db-context.spec.ts`, update the test at lines 195-201:

```typescript
  it("_migration accessor exists", () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
    });

    expect(typeof db._migration).toBe("function");
  });
```

**Step 7: Run typecheck**

Run: `pnpm typecheck packages/orm-common`
Expected: PASS

**Step 8: Run tests**

Run: `pnpm vitest packages/orm-common --run --project=node`
Expected: PASS

**Step 9: Commit**

```bash
git add packages/orm-common/src/models/system-migration.ts \
       packages/orm-common/src/define-db-context.ts \
       packages/orm-common/src/create-db-context.ts \
       packages/orm-common/src/ddl/initialize.ts \
       packages/orm-common/src/types/db-context-def.ts \
       packages/orm-common/tests/db-context/create-db-context.spec.ts
git commit -m "fix(orm-common): include _Migration table in createAllObjects()"
```
