# Connection Factory & Pooling

Connection pool management using the `generic-pool` library. Pools are keyed by configuration and reused automatically.

## `createDbConn(config)`

Factory function that acquires a pooled connection. Creates a new pool if none exists for the given configuration.

```typescript
import { createDbConn } from "@simplysm/orm-node";

const conn = await createDbConn({
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
  pool: {
    min: 2,
    max: 20,
  },
});

await conn.connect();
// ... use connection ...
await conn.close(); // returns connection to pool
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `DbConnConfig` | Database connection configuration |

**Returns:** `Promise<DbConn>` -- a `PooledDbConn` wrapper.

**Pool behavior:**

- Pools are cached by a JSON-serialized configuration key.
- Each pool validates connections on borrow (`testOnBorrow: true`).
- Failed connection creation errors are tracked per pool.
- Driver modules (`tedious`, `mysql2`, `pg`, `pg-copy-streams`) are lazy-loaded and cached.

---

## `PooledDbConn`

A `DbConn` wrapper that manages borrowing from and returning connections to a pool. Implements the full `DbConn` interface via delegation.

### Key Behaviors

- **`connect()`** -- Acquires a physical connection from the pool. Throws if already connected.
- **`close()`** -- Returns the connection to the pool (does **not** terminate the physical connection). If a transaction is in progress, it is rolled back first.
- **Physical connection loss** -- If the underlying connection is lost (timeout, network error), the wrapper emits `close` and clears its reference. The pool's validation will discard the broken connection.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `config` | `DbConnConfig` | Delegates to underlying connection's config |
| `isConnected` | `boolean` | `true` if a physical connection is acquired and active |
| `isInTransaction` | `boolean` | `true` if the underlying connection has an active transaction |

### Methods

All `DbConn` methods (`beginTransaction`, `commitTransaction`, `rollbackTransaction`, `execute`, `executeParametrized`, `bulkInsert`) are delegated to the underlying physical connection. Throws if no connection is acquired.
