# Built-in Services

## OrmService

Provides database connection/query/transaction via WebSocket. `@Authorize()` decorator is applied, requiring login.

```typescript
import { ServiceServer, OrmService } from "@simplysm/service-server";

const server = new ServiceServer({
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

## CryptoService

Provides SHA256 hash and AES-256-CBC symmetric key encryption/decryption.

```typescript
import { ServiceServer, CryptoService } from "@simplysm/service-server";

const server = new ServiceServer({
  port: 8080,
  rootPath: "/app/data",
  services: [CryptoService],
});
```

`.config.json` config:

```json
{
  "crypto": {
    "key": "your-32-byte-secret-key-here!!"
  }
}
```

| Method | Returns | Description |
|--------|---------|------|
| `encrypt(data)` | `Promise<string>` | Generate SHA256 HMAC hash (one-way). `data` is `string \| Uint8Array` |
| `encryptAes(data)` | `Promise<string>` | AES-256-CBC encryption. `data` is `Uint8Array`. Returns hex string in `iv:encrypted` format |
| `decryptAes(encText)` | `Promise<Uint8Array>` | AES-256-CBC decryption. Returns original binary |

## SmtpService

A nodemailer-based email sending service. Can pass SMTP config directly or reference server config file.

```typescript
import { ServiceServer, SmtpService } from "@simplysm/service-server";

const server = new ServiceServer({
  port: 8080,
  rootPath: "/app/data",
  services: [SmtpService],
});
```

`.config.json` config (when using config reference method):

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

| Method | Returns | Description |
|--------|---------|------|
| `send(options)` | `Promise<string>` | Send email by directly passing SMTP config. Returns message ID |
| `sendByConfig(configName, options)` | `Promise<string>` | Send email by referencing SMTP config in config file. Returns message ID |

`send()` options:

```typescript
interface SmtpSendOption {
  host: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: SmtpSendAttachment[];
}
```

## AutoUpdateService

Supports auto-update for client apps. Searches for latest version files by platform in the client directory.

```typescript
import { ServiceServer, AutoUpdateService } from "@simplysm/service-server";

const server = new ServiceServer({
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
| `getLastVersion(platform)` | `Promise<{ version: string; downloadPath: string } \| undefined>` | Returns latest version and download path for the platform. Returns `undefined` if no update |

Return value example:

```typescript
{
  version: "1.0.1",
  downloadPath: "/my-app/android/updates/1.0.1.apk",
}
```
