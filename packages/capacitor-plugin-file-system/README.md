# @simplysm/capacitor-plugin-file-system

Capacitor plugin for file system access on Android and web.

- **Android 11+**: Uses `MANAGE_EXTERNAL_STORAGE` permission for full file system access
- **Android 10 and below**: Uses `READ/WRITE_EXTERNAL_STORAGE` permissions
- **Web (browser)**: IndexedDB-based virtual file system emulation

## Installation

```bash
npm install @simplysm/capacitor-plugin-file-system
# or
yarn add @simplysm/capacitor-plugin-file-system
```

**Peer dependency**: `@capacitor/core` ^7.4.4

### Android Setup

Register the plugin in your app's `MainActivity`:

```java
import kr.co.simplysm.capacitor.filesystem.FileSystemPlugin;

public class MainActivity extends BridgeActivity {
  @Override
  protected void init(Bundle savedInstanceState) {
    super.init(savedInstanceState);
    registerPlugin(FileSystemPlugin.class);
  }
}
```

The plugin's `AndroidManifest.xml` automatically merges the required permissions and `FileProvider` configuration.

## API

All methods are static on the `FileSystem` class. Each returns a `Promise`.

### `FileSystem.checkPermissionAsync()`

Checks whether file system permissions are granted.

```ts
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

const granted = await FileSystem.checkPermissionAsync();
// granted: boolean
```

### `FileSystem.requestPermissionAsync()`

Requests file system permissions from the user.

- **Android 11+**: Opens the system settings screen for all-files access
- **Android 10 and below**: Shows the standard permission dialog

```ts
await FileSystem.requestPermissionAsync();
```

### `FileSystem.readdirAsync(dirPath)`

Lists files and directories in the given directory.

| Parameter | Type     | Description              |
|-----------|----------|--------------------------|
| `dirPath` | `string` | Absolute path to the directory |

**Returns**: `IFileInfo[]`

```ts
const files = await FileSystem.readdirAsync("/storage/emulated/0/Documents");
// files: Array<{ name: string; isDirectory: boolean }>
```

### `FileSystem.getStoragePathAsync(type)`

Returns the absolute path for a storage location.

| Parameter | Type       | Description    |
|-----------|------------|----------------|
| `type`    | `TStorage` | Storage type   |

**`TStorage` values**:

| Value            | Description                                              |
|------------------|----------------------------------------------------------|
| `"external"`     | External storage root (`Environment.getExternalStorageDirectory`) |
| `"externalFiles"`| App-specific external files directory                    |
| `"externalCache"`| App-specific external cache directory                    |
| `"externalMedia"`| App-specific external media directory                    |
| `"appData"`      | App data directory                                       |
| `"appFiles"`     | App files directory                                      |
| `"appCache"`     | App cache directory                                      |

**Returns**: `string` (absolute path)

```ts
const extPath = await FileSystem.getStoragePathAsync("external");
// e.g. "/storage/emulated/0"
```

### `FileSystem.getFileUriAsync(filePath)`

Returns a content URI for the file via `FileProvider` (Android) or a blob URL (web).

| Parameter  | Type     | Description             |
|------------|----------|-------------------------|
| `filePath` | `string` | Absolute path to the file |

**Returns**: `string` (URI)

```ts
const uri = await FileSystem.getFileUriAsync("/storage/emulated/0/Documents/report.pdf");
```

### `FileSystem.writeFileAsync(filePath, data)`

Writes data to a file. Creates parent directories automatically.

| Parameter  | Type               | Description                         |
|------------|--------------------|-------------------------------------|
| `filePath` | `string`           | Absolute path to the file           |
| `data`     | `string \| Buffer` | Content to write (UTF-8 string or Buffer) |

When `data` is a `Buffer`, it is encoded as base64 for transfer. When `data` is a `string`, it is written as UTF-8.

```ts
// Write text
await FileSystem.writeFileAsync("/path/to/file.txt", "Hello, world!");

// Write binary
const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
await FileSystem.writeFileAsync("/path/to/file.bin", buf);
```

### `FileSystem.readFileStringAsync(filePath)`

Reads a file as a UTF-8 string.

| Parameter  | Type     | Description             |
|------------|----------|-------------------------|
| `filePath` | `string` | Absolute path to the file |

**Returns**: `string`

```ts
const content = await FileSystem.readFileStringAsync("/path/to/file.txt");
```

### `FileSystem.readFileBufferAsync(filePath)`

Reads a file as a `Buffer`.

| Parameter  | Type     | Description             |
|------------|----------|-------------------------|
| `filePath` | `string` | Absolute path to the file |

**Returns**: `Buffer`

```ts
const buf = await FileSystem.readFileBufferAsync("/path/to/file.bin");
```

### `FileSystem.removeAsync(targetPath)`

Deletes a file or directory recursively.

| Parameter    | Type     | Description                      |
|--------------|----------|----------------------------------|
| `targetPath` | `string` | Absolute path to file or directory |

```ts
await FileSystem.removeAsync("/path/to/dir");
```

### `FileSystem.mkdirsAsync(targetPath)`

Creates a directory and all parent directories recursively.

| Parameter    | Type     | Description                  |
|--------------|----------|------------------------------|
| `targetPath` | `string` | Absolute path to the directory |

```ts
await FileSystem.mkdirsAsync("/path/to/new/dir");
```

### `FileSystem.existsAsync(targetPath)`

Checks whether a file or directory exists.

| Parameter    | Type     | Description                      |
|--------------|----------|----------------------------------|
| `targetPath` | `string` | Absolute path to file or directory |

**Returns**: `boolean`

```ts
const exists = await FileSystem.existsAsync("/path/to/file.txt");
```

## Types

### `TStorage`

```ts
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

```ts
interface IFileInfo {
  name: string;
  isDirectory: boolean;
}
```

### `IFileSystemPlugin`

Low-level plugin interface registered with Capacitor. Use the `FileSystem` static class instead for a simpler API.

```ts
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
