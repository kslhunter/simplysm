# ORM Client Connector Review Fixes

## Overview

Fix issues found in code review of `packages/service-client/src/features/orm/orm-client-connector.ts`.

## Changes

### #1 README Property Name Fix (P0)

**File:** `packages/service-client/README.md`

Replace all occurrences of `dbContextType` with `dbContextDef` to match the actual `OrmConnectConfig` interface.

### #2 Extract Shared Setup Logic (P1)

**File:** `packages/service-client/src/features/orm/orm-client-connector.ts`

Extract the duplicated setup logic (executor creation, info fetch, database validation, dbContext creation) from `connect` and `connectWithoutTransaction` into a shared helper function `_createConfiguredDb()`.

Pattern follows server-side `create-orm.ts` which uses `_createDbContext()` helper.

### #3 Preserve Original FK Error (P1)

**File:** `packages/service-client/src/features/orm/orm-client-connector.ts`

Replace direct `err.message` mutation with `new Error(message, { cause: err })` to preserve the original error for debugging.

### #4+#5 Align Error Messages (P2)

**File:** `packages/service-client/src/features/orm/orm-client-connector.ts`

Change database validation error from `"Database name is required"` to `"database is required"` to match server-side `create-orm.ts`.

### #6 Callback Parameter Naming (P2)

**File:** `packages/service-client/src/features/orm/orm-client-connector.ts`

Change callback parameter name from `conn` to `db` in the `OrmClientConnector` interface to match the actual value passed in implementation and all README examples.
