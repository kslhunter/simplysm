# IndexedDB Store

Generic IndexedDB wrapper providing typed CRUD operations and transaction management.

## `StoreConfig`

Configuration for an IndexedDB object store, used when opening the database.

```typescript
interface StoreConfig {
  name: string;
  keyPath: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Object store name |
| `keyPath` | `string` | Key path for the object store |

## `IndexedDbStore`

A wrapper around the IndexedDB API with automatic database opening, version upgrade handling, and typed CRUD methods.

```typescript
class IndexedDbStore {
  constructor(dbName: string, dbVersion: number, storeConfigs: StoreConfig[]);
}
```

| Constructor Parameter | Type | Description |
|----------------------|------|-------------|
| `dbName` | `string` | Database name |
| `dbVersion` | `number` | Database version (triggers `onupgradeneeded` when increased) |
| `storeConfigs` | `StoreConfig[]` | Object store configurations to create on upgrade |

### Methods

#### `open`

Open the database (creates stores on version upgrade). Returns the existing connection if already open. Concurrent calls return the same pending promise.

```typescript
async open(): Promise<IDBDatabase>
```

#### `withStore`

Execute a function within a transaction on a specific store. Handles transaction commit/abort automatically.

```typescript
async withStore<TResult>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<TResult>,
): Promise<TResult>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `storeName` | `string` | Target object store name |
| `mode` | `IDBTransactionMode` | `"readonly"` or `"readwrite"` |
| `fn` | `(store: IDBObjectStore) => Promise<TResult>` | Function to execute within the transaction |

#### `get`

Get a single value by key.

```typescript
async get<TValue>(storeName: string, key: IDBValidKey): Promise<TValue | undefined>
```

#### `put`

Insert or update a value.

```typescript
async put(storeName: string, value: unknown): Promise<void>
```

#### `delete`

Delete a value by key.

```typescript
async delete(storeName: string, key: IDBValidKey): Promise<void>
```

#### `getAll`

Get all values from a store.

```typescript
async getAll<TItem>(storeName: string): Promise<TItem[]>
```

#### `close`

Close the database connection.

```typescript
close(): void
```
