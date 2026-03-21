# @simplysm/capacitor-plugin-file-system

Capacitor File System Plugin -- full file system access for Android with IndexedDB fallback for browser.

## Installation

```bash
npm install @simplysm/capacitor-plugin-file-system
```

## API Overview

### Types

| API | Type | Description |
|-----|------|-------------|
| `StorageType` | type | Storage location type (`"external"`, `"externalFiles"`, `"externalCache"`, `"externalMedia"`, `"appData"`, `"appFiles"`, `"appCache"`) |
| `FileInfo` | interface | File entry info (`name`, `isDirectory`) |

### Interfaces

| API | Type | Description |
|-----|------|-------------|
| `FileSystemPlugin` | interface | Low-level Capacitor plugin interface for file system operations |

### Classes

| API | Type | Description |
|-----|------|-------------|
| `FileSystem` | abstract class | File system access with permission management |

## `StorageType`

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

## `FileInfo`

```typescript
interface FileInfo {
  name: string;
  isDirectory: boolean;
}
```

## `FileSystemPlugin`

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

Low-level Capacitor plugin interface. Use `FileSystem` static methods instead of calling this directly.

## `FileSystem`

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

File system access plugin.
- Android 11+: Full file system access via `MANAGE_EXTERNAL_STORAGE` permission.
- Android 10-: `READ/WRITE_EXTERNAL_STORAGE` permission.
- Browser: IndexedDB-based emulation.

## Usage Examples

### Read and write files

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

const storagePath = await FileSystem.getStoragePath("appFiles");
const filePath = storagePath + "/data.txt";

await FileSystem.writeFile(filePath, "Hello, World!");
const content = await FileSystem.readFile(filePath, "utf8");
```

### List directory contents

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

const granted = await FileSystem.checkPermissions();
if (!granted) {
  await FileSystem.requestPermissions();
}

const externalPath = await FileSystem.getStoragePath("external");
const files = await FileSystem.readdir(externalPath + "/Documents");
```

### Write binary data

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

const storagePath = await FileSystem.getStoragePath("appCache");
await FileSystem.writeFile(storagePath + "/image.bin", myUint8Array);
const data = await FileSystem.readFile(storagePath + "/image.bin");
```
