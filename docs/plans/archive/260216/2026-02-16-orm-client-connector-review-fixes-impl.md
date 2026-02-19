# ORM Client Connector Review Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Fix all issues (P0–P2) found in code review of orm-client-connector.ts

**Architecture:** Refactor the factory function to extract duplicated setup logic into a helper, fix FK error handling to preserve original errors, align error messages with server-side, and fix README documentation.

**Tech Stack:** TypeScript

---

### Task 1: Refactor orm-client-connector.ts

**Files:**
- Modify: `packages/service-client/src/features/orm/orm-client-connector.ts`

**Step 1: Rewrite the file with all fixes applied**

Replace the entire file content with:

```typescript
import { OrmClientDbContextExecutor } from "./orm-client-db-context-executor";
import type { OrmConnectConfig } from "./orm-connect-config";
import { createDbContext, type DbContextDef, type DbContextInstance } from "@simplysm/orm-common";
import type { ServiceClient } from "../../service-client";

export interface OrmClientConnector {
  connect<TDef extends DbContextDef<any, any, any>, R>(
    config: OrmConnectConfig<TDef>,
    callback: (db: DbContextInstance<TDef>) => Promise<R> | R,
  ): Promise<R>;
  connectWithoutTransaction<TDef extends DbContextDef<any, any, any>, R>(
    config: OrmConnectConfig<TDef>,
    callback: (db: DbContextInstance<TDef>) => Promise<R> | R,
  ): Promise<R>;
}

export function createOrmClientConnector(serviceClient: ServiceClient): OrmClientConnector {
  async function _createConfiguredDb<TDef extends DbContextDef<any, any, any>>(
    config: OrmConnectConfig<TDef>,
  ): Promise<DbContextInstance<TDef>> {
    const executor = new OrmClientDbContextExecutor(serviceClient, config.connOpt);
    const info = await executor.getInfo();
    const database = config.dbContextOpt?.database ?? info.database;
    if (database == null || database === "") {
      throw new Error("database is required");
    }
    return createDbContext(config.dbContextDef, executor, {
      database,
      schema: config.dbContextOpt?.schema ?? info.schema,
    });
  }

  async function connect<TDef extends DbContextDef<any, any, any>, R>(
    config: OrmConnectConfig<TDef>,
    callback: (db: DbContextInstance<TDef>) => Promise<R> | R,
  ): Promise<R> {
    const db = await _createConfiguredDb(config);
    return db.connect(async () => {
      try {
        return await callback(db);
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.includes("a parent row: a foreign key constraint") ||
            err.message.includes("conflicted with the REFERENCE"))
        ) {
          throw new Error("경고! 연결된 작업에 의한 처리 거부. 후속작업 확인요망", { cause: err });
        }

        throw err;
      }
    });
  }

  async function connectWithoutTransaction<TDef extends DbContextDef<any, any, any>, R>(
    config: OrmConnectConfig<TDef>,
    callback: (db: DbContextInstance<TDef>) => Promise<R> | R,
  ): Promise<R> {
    const db = await _createConfiguredDb(config);
    return db.connectWithoutTransaction(async () => callback(db));
  }

  return {
    connect,
    connectWithoutTransaction,
  };
}
```

Changes applied:
- **#2**: Extracted `_createConfiguredDb()` helper (follows server-side `_createDbContext()` pattern)
- **#3**: FK error now throws `new Error(msg, { cause: err })` instead of mutating `err.message`
- **#4+#5**: Error message changed to `"database is required"` (matches server-side)
- **#6**: Interface callback parameter renamed from `conn` to `db`

**Step 2: Verify typecheck and lint**

Run: `pnpm typecheck packages/service-client && pnpm lint packages/service-client`
Expected: No errors

---

### Task 2: Fix README property name

**Files:**
- Modify: `packages/service-client/README.md`

**Step 1: Replace `dbContextType` with `dbContextDef`**

In `packages/service-client/README.md`, replace all occurrences of `dbContextType` with `dbContextDef`:
- Line 272: `dbContextType: MyDbContext,` → `dbContextDef: MyDbContext,`
- Line 286: `dbContextType: MyDbContext,` → `dbContextDef: MyDbContext,`
- Line 373: `| \`dbContextType\` | \`Type<T>\` |` → `| \`dbContextDef\` | \`TDef\` |`

**Step 2: Verify no other references remain**

Run: `grep -n "dbContextType" packages/service-client/README.md`
Expected: No output (all replaced)
