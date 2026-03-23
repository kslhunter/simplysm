# @simplysm/sd-orm-common-ext

> **Deprecated** -- All exports in this package are marked as deprecated.

Extended ORM models and utilities for common application patterns such as user authentication, system logging, data audit logging, and unique code generation. Built on top of `@simplysm/sd-orm-common`.

## Installation

```bash
npm install @simplysm/sd-orm-common-ext
```

## API Overview

### Extensions

| API | Type | Description |
|-----|------|-------------|
| `DbContextExt` | Abstract class | Extended `DbContext` with built-in queryables and auth/logging methods |
| `IAuthInfo` | Interface | Authentication result type |
| `IInsertDataLogParam` | Interface | Parameter for inserting data logs |
| `IJoinDataLogItem` | Interface | Joined data log item shape |

### Models

| API | Type | Description |
|-----|------|-------------|
| `Authentication` | Model class | Authentication token storage |
| `SystemDataLog` | Model class | Data change audit log |
| `SystemLog` | Model class | System event log |
| `UniqueCode` | Model class | Sequential unique code storage |
| `User` | Model class | User account |
| `UserConfig` | Model class | User configuration key-value pairs |
| `UserPermission` | Model class | User permission key-value pairs |

### Queryable Augmentations

| API | Type | Description |
|-----|------|-------------|
| `Queryable.joinLastDataLog()` | Method | Joins the most recent data log entry |
| `Queryable.joinFirstDataLog()` | Method | Joins the earliest data log entry |
| `Queryable.insertDataLogAsync()` | Method | Inserts a data log entry |
| `Queryable.insertDataLogPrepare()` | Method | Prepares a data log entry for batch insert |

## API Reference

### `DbContextExt`

Abstract class extending `DbContext` with pre-configured queryables for all system models and convenience methods for authentication, user config, system logging, and unique code generation.

```typescript
abstract class DbContextExt extends DbContext {
  uniqueCode: Queryable<this, UniqueCode>;
  systemDataLog: Queryable<this, SystemDataLog>;
  systemLog: Queryable<this, SystemLog>;
  authentication: Queryable<this, Authentication>;
  user: Queryable<this, User>;
  userConfig: Queryable<this, UserConfig>;
  userPermission: Queryable<this, UserPermission>;

  async authAsync(authKey: Uuid): Promise<IAuthInfo>;
  async authAsync(loginId: string, encryptedPassword: string): Promise<IAuthInfo>;

  async setUserConfig(userId: number, key: string, val: any): Promise<void>;
  async getUserConfig(userId: number, key: string): Promise<any>;

  async writeSystemLog(
    userId: number | undefined,
    clientName: string,
    severity: "error" | "warn" | "log",
    ...logs: any[]
  ): Promise<void>;

  async createUniqueCodes(option: {
    prefix: string;
    seqLength?: number;
    count: number;
  }): Promise<string[]>;
}
```

| Method | Description |
|--------|-------------|
| `authAsync(authKey)` | Authenticates by auth key (Uuid), refreshes token, returns user info with permissions and configs |
| `authAsync(loginId, encryptedPassword)` | Authenticates by login credentials, creates auth token, returns user info |
| `setUserConfig(userId, key, val)` | Upserts a user configuration entry |
| `getUserConfig(userId, key)` | Retrieves a user configuration value |
| `writeSystemLog(userId, clientName, severity, ...logs)` | Writes a system log entry |
| `createUniqueCodes(option)` | Generates sequential unique codes with a prefix |

### `IAuthInfo`

Authentication result returned by `authAsync`.

