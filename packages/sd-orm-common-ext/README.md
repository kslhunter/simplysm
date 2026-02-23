# @simplysm/sd-orm-common-ext

> **DEPRECATED**: This package is no longer maintained and must not be used in new code. It will not receive bug fixes or updates. All symbols exported from this package are marked `@deprecated`.

---

## Overview

Provides pre-built ORM table models and a `DbContext` extension class for common application concerns: authentication sessions, users, permissions, user configurations, system logging, data change logging, and unique code generation.

**Peer dependencies:** `@simplysm/sd-orm-common`, `@simplysm/sd-core-common`

---

## Table of Contents

- [Models](#models)
  - [Authentication](#authentication)
  - [User](#user)
  - [UserConfig](#userconfig)
  - [UserPermission](#userpermission)
  - [SystemDataLog](#systemdatalog)
  - [SystemLog](#systemlog)
  - [UniqueCode](#uniquecode)
- [Extensions: DbContextExt](#dbcontextext)
  - [Queryable properties](#queryable-properties)
  - [Methods](#methods)
  - [IAuthInfo](#iauthinfo)
- [Extensions: Queryable (module augmentation)](#extensions-queryable-module-augmentation)
  - [joinLastDataLog](#joinlastdatalog)
  - [joinFirstDataLog](#joinfirstdatalog)
  - [insertDataLogAsync](#insertdatalogasync)
  - [insertDataLogPrepare](#insertdatalogprepare)
  - [IInsertDataLogParam](#iinsertdatalogparam)
  - [IJoinDataLogItem](#ijoindatalogitem)

---

## Models

### Authentication

**@deprecated**

ORM table entity representing a login session / authentication token.

```typescript
import { Authentication } from "@simplysm/sd-orm-common-ext";
```

| Column         | Type       | Constraints  | Description                          |
| -------------- | ---------- | ------------ | ------------------------------------ |
| `key`          | `Uuid`     | Primary key  | Authentication token key             |
| `userId`       | `number`   | Unique index | FK → `User.id`                       |
| `lastDateTime` | `DateTime` |              | Timestamp of the last authentication |

**Relations**

| Property | Type                          | Description                         |
| -------- | ----------------------------- | ----------------------------------- |
| `user`   | `Readonly<User> \| undefined` | FK target: the owning `User` record |

---

### User

**@deprecated**

ORM table entity for application users.

```typescript
import { User } from "@simplysm/sd-orm-common-ext";
```

| Column              | Type                  | Constraints       | Description        |
| ------------------- | --------------------- | ----------------- | ------------------ |
| `id`                | `number \| undefined` | Auto-increment PK | User ID            |
| `name`              | `string`              | Index             | Display name       |
| `email`             | `string \| undefined` | Nullable          | Email address      |
| `loginId`           | `string \| undefined` | Index, Nullable   | Login identifier   |
| `encryptedPassword` | `string \| undefined` | Nullable          | Encrypted password |
| `isDeleted`         | `boolean`             |                   | Soft-delete flag   |

**Relations**

| Property      | Type                                      | Description                      |
| ------------- | ----------------------------------------- | -------------------------------- |
| `configs`     | `Readonly<UserConfig>[] \| undefined`     | FK target: configuration entries |
| `permissions` | `Readonly<UserPermission>[] \| undefined` | FK target: permission entries    |

---

### UserConfig

**@deprecated**

ORM table entity for per-user key/value configuration storage.

```typescript
import { UserConfig } from "@simplysm/sd-orm-common-ext";
```

| Column      | Type     | Constraints   | Description           |
| ----------- | -------- | ------------- | --------------------- |
| `userId`    | `number` | Primary key 1 | FK → `User.id`        |
| `code`      | `string` | Primary key 2 | Configuration key     |
| `valueJson` | `string` | String MAX    | JSON-serialized value |

**Relations**

| Property | Type                          | Description                         |
| -------- | ----------------------------- | ----------------------------------- |
| `user`   | `Readonly<User> \| undefined` | FK target: the owning `User` record |

---

### UserPermission

**@deprecated**

ORM table entity for per-user permission codes with associated JSON values.

```typescript
import { UserPermission } from "@simplysm/sd-orm-common-ext";
```

| Column      | Type     | Constraints   | Description                      |
| ----------- | -------- | ------------- | -------------------------------- |
| `userId`    | `number` | Primary key 1 | FK → `User.id`                   |
| `code`      | `string` | Primary key 2 | Permission code                  |
| `valueJson` | `string` | String MAX    | JSON-serialized permission value |

**Relations**

| Property | Type                          | Description                         |
| -------- | ----------------------------- | ----------------------------------- |
| `user`   | `Readonly<User> \| undefined` | FK target: the owning `User` record |

---

### SystemDataLog

**@deprecated**

ORM table entity recording data-change audit events for any table row.

```typescript
import { SystemDataLog } from "@simplysm/sd-orm-common-ext";
```

| Column             | Type                  | Constraints                         | Description                      |
| ------------------ | --------------------- | ----------------------------------- | -------------------------------- |
| `id`               | `number \| undefined` | Auto-increment PK                   | Log entry ID                     |
| `tableName`        | `string`              | Index `tableItem` order 1           | Name of the audited table        |
| `tableDescription` | `string \| undefined` | Nullable                            | Human-readable table description |
| `type`             | `string`              |                                     | Event type label                 |
| `itemId`           | `number \| undefined` | Index `tableItem` order 2, Nullable | PK of the audited row            |
| `valueJson`        | `string \| undefined` | String MAX, Nullable                | JSON snapshot of changed values  |
| `dateTime`         | `DateTime`            | DESC index                          | Timestamp of the event           |
| `userId`           | `number \| undefined` | Nullable                            | FK → `User.id`                   |

**Relations**

| Property | Type                          | Description                              |
| -------- | ----------------------------- | ---------------------------------------- |
| `user`   | `Readonly<User> \| undefined` | FK target: the user who caused the event |

---

### SystemLog

**@deprecated**

ORM table entity for general application log messages (errors, warnings, info).

```typescript
import { SystemLog } from "@simplysm/sd-orm-common-ext";
```

| Column       | Type                  | Constraints       | Description                               |
| ------------ | --------------------- | ----------------- | ----------------------------------------- |
| `id`         | `number \| undefined` | Auto-increment PK | Log entry ID                              |
| `clientName` | `string`              |                   | Name of the client that produced the log  |
| `dateTime`   | `DateTime`            |                   | Timestamp of the log entry                |
| `type`       | `string`              |                   | Severity: `"error"`, `"warn"`, or `"log"` |
| `message`    | `string`              | String MAX        | Formatted log message                     |
| `userId`     | `number \| undefined` | Nullable          | FK → `User.id`                            |

**Relations**

| Property | Type                          | Description                |
| -------- | ----------------------------- | -------------------------- |
| `user`   | `Readonly<User> \| undefined` | FK target: the acting user |

---

### UniqueCode

**@deprecated**

ORM table entity for sequential, prefix-based unique code generation.

```typescript
import { UniqueCode } from "@simplysm/sd-orm-common-ext";
```

| Column | Type     | Constraints | Description                       |
| ------ | -------- | ----------- | --------------------------------- |
| `code` | `string` | Primary key | Full code string (`prefix + seq`) |
| `seq`  | `number` |             | Numeric sequence value            |

---

## Extensions: DbContextExt

**@deprecated**

Abstract base class that extends `DbContext` from `@simplysm/sd-orm-common`. Provides pre-wired `Queryable` properties for all bundled models plus high-level helper methods for authentication, configuration, logging, and code generation.

```typescript
import { DbContextExt } from "@simplysm/sd-orm-common-ext";

abstract class MyDb extends DbContextExt {
  /* ... */
}
```

### Queryable properties

| Property         | Type                              | Description                            |
| ---------------- | --------------------------------- | -------------------------------------- |
| `uniqueCode`     | `Queryable<this, UniqueCode>`     | Query entry point for `UniqueCode`     |
| `systemDataLog`  | `Queryable<this, SystemDataLog>`  | Query entry point for `SystemDataLog`  |
| `systemLog`      | `Queryable<this, SystemLog>`      | Query entry point for `SystemLog`      |
| `authentication` | `Queryable<this, Authentication>` | Query entry point for `Authentication` |
| `user`           | `Queryable<this, User>`           | Query entry point for `User`           |
| `userConfig`     | `Queryable<this, UserConfig>`     | Query entry point for `UserConfig`     |
| `userPermission` | `Queryable<this, UserPermission>` | Query entry point for `UserPermission` |

### Methods

#### `authAsync(authKey: Uuid): Promise<IAuthInfo>`

#### `authAsync(loginId: string, encryptedPassword: string): Promise<IAuthInfo>`

Authenticates a user by either an existing auth token (`Uuid`) or by login credentials. Stale authentication records older than 1 day are deleted on each call. On success the authentication row is upserted with a refreshed `lastDateTime` and a new token key is returned.

Throws if the auth token has expired or if the login credentials do not match an active user.

```typescript
// Authenticate by credentials
const authInfo = await db.authAsync("john", encryptedPwd);

// Re-authenticate by token
const authInfo = await db.authAsync(existingKey);
```

---

#### `setUserConfig(userId: number, key: string, val: any): Promise<void>`

Upserts a per-user configuration entry. `val` is serialized to JSON before storage.

```typescript
await db.setUserConfig(1, "theme", "dark");
```

---

#### `getUserConfig(userId: number, key: string): Promise<any>`

Returns the parsed JSON value of a per-user configuration entry, or `undefined` if not found.

```typescript
const theme = await db.getUserConfig(1, "theme"); // "dark"
```

---

#### `writeSystemLog(userId: number | undefined, clientName: string, severity: "error" | "warn" | "log", ...logs: any[]): Promise<void>`

Inserts a system log entry. `logs` is formatted with `util.format` before being stored.

```typescript
await db.writeSystemLog(1, "MyApp", "error", new Error("something went wrong"));
```

---

#### `createUniqueCodes(option: { prefix: string; seqLength?: number; count: number }): Promise<string[]>`

Generates `count` sequential unique codes under a given `prefix`. The sequence continues from the highest existing sequence number for that prefix. If `seqLength` is provided the numeric part is zero-padded to that length.

Returns an array of the newly created code strings.

```typescript
// Generates ["ORD-001", "ORD-002", "ORD-003"]
const codes = await db.createUniqueCodes({ prefix: "ORD-", seqLength: 3, count: 3 });
```

---

### IAuthInfo

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

Returned by `authAsync`. `key` is the current authentication token. `permissionRecord` and `configRecord` are keyed by `code` and contain the parsed JSON values from `UserPermission` and `UserConfig` respectively.

---

## Extensions: Queryable (module augmentation)

Importing this package augments `Queryable<D, T>` from `@simplysm/sd-orm-common` with additional methods. These are available on any `Queryable` whose database context extends `DbContextExt`.

```typescript
import "@simplysm/sd-orm-common-ext"; // import for side-effects to activate augmentation
```

### `joinLastDataLog`

```typescript
joinLastDataLog(opt?: {
  includeTypes?: string[];
  excludeTypes?: string[];
}): Queryable<D, T & { lastDataLog: IJoinDataLogItem }>
```

Left-joins the most recent `SystemDataLog` entry for each row (matched by `tableName` and `id`). The result shape gains a `lastDataLog` property. `includeTypes`/`excludeTypes` filter which log event types are considered.

---

### `joinFirstDataLog`

```typescript
joinFirstDataLog(opt?: {
  includeTypes?: string[];
  excludeTypes?: string[];
}): Queryable<D, T & { firstDataLog: IJoinDataLogItem }>
```

Same as `joinLastDataLog` but joins the oldest matching `SystemDataLog` entry. The result shape gains a `firstDataLog` property.

---

### `insertDataLogAsync`

```typescript
insertDataLogAsync(log: IInsertDataLogParam): Promise<number[]>
```

Inserts a `SystemDataLog` record for the current queryable's table. Uses `db.lastConnectionDateTime` as the timestamp. Returns the auto-generated IDs of the inserted rows.

---

### `insertDataLogPrepare`

```typescript
insertDataLogPrepare(log: IInsertDataLogParam): void
```

Stages a `SystemDataLog` insert using `insertPrepare` (deferred execution within the current transaction batch). Otherwise identical to `insertDataLogAsync`.

---

### IInsertDataLogParam

```typescript
interface IInsertDataLogParam {
  type: string;
  itemId: number;
  valueJson: string | undefined;
  userId: number | undefined;
}
```

| Field       | Type                  | Description                                    |
| ----------- | --------------------- | ---------------------------------------------- |
| `type`      | `string`              | Event type label (e.g. `"INSERT"`, `"UPDATE"`) |
| `itemId`    | `number`              | PK of the audited row                          |
| `valueJson` | `string \| undefined` | JSON snapshot of the changed data              |
| `userId`    | `number \| undefined` | ID of the user who triggered the event         |

---

### IJoinDataLogItem

```typescript
interface IJoinDataLogItem {
  type: string | undefined;
  dateTime: DateTime | undefined;
  userId: number | undefined;
  userName: string | undefined;
}
```

Shape of the joined data log entry added to each result row by `joinLastDataLog` and `joinFirstDataLog`.

| Field      | Type                    | Description                           |
| ---------- | ----------------------- | ------------------------------------- |
| `type`     | `string \| undefined`   | Event type label                      |
| `dateTime` | `DateTime \| undefined` | Timestamp of the log entry            |
| `userId`   | `number \| undefined`   | ID of the user who caused the event   |
| `userName` | `string \| undefined`   | Name of the user who caused the event |
