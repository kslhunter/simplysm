# orm-node: DbConnFactory & SdOrm Functional Conversion

## Summary

Convert two class-based APIs in `@simplysm/orm-node` to functional style, aligning with the project's "functional style preferred" design philosophy.

## Changes

### 1. DbConnFactory → createDbConn

**File rename:** `db-conn-factory.ts` → `create-db-conn.ts`

**Before:**
```typescript
import { DbConnFactory } from "@simplysm/orm-node";
const conn = await DbConnFactory.create(config);
```

**After:**
```typescript
import { createDbConn } from "@simplysm/orm-node";
const conn = await createDbConn(config);
```

**Implementation:**
- Module-level `poolMap` replaces static `_poolMap`
- `createDbConn()` public function replaces `DbConnFactory.create()`
- Private static methods become module-level functions: `getOrCreatePool`, `createRawConnection`, `ensureModule`
- No behavioral changes

**Affected files:**
- `packages/orm-node/src/create-db-conn.ts` (new, replaces `db-conn-factory.ts`)
- `packages/orm-node/src/node-db-context-executor.ts` (import + call site)
- `packages/service-server/src/services/orm-service.ts` (import + call site)
- `packages/orm-node/src/index.ts` (export)
- `packages/orm-node/README.md` (examples)

### 2. SdOrm → createOrm

**File rename:** `sd-orm.ts` → `create-orm.ts`

**Before:**
```typescript
import { SdOrm } from "@simplysm/orm-node";
const orm = new SdOrm(MyDb, config, options);
```

**After:**
```typescript
import { createOrm, type Orm } from "@simplysm/orm-node";
const orm = createOrm(MyDb, config, options);
```

**Implementation:**
- `Orm<TDef>` interface defines the returned object shape
- `createOrm()` factory function returns `Orm<TDef>`
- `_createDbContext` becomes a closure inside `createOrm`
- `.connect()` and `.connectWithoutTransaction()` usage unchanged
- `SdOrmOptions` type retained as-is

**Affected files:**
- `packages/orm-node/src/create-orm.ts` (new, replaces `sd-orm.ts`)
- `packages/orm-node/src/index.ts` (export)
- `packages/orm-node/README.md` (examples)

## Migration Strategy

- **No deprecation period** — only used within this monorepo
- Old files (`db-conn-factory.ts`, `sd-orm.ts`) deleted immediately
- Old class names (`DbConnFactory`, `SdOrm`) removed from exports

## Out of Scope

- ExprUnit/WhereExprUnit (cost outweighs benefit, no user-facing change)
- Other orm-common classes (builders, queryable, query renderers — justified as classes)
