# @simplysm/capacitor-plugin-file-system

Capacitor plugin for file system access on Android with an IndexedDB-based fallback for browsers.

- **Android 11+**: Full file system access via `MANAGE_EXTERNAL_STORAGE` permission
- **Android 10-**: `READ/WRITE_EXTERNAL_STORAGE` permissions
- **Browser**: IndexedDB-based emulation

## Installation

```bash
npm install @simplysm/capacitor-plugin-file-system
```

## API Overview

### Types

| API | Type | Description |
|-----|------|-------------|
| `StorageType` | Type | Union of supported Android storage location identifiers |

### Interfaces

| API | Type | Description |
|-----|------|-------------|
| `FileInfo` | Interface | File entry metadata returned by directory listing |
| `FileSystemPlugin` | Interface | Native plugin interface for file system operations |

### Classes

| API | Type | Description |
|-----|------|-------------|
| `FileSystem` | Class | Static API for file system access with permission management |

## `StorageType`

Union type representing available storage location types.

```typescript
type StorageType =
  | "external"
  | "externalFiles"
  | "externalCache"
  | "externalMedia"
  | "appData"
  | "appFiles"
  | "appCache";
```

| Value | Description |
|-------|-------------|
| `"external"` | Shared external storage root (`Environment.getExternalStorageDirectory`) |
| `"externalFiles"` | App-specific external files directory |
| `"externalCache"` | App-specific external cache directory |
| `"externalMedia"` | App-specific external media directory |
| `"appData"` | Internal app data directory |
| `"appFiles"` | Internal app files directory |
| `"appCache"` | Internal app cache directory |

## `FileInfo`

Metadata for a single file or directory entry.

```typescript
interface FileInfo {
  name: string;
  isDirectory: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Name of the file or directory |
| `isDirectory` | `boolean` | `true` if the entry is a directory |

## `FileSystemPlugin`

Native plugin interface for file system operations. Use the `FileSystem` class for a simplified API.

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

| Method | Signature | Description |
|--------|-----------|-------------|
| `checkPermissions` | `() => Promise<{ granted: boolean }>` | Check if storage permissions are granted |
| `requestPermissions` | `() => Promise<void>` | Request storage permissions |
| `readdir` | `(options: { path: string }) => Promise<{ files: FileInfo[] }>` | List files in a directory |
| `getStoragePath` | `(options: { type: StorageType }) => Promise<{ path: string }>` | Get the absolute path for a storage type |
| `getUri` | `(options: { path: string }) => Promise<{ uri: string }>` | Get a FileProvider `content://` URI for a file path |
| `writeFile` | `(options: { path: string; data: string; encoding?: "utf8" \| "base64" }) => Promise<void>` | Write data to a file |
| `readFile` | `(options: { path: string; encoding?: "utf8" \| "base64" }) => Promise<{ data: string }>` | Read data from a file |
| `remove` | `(options: { path: string }) => Promise<void>` | Remove a file or directory |
| `mkdir` | `(options: { path: string }) => Promise<void>` | Create a directory |
| `exists` | `(options: { path: string }) => Promise<{ exists: boolean }>` | Check if a path exists |

## `FileSystem`

Abstract class with static methods for file system operations. On Android 11+ it uses `MANAGE_EXTERNAL_STORAGE`. On Android 10 and below it uses `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE`. On the browser it falls back to IndexedDB emulation.

```typescript
abstract class FileSystem {
  static async checkPermissions(): Promise<boolean>;
  static async requestPermissions(): Promise<void>;
  static async readdir(dirPath: string): Promise<FileInfo[]>;
  static async getStoragePath(type: StorageType): Promise<string>;
  static async getUri(filePath: string): Promise<string>;
  static async writeFile(filePath: string, data: string | Bytes): Promise<void>;
  static async readFile(filePath: string): Promise<Bytes>;
  static async readFile(filePath: string, encoding: "utf8"): Promise<string>;
  static async remove(targetPath: string): Promise<void>;
  static async mkdir(targetPath: string): Promise<void>;
  static async exists(targetPath: string): Promise<boolean>;
}
```

| Method | Signature | Description |
|--------|-----------|-------------|
| `checkPermissions` | `static async checkPermissions(): Promise<boolean>` | Check whether storage permissions are granted |
| `requestPermissions` | `static async requestPermissions(): Promise<void>` | Request storage permissions from the user |
| `readdir` | `static async readdir(dirPath: string): Promise<FileInfo[]>` | List files and directories at the given path |
| `getStoragePath` | `static async getStoragePath(type: StorageType): Promise<string>` | Get the absolute path for a storage type |
| `getUri` | `static async getUri(filePath: string): Promise<string>` | Get a FileProvider `content://` URI for the given file path |
| `writeFile` | `static async writeFile(filePath: string, data: string \| Bytes): Promise<void>` | Write string or binary data to a file. Binary data (`Bytes`) is automatically base64-encoded. |
| `readFile` | `static async readFile(filePath: string): Promise<Bytes>` | Read a file as binary data |
| `readFile` (overload) | `static async readFile(filePath: string, encoding: "utf8"): Promise<string>` | Read a file as a UTF-8 string |
| `remove` | `static async remove(targetPath: string): Promise<void>` | Recursively delete a file or directory |
| `mkdir` | `static async mkdir(targetPath: string): Promise<void>` | Recursively create a directory and all parent directories |
| `exists` | `static async exists(targetPath: string): Promise<boolean>` | Check whether a file or directory exists at the given path |

## Usage Examples

### Read and write files

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

// Ensure permissions
const granted = await FileSystem.checkPermissions();
if (!granted) {
  await FileSystem.requestPermissions();
}

// Get app cache path and write a file
const cachePath = await FileSystem.getStoragePath("appCache");
await FileSystem.writeFile(`${cachePath}/data.json`, JSON.stringify({ key: "value" }));

// Read the file back as a string
const content = await FileSystem.readFile(`${cachePath}/data.json`, "utf8");
```

### List directory contents and check existence

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

const externalPath = await FileSystem.getStoragePath("external");
const files = await FileSystem.readdir(`${externalPath}/Documents`);

for (const file of files) {
  if (file.isDirectory) {
    // handle directory
  } else {
    // handle file
  }
}

// Create a directory if it does not exist
const dirPath = `${externalPath}/MyApp/data/logs`;
if (!(await FileSystem.exists(dirPath))) {
  await FileSystem.mkdir(dirPath);
}
```
