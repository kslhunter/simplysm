# ORM Pool Connection Error Propagation

## Problem

`generic-pool` swallows connection creation errors internally. When `pool.acquire()` times out after 30 seconds, only `"ResourceRequest timed out"` is thrown — the original error (e.g., `ECONNREFUSED`) is lost.

```
pool.create() → conn.connect() → ECONNREFUSED (actual error)
                    ↓
            generic-pool catches internally
                    ↓
            30s later → "ResourceRequest timed out" (original error lost)
```

## Solution

Use `generic-pool`'s `factoryCreateError` event to capture the last creation error, and include it in the error thrown on `acquire()` failure.

### Changes

#### 1. `packages/orm-node/src/create-db-conn.ts`

- Add `poolLastErrorMap: Map<string, Error>` alongside existing `poolMap`
- Register `factoryCreateError` event listener on pool creation → store error by configKey
- Pass error getter function `() => poolLastErrorMap.get(configKey)` to `PooledDbConn` constructor

#### 2. `packages/orm-node/src/pooled-db-conn.ts`

- Add `_getLastCreateError?: () => Error | undefined` constructor parameter
- Wrap `pool.acquire()` in try-catch in `connect()`
- On failure: throw `SdError` with config info + cause error from getter (fallback to original error)

### Error Message Format

```
DB 연결 실패 [postgresql://localhost:5432/mydb]: connect ECONNREFUSED 127.0.0.1:5432
```

### Error Flow

```
pool.create() → conn.connect() → ECONNREFUSED
        ↓
factoryCreateError event → poolLastErrorMap.set(configKey, err)
        ↓
pool.acquire() timeout → catch → poolLastErrorMap.get(configKey) → SdError with cause
```

### Design Decisions

- **Separate Map** (`poolLastErrorMap`) instead of attaching property to pool object — type-safe, consistent with existing `poolMap` pattern
- **Getter function** passed to `PooledDbConn` instead of direct import — avoids circular dependency (`create-db-conn` → `pooled-db-conn` → `create-db-conn`)
- **`SdError`** used for consistency with existing error patterns in the codebase
