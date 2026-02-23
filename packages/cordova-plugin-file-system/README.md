# @simplysm/cordova-plugin-file-system

Cordova plugin for file system access on Android.

> **Legacy**: Consider migrating to `@simplysm/capacitor-plugin-file-system` for new projects.

## Installation

```bash
cordova plugin add @simplysm/cordova-plugin-file-system
```

Supported platforms: **Android**

## API

### CordovaFileSystem

Abstract static class providing file system operations via the Cordova bridge.

```typescript
import { CordovaFileSystem } from "@simplysm/cordova-plugin-file-system";
```

#### `CordovaFileSystem.checkPermissionAsync(): Promise<boolean>`

Checks if file system permission is granted.

```typescript
const granted = await CordovaFileSystem.checkPermissionAsync();
```

#### `CordovaFileSystem.requestPermissionAsync(): Promise<void>`

Requests file system permission from the user.

```typescript
await CordovaFileSystem.requestPermissionAsync();
```

#### `CordovaFileSystem.readdirAsync(dirPath: string): Promise<{ name: string; isDirectory: boolean }[]>`

Reads the contents of a directory.

```typescript
const entries = await CordovaFileSystem.readdirAsync("/storage/emulated/0/Documents");
for (const entry of entries) {
  console.log(entry.name, entry.isDirectory);
}
```

#### `CordovaFileSystem.getStoragePathAsync(type): Promise<string>`

Returns the absolute path for a named storage location.

```typescript
const cachePath = await CordovaFileSystem.getStoragePathAsync("appCache");
```

**Storage types:**

| Type            | Description                           |
| --------------- | ------------------------------------- |
| `external`      | External storage root                 |
| `externalFiles` | App-specific external files directory |
| `externalCache` | App-specific external cache directory |
| `externalMedia` | App-specific external media directory |
| `appData`       | App data directory                    |
| `appFiles`      | App files directory                   |
| `appCache`      | App cache directory                   |

#### `CordovaFileSystem.getFileUriAsync(filePath: string): Promise<string>`

Returns a content URI for a file path.

```typescript
const uri = await CordovaFileSystem.getFileUriAsync("/path/to/file.apk");
```

#### `CordovaFileSystem.writeFileAsync(filePath: string, data: string | Buffer): Promise<void>`

Writes data to a file. Accepts UTF-8 strings or Buffers (auto-encoded as base64).

```typescript
await CordovaFileSystem.writeFileAsync("/path/to/file.txt", "Hello, world!");
await CordovaFileSystem.writeFileAsync("/path/to/file.bin", Buffer.from([0x00, 0x01]));
```

#### `CordovaFileSystem.readFileStringAsync(filePath: string): Promise<string>`

Reads a file as a UTF-8 string. Throws if the file does not exist.

```typescript
const content = await CordovaFileSystem.readFileStringAsync("/path/to/file.txt");
```

#### `CordovaFileSystem.readFileBufferAsync(filePath: string): Promise<Buffer>`

Reads a file as a Buffer.

```typescript
const buffer = await CordovaFileSystem.readFileBufferAsync("/path/to/file.bin");
```

#### `CordovaFileSystem.removeAsync(targetPath: string): Promise<void>`

Removes a file or directory recursively.

```typescript
await CordovaFileSystem.removeAsync("/path/to/old-dir");
```

#### `CordovaFileSystem.mkdirsAsync(targetPath: string): Promise<void>`

Creates a directory recursively.

```typescript
await CordovaFileSystem.mkdirsAsync("/path/to/new/nested/dir");
```

#### `CordovaFileSystem.existsAsync(targetPath: string): Promise<boolean>`

Checks if a file or directory exists.

```typescript
const exists = await CordovaFileSystem.existsAsync("/path/to/file.txt");
```
