# Built-in Services

Pre-defined service definitions ready to use with `ServiceServer`.

## `OrmService`

Server-side ORM service implementation. Requires authentication. Manages database connections per WebSocket socket (using `WeakMap`). Supports MySQL, MSSQL, and PostgreSQL via `@simplysm/orm-node`.

```typescript
const OrmService: ServiceDefinition;
```

Implements the `OrmService` interface from `@simplysm/service-common`:

| Method | Description |
|--------|-------------|
| `getInfo()` | Get database dialect and connection info from config |
| `connect()` | Open a new database connection, returns connection ID |
| `close()` | Close a database connection |
| `beginTransaction()` | Begin transaction |
| `commitTransaction()` | Commit transaction |
| `rollbackTransaction()` | Rollback transaction |
| `executeParametrized()` | Execute parameterized SQL |
| `executeDefs()` | Execute QueryDef array (builds SQL via QueryBuilder) |
| `bulkInsert()` | Bulk insert records |

**Note:** ORM service requires WebSocket connection (cannot be used over HTTP).

## `AutoUpdateService`

Server-side auto-update service implementation. Scans the client's platform-specific `updates/` directory for version files.

```typescript
const AutoUpdateService: ServiceDefinition;
```

Implements the `AutoUpdateService` interface from `@simplysm/service-common`:

| Method | Description |
|--------|-------------|
| `getLastVersion(platform)` | Find latest version file for platform (win32, android, etc.) |

Supported platforms and file extensions:
- `android`: `.apk` files
- Other platforms: `.exe` files

## `SmtpClientService`

Server-side SMTP email sending service. Uses `nodemailer` under the hood.

```typescript
const SmtpClientService: ServiceDefinition;
```

| Method | Description |
|--------|-------------|
| `send(options)` | Send email with full SMTP options |
| `sendByDefault(options)` | Send email using server's default SMTP config |
