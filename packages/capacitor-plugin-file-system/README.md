# @simplysm/capacitor-plugin-file-system

Capacitor file system plugin providing file system access across Android and Browser (web) environments.

- **Android 11+**: Uses `MANAGE_EXTERNAL_STORAGE` permission for full file system access
- **Android 10 and below**: Uses `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` permissions
- **Browser**: IndexedDB-based virtual file system emulation

## Installation

```bash
yarn add @simplysm/capacitor-plugin-file-system
npx cap sync
```

## API

### FileSystem

Abstract static class providing file system operations. All methods are async.

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";
```

#### `FileSystem.checkPermissionAsync(): Promise<boolean>`

Checks if file system permission is granted.

```typescript
const granted = await FileSystem.checkPermissionAsync();
```

#### `FileSystem.requestPermissionAsync(): Promise<void>`

Requests file system permission. On Android 11+, navigates to system settings. On Android 10 and below, shows a permission dialog.

```typescript
await FileSystem.requestPermissionAsync();
```

#### `FileSystem.readdirAsync(dirPath: string): Promise<IFileInfo[]>`

Reads the contents of a directory.

```typescript
const files = await FileSystem.readdirAsync("/storage/emulated/0/Documents");
for (const file of files) {
  console.log(file.name, file.isDirectory);
}
```

#### `FileSystem.getStoragePathAsync(type: TStorage): Promise<string>`

Returns the absolute path for a named storage location.

```typescript
const cachePath = await FileSystem.getStoragePathAsync("appCache");
const externalPath = await FileSystem.getStoragePathAsync("external");
```

**Storage types:**

| Type            | Description                                                       |
| --------------- | ----------------------------------------------------------------- |
| `external`      | External storage root (`Environment.getExternalStorageDirectory`) |
| `externalFiles` | App-specific external files directory                             |
| `externalCache` | App-specific external cache directory                             |
| `externalMedia` | App-specific external media directory                             |
| `appData`       | App data directory                                                |
| `appFiles`      | App files directory                                               |
| `appCache`      | App cache directory                                               |

#### `FileSystem.getFileUriAsync(filePath: string): Promise<string>`

Returns a `content://` URI (FileProvider) for a file path.

```typescript
const uri = await FileSystem.getFileUriAsync("/path/to/file.apk");
```

#### `FileSystem.writeFileAsync(filePath: string, data: string | Buffer): Promise<void>`

Writes data to a file. Accepts UTF-8 strings or Buffers (auto-encoded as base64).

```typescript
await FileSystem.writeFileAsync("/path/to/file.txt", "Hello, world!");
await FileSystem.writeFileAsync("/path/to/file.bin", Buffer.from([0x00, 0x01]));
```

#### `FileSystem.readFileStringAsync(filePath: string): Promise<string>`

Reads a file as a UTF-8 string.

```typescript
const content = await FileSystem.readFileStringAsync("/path/to/file.txt");
```

#### `FileSystem.readFileBufferAsync(filePath: string): Promise<Buffer>`

Reads a file as a Buffer.

```typescript
const buffer = await FileSystem.readFileBufferAsync("/path/to/file.bin");
```

#### `FileSystem.removeAsync(targetPath: string): Promise<void>`

Removes a file or directory recursively.

```typescript
await FileSystem.removeAsync("/path/to/old-dir");
```

#### `FileSystem.mkdirsAsync(targetPath: string): Promise<void>`

Creates a directory recursively (like `mkdir -p`).

```typescript
await FileSystem.mkdirsAsync("/path/to/new/nested/dir");
```

#### `FileSystem.existsAsync(targetPath: string): Promise<boolean>`

Checks if a file or directory exists.

```typescript
const exists = await FileSystem.existsAsync("/path/to/file.txt");
```

## Types

### TStorage

Union type identifying named storage locations.

```typescript
import { TStorage } from "@simplysm/capacitor-plugin-file-system";
```

```typescript
type TStorage =
  | "external"
  | "externalFiles"
  | "externalCache"
  | "externalMedia"
  | "appData"
  | "appFiles"
  | "appCache";
```

### IFileInfo

Directory entry information.

```typescript
import { IFileInfo } from "@simplysm/capacitor-plugin-file-system";
```

```typescript
interface IFileInfo {
  name: string;
  isDirectory: boolean;
}
```

### IFileSystemPlugin

Raw Capacitor plugin interface. Typically used internally by `FileSystem`.

```typescript
import { IFileSystemPlugin } from "@simplysm/capacitor-plugin-file-system";
```

```typescript
interface IFileSystemPlugin {
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
