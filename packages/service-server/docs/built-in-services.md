# Built-in Services

## OrmService

Provides database connection/query/transaction via WebSocket. The `auth()` wrapper is applied, requiring login.

```typescript
import { createServiceServer, OrmService } from "@simplysm/service-server";

const server = createServiceServer({
  port: 8080,
  rootPath: "/app/data",
  auth: { jwtSecret: "secret" },
  services: [OrmService],
});
```

Define ORM config in `.config.json`:

```json
{
  "orm": {
    "default": {
      "dialect": "mysql",
      "host": "localhost",
      "port": 3306,
      "database": "mydb",
      "user": "root",
      "password": "password"
    }
  }
}
```

Methods provided by `OrmService`:

| Method | Returns | Description |
|--------|---------|------|
| `getInfo(opt)` | `Promise<{ dialect, database?, schema? }>` | Query DB connection info |
| `connect(opt)` | `Promise<number>` | Create DB connection. Returns connection ID |
| `close(connId)` | `Promise<void>` | Close DB connection |
| `beginTransaction(connId, isolationLevel?)` | `Promise<void>` | Begin transaction |
| `commitTransaction(connId)` | `Promise<void>` | Commit transaction |
| `rollbackTransaction(connId)` | `Promise<void>` | Rollback transaction |
| `executeParametrized(connId, query, params?)` | `Promise<unknown[][]>` | Execute parameterized query |
| `executeDefs(connId, defs, options?)` | `Promise<unknown[][]>` | Execute QueryDef-based queries |
| `bulkInsert(connId, tableName, columnDefs, records)` | `Promise<void>` | Bulk INSERT |

When a WebSocket connection is closed, all DB connections opened from that socket are automatically cleaned up.

Use `OrmServiceType` to share method signatures with the client:

```typescript
import type { OrmServiceType } from "@simplysm/service-server";
// OrmServiceType = ServiceMethods<typeof OrmService>
```

## AutoUpdateService

Supports auto-update for client apps. Searches for the latest version files by platform in the client directory. No auth is required.

```typescript
import { createServiceServer, AutoUpdateService } from "@simplysm/service-server";

const server = createServiceServer({
  port: 8080,
  rootPath: "/app/data",
  services: [AutoUpdateService],
});
```

Update file structure:

```
rootPath/www/{clientName}/{platform}/updates/
  1.0.0.exe    (Windows)
  1.0.1.exe
  1.0.0.apk    (Android)
  1.0.1.apk
```

| Method | Returns | Description |
|--------|---------|------|
| `getLastVersion(platform)` | `Promise<{ version: string; downloadPath: string } \| undefined>` | Returns the latest version and download path for the platform. Returns `undefined` if no update files exist |

Return value example:

```typescript
{
  version: "1.0.1",
  downloadPath: "/my-app/android/updates/1.0.1.apk",
}
```

Use `AutoUpdateServiceType` to share method signatures with the client:

```typescript
import type { AutoUpdateServiceType } from "@simplysm/service-server";
// AutoUpdateServiceType = ServiceMethods<typeof AutoUpdateService>
```
