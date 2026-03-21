# Classes

IndexedDB-based storage classes for browser-side data persistence.

```typescript
import { IndexedDbStore, IndexedDbVirtualFs } from "@simplysm/core-browser";
```

## `StoreConfig`

Configuration for an IndexedDB object store.

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

IndexedDB wrapper that manages database connections, schema upgrades, and transactional CRUD operations. Handles version changes and connection blocking gracefully.

### Constructor

```typescript
constructor(dbName: string, dbVersion: number, storeConfigs: StoreConfig[])
```

**Parameters:**
- `dbName` -- Database name
- `dbVersion` -- Database version (triggers upgrade when increased)
- `storeConfigs` -- Array of object store configurations

### Methods

#### `open`

Open or reuse the database connection. Creates object stores defined in `storeConfigs` during upgrade. Handles `onversionchange` and `onclose` events to clear internal references.

```typescript
async open(): Promise<IDBDatabase>;
```

#### `withStore`

Execute a function within an IndexedDB transaction. Handles transaction completion and error propagation.

```typescript
async withStore<TResult>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<TResult>,
): Promise<TResult>;
```

#### `get`

Get a value by key from a store.

```typescript
async get<TValue>(storeName: string, key: IDBValidKey): Promise<TValue | undefined>;
```

#### `put`

Put a value into a store (insert or update).

```typescript
async put(storeName: string, value: unknown): Promise<void>;
```

#### `delete`

Delete a value by key from a store.

```typescript
async delete(storeName: string, key: IDBValidKey): Promise<void>;
```

#### `getAll`

Get all values from a store.

```typescript
async getAll<TItem>(storeName: string): Promise<TItem[]>;
```

#### `close`

Close the database connection and clear internal references.

```typescript
close(): void;
```

---

## `VirtualFsEntry`

Entry in the virtual file system.

```typescript
interface VirtualFsEntry {
  kind: "file" | "dir";
  dataBase64?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `kind` | `"file" \| "dir"` | Entry type |
| `dataBase64` | `string \| undefined` | Base64-encoded file data (files only) |

## `IndexedDbVirtualFs`

Virtual file system backed by IndexedDB. Stores files and directories as key-value entries with hierarchical path support. Built on top of `IndexedDbStore`.

### Constructor

```typescript
constructor(db: IndexedDbStore, storeName: string, keyField: string)
```

**Parameters:**
- `db` -- `IndexedDbStore` instance
- `storeName` -- Name of the object store to use
- `keyField` -- Key field name for entries

### Methods

#### `getEntry`

Get a virtual file system entry by its full key.

```typescript
async getEntry(fullKey: string): Promise<VirtualFsEntry | undefined>;
```

#### `putEntry`

Put an entry into the virtual file system.

```typescript
async putEntry(fullKey: string, kind: "file" | "dir", dataBase64?: string): Promise<void>;
```

#### `deleteByPrefix`

Delete all entries matching a key prefix (the entry with the exact prefix key and all children).

```typescript
async deleteByPrefix(keyPrefix: string): Promise<boolean>;
```

**Returns:** `true` if any entries were deleted.

#### `listChildren`

List immediate children under a prefix path.

```typescript
async listChildren(prefix: string): Promise<{ name: string; isDirectory: boolean }[]>;
```

#### `ensureDir`

Ensure a directory path exists by creating all missing parent directories.

```typescript
async ensureDir(
  fullKeyBuilder: (path: string) => string,
  dirPath: string,
): Promise<void>;
```

**Parameters:**
- `fullKeyBuilder` -- Function to convert a path segment to a full key
- `dirPath` -- Directory path to ensure (e.g., `"/a/b/c"`)
