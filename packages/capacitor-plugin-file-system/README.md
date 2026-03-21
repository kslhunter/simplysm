# @simplysm/capacitor-plugin-file-system

Simplysm Package - Capacitor File System Plugin. Provides file system access for Android (MANAGE_EXTERNAL_STORAGE on Android 11+) with IndexedDB-based browser emulation.

## Installation

```bash
npm install @simplysm/capacitor-plugin-file-system
```

## API Overview

### File System

| API | Type | Description |
|-----|------|-------------|
| `FileSystem` | class | File system access plugin (static methods) |
| `FileSystemPlugin` | interface | Low-level Capacitor plugin interface for file system |
| `StorageType` | type | Storage location type |
| `FileInfo` | interface | File/directory entry information |

---

### `StorageType`

```typescript
type StorageType =
  | "external"       // External storage root (Environment.getExternalStorageDirectory)
  | "externalFiles"  // App-specific external files directory
  | "externalCache"  // App-specific external cache directory
  | "externalMedia"  // App-specific external media directory
  | "appData"        // App data directory
  | "appFiles"       // App files directory
  | "appCache";      // App cache directory
```

### `FileInfo`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | File or directory name |
| `isDirectory` | `boolean` | Whether the entry is a directory |

### `FileSystemPlugin`

| Method | Signature | Description |
|--------|-----------|-------------|
| `checkPermissions` | `() => Promise<{ granted: boolean }>` | Check file system permission |
| `requestPermissions` | `() => Promise<void>` | Request file system permission |
| `readdir` | `(options: { path: string }) => Promise<{ files: FileInfo[] }>` | Read directory contents |
| `getStoragePath` | `(options: { type: StorageType }) => Promise<{ path: string }>` | Get storage path by type |
| `getUri` | `(options: { path: string }) => Promise<{ uri: string }>` | Get FileProvider URI |
| `writeFile` | `(options: { path: string; data: string; encoding?: "utf8" \| "base64" }) => Promise<void>` | Write file |
| `readFile` | `(options: { path: string; encoding?: "utf8" \| "base64" }) => Promise<{ data: string }>` | Read file |
| `remove` | `(options: { path: string }) => Promise<void>` | Delete file/directory |
| `mkdir` | `(options: { path: string }) => Promise<void>` | Create directory |
| `exists` | `(options: { path: string }) => Promise<{ exists: boolean }>` | Check existence |

### `FileSystem`

Abstract class with static methods for file system access. Android 11+ uses MANAGE_EXTERNAL_STORAGE; Android 10- uses READ/WRITE_EXTERNAL_STORAGE; browser uses IndexedDB emulation.

| Method | Signature | Description |
|--------|-----------|-------------|
| `checkPermissions` | `() => Promise<boolean>` | Check permission |
| `requestPermissions` | `() => Promise<void>` | Request permission (Android 11+: settings, Android 10-: dialog) |
| `readdir` | `(dirPath: string) => Promise<FileInfo[]>` | Read directory |
| `getStoragePath` | `(type: StorageType) => Promise<string>` | Get storage path |
| `getUri` | `(filePath: string) => Promise<string>` | Get FileProvider URI |
| `writeFile` | `(filePath: string, data: string \| Bytes) => Promise<void>` | Write file (string or Uint8Array) |
| `readFile` | `(filePath: string) => Promise<Bytes>` | Read file as Bytes |
| `readFile` | `(filePath: string, encoding: "utf8") => Promise<string>` | Read file as UTF-8 string |
| `remove` | `(targetPath: string) => Promise<void>` | Delete file/directory (recursive) |
| `mkdir` | `(targetPath: string) => Promise<void>` | Create directory (recursive) |
| `exists` | `(targetPath: string) => Promise<boolean>` | Check existence |

## Usage Examples

### Read and write files

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

// Check and request permissions
if (!(await FileSystem.checkPermissions())) {
  await FileSystem.requestPermissions();
}

// Get storage path and write a file
const storagePath = await FileSystem.getStoragePath("appFiles");
await FileSystem.writeFile(`${storagePath}/data.txt`, "Hello, world!");

// Read it back
const content = await FileSystem.readFile(`${storagePath}/data.txt`, "utf8");

// List directory contents
const files = await FileSystem.readdir(storagePath);
```
