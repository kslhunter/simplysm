# Fix: Include _Migration in createAllObjects()

## Problem

`createAllObjects()` in `initialize.ts` only creates tables from `def.meta.tables` (user-defined tables).
`SystemMigration` is added separately as a queryable accessor in `create-db-context.ts:365` but is never
included in `def.meta.tables`, so it's never created by `createAllObjects()`.

This causes:
- **force:true with no migrations**: Succeeds but migration table is never created
- **force:false second run**: Migration table still missing → treated as new environment → attempts
  CREATE TABLE for all user tables → conflicts with existing tables

## Solution

1. Rename `SystemMigration` → `_Migration` (table name), `systemMigration` → `_migration` (accessor key)
   - `_` prefix convention signals "system/internal" table
   - Reduces collision risk with user table names
2. Include `_Migration` in `def.meta.tables` during `defineDbContext()`, so it flows naturally
   through `getBuilders()` → `createAllObjects()`

## Changes

### 1. `packages/orm-common/src/models/system-migration.ts`

Rename table:

```typescript
export const _Migration = Table("_Migration")
  .columns((c) => ({
    code: c.varchar(255),
  }))
  .description("System Migration Table")
  .primaryKey("code");
```

### 2. `packages/orm-common/src/define-db-context.ts`

Add `_Migration` to `tables` automatically:

```typescript
import { _Migration } from "./models/system-migration";

export function defineDbContext<...>(config: { ... }): DbContextDef<...> {
  return {
    meta: {
      tables: { ...(config.tables ?? {}), _migration: _Migration } as TTables,
      // ... rest unchanged
    },
  };
}
```

### 3. `packages/orm-common/src/create-db-context.ts`

Remove line 364-365 (separate systemMigration accessor), since it's now handled by the
tables loop at line 352:

```diff
-  // ── Add System table ──
-  (db as any).systemMigration = queryable(db as any, SystemMigration);
```

### 4. `packages/orm-common/src/ddl/initialize.ts`

Update accessor references: `db.systemMigration()` → `db._migration()`

## No Changes Required

- `getBuilders()` / `createAllObjects()` — reads `def.meta.tables` → automatically includes `_Migration`

## Behavior After Fix

| Scenario | Before (broken) | After (fixed) |
|----------|-----------------|---------------|
| force:true | Migration table not created | Created with all tables |
| force:false (first) | Migration table not created, next run conflicts | Created with all tables |
| force:false (existing) | Never reaches this path | Reads migrations normally |

## Considerations

- `Object.keys(def.meta.tables)` will include `_migration` — acceptable
- `_` prefix reduces user naming collision risk
- `_Migration` has no `.database()` set → falls back to DbContext's default database — correct behavior
- No existing production DBs have SystemMigration table — no migration needed
