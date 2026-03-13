# @simplysm/sd-orm-common-ext

> **Deprecated** -- This package is no longer maintained.

Extended ORM models and utilities for common application patterns such as user authentication, system logging, data audit logging, and unique code generation. Built on top of `@simplysm/sd-orm-common`.

## Installation

```bash
npm install @simplysm/sd-orm-common-ext
# or
yarn add @simplysm/sd-orm-common-ext
```

### Peer Dependencies

- `@simplysm/sd-core-common`
- `@simplysm/sd-orm-common`

## API Reference

### DbContextExt (abstract class) -- deprecated

An extended `DbContext` that pre-registers all built-in model queryables and provides helper methods for authentication, logging, user configuration, and unique code generation.

#### Pre-registered Queryables

| Property | Model |
|---|---|
| `uniqueCode` | `UniqueCode` |
| `systemDataLog` | `SystemDataLog` |
| `systemLog` | `SystemLog` |
| `authentication` | `Authentication` |
| `user` | `User` |
| `userConfig` | `UserConfig` |
| `userPermission` | `UserPermission` |

#### Methods

##### `authAsync(authKey: Uuid): Promise<IAuthInfo>`

Authenticates a user by an existing authentication key. Expired authentication records (older than 1 day) are cleaned up automatically. Throws if the key has expired.

##### `authAsync(loginId: string, encryptedPassword: string): Promise<IAuthInfo>`

Authenticates a user by login ID and encrypted password. Expired authentication records are cleaned up automatically. Throws if no matching user is found.

##### `setUserConfig(userId: number, key: string, val: any): Promise<void>`

Upserts a user configuration entry. The value is JSON-serialized before storage.

##### `getUserConfig(userId: number, key: string): Promise<any>`

Retrieves a user configuration value by key. Returns `undefined` if not found.

##### `writeSystemLog(userId: number | undefined, clientName: string, severity: "error" | "warn" | "log", ...logs: any[]): Promise<void>`

Inserts a system log entry with the given severity and message. Messages are formatted using `util.format`.

##### `createUniqueCodes(option: { prefix: string; seqLength?: number; count: number }): Promise<string[]>`

Generates one or more unique codes with a given prefix. Codes are formed as `prefix + sequence number`, where the sequence is zero-padded to `seqLength` if specified. Uses row-level locking to guarantee uniqueness.

---

### IAuthInfo\<T\>

Returned by `DbContextExt.authAsync`.

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

---

### Queryable Extensions

The package augments `Queryable` from `@simplysm/sd-orm-common` with data-log related methods. These are available on all `Queryable` instances when this package is imported.

#### `queryable.joinLastDataLog(opt?): Queryable`

Joins the most recent `SystemDataLog` entry for each row (matched by table name and item ID). The result type is extended with a `lastDataLog` property.

- `opt.includeTypes` -- only include log entries of these types.
- `opt.excludeTypes` -- exclude log entries of these types.

#### `queryable.joinFirstDataLog(opt?): Queryable`

Joins the earliest `SystemDataLog` entry for each row. Same options as `joinLastDataLog`. The result type is extended with a `firstDataLog` property.

#### `queryable.insertDataLogAsync(log: IInsertDataLogParam): Promise<number[]>`

Inserts a data log entry for the current queryable's table. Returns the inserted log IDs.

#### `queryable.insertDataLogPrepare(log: IInsertDataLogParam): void`

Prepares (batches) a data log insert for the current queryable's table without immediately executing it.

---

### IInsertDataLogParam

Parameter for `insertDataLogAsync` and `insertDataLogPrepare`.

```typescript
interface IInsertDataLogParam {
  type: string;
  itemId: number;
  valueJson: string | undefined;
  userId: number | undefined;
}
```

### IJoinDataLogItem

Shape of the joined data log object added by `joinLastDataLog` / `joinFirstDataLog`.

```typescript
interface IJoinDataLogItem {
  type: string | undefined;
  dateTime: DateTime | undefined;
  userId: number | undefined;
  userName: string | undefined;
}
```

---

### Models

All model classes are deprecated. They use `@simplysm/sd-orm-common` decorators (`@Table`, `@Column`, `@Index`, `@ForeignKey`, `@ForeignKeyTarget`).

#### Authentication

Stores active authentication sessions.

| Column | Type | Description |
|---|---|---|
| `key` (PK) | `Uuid` | Authentication key |
| `userId` (unique index) | `number` | User ID |
| `lastDateTime` | `DateTime` | Last authentication timestamp |

Foreign keys: `user` -> `User`

#### SystemDataLog

Audit log for data changes across tables.

| Column | Type | Description |
|---|---|---|
| `id` (PK, auto-increment) | `number` | Log ID |
| `tableName` (indexed) | `string` | Target table name |
| `tableDescription` | `string?` | Target table description |
| `type` | `string` | Log type (e.g. create, update, delete) |
| `itemId` (indexed) | `number?` | Target row ID |
| `valueJson` | `string?` | JSON snapshot of the data (max length) |
| `dateTime` (indexed DESC) | `DateTime` | Log timestamp |
| `userId` | `number?` | User who made the change |

Foreign keys: `user` -> `User`

#### SystemLog

General-purpose system log.

| Column | Type | Description |
|---|---|---|
| `id` (PK, auto-increment) | `number` | Log ID |
| `clientName` | `string` | Client name |
| `dateTime` | `DateTime` | Log timestamp |
| `type` | `string` | Severity (error, warn, log) |
| `message` | `string` | Log message (max length) |
| `userId` | `number?` | Associated user ID |

Foreign keys: `user` -> `User`

#### UniqueCode

Stores generated unique codes with sequential numbering.

| Column | Type | Description |
|---|---|---|
| `code` (PK) | `string` | Full code (prefix + sequence) |
| `seq` | `number` | Sequence number |

#### User

User accounts.

| Column | Type | Description |
|---|---|---|
| `id` (PK, auto-increment) | `number` | User ID |
| `name` (indexed) | `string` | Display name |
| `email` | `string?` | Email address |
| `loginId` (indexed) | `string?` | Login identifier |
| `encryptedPassword` | `string?` | Encrypted password |
| `isDeleted` | `boolean` | Soft-delete flag |

Foreign key targets: `configs` -> `UserConfig[]`, `permissions` -> `UserPermission[]`

#### UserConfig

Key-value configuration per user.

| Column | Type | Description |
|---|---|---|
| `userId` (PK 1) | `number` | User ID |
| `code` (PK 2) | `string` | Configuration key |
| `valueJson` | `string` | JSON-serialized value (max length) |

Foreign keys: `user` -> `User`

#### UserPermission

Key-value permissions per user.

| Column | Type | Description |
|---|---|---|
| `userId` (PK 1) | `number` | User ID |
| `code` (PK 2) | `string` | Permission code |
| `valueJson` | `string` | JSON-serialized value (max length) |

Foreign keys: `user` -> `User`
