# Built-in Services

Pre-built service definitions ready to include in `ServiceServerOptions.services`.

## `OrmService`

Database operations service using `@simplysm/orm-node`. Requires authentication (service-level `auth` wrapper). **WebSocket only** -- cannot be used over HTTP.

Manages database connections per WebSocket socket. Connections are automatically cleaned up when the socket closes.

### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `getInfo` | `opt: DbConnOptions & { configName }` | `{ dialect, database?, schema? }` | Get database connection info from config |
| `connect` | `opt: DbConnOptions & { configName }` | `number` (connId) | Open a database connection |
| `close` | `connId: number` | `void` | Close a database connection |
| `beginTransaction` | `connId, isolationLevel?` | `void` | Begin a transaction |
| `commitTransaction` | `connId` | `void` | Commit the current transaction |
| `rollbackTransaction` | `connId` | `void` | Rollback the current transaction |
| `executeParametrized` | `connId, query, params?` | `unknown[][]` | Execute a parameterized query |
| `executeDefs` | `connId, defs, options?` | `unknown[][]` | Execute query definitions with optional result parsing |
| `bulkInsert` | `connId, tableName, columnDefs, records` | `void` | Perform bulk insert |

### Configuration

Reads from the `"orm"` config section via `ctx.getConfig("orm")`. Config file (`.config.json`) example:

```json
{
  "orm": {
    "default": {
      "dialect": "mysql",
      "host": "localhost",
      "port": 3306,
      "username": "root",
      "password": "password",
      "database": "mydb"
    }
  }
}
```

### Type export

```typescript
export type OrmServiceType = ServiceMethods<typeof OrmService>;
```

---

## `AutoUpdateService`

Provides app auto-update version checking. Scans `{clientPath}/{platform}/updates/` for versioned files.

### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `getLastVersion` | `platform: string` | `{ version, downloadPath } \| undefined` | Get the latest version for a platform |

- **Android**: Looks for `.apk` files
- **Other platforms**: Looks for `.exe` files
- Version is extracted from the filename (e.g., `1.2.3.apk`)
- Uses `semver.maxSatisfying` to find the highest version

### Type export

```typescript
export type AutoUpdateServiceType = ServiceMethods<typeof AutoUpdateService>;
```

---

## `SmtpClientService`

Email sending service using `nodemailer`.

### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `send` | `options: SmtpClientSendOption` | `string` (messageId) | Send an email with explicit SMTP settings |
| `sendByConfig` | `configName, options: SmtpClientSendByDefaultOption` | `string` (messageId) | Send using a named SMTP configuration |

### Configuration

`sendByConfig` reads from the `"smtp"` config section. Config file (`.config.json`) example:

```json
{
  "smtp": {
    "default": {
      "host": "smtp.example.com",
      "port": 587,
      "secure": false,
      "user": "user@example.com",
      "pass": "password",
      "senderName": "My App",
      "senderEmail": "noreply@example.com"
    }
  }
}
```

### Type export

```typescript
export type SmtpClientServiceType = ServiceMethods<typeof SmtpClientService>;
```

---

## Registering Built-in Services

```typescript
import {
  createServiceServer,
  OrmService,
  AutoUpdateService,
  SmtpClientService,
} from "@simplysm/service-server";

const server = createServiceServer({
  rootPath: process.cwd(),
  port: 3000,
  auth: { jwtSecret: "my-secret" },
  services: [OrmService, AutoUpdateService, SmtpClientService],
});
```
