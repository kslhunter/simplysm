# Service Types

## `OrmService`

ORM service interface. Provides database connection, transaction management, and query execution over the service protocol. Supports MySQL, MSSQL, and PostgreSQL.

```typescript
interface OrmService {
  getInfo(opt: DbConnOptions & { configName: string }): Promise<{
    dialect: Dialect;
    database?: string;
    schema?: string;
  }>;
  connect(opt: Record<string, unknown>): Promise<number>;
  close(connId: number): Promise<void>;
  beginTransaction(connId: number, isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(connId: number): Promise<void>;
  rollbackTransaction(connId: number): Promise<void>;
  executeParametrized(connId: number, query: string, params?: unknown[]): Promise<unknown[][]>;
  executeDefs(connId: number, defs: QueryDef[], options?: (ResultMeta | undefined)[]): Promise<unknown[][]>;
  bulkInsert(connId: number, tableName: string, columnDefs: Record<string, ColumnMeta>, records: Record<string, unknown>[]): Promise<void>;
}
```

| Method | Description |
|--------|-------------|
| `getInfo()` | Get database dialect and connection info |
| `connect()` | Open a new database connection, returns connection ID |
| `close()` | Close a database connection |
| `beginTransaction()` | Begin transaction with optional isolation level |
| `commitTransaction()` | Commit transaction |
| `rollbackTransaction()` | Rollback transaction |
| `executeParametrized()` | Execute a parameterized SQL query |
| `executeDefs()` | Execute QueryDef array |
| `bulkInsert()` | Bulk insert records |

## `DbConnOptions`

Database connection options.

```typescript
type DbConnOptions = { configName?: string; config?: Record<string, unknown> };
```

| Field | Type | Description |
|-------|------|-------------|
| `configName` | `string` | Configuration name to look up from server config |
| `config` | `Record<string, unknown>` | Direct connection config object |

## `AutoUpdateService`

Auto-update service interface. Retrieves the latest version info for client applications.

```typescript
interface AutoUpdateService {
  getLastVersion(platform: string): Promise<
    | { version: string; downloadPath: string }
    | undefined
  >;
}
```

| Method | Description |
|--------|-------------|
| `getLastVersion()` | Retrieve latest version info for a platform (e.g., "win32", "darwin", "android") |

## `SmtpClientSendOption`

Full SMTP send options.

```typescript
interface SmtpClientSendOption {
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
  attachments?: SmtpClientSendAttachment[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `host` | `string` | SMTP server hostname |
| `port` | `number` | SMTP server port |
| `secure` | `boolean` | Use TLS |
| `user` | `string` | SMTP auth username |
| `pass` | `string` | SMTP auth password |
| `from` | `string` | Sender email |
| `to` | `string` | Recipient email |
| `cc` | `string` | CC recipients |
| `bcc` | `string` | BCC recipients |
| `subject` | `string` | Email subject |
| `html` | `string` | Email body (HTML) |
| `attachments` | `SmtpClientSendAttachment[]` | File attachments |

## `SmtpClientSendByDefaultOption`

SMTP send options using default server configuration.

```typescript
interface SmtpClientSendByDefaultOption {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: SmtpClientSendAttachment[];
}
```

## `SmtpClientSendAttachment`

Email attachment definition.

```typescript
interface SmtpClientSendAttachment {
  filename: string;
  content?: string | Uint8Array;
  path?: any;
  contentType?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `filename` | `string` | Attachment filename |
| `content` | `string \| Uint8Array` | Inline content |
| `path` | `any` | File path |
| `contentType` | `string` | MIME type |

## `SmtpClientDefaultOptions`

Default SMTP client configuration.

```typescript
interface SmtpClientDefaultOptions {
  senderName: string;
  senderEmail?: string;
  user?: string;
  pass?: string;
  host: string;
  port?: number;
  secure?: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `senderName` | `string` | Default sender display name |
| `senderEmail` | `string` | Default sender email |
| `user` | `string` | SMTP auth username |
| `pass` | `string` | SMTP auth password |
| `host` | `string` | SMTP server hostname |
| `port` | `number` | SMTP server port |
| `secure` | `boolean` | Use TLS |
