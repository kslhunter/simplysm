# Configuration

Connection configuration types used to establish database connections.

## `DbConnConfig`

Union type of all dialect-specific configurations:

```typescript
type DbConnConfig = MysqlDbConnConfig | MssqlDbConnConfig | PostgresqlDbConnConfig;
```

---

## `MysqlDbConnConfig`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `dialect` | `"mysql"` | Yes | Must be `"mysql"` |
| `host` | `string` | Yes | Server hostname or IP |
| `port` | `number` | No | Server port |
| `username` | `string` | Yes | Login username |
| `password` | `string` | Yes | Login password |
| `database` | `string` | No | Default database name |
| `defaultIsolationLevel` | `IsolationLevel` | No | Default transaction isolation level |
| `pool` | `DbPoolConfig` | No | Connection pool settings |

---

## `MssqlDbConnConfig`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `dialect` | `"mssql" \| "mssql-azure"` | Yes | Use `"mssql-azure"` for Azure SQL (enables encryption) |
| `host` | `string` | Yes | Server hostname or IP |
| `port` | `number` | No | Server port |
| `username` | `string` | Yes | Login username |
| `password` | `string` | Yes | Login password |
| `database` | `string` | No | Default database name |
| `schema` | `string` | No | Default schema (e.g., `dbo`) |
| `defaultIsolationLevel` | `IsolationLevel` | No | Default transaction isolation level |
| `pool` | `DbPoolConfig` | No | Connection pool settings |

---

## `PostgresqlDbConnConfig`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `dialect` | `"postgresql"` | Yes | Must be `"postgresql"` |
| `host` | `string` | Yes | Server hostname or IP |
| `port` | `number` | No | Server port (default: 5432) |
| `username` | `string` | Yes | Login username |
| `password` | `string` | Yes | Login password |
| `database` | `string` | No | Default database name |
| `schema` | `string` | No | Default schema (e.g., `public`) |
| `defaultIsolationLevel` | `IsolationLevel` | No | Default transaction isolation level |
| `pool` | `DbPoolConfig` | No | Connection pool settings |

---

## `DbPoolConfig`

Connection pool settings (applied via `generic-pool`).

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `min` | `number` | `1` | Minimum number of connections in the pool |
| `max` | `number` | `10` | Maximum number of connections in the pool |
| `acquireTimeoutMillis` | `number` | `30000` | Timeout for acquiring a connection (ms) |
| `idleTimeoutMillis` | `number` | `30000` | Timeout before idle connections are destroyed (ms) |

---

## `IsolationLevel`

Transaction isolation level (from `@simplysm/orm-common`):

```typescript
type IsolationLevel =
  | "READ_UNCOMMITTED"
  | "READ_COMMITTED"
  | "REPEATABLE_READ"
  | "SERIALIZABLE";
```

---

## `getDialectFromConfig(config)`

Utility that extracts the `Dialect` from a `DbConnConfig`. Maps `"mssql-azure"` to `"mssql"`.

```typescript
import { getDialectFromConfig } from "@simplysm/orm-node";

getDialectFromConfig({ dialect: "mssql-azure", ... }); // => "mssql"
getDialectFromConfig({ dialect: "mysql", ... });        // => "mysql"
```

**Returns:** `Dialect` (`"mysql" | "mssql" | "postgresql"`)
