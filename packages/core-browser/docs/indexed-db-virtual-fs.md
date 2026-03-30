# IndexedDB Virtual FS

A virtual file system abstraction backed by IndexedDB, built on top of `IndexedDbStore`.

## `VirtualFsEntry`

Represents a file or directory entry in the virtual file system.

```typescript
interface VirtualFsEntry {
  kind: "file" | "dir";
  dataBase64?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `kind` | `"file" \| "dir"` | Entry type |
| `dataBase64` | `string \| undefined` | Base64-encoded file data (only for files) |

## `IndexedDbVirtualFs`

Virtual file system that stores entries in an `IndexedDbStore`. Supports hierarchical path-based operations including directory creation, prefix-based deletion, and child listing.

```typescript
class IndexedDbVirtualFs {
  constructor(db: IndexedDbStore, storeName: string, keyField: string);
}
```

| Constructor Parameter | Type | Description |
|----------------------|------|-------------|
| `db` | `IndexedDbStore` | The IndexedDB store instance |
| `storeName` | `string` | Object store name to use |
| `keyField` | `string` | Field name used as the key in the store |

### Methods

#### `getEntry`

Get a virtual FS entry by its full key.

```typescript
async getEntry(fullKey: string): Promise<VirtualFsEntry | undefined>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `fullKey` | `string` | Full key identifying the entry |

#### `putEntry`

Insert or update a virtual FS entry.

```typescript
async putEntry(fullKey: string, kind: "file" | "dir", dataBase64?: string): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `fullKey` | `string` | Full key for the entry |
| `kind` | `"file" \| "dir"` | Entry type |
| `dataBase64` | `string` | Optional base64-encoded data (for files) |

#### `deleteByPrefix`

Delete all entries whose key matches the given prefix or starts with `prefix + "/"`.

```typescript
async deleteByPrefix(keyPrefix: string): Promise<boolean>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `keyPrefix` | `string` | Key prefix to match |

**Returns:** `Promise<boolean>` -- `true` if at least one entry was deleted.

#### `listChildren`

List immediate children under a given prefix. Returns each child's name and whether it is a directory.

```typescript
async listChildren(prefix: string): Promise<{ name: string; isDirectory: boolean }[]>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `prefix` | `string` | Parent path prefix (e.g., `"/root/dir/"`) |

**Returns:** `Promise<{ name: string; isDirectory: boolean }[]>` -- Array of child entries.

#### `ensureDir`

Ensure all directories along a path exist, creating missing ones.

```typescript
async ensureDir(
  fullKeyBuilder: (path: string) => string,
  dirPath: string,
): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `fullKeyBuilder` | `(path: string) => string` | Function to build the full key from a path segment |
| `dirPath` | `string` | Directory path to ensure (e.g., `"/a/b/c"`) |
