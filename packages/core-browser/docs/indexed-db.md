# IndexedDB

Lightweight wrappers around the browser IndexedDB API. `IndexedDbStore` provides a simplified interface for opening databases and performing CRUD operations. `IndexedDbVirtualFs` builds on top of it to implement a virtual filesystem stored in IndexedDB.

## IndexedDbStore

```typescript
class IndexedDbStore {
  constructor(dbName: string, dbVersion: number, storeConfigs: StoreConfig[]);
}
```

A wrapper that manages an IndexedDB database with automatic store creation on version upgrades.

| Parameter | Type | Description |
|-----------|------|-------------|
| `dbName` | `string` | Database name |
| `dbVersion` | `number` | Database version (triggers `onupgradeneeded` when increased) |
| `storeConfigs` | `StoreConfig[]` | Object store definitions |

### StoreConfig

```typescript
interface StoreConfig {
  name: string;
  keyPath: string;
}
```

### Methods

#### open

```typescript
open(): Promise<IDBDatabase>
```

Open the database, creating any missing object stores defined in `storeConfigs`. Rejects if the database is blocked by another connection.

#### withStore

```typescript
withStore<TResult>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<TResult>,
): Promise<TResult>
```

Execute a callback within a transaction on the specified store. The database connection is automatically opened and closed. If the callback throws, the transaction is aborted.

#### get

```typescript
get<TValue>(storeName: string, key: IDBValidKey): Promise<TValue | undefined>
```

Retrieve a single record by key. Returns `undefined` if not found.

#### put

```typescript
put(storeName: string, value: unknown): Promise<void>
```

Insert or update a record. The key is extracted from the value using the store's `keyPath`.

#### getAll

```typescript
getAll<TItem>(storeName: string): Promise<TItem[]>
```

Retrieve all records from a store.

---

## IndexedDbVirtualFs

```typescript
class IndexedDbVirtualFs {
  constructor(db: IndexedDbStore, storeName: string, keyField: string);
}
```

A virtual filesystem built on `IndexedDbStore`. Each entry is stored as a record with a full path key, a kind (`"file"` or `"dir"`), and optional Base64-encoded data.

| Parameter | Type | Description |
|-----------|------|-------------|
| `db` | `IndexedDbStore` | The underlying IndexedDB store instance |
| `storeName` | `string` | Name of the object store to use |
| `keyField` | `string` | The key property name in stored records |

### VirtualFsEntry

```typescript
interface VirtualFsEntry {
  kind: "file" | "dir";
  dataBase64?: string;
}
```

### Methods

#### getEntry

```typescript
getEntry(fullKey: string): Promise<VirtualFsEntry | undefined>
```

Get a single filesystem entry by its full key path.

#### putEntry

```typescript
putEntry(fullKey: string, kind: "file" | "dir", dataBase64?: string): Promise<void>
```

Create or update a filesystem entry.

#### deleteByPrefix

```typescript
deleteByPrefix(keyPrefix: string): Promise<boolean>
```

Delete all entries whose key matches the prefix or starts with `prefix + "/"`. Returns `true` if any entries were deleted.

#### listChildren

```typescript
listChildren(prefix: string): Promise<{ name: string; isDirectory: boolean }[]>
```

List immediate children under a path prefix. Returns each child's name and whether it is a directory.

#### ensureDir

```typescript
ensureDir(
  fullKeyBuilder: (path: string) => string,
  dirPath: string,
): Promise<void>
```

Ensure that a directory and all its ancestor directories exist. Walks through each segment of `dirPath` and creates missing directory entries.

| Parameter | Type | Description |
|-----------|------|-------------|
| `fullKeyBuilder` | `(path: string) => string` | Function to convert a path into a full key |
| `dirPath` | `string` | Directory path to ensure (e.g., `"/data/images"`) |

---

## Usage Examples

```typescript
import { IndexedDbStore, IndexedDbVirtualFs } from "@simplysm/core-browser";

// Set up a database with one store
const store = new IndexedDbStore("my-app-db", 1, [
  { name: "files", keyPath: "path" },
]);

// Basic CRUD
await store.put("files", { path: "/config.json", data: "{}" });
const record = await store.get<{ path: string; data: string }>("files", "/config.json");
const allRecords = await store.getAll("files");

// Use withStore for custom transactions
await store.withStore("files", "readwrite", async (objStore) => {
  return new Promise((resolve, reject) => {
    const req = objStore.delete("/old-file.txt");
    req.onsuccess = () => resolve(undefined);
    req.onerror = () => reject(req.error);
  });
});

// Virtual filesystem
const vfs = new IndexedDbVirtualFs(store, "files", "path");

await vfs.ensureDir((p) => p, "/data/images");
await vfs.putEntry("/data/images/photo.png", "file", btoa("...binary data..."));

const children = await vfs.listChildren("/data/");
// [{ name: "images", isDirectory: true }]

const entry = await vfs.getEntry("/data/images/photo.png");
// { kind: "file", dataBase64: "..." }

const deleted = await vfs.deleteByPrefix("/data/images");
// true
```
