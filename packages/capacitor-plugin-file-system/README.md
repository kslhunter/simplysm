# @simplysm/capacitor-plugin-file-system

Simplysm Package - Capacitor File System Plugin

## Installation

```bash
pnpm add @simplysm/capacitor-plugin-file-system
```

## Main Modules

### FileSystem

An abstract class that provides static methods for file system access via the Capacitor plugin bridge.

- **Android 11+**: Full file system access via `MANAGE_EXTERNAL_STORAGE` permission.
- **Android 10 and below**: `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` permission.
- **Browser**: IndexedDB-based emulation.

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";
```

#### `FileSystem.checkPermissions()`

Checks whether the required file system permission has been granted.

```typescript
static async checkPermissions(): Promise<boolean>
```

```typescript
const granted = await FileSystem.checkPermissions();
if (!granted) {
  await FileSystem.requestPermissions();
}
```

#### `FileSystem.requestPermissions()`

Requests the required file system permission.

- Android 11+: Navigates to the system settings page.
- Android 10 and below: Shows the OS permission dialog.

```typescript
static async requestPermissions(): Promise<void>
```

```typescript
await FileSystem.requestPermissions();
```

#### `FileSystem.readdir(dirPath)`

Reads the contents of a directory and returns an array of `FileInfo` objects.

```typescript
static async readdir(dirPath: string): Promise<FileInfo[]>
```

```typescript
const entries = await FileSystem.readdir("/storage/emulated/0/Download");
for (const entry of entries) {
  console.log(entry.name, entry.isDirectory);
}
```

#### `FileSystem.getStoragePath(type)`

Returns the absolute path for the given storage type.

```typescript
static async getStoragePath(type: StorageType): Promise<string>
```

| `type` value      | Description                                                        |
|-------------------|--------------------------------------------------------------------|
| `"external"`      | External storage root (`Environment.getExternalStorageDirectory`)  |
| `"externalFiles"` | App-specific external files directory                              |
| `"externalCache"` | App-specific external cache directory                              |
| `"externalMedia"` | App-specific external media directory                              |
| `"appData"`       | App data directory                                                 |
| `"appFiles"`      | App files directory                                                |
| `"appCache"`      | App cache directory                                                |

```typescript
const path = await FileSystem.getStoragePath("external");
console.log(path); // e.g. "/storage/emulated/0"
```

#### `FileSystem.getUri(filePath)`

Returns a `FileProvider` URI for the given file path. Required for sharing files with other apps on Android.

```typescript
static async getUri(filePath: string): Promise<string>
```

```typescript
const uri = await FileSystem.getUri("/storage/emulated/0/Download/report.pdf");
console.log(uri); // content://...
```

#### `FileSystem.writeFile(filePath, data)`

Writes data to a file. Accepts a UTF-8 string or a `Bytes` (`Uint8Array`) value. Strings are written with UTF-8 encoding; byte arrays are written with Base64 encoding.

```typescript
static async writeFile(filePath: string, data: string | Bytes): Promise<void>
```

```typescript
// Write text
await FileSystem.writeFile("/storage/emulated/0/Download/hello.txt", "Hello, world!");

// Write binary
const bytes: Uint8Array = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
await FileSystem.writeFile("/storage/emulated/0/Download/image.png", bytes);
```

#### `FileSystem.readFile(filePath)`

Reads a file. When called without an encoding argument, returns a `Bytes` (`Uint8Array`) value. When called with `"utf8"`, returns a UTF-8 string.

```typescript
static async readFile(filePath: string): Promise<Bytes>
static async readFile(filePath: string, encoding: "utf8"): Promise<string>
```

```typescript
// Read as bytes
const bytes = await FileSystem.readFile("/storage/emulated/0/Download/image.png");
console.log(bytes.length);

// Read as string
const text = await FileSystem.readFile("/storage/emulated/0/Download/hello.txt", "utf8");
console.log(text);
```

#### `FileSystem.remove(targetPath)`

Deletes a file or directory recursively.

```typescript
static async remove(targetPath: string): Promise<void>
```

```typescript
await FileSystem.remove("/storage/emulated/0/Download/old-folder");
```

#### `FileSystem.mkdir(targetPath)`

Creates a directory, including any intermediate directories (recursive).

```typescript
static async mkdir(targetPath: string): Promise<void>
```

```typescript
await FileSystem.mkdir("/storage/emulated/0/Download/new-folder/sub");
```

#### `FileSystem.exists(targetPath)`

Checks whether a file or directory exists at the given path.

```typescript
static async exists(targetPath: string): Promise<boolean>
```

```typescript
const exists = await FileSystem.exists("/storage/emulated/0/Download/report.pdf");
console.log(exists); // true or false
```

## Types

### `StorageType`

Union type representing supported storage location identifiers used with `FileSystem.getStoragePath()`.

```typescript
import { type StorageType } from "@simplysm/capacitor-plugin-file-system";

type StorageType =
  | "external"
  | "externalFiles"
  | "externalCache"
  | "externalMedia"
  | "appData"
  | "appFiles"
  | "appCache";
```

### `FileInfo`

Represents a single entry returned by `FileSystem.readdir()`.

```typescript
import { type FileInfo } from "@simplysm/capacitor-plugin-file-system";

interface FileInfo {
  name: string;        // File or directory name
  isDirectory: boolean; // true if the entry is a directory
}
```

### `FileSystemPlugin`

The low-level plugin interface registered with Capacitor. Used internally by `FileSystem`. Direct use is not required in most cases.

```typescript
import { type FileSystemPlugin } from "@simplysm/capacitor-plugin-file-system";

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
