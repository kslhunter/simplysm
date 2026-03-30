# ORM/AutoUpdate Services

## `OrmService`

Built-in ORM service definition. Provides database connection, transaction management, and query execution over the WebSocket RPC layer. Requires authentication (wrapped with `auth()`).

```typescript
export const OrmService: ServiceDefinition;
```

The ORM service is registered with the name `"Orm"` and requires WebSocket transport (HTTP is not supported).

Database connections are tracked per socket. When a WebSocket connection closes, all associated DB connections are automatically cleaned up.

Methods (matching the `OrmService` interface from `@simplysm/service-common`):

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `getInfo` | `opt: DbConnOptions & { configName: string }` | `Promise<{ dialect: Dialect; database?: string; schema?: string }>` | Gets database info from server config |
| `connect` | `opt: DbConnOptions & { configName: string }` | `Promise<number>` | Opens a DB connection. Returns connection ID |
| `close` | `connId: number` | `Promise<void>` | Closes a DB connection |
| `beginTransaction` | `connId: number, isolationLevel?: IsolationLevel` | `Promise<void>` | Begins a transaction |
| `commitTransaction` | `connId: number` | `Promise<void>` | Commits a transaction |
| `rollbackTransaction` | `connId: number` | `Promise<void>` | Rolls back a transaction |
| `executeParametrized` | `connId: number, query: string, params?: unknown[]` | `Promise<unknown[][]>` | Executes a parameterized query |
| `executeDefs` | `connId: number, defs: QueryDef[], options?: (ResultMeta \| undefined)[]` | `Promise<unknown[][]>` | Executes query definitions with optional result parsing |
| `bulkInsert` | `connId: number, tableName: string, columnDefs: Record<string, ColumnMeta>, records: Record<string, unknown>[]` | `Promise<void>` | Performs bulk insert |

Configuration: Reads from the `"orm"` section of the server config file (`.config.json`).

## `OrmServiceType`

Type alias for the ORM service methods. Useful for client-side type sharing.

```typescript
export type OrmServiceType = ServiceMethods<typeof OrmService>;
```

## `AutoUpdateService`

Built-in auto-update service definition. Provides version lookup for client applications. Does not require authentication.

```typescript
export const AutoUpdateService: ServiceDefinition;
```

Registered with the name `"AutoUpdate"`. Scans `{clientPath}/{platform}/updates/` for versioned files (`.exe` for desktop, `.apk` for Android).

Methods:

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `getLastVersion` | `platform: string` | `Promise<{ version: string; downloadPath: string } \| undefined>` | Returns the latest version info for the given platform. Uses `semver.maxSatisfying` to find the highest version |

## `AutoUpdateServiceType`

Type alias for the auto-update service methods.

```typescript
export type AutoUpdateServiceType = ServiceMethods<typeof AutoUpdateService>;
```