```typescript
interface IAuthInfo<T extends Record<string, any> = Record<string, any>> {
  key: Uuid;
  user: {
    id: number;
    name: string;
    email: string | undefined;
    permissionRecord: Record<string, any>;
    configRecord: T;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `key` | `Uuid` | Authentication token key |
| `user.id` | `number` | User ID |
| `user.name` | `string` | User display name |
| `user.email` | `string \| undefined` | User email address |
| `user.permissionRecord` | `Record<string, any>` | User permissions as key-value pairs |
| `user.configRecord` | `T` | User configuration as key-value pairs |

### `IInsertDataLogParam`

Parameter type for inserting data log entries.

```typescript
interface IInsertDataLogParam {
  type: string;
  itemId: number;
  valueJson: string | undefined;
  userId: number | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Log entry type/category |
| `itemId` | `number` | ID of the related data item |
| `valueJson` | `string \| undefined` | JSON-serialized value snapshot |
| `userId` | `number \| undefined` | ID of the user who made the change |

### `IJoinDataLogItem`

Shape of joined data log entries returned by `joinLastDataLog` / `joinFirstDataLog`.

```typescript
interface IJoinDataLogItem {
  type: string | undefined;
  dateTime: DateTime | undefined;
  userId: number | undefined;
  userName: string | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string \| undefined` | Log entry type |
| `dateTime` | `DateTime \| undefined` | Timestamp of the log entry |
| `userId` | `number \| undefined` | ID of the user who made the change |
| `userName` | `string \| undefined` | Name of the user who made the change |

### `Authentication`

Model class for authentication token storage.

```typescript
@Table({ description: "Authentication" })
class Authentication {
  @Column({ description: "Auth key", primaryKey: 1 })
  key!: Uuid;

  @Index({ unique: true })
  @Column({ description: "User ID" })
  userId!: number;

  @Column({ description: "Last authentication datetime" })
  lastDateTime!: DateTime;

  @ForeignKey(["userId"], () => User, "User")
  user?: Readonly<User>;
}
```

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| `key` | `Uuid` | PK | Authentication token key |
| `userId` | `number` | Unique Index | Foreign key to User |
| `lastDateTime` | `DateTime` | -- | Last authentication timestamp |

### `SystemDataLog`

Model class for data change audit logging.

```typescript
@Table({ description: "System data log" })
class SystemDataLog {
  @Column({ description: "ID", autoIncrement: true, primaryKey: 1 })
  id?: number;

  @Index({ name: "tableItem", order: 1 })
  @Column({ description: "Table name" })
  tableName!: string;

  @Column({ description: "Table description", nullable: true })
  tableDescription?: string;

  @Column({ description: "Type" })
  type!: string;

  @Index({ name: "tableItem", order: 2 })
  @Column({ description: "Item ID", nullable: true })
  itemId?: number;

  @Column({ description: "Value (JSON)", dataType: { type: "STRING", length: "MAX" }, nullable: true })
  valueJson?: string;

  @Index({ orderBy: "DESC" })
  @Column({ description: "Datetime" })
  dateTime!: DateTime;

  @Column({ description: "User ID", nullable: true })
  userId?: number;

  @ForeignKey(["userId"], () => User, "User")
  user?: Readonly<User>;
}
```

| Column | Type | Key | Nullable | Description |
|--------|------|-----|----------|-------------|
| `id` | `number` | PK (auto) | No | Auto-incrementing ID |
| `tableName` | `string` | Index | No | Name of the logged table |
| `tableDescription` | `string` | -- | Yes | Description of the logged table |
| `type` | `string` | -- | No | Log entry type |
| `itemId` | `number` | Index | Yes | ID of the affected row |
| `valueJson` | `string` | -- | Yes | JSON snapshot of the data |
| `dateTime` | `DateTime` | Index (DESC) | No | When the change occurred |
| `userId` | `number` | -- | Yes | Foreign key to User |

### `SystemLog`

Model class for system event logging.

```typescript
@Table({ description: "System log" })
class SystemLog {
  @Column({ description: "ID", autoIncrement: true, primaryKey: 1 })
  id?: number;

  @Column({ description: "Client name" })
  clientName!: string;

  @Column({ description: "Datetime" })
  dateTime!: DateTime;

  @Column({ description: "Type" })
  type!: string;

  @Column({ description: "Message", dataType: { type: "STRING", length: "MAX" } })
  message!: string;

  @Column({ description: "User ID", nullable: true })
  userId?: number;

  @ForeignKey(["userId"], () => User, "User")
  user?: Readonly<User>;
}
```

| Column | Type | Key | Nullable | Description |
|--------|------|-----|----------|-------------|
| `id` | `number` | PK (auto) | No | Auto-incrementing ID |
| `clientName` | `string` | -- | No | Name of the client application |
| `dateTime` | `DateTime` | -- | No | When the event occurred |
| `type` | `string` | -- | No | Severity type (`"error"`, `"warn"`, `"log"`) |
| `message` | `string` | -- | No | Log message content |
| `userId` | `number` | -- | Yes | Foreign key to User |

### `UniqueCode`

Model class for sequential unique code generation.

```typescript
@Table({ description: "Unique code" })
class UniqueCode {
  @Column({ description: "Code (prefix + seq)", primaryKey: 1 })
  code!: string;

  @Column({ description: "Sequence number" })
  seq!: number;
}
```

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| `code` | `string` | PK | Full code string (prefix + sequence) |
| `seq` | `number` | -- | Numeric sequence value |

### `User`

Model class for user accounts.

```typescript
@Table({ description: "User" })
class User {
  @Column({ description: "ID", autoIncrement: true, primaryKey: 1 })
  id?: number;

  @Index()
  @Column({ description: "Name" })
  name!: string;

  @Column({ description: "Email", nullable: true })
  email?: string;

  @Index()
  @Column({ description: "Login ID", nullable: true })
  loginId?: string;

  @Column({ description: "Encrypted password", nullable: true })
  encryptedPassword?: string;

  @Column({ description: "Is deleted" })
  isDeleted!: boolean;

  @ForeignKeyTarget(() => UserConfig, "user", "Config list")
  configs?: Readonly<UserConfig>[];

  @ForeignKeyTarget(() => UserPermission, "user", "Permission list")
  permissions?: Readonly<UserPermission>[];
}
```

| Column | Type | Key | Nullable | Description |
|--------|------|-----|----------|-------------|
| `id` | `number` | PK (auto) | No | Auto-incrementing user ID |
| `name` | `string` | Index | No | User display name |
| `email` | `string` | -- | Yes | User email address |
| `loginId` | `string` | Index | Yes | Login identifier |
| `encryptedPassword` | `string` | -- | Yes | Encrypted password hash |
| `isDeleted` | `boolean` | -- | No | Soft-delete flag |

### `UserConfig`

Model class for user configuration key-value pairs.

```typescript
@Table({ description: "User config" })
class UserConfig {
  @Column({ description: "User ID", primaryKey: 1 })
  userId!: number;

  @Column({ description: "Code", primaryKey: 2 })
  code!: string;

  @Column({ description: "Value (JSON)", dataType: { type: "STRING", length: "MAX" } })
  valueJson!: string;

  @ForeignKey(["userId"], () => User, "User")
  user?: Readonly<User>;
}
```

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| `userId` | `number` | PK (1) | Foreign key to User |
| `code` | `string` | PK (2) | Configuration key |
| `valueJson` | `string` | -- | JSON-serialized configuration value |

### `UserPermission`

Model class for user permission key-value pairs.

```typescript
@Table({ description: "User permission" })
class UserPermission {
  @Column({ description: "User ID", primaryKey: 1 })
  userId!: number;

  @Column({ description: "Code", primaryKey: 2 })
  code!: string;

  @Column({ description: "Value (JSON)", dataType: { type: "STRING", length: "MAX" } })
  valueJson!: string;

  @ForeignKey(["userId"], () => User, "User")
  user?: Readonly<User>;
}
```

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| `userId` | `number` | PK (1) | Foreign key to User |
| `code` | `string` | PK (2) | Permission key |
| `valueJson` | `string` | -- | JSON-serialized permission value |

### Queryable Augmentations

These methods are added to `Queryable` via module augmentation and are available on any `Queryable` instance within a `DbContextExt`.

#### `joinLastDataLog(opt?)`

Joins the most recent `SystemDataLog` entry for each row, filtered by table name and item ID.

```typescript
interface Queryable<D extends DbContext, T> {
  joinLastDataLog(opt?: {
    includeTypes?: string[];
    excludeTypes?: string[];
  }): Queryable<D, T & { lastDataLog: IJoinDataLogItem }>;
}
```

#### `joinFirstDataLog(opt?)`

Joins the earliest `SystemDataLog` entry for each row.

```typescript
interface Queryable<D extends DbContext, T> {
  joinFirstDataLog(opt?: {
    includeTypes?: string[];
    excludeTypes?: string[];
  }): Queryable<D, T & { firstDataLog: IJoinDataLogItem }>;
}
```

#### `insertDataLogAsync(log)`

Inserts a data log entry for the current queryable's table.

```typescript
interface Queryable<D extends DbContext, T> {
  insertDataLogAsync(log: IInsertDataLogParam): Promise<number[]>;
}
```

#### `insertDataLogPrepare(log)`

Prepares a data log entry for batch insertion (does not execute immediately).

```typescript
interface Queryable<D extends DbContext, T> {
  insertDataLogPrepare(log: IInsertDataLogParam): void;
}
```

## Usage Examples

### Authentication

```typescript
import { SdOrm } from "@simplysm/sd-orm-node";

class MyDb extends DbContextExt {
  // inherits all system queryables
}

const orm = new SdOrm(MyDb, config);

// Login
const authInfo = await orm.connectAsync(async (db) => {
  return await db.authAsync("admin", "encrypted_password_here");
});

// Re-authenticate with token
const refreshed = await orm.connectAsync(async (db) => {
  return await db.authAsync(authInfo.key);
});
```

### Data audit logging

```typescript
await orm.connectAsync(async (db) => {
  // Join last modification info
  const items = await db.someTable
    .joinLastDataLog()
    .select((item) => ({
      id: item.id,
      name: item.name,
      lastModifiedBy: item.lastDataLog.userName,
      lastModifiedAt: item.lastDataLog.dateTime,
    }))
    .resultAsync();

  // Log a data change
  await db.someTable.insertDataLogAsync({
    type: "update",
    itemId: 1,
    valueJson: JSON.stringify({ name: "new value" }),
    userId: currentUserId,
  });
});
```
