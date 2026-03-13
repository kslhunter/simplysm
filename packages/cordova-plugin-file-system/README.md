# @simplysm/cordova-plugin-file-system

> **Deprecated**: This package is no longer maintained. Use the Capacitor equivalent instead.

Cordova plugin providing file system operations for Android. Includes a browser fallback using IndexedDB.

## Installation

```bash
cordova plugin add @simplysm/cordova-plugin-file-system
```

## Supported Platforms

- **Android** -- Native Java implementation with full file system access
- **Browser** -- IndexedDB-backed fallback for development/testing

## Android Permissions

The plugin automatically declares the following permissions in `AndroidManifest.xml`:

| Permission                          | Notes                              |
|-------------------------------------|------------------------------------|
| `MANAGE_EXTERNAL_STORAGE`           | Android 11+ (API 30+)             |
| `READ_EXTERNAL_STORAGE`             | Up to API 32                       |
| `WRITE_EXTERNAL_STORAGE`            | Up to API 29                       |

## API

All methods are static on the `CordovaFileSystem` class.

```ts
import { CordovaFileSystem } from "@simplysm/cordova-plugin-file-system";
```

### Permission Methods

#### `CordovaFileSystem.checkPermissionAsync()`

Checks whether the app has file system permissions.

```ts
static async checkPermissionAsync(): Promise<boolean>
```

On Android 11+, checks `MANAGE_EXTERNAL_STORAGE`. On older versions, checks `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE`. Always returns `true` on the browser platform.

#### `CordovaFileSystem.requestPermissionAsync()`

Requests file system permissions from the user.

```ts
static async requestPermissionAsync(): Promise<void>
```

On Android 11+, opens the system "All Files Access" settings screen. On older versions, triggers the standard permission dialog. No-op on the browser platform.

### Storage Path Methods

#### `CordovaFileSystem.getStoragePathAsync(type)`

Returns the absolute path for the specified storage location.

```ts
static async getStoragePathAsync(
  type:
    | "external"
    | "externalFiles"
    | "externalCache"
    | "externalMedia"
    | "appData"
    | "appFiles"
    | "appCache",
): Promise<string>
```

| Type             | Android equivalent                              |
|------------------|-------------------------------------------------|
| `"external"`     | `Environment.getExternalStorageDirectory()`     |
| `"externalFiles"`| `Context.getExternalFilesDir(null)`             |
| `"externalCache"`| `Context.getExternalCacheDir()`                 |
| `"externalMedia"`| `Context.getExternalMediaDirs()[0]`             |
| `"appData"`      | `ApplicationInfo.dataDir`                       |
| `"appFiles"`     | `Context.getFilesDir()`                         |
| `"appCache"`     | `Context.getCacheDir()`                         |

#### `CordovaFileSystem.getFileUriAsync(filePath)`

Returns a content URI for the given file path, suitable for sharing with other apps via `FileProvider`.

```ts
static async getFileUriAsync(filePath: string): Promise<string>
```

On Android, returns a `content://` URI. On the browser platform, returns a `blob:` URL.

### File Read/Write Methods

#### `CordovaFileSystem.writeFileAsync(filePath, data)`

Writes a string or Buffer to a file. Parent directories are created automatically.

```ts
static async writeFileAsync(filePath: string, data: string | Buffer): Promise<void>
```

- When `data` is a `string`, writes UTF-8 encoded text.
- When `data` is a `Buffer`, encodes as base64 for transport and writes raw bytes on the native side.

#### `CordovaFileSystem.readFileStringAsync(filePath)`

Reads a file as a UTF-8 string.

```ts
static async readFileStringAsync(filePath: string): Promise<string>
```

Throws if the file does not exist.

#### `CordovaFileSystem.readFileBufferAsync(filePath)`

Reads a file and returns its contents as a `Buffer`.

```ts
static async readFileBufferAsync(filePath: string): Promise<Buffer>
```

Throws if the file does not exist.

### Directory Methods

#### `CordovaFileSystem.readdirAsync(dirPath)`

Lists entries in a directory.

```ts
static async readdirAsync(dirPath: string): Promise<{ name: string; isDirectory: boolean }[]>
```

Returns an array of objects, each containing the entry `name` and whether it `isDirectory`.

#### `CordovaFileSystem.mkdirsAsync(targetPath)`

Creates a directory and all necessary parent directories (recursive).

```ts
static async mkdirsAsync(targetPath: string): Promise<void>
```

No-op if the directory already exists.

### File System Utility Methods

#### `CordovaFileSystem.existsAsync(targetPath)`

Checks whether a file or directory exists at the given path.

```ts
static async existsAsync(targetPath: string): Promise<boolean>
```

#### `CordovaFileSystem.removeAsync(targetPath)`

Deletes a file or directory. Directories are deleted recursively.

```ts
static async removeAsync(targetPath: string): Promise<void>
```
