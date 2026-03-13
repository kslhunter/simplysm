# Services

## SdServiceBase

Abstract base class for all service classes. Provides access to the server instance, socket context, authentication info, and configuration.

```typescript
abstract class SdServiceBase<TAuthInfo = any>
```

### Properties

| Property | Type | Description |
|---|---|---|
| `server` | `SdServiceServer<TAuthInfo>` | The server instance (injected by `SdServiceExecutor`). |
| `socket` | `SdServiceSocket \| undefined` | The v2 WebSocket connection context (set for WebSocket requests). |
| `v1` | `{ socket: SdServiceSocketV1; request: ISdServiceRequest } \| undefined` | Legacy v1 socket context. |
| `http` | `{ clientName: string; authTokenPayload?: IAuthTokenPayload } \| undefined` | HTTP request context (set for HTTP API requests). |

### Accessors

#### `authInfo: TAuthInfo | undefined`

Returns the authenticated user's custom data from the JWT payload. Works for both WebSocket and HTTP contexts.

#### `clientName: string | undefined`

Returns the client application name from the request context. Includes path traversal protection (rejects names containing `..`, `/`, or `\`).

#### `clientPath: string | undefined`

Returns the resolved file system path for the current client. Uses `pathProxy` from server options if configured, otherwise resolves to `{rootPath}/www/{clientName}`.

### Methods

#### `getConfigAsync<T>(section: string): Promise<T>`

Loads configuration from `.config.json` files. Merges root-level config with client-level config (client config takes precedence).

- Reads `{rootPath}/.config.json` (root config).
- Reads `{clientPath}/.config.json` (client config, if `clientPath` is available).
- Returns the value for the specified section key.
- Throws if the section is not found.

```typescript
class MyService extends SdServiceBase {
  async doSomething(): Promise<void> {
    const dbConfig = await this.getConfigAsync<{ host: string; port: number }>("database");
    // Uses .config.json: { "database": { "host": "localhost", "port": 3306 } }
  }
}
```

---

## SdServiceExecutor

Resolves and executes service methods by name. Handles authorization checks and context injection. Used internally by transport handlers.

```typescript
class SdServiceExecutor
```

### Methods

#### `runMethodAsync(def): Promise<any>`

Looks up a service class by name, checks authorization, creates an instance with injected context, and invokes the target method.

```typescript
await executor.runMethodAsync({
  serviceName: "MyService",
  methodName: "hello",
  params: ["world"],
  socket: serviceSocket,        // WebSocket context (optional)
  http: { clientName: "app" },  // HTTP context (optional)
});
```

Authorization flow:
1. If `auth` is configured in server options, check for `@Authorize` metadata on the method, then the class.
2. If no `@Authorize` is found, the method is treated as public.
3. If `@Authorize()` (empty), only authentication is required.
4. If `@Authorize(["perm1"])`, the user must have at least one matching permission.
5. Legacy v1 sockets cannot access `@Authorize`-decorated services.

---

## Built-in Services

### SdAutoUpdateService

Auto-update service for mobile/desktop clients. Scans update directories for the latest version.

```typescript
class SdAutoUpdateService extends SdServiceBase implements ISdAutoUpdateService
```

#### `getLastVersion(platform: string): { version: string; downloadPath: string } | undefined`

Returns the latest available update for the given platform.

- `platform` - `"android"` (looks for `.apk` files) or other (looks for `.exe` files).
- Scans `{clientPath}/{platform}/updates/` directory.
- Uses semver to determine the highest version.

---

### SdCryptoService

Cryptographic operations using Node.js `crypto` module. Reads encryption key from the `"crypto"` config section.

```typescript
class SdCryptoService extends SdServiceBase implements ISdCryptoService
```

Config section (`"crypto"` in `.config.json`):
```json
{ "crypto": { "key": "your-32-byte-hex-key" } }
```

#### `encrypt(data: string | Buffer): Promise<string>`

One-way HMAC-SHA256 hash. Returns hex-encoded digest.

#### `encryptAes(data: Buffer): Promise<string>`

AES-256-CBC encryption with random IV. Returns `"iv:ciphertext"` hex string.

#### `decryptAes(encText: string): Promise<Buffer>`

Decrypts AES-256-CBC encrypted text. Expects `"iv:ciphertext"` hex format.

---

### SdOrmService

Database connection management service. Provides WebSocket-bound database connections with automatic cleanup. Decorated with `@Authorize()` (requires authentication).

```typescript
@Authorize()
class SdOrmService extends SdServiceBase implements ISdOrmService
```

Requires a WebSocket connection (not available over HTTP). Database connections are tracked per-socket using a `WeakMap` and automatically closed when the socket disconnects.

Config section (`"orm"` in `.config.json`):
```json
{
  "orm": {
    "default": {
      "dialect": "mysql",
      "host": "localhost",
      "port": 3306,
      "username": "root",
      "password": "pass",
      "database": "mydb"
    }
  }
}
```

#### `getInfo(opt): Promise<{ dialect, database?, schema? }>`

Returns dialect and database/schema info for a named config.

#### `connect(opt): Promise<number>`

Creates a new database connection and returns a connection ID. The connection is tied to the current WebSocket.

#### `close(connId: number): Promise<void>`

Closes a specific database connection.

#### `beginTransaction(connId: number, isolationLevel?: ISOLATION_LEVEL): Promise<void>`

Starts a transaction on the connection.

#### `commitTransaction(connId: number): Promise<void>`

Commits the current transaction.

#### `rollbackTransaction(connId: number): Promise<void>`

Rolls back the current transaction.

#### `executeParametrized(connId: number, query: string, params?: any[]): Promise<any[][]>`

Executes a parameterized SQL query.

#### `executeDefs(connId: number, defs: TQueryDef[], options?: (IQueryResultParseOption | undefined)[]): Promise<any[][]>`

Executes query definitions built with `QueryBuilder`. Optimizes by combining queries when no result parsing is needed.

#### `bulkInsert(connId: number, tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void>`

Performs a bulk insert operation.

#### `bulkUpsert(connId: number, tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void>`

Performs a bulk upsert (insert or update) operation.

---

### SdSmtpClientService

Email sending service via SMTP using `nodemailer`.

```typescript
class SdSmtpClientService extends SdServiceBase implements ISdSmtpClientService
```

#### `send(options: ISmtpClientSendOption): Promise<string>`

Sends an email with explicit SMTP settings. Returns the message ID.

```typescript
await smtpService.send({
  host: "smtp.example.com",
  port: 587,
  secure: false,
  user: "user@example.com",
  pass: "password",
  from: '"Sender" <sender@example.com>',
  to: "recipient@example.com",
  subject: "Hello",
  html: "<p>Hello World</p>",
});
```

#### `sendByConfig(configName: string, options: ISmtpClientSendByDefaultOption): Promise<string>`

Sends an email using SMTP settings from the `"smtp"` config section. Only requires recipient, subject, and body.

Config section (`"smtp"` in `.config.json`):
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

```typescript
await smtpService.sendByConfig("default", {
  to: "recipient@example.com",
  subject: "Hello",
  html: "<p>Hello World</p>",
});
```
