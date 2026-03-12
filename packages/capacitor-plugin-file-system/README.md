# @simplysm/capacitor-plugin-file-system

Capacitor plugin for file system access across Android and web platforms.

- **Android 11+**: Full file system access via `MANAGE_EXTERNAL_STORAGE` permission
- **Android 10 and below**: `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` permissions
- **Browser**: IndexedDB-based virtual file system emulation

## Installation

```bash
npm install @simplysm/capacitor-plugin-file-system
```

### Peer Dependencies

- `@capacitor/core` ^7.4.4

## API

### `FileSystem`

Abstract static class providing all file system operations.

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";
```

#### `FileSystem.checkPermissions()`

Check whether file system permissions are granted.

```typescript
static async checkPermissions(): Promise<boolean>
```

**Returns**: `true` if permissions are granted, `false` otherwise. On the web platform, always returns `true`.

#### `FileSystem.requestPermissions()`

Request file system permissions from the user.

```typescript
static async requestPermissions(): Promise<void>
```

- Android 11+: Navigates to the system settings page for the user to grant access.
- Android 10 and below: Shows the standard permission dialog.

#### `FileSystem.readdir(dirPath)`

Read the contents of a directory.

```typescript
static async readdir(dirPath: string): Promise<FileInfo[]>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `dirPath` | `string` | Absolute path to the directory |

**Returns**: Array of `FileInfo` objects.

#### `FileSystem.getStoragePath(type)`

Get the absolute path for a specific storage location.

```typescript
static async getStoragePath(type: StorageType): Promise<string>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `StorageType` | The storage location type |

**Returns**: Absolute path string for the requested storage location.

#### `FileSystem.getUri(filePath)`

Get a content URI for a file (via Android FileProvider). On the web platform, returns a Blob URL that must be released with `URL.revokeObjectURL()` after use.

```typescript
static async getUri(filePath: string): Promise<string>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | `string` | Absolute path to the file |

**Returns**: URI string.

#### `FileSystem.writeFile(filePath, data)`

Write data to a file. Parent directories are created automatically.

```typescript
static async writeFile(filePath: string, data: string | Bytes): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | `string` | Absolute path to the file |
| `data` | `string \| Bytes` | Content to write. Strings are written as UTF-8; `Bytes` (`Uint8Array`) is encoded as base64 for transfer. |

#### `FileSystem.readFile(filePath, encoding?)`

Read a file. Returns binary data by default, or a UTF-8 string when the encoding parameter is provided.

```typescript
static async readFile(filePath: string): Promise<Bytes>
static async readFile(filePath: string, encoding: "utf8"): Promise<string>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | `string` | Absolute path to the file |
| `encoding` | `"utf8"` (optional) | If provided, returns a UTF-8 decoded string |

**Returns**: `Bytes` (binary) or `string` depending on the encoding parameter.

#### `FileSystem.remove(targetPath)`

Delete a file or directory. Directories are removed recursively.

```typescript
static async remove(targetPath: string): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | Absolute path to the file or directory |

#### `FileSystem.mkdir(targetPath)`

Create a directory. Missing parent directories are created recursively.

```typescript
static async mkdir(targetPath: string): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | Absolute path to the directory |

#### `FileSystem.exists(targetPath)`

Check whether a file or directory exists.

```typescript
static async exists(targetPath: string): Promise<boolean>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | Absolute path to check |

**Returns**: `true` if the path exists, `false` otherwise.

## Types

### `StorageType`

```typescript
type StorageType =
  | "external"        // External storage root (Environment.getExternalStorageDirectory)
  | "externalFiles"   // App-specific external files directory
  | "externalCache"   // App-specific external cache directory
  | "externalMedia"   // App-specific external media directory
  | "appData"         // App data directory
  | "appFiles"        // App files directory
  | "appCache";       // App cache directory
```

### `FileInfo`

```typescript
interface FileInfo {
  name: string;        // File or directory name
  isDirectory: boolean; // true if the entry is a directory
}
```

### `FileSystemPlugin`

Low-level Capacitor plugin interface. Use the `FileSystem` class instead for a simpler API.

```typescript
interface FileSystemPlugin {
  checkPermissions(): Promise<{ granted: boolean }>;
  requestPermissions(): Promise<void>;
  readdir(options: { path: string }): Promise<{ files: FileInfo[] }>;
  getStoragePath(options: { type: StorageType }): Promise<{ path: string }>;
  getUri(options: { path: string }): Promise<{ uri: string }>;
  writeFile(options: { path: string; data: string; encoding?: "utf8" | "base64" }): Promise<void>;
  readFile(options: { path: string; encoding?: "utf8" | "base64" }): Promise<{ data: string }>;
  remove(options: { path: string }): Promise<void>;
  mkdir(options: { path: string }): Promise<void>;
  exists(options: { path: string }): Promise<{ exists: boolean }>;
}
```
