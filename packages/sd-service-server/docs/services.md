# Built-in Services

## SdAutoUpdateService

Provides the latest application version information for auto-update clients. Extends `SdServiceBase`. Implements `ISdAutoUpdateService`.

Scans the `{clientPath}/{platform}/updates/` directory for `.apk` (Android) or `.exe` (Windows) files and returns the highest semver version found.

### Methods

#### `getLastVersion(platform)`

```typescript
getLastVersion(platform: string):
  | { version: string; downloadPath: string }
  | undefined
```

Returns the latest available version and its download path for the given platform.

| Parameter | Type | Description |
|-----------|------|-------------|
| `platform` | `string` | Target platform (e.g. `"android"`, `"windows"`) |

**Returns:** `{ version: string; downloadPath: string } | undefined` -- version info, or `undefined` if no updates directory exists.

---

## SdCryptoService

Provides SHA-256 HMAC hashing and AES-256-CBC encryption/decryption. Extends `SdServiceBase`. Implements `ISdCryptoService`.

Reads the encryption key from the `"crypto"` section of `.config.json`.

### Methods

#### `encrypt(data)`

```typescript
async encrypt(data: string | Buffer): Promise<string>
```

Computes a SHA-256 HMAC digest of the input data.

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `string \| Buffer` | Data to hash |

**Returns:** `Promise<string>` -- hex-encoded HMAC digest.

#### `encryptAes(data)`

```typescript
async encryptAes(data: Buffer): Promise<string>
```

Encrypts data using AES-256-CBC with a random IV.

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `Buffer` | Data to encrypt |

**Returns:** `Promise<string>` -- encrypted string in `iv:ciphertext` hex format.

#### `decryptAes(encText)`

```typescript
async decryptAes(encText: string): Promise<Buffer>
```

Decrypts an AES-256-CBC encrypted string.

| Parameter | Type | Description |
|-----------|------|-------------|
| `encText` | `string` | Encrypted string in `iv:ciphertext` hex format |

**Returns:** `Promise<Buffer>` -- decrypted data.

---

## SdOrmService

Server-side ORM service that manages database connections, transactions, and query execution for remote clients. Extends `SdServiceBase`. Implements `ISdOrmService`. Decorated with `@Authorize()` (requires authentication).

Uses a `WeakMap` keyed by socket instance to track database connections per client, ensuring automatic cleanup when a socket disconnects.

### Methods

#### `getInfo(opt)`

```typescript
async getInfo(opt: TDbConnOptions & { configName: string }): Promise<{
  dialect: TDbContextOption["dialect"];
  database?: string;
  schema?: string;
}>
```

Returns database dialect and connection metadata.

| Parameter | Type | Description |
|-----------|------|-------------|
| `opt` | `TDbConnOptions & { configName: string }` | Connection options with config section name |

#### `connect(opt)`

```typescript
async connect(opt: TDbConnOptions & { configName: string }): Promise<number>
```

Creates a database connection and returns its numeric ID. Registers a socket close handler to clean up all connections when the socket disconnects.

| Parameter | Type | Description |
|-----------|------|-------------|
| `opt` | `TDbConnOptions & { configName: string }` | Connection options with config section name |

**Returns:** `Promise<number>` -- connection ID for subsequent operations.

#### `close(connId)`

```typescript
async close(connId: number): Promise<void>
```

Closes a database connection by ID.

#### `beginTransaction(connId, isolationLevel?)`

```typescript
async beginTransaction(connId: number, isolationLevel?: ISOLATION_LEVEL): Promise<void>
```

Begins a transaction on the specified connection.

| Parameter | Type | Description |
|-----------|------|-------------|
| `connId` | `number` | Connection ID |
| `isolationLevel` | `ISOLATION_LEVEL` | Optional isolation level |

#### `commitTransaction(connId)`

```typescript
async commitTransaction(connId: number): Promise<void>
```

Commits the current transaction.

#### `rollbackTransaction(connId)`

```typescript
async rollbackTransaction(connId: number): Promise<void>
```

Rolls back the current transaction.

#### `executeParametrized(connId, query, params?)`

```typescript
async executeParametrized(connId: number, query: string, params?: any[]): Promise<any[][]>
```

Executes a parameterized SQL query.

| Parameter | Type | Description |
|-----------|------|-------------|
| `connId` | `number` | Connection ID |
| `query` | `string` | SQL query string |
| `params` | `any[]` | Optional query parameters |

#### `executeDefs(connId, defs, options?)`

```typescript
async executeDefs(
  connId: number,
  defs: TQueryDef[],
  options?: (IQueryResultParseOption | undefined)[],
): Promise<any[][]>
```

Executes query definitions, optionally parsing results. When all options are `undefined`, batches queries into a single execution for efficiency.

| Parameter | Type | Description |
|-----------|------|-------------|
| `connId` | `number` | Connection ID |
| `defs` | `TQueryDef[]` | Query definitions |
| `options` | `(IQueryResultParseOption \| undefined)[]` | Optional parse options per query |

#### `bulkInsert(connId, tableName, columnDefs, records)`

```typescript
async bulkInsert(
  connId: number,
  tableName: string,
  columnDefs: IQueryColumnDef[],
  records: Record<string, any>[],
): Promise<void>
```

Performs a bulk insert operation.

| Parameter | Type | Description |
|-----------|------|-------------|
| `connId` | `number` | Connection ID |
| `tableName` | `string` | Target table name |
| `columnDefs` | `IQueryColumnDef[]` | Column definitions |
| `records` | `Record<string, any>[]` | Records to insert |

#### `bulkUpsert(connId, tableName, columnDefs, records)`

```typescript
async bulkUpsert(
  connId: number,
  tableName: string,
  columnDefs: IQueryColumnDef[],
  records: Record<string, any>[],
): Promise<void>
```

Performs a bulk upsert (insert or update) operation.

| Parameter | Type | Description |
|-----------|------|-------------|
| `connId` | `number` | Connection ID |
| `tableName` | `string` | Target table name |
| `columnDefs` | `IQueryColumnDef[]` | Column definitions |
| `records` | `Record<string, any>[]` | Records to upsert |

---

## SdSmtpClientService

Sends emails via SMTP using nodemailer. Extends `SdServiceBase`. Implements `ISdSmtpClientService`.

### Methods

#### `send(options)`

```typescript
async send(options: ISmtpClientSendOption): Promise<string>
```

Sends an email with explicit SMTP configuration.

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `ISmtpClientSendOption` | Full SMTP options including host, port, auth, and mail content |

**Returns:** `Promise<string>` -- the message ID.

#### `sendByConfig(configName, options)`

```typescript
async sendByConfig(configName: string, options: ISmtpClientSendByDefaultOption): Promise<string>
```

Sends an email using SMTP settings from the server's `"smtp"` config section.

| Parameter | Type | Description |
|-----------|------|-------------|
| `configName` | `string` | Named SMTP configuration key in the `"smtp"` config section |
| `options` | `ISmtpClientSendByDefaultOption` | Mail content options (recipients, subject, body, etc.) |

**Returns:** `Promise<string>` -- the message ID.

**Throws:** `Error` if the named SMTP configuration is not found.
