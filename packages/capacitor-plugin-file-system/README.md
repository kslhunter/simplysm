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

#### `FileSystem.hasPermission()`

Checks whether the required file system permission has been granted.

```typescript
static async hasPermission(): Promise<boolean>
```

```typescript
const granted = await FileSystem.hasPermission();
if (!granted) {
  await FileSystem.requestPermission();
}
```

#### `FileSystem.requestPermission()`

Requests the required file system permission.

- Android 11+: Navigates to the system settings page.
- Android 10 and below: Shows the OS permission dialog.

```typescript
static async requestPermission(): Promise<void>
```

```typescript
await FileSystem.requestPermission();
```

#### `FileSystem.readdir(dirPath)`

Reads the contents of a directory and returns an array of `IFileInfo` objects.

```typescript
static async readdir(dirPath: string): Promise<IFileInfo[]>
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
static async getStoragePath(type: TStorage): Promise<string>
```

| `type` value     | Description                                                   |
|------------------|---------------------------------------------------------------|
| `"external"`     | External storage root (`Environment.getExternalStorageDirectory`) |
| `"externalFiles"`| App-specific external files directory                         |
| `"externalCache"`| App-specific external cache directory                         |
| `"externalMedia"`| App-specific external media directory                         |
| `"appData"`      | App data directory                                            |
| `"appFiles"`     | App files directory                                           |
| `"appCache"`     | App cache directory                                           |

```typescript
const path = await FileSystem.getStoragePath("external");
console.log(path); // e.g. "/storage/emulated/0"
```

#### `FileSystem.getFileUri(filePath)`

Returns a `FileProvider` URI for the given file path. Required for sharing files with other apps on Android.

```typescript
static async getFileUri(filePath: string): Promise<string>
```

```typescript
const uri = await FileSystem.getFileUri("/storage/emulated/0/Download/report.pdf");
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

#### `FileSystem.readFileString(filePath)`

Reads a file as a UTF-8 string.

```typescript
static async readFileString(filePath: string): Promise<string>
```

```typescript
const text = await FileSystem.readFileString("/storage/emulated/0/Download/hello.txt");
console.log(text);
```

#### `FileSystem.readFileBytes(filePath)`

Reads a file as a `Bytes` (`Uint8Array`) value.

```typescript
static async readFileBytes(filePath: string): Promise<Bytes>
```

```typescript
const bytes = await FileSystem.readFileBytes("/storage/emulated/0/Download/image.png");
console.log(bytes.length);
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

### `TStorage`

Union type representing supported storage location identifiers used with `FileSystem.getStoragePath()`.

```typescript
import { type TStorage } from "@simplysm/capacitor-plugin-file-system";

type TStorage =
  | "external"
  | "externalFiles"
  | "externalCache"
  | "externalMedia"
  | "appData"
  | "appFiles"
  | "appCache";
```

### `IFileInfo`

Represents a single entry returned by `FileSystem.readdir()`.

```typescript
import { type IFileInfo } from "@simplysm/capacitor-plugin-file-system";

interface IFileInfo {
  name: string;        // File or directory name
  isDirectory: boolean; // true if the entry is a directory
}
```

### `IFileSystemPlugin`

The low-level plugin interface registered with Capacitor. Used internally by `FileSystem`. Direct use is not required in most cases.

```typescript
import { type IFileSystemPlugin } from "@simplysm/capacitor-plugin-file-system";

interface IFileSystemPlugin {
  hasPermission(): Promise<{ granted: boolean }>;
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
