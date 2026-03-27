# @simplysm/capacitor-plugin-file-system

Capacitor File System Plugin -- Full file system access with Android permission management. Supports reading/writing files, directory operations, storage path retrieval, and FileProvider URI generation. Uses `MANAGE_EXTERNAL_STORAGE` on Android 11+ and `READ/WRITE_EXTERNAL_STORAGE` on earlier versions. Falls back to IndexedDB on browser.

## Installation

```bash
npm install @simplysm/capacitor-plugin-file-system
```

**Peer dependencies:**

- `@capacitor/core` ^7.4.4

## API Overview

| API | Type | Description |
|-----|------|-------------|
| `FileSystem` | Abstract class | Static methods for file system operations with permission management |
| `TStorage` | Type alias | Union type of storage location identifiers |
| `IFileInfo` | Interface | File/directory entry information |
| `IFileSystemPlugin` | Interface | Low-level Capacitor plugin interface for file system operations |

## API Reference

### `TStorage`

Union type representing available storage locations.

```typescript
export type TStorage =
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
| `"external"` | External storage root (`Environment.getExternalStorageDirectory`) |
| `"externalFiles"` | App-specific external files directory |
| `"externalCache"` | App-specific external cache directory |
| `"externalMedia"` | App-specific external media directory |
| `"appData"` | App data directory |
| `"appFiles"` | App files directory |
| `"appCache"` | App cache directory |

### `IFileInfo`

File or directory entry information returned by directory listing.

```typescript
export interface IFileInfo {
  name: string;
  isDirectory: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Name of the file or directory |
| `isDirectory` | `boolean` | `true` if the entry is a directory, `false` if a file |

### `IFileSystemPlugin`

Low-level Capacitor plugin interface. Use `FileSystem` instead for a simplified API.

```typescript
export interface IFileSystemPlugin {
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<void>;
  readdir(options: { path: string }): Promise<{ files: IFileInfo[] }>;
  getStoragePath(options: { type: TStorage }): Promise<{ path: string }>;
  getFileUri(options: { path: string }): Promise<{ uri: string }>;
  writeFile(options: { path: string; data: string; encoding?: "utf8" | "base64" }): Promise<void>;
  readFile(options: { path: string; encoding?: "utf8" | "base64" }): Promise<{ data: string }>;
  remove(options: { path: string }): Promise<void>;
  mkdir(options: { path: string }): Promise<void>;
  exists(options: { path: string }): Promise<{ exists: boolean }>;
}
```

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `checkPermission` | -- | `Promise<{ granted: boolean }>` | Check file system permission |
| `requestPermission` | -- | `Promise<void>` | Request file system permission |
| `readdir` | `options: { path }` | `Promise<{ files: IFileInfo[] }>` | List directory contents |
| `getStoragePath` | `options: { type: TStorage }` | `Promise<{ path: string }>` | Get absolute path for a storage type |
| `getFileUri` | `options: { path }` | `Promise<{ uri: string }>` | Get FileProvider content:// URI |
| `writeFile` | `options: { path, data, encoding? }` | `Promise<void>` | Write file with utf8 or base64 encoding |
| `readFile` | `options: { path, encoding? }` | `Promise<{ data: string }>` | Read file as utf8 or base64 string |
| `remove` | `options: { path }` | `Promise<void>` | Remove file or directory recursively |
| `mkdir` | `options: { path }` | `Promise<void>` | Create directory recursively |
| `exists` | `options: { path }` | `Promise<{ exists: boolean }>` | Check if file or directory exists |

### `FileSystem`

Abstract class with static methods for full file system access.

- **Android 11+**: `MANAGE_EXTERNAL_STORAGE` permission for full file system access
- **Android 10-**: `READ/WRITE_EXTERNAL_STORAGE` permissions
- **Browser**: IndexedDB-based emulation

```typescript
export abstract class FileSystem {
  static async checkPermissionAsync(): Promise<boolean>;
  static async requestPermissionAsync(): Promise<void>;
  static async readdirAsync(dirPath: string): Promise<IFileInfo[]>;
  static async getStoragePathAsync(type: TStorage): Promise<string>;
  static async getFileUriAsync(filePath: string): Promise<string>;
  static async writeFileAsync(filePath: string, data: string | Buffer): Promise<void>;
  static async readFileStringAsync(filePath: string): Promise<string>;
  static async readFileBufferAsync(filePath: string): Promise<Buffer>;
  static async removeAsync(targetPath: string): Promise<void>;
  static async mkdirsAsync(targetPath: string): Promise<void>;
  static async existsAsync(targetPath: string): Promise<boolean>;
}
```

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `checkPermissionAsync` | -- | `Promise<boolean>` | Check if file system permission is granted |
| `requestPermissionAsync` | -- | `Promise<void>` | Request file system permission (Android 11+: opens settings; Android 10-: shows dialog) |
| `readdirAsync` | `dirPath: string` | `Promise<IFileInfo[]>` | List files and directories in a directory |
| `getStoragePathAsync` | `type: TStorage` | `Promise<string>` | Get the absolute path for the specified storage type |
| `getFileUriAsync` | `filePath: string` | `Promise<string>` | Get a FileProvider `content://` URI for a file path |
| `writeFileAsync` | `filePath: string, data: string \| Buffer` | `Promise<void>` | Write a file; `Buffer` data is base64-encoded, `string` is written as UTF-8 |
| `readFileStringAsync` | `filePath: string` | `Promise<string>` | Read a file as a UTF-8 string |
| `readFileBufferAsync` | `filePath: string` | `Promise<Buffer>` | Read a file as a Buffer |
| `removeAsync` | `targetPath: string` | `Promise<void>` | Delete a file or directory recursively |
| `mkdirsAsync` | `targetPath: string` | `Promise<void>` | Create a directory and all parent directories |
| `existsAsync` | `targetPath: string` | `Promise<boolean>` | Check whether a file or directory exists |

## Usage Examples

### Read and write files with permission handling

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

// Ensure permission is granted
const hasPermission = await FileSystem.checkPermissionAsync();
if (!hasPermission) {
  await FileSystem.requestPermissionAsync();
}

// Get app cache directory
const cachePath = await FileSystem.getStoragePathAsync("appCache");

// Write a text file
await FileSystem.writeFileAsync(`${cachePath}/config.json`, '{"key": "value"}');

// Read it back
const content = await FileSystem.readFileStringAsync(`${cachePath}/config.json`);

// Write binary data
const buffer = Buffer.from([0x00, 0x01, 0x02]);
await FileSystem.writeFileAsync(`${cachePath}/data.bin`, buffer);

// Read binary data
const data = await FileSystem.readFileBufferAsync(`${cachePath}/data.bin`);
```

### List directory contents

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

const externalPath = await FileSystem.getStoragePathAsync("external");
const files = await FileSystem.readdirAsync(`${externalPath}/Documents`);

for (const file of files) {
  console.log(`${file.name} (${file.isDirectory ? "directory" : "file"})`);
}
```
