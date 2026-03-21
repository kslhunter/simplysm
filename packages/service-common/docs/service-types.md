# Service Types

Shared interface definitions for built-in services.

## OrmService

ORM service interface. Provides database connection, transaction management, and query execution. Supports MySQL, MSSQL, and PostgreSQL.

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

## DbConnOptions

Database connection options.

```typescript
type DbConnOptions = {
  configName?: string;
  config?: Record<string, unknown>;
};
```

## AutoUpdateService

Auto-update service interface. Retrieves the latest version info for client applications.

```typescript
interface AutoUpdateService {
  /**
   * Retrieve the latest version info for the specified platform.
   * @param platform Target platform (e.g., "win32", "darwin", "linux")
   * @returns Latest version info, or undefined if no version exists
   */
  getLastVersion(platform: string): Promise<
    | { version: string; downloadPath: string }
    | undefined
  >;
}
```

## SMTP Types

### `SmtpClientSendAttachment`

```typescript
interface SmtpClientSendAttachment {
  filename: string;
  content?: string | Uint8Array;
  path?: any;
  contentType?: string;
}
```

### `SmtpClientSendByDefaultOption`

Options for sending email using server-side default SMTP configuration.

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

### `SmtpClientSendOption`

Full SMTP send options (includes server configuration).

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

### `SmtpClientDefaultOptions`

Default SMTP client configuration (stored in server config).

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
