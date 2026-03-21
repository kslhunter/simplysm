# Built-in Services

Pre-defined service definitions ready to use with `ServiceServer`.

## OrmService

Database ORM service. Requires authentication (wrapped with `auth()`). Requires WebSocket connection (cannot be used over HTTP).

```typescript
import { OrmService, type OrmServiceType } from "@simplysm/service-server";
```

### Definition

```typescript
const OrmService: ServiceDefinition;
```

Service name: `"Orm"`

### Methods

```typescript
interface OrmServiceType {
  getInfo(opt: DbConnOptions & { configName: string }): Promise<{
    dialect: Dialect;
    database?: string;
    schema?: string;
  }>;
  connect(opt: DbConnOptions & { configName: string }): Promise<number>;
  close(connId: number): Promise<void>;
  beginTransaction(connId: number, isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(connId: number): Promise<void>;
  rollbackTransaction(connId: number): Promise<void>;
  executeParametrized(connId: number, query: string, params?: unknown[]): Promise<unknown[][]>;
  executeDefs(
    connId: number,
    defs: QueryDef[],
    options?: (ResultMeta | undefined)[],
  ): Promise<unknown[][]>;
  bulkInsert(
    connId: number,
    tableName: string,
    columnDefs: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void>;
}
```

**Behavior:**
- Database connections are tracked per WebSocket socket using a `WeakMap`
- Connections are automatically cleaned up when the socket closes
- Configuration is loaded from `.config.json` under the `"orm"` section
- Supports `mssql-azure` dialect (mapped to `mssql` for query building)

**Configuration example** (`.config.json`):
```json
{
  "orm": {
    "myDb": {
      "dialect": "mysql",
      "host": "localhost",
      "port": 3306,
      "database": "mydb",
      "user": "root",
      "password": "secret"
    }
  }
}
```

---

## AutoUpdateService

Auto-update service for client applications. No authentication required.

```typescript
import { AutoUpdateService, type AutoUpdateServiceType } from "@simplysm/service-server";
```

### Definition

```typescript
const AutoUpdateService: ServiceDefinition;
```

Service name: `"AutoUpdate"`

### Methods

```typescript
interface AutoUpdateServiceType {
  getLastVersion(platform: string): Promise<
    | { version: string; downloadPath: string }
    | undefined
  >;
}
```

**Behavior:**
- Scans `{clientPath}/{platform}/updates/` for version files
- Android: looks for `.apk` files
- Other platforms: looks for `.exe` files
- Returns the highest semver version found
- Returns `undefined` if no updates directory or no valid versions exist

---

## SmtpClientService

SMTP email sending service. No authentication required.

```typescript
import { SmtpClientService, type SmtpClientServiceType } from "@simplysm/service-server";
```

### Definition

```typescript
const SmtpClientService: ServiceDefinition;
```

Service name: `"SmtpClient"`

### Methods

```typescript
interface SmtpClientServiceType {
  send(options: SmtpClientSendOption): Promise<string>;
  sendByConfig(configName: string, options: SmtpClientSendByDefaultOption): Promise<string>;
}
```

**`send`** -- Send email with explicit SMTP configuration. Returns the message ID.

**`sendByConfig`** -- Send email using server-side SMTP configuration. Configuration is loaded from `.config.json` under the `"smtp"` section.

**Configuration example** (`.config.json`):
```json
{
  "smtp": {
    "default": {
      "senderName": "My App",
      "senderEmail": "noreply@example.com",
      "user": "smtp-user",
      "pass": "smtp-pass",
      "host": "smtp.example.com",
      "port": 587,
      "secure": false
    }
  }
}
```

---

## Usage

Register built-in services when creating the server:

```typescript
import {
  createServiceServer,
  OrmService,
  AutoUpdateService,
  SmtpClientService,
} from "@simplysm/service-server";

const server = createServiceServer({
  rootPath: "/app",
  port: 3000,
  auth: { jwtSecret: "secret" },
  services: [OrmService, AutoUpdateService, SmtpClientService],
});
```
