# @simplysm/cordova-plugin-file-system

> **Deprecated:** This package is no longer maintained. Migrate to `@simplysm/capacitor-plugin-file-system`.

Cordova File System Plugin (legacy) -- Full file system access for Android via the Cordova bridge. Supports permission management, reading/writing files (string and binary), directory operations, storage path retrieval, and FileProvider URI generation.

## Installation

```bash
npm install @simplysm/cordova-plugin-file-system
```

## API Overview

| API | Type | Description |
|-----|------|-------------|
| `CordovaFileSystem` | Abstract class | Static methods for file system operations via the Cordova bridge |

## API Reference

### `CordovaFileSystem`

Abstract class with static methods for full file system access through the Cordova bridge.

```typescript
export abstract class CordovaFileSystem {
  static async checkPermissionAsync(): Promise<boolean>;
  static async requestPermissionAsync(): Promise<void>;
  static async readdirAsync(dirPath: string): Promise<{ name: string; isDirectory: boolean }[]>;
  static async getStoragePathAsync(
    type:
      | "external"
      | "externalFiles"
      | "externalCache"
      | "externalMedia"
      | "appData"
      | "appFiles"
      | "appCache",
  ): Promise<string>;
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
| `requestPermissionAsync` | -- | `Promise<void>` | Request file system permission |
| `readdirAsync` | `dirPath: string` | `Promise<{ name: string; isDirectory: boolean }[]>` | List files and directories in a directory |
| `getStoragePathAsync` | `type: string` (see storage types) | `Promise<string>` | Get the absolute path for the specified storage type |
| `getFileUriAsync` | `filePath: string` | `Promise<string>` | Get a FileProvider content:// URI for a file path |
| `writeFileAsync` | `filePath: string, data: string \| Buffer` | `Promise<void>` | Write a file; `Buffer` data is base64-encoded, `string` is written as UTF-8 |
| `readFileStringAsync` | `filePath: string` | `Promise<string>` | Read a file as a UTF-8 string. Throws if file does not exist |
| `readFileBufferAsync` | `filePath: string` | `Promise<Buffer>` | Read a file as a Buffer |
| `removeAsync` | `targetPath: string` | `Promise<void>` | Delete a file or directory recursively |
| `mkdirsAsync` | `targetPath: string` | `Promise<void>` | Create a directory and all parent directories |
| `existsAsync` | `targetPath: string` | `Promise<boolean>` | Check whether a file or directory exists |

#### `readdirAsync` return fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Name of the file or directory |
| `isDirectory` | `boolean` | `true` if the entry is a directory, `false` if a file |

#### Storage type values

| Value | Description |
|-------|-------------|
| `"external"` | External storage root (`Environment.getExternalStorageDirectory`) |
| `"externalFiles"` | App-specific external files directory |
| `"externalCache"` | App-specific external cache directory |
| `"externalMedia"` | App-specific external media directory |
| `"appData"` | App data directory |
| `"appFiles"` | App files directory |
| `"appCache"` | App cache directory |

## Usage Examples

### Read and write files with permission handling

```typescript
import { CordovaFileSystem } from "@simplysm/cordova-plugin-file-system";

// Ensure permission is granted
const hasPermission = await CordovaFileSystem.checkPermissionAsync();
if (!hasPermission) {
  await CordovaFileSystem.requestPermissionAsync();
}

// Get app cache directory
const cachePath = await CordovaFileSystem.getStoragePathAsync("appCache");

// Write a text file
await CordovaFileSystem.writeFileAsync(`${cachePath}/config.json`, '{"key": "value"}');

// Read it back
const content = await CordovaFileSystem.readFileStringAsync(`${cachePath}/config.json`);

// Write binary data
const buffer = Buffer.from([0x00, 0x01, 0x02]);
await CordovaFileSystem.writeFileAsync(`${cachePath}/data.bin`, buffer);

// Read binary data
const data = await CordovaFileSystem.readFileBufferAsync(`${cachePath}/data.bin`);
```

### List directory and check existence

```typescript
import { CordovaFileSystem } from "@simplysm/cordova-plugin-file-system";

const externalPath = await CordovaFileSystem.getStoragePathAsync("external");

// List directory contents
const files = await CordovaFileSystem.readdirAsync(`${externalPath}/Documents`);
for (const file of files) {
  console.log(`${file.name} (${file.isDirectory ? "directory" : "file"})`);
}

// Check if a path exists
const exists = await CordovaFileSystem.existsAsync(`${externalPath}/Documents/report.pdf`);
```
