# @simplysm/capacitor-plugin-file-system

A Capacitor-based file system access plugin. On Android, it provides direct access to the native file system, while in web environments it operates as an IndexedDB-based virtual file system.

## Installation

```bash
npm install @simplysm/capacitor-plugin-file-system
npx cap sync
```

## Supported Platforms

| Platform | Supported | Implementation |
|--------|----------|----------|
| Android | Yes | Native Java (API 23+) |
| Web | Yes | IndexedDB-based virtual file system |
| iOS | No | - |

### Android Permissions

Different permission models are used depending on the Android version.

| Android Version | Permission | Behavior |
|-------------|------|------|
| Android 11+ (API 30+) | `MANAGE_EXTERNAL_STORAGE` | Navigate to settings screen to grant full file access permission |
| Android 10 and below | `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` | Display runtime permission dialog |

The plugin automatically declares the necessary permissions in `AndroidManifest.xml`, so you don't need to add them separately in your app's manifest.

## Main Modules

All APIs are provided as static methods of the `FileSystem` class.

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";
```

### Method List

| Method | Return Type | Description |
|--------|----------|------|
| `hasPermission()` | `Promise<boolean>` | Check if file system access permission is granted |
| `requestPermission()` | `Promise<void>` | Request file system access permission |
| `readdir(dirPath)` | `Promise<IFileInfo[]>` | List files/folders in directory |
| `getStoragePath(type)` | `Promise<string>` | Return absolute path by storage type |
| `getFileUri(filePath)` | `Promise<string>` | Return FileProvider URI (Android) / Blob URL (Web) |
| `writeFile(filePath, data)` | `Promise<void>` | Write file (string or binary) |
| `readFileString(filePath)` | `Promise<string>` | Read file as UTF-8 string |
| `readFileBytes(filePath)` | `Promise<Bytes>` | Read file as binary (`Uint8Array`) |
| `remove(targetPath)` | `Promise<void>` | Recursively delete file or directory |
| `mkdir(targetPath)` | `Promise<void>` | Recursively create directory |
| `exists(targetPath)` | `Promise<boolean>` | Check if file or directory exists |

### Type Definitions

```typescript
import type { TStorage, IFileInfo } from "@simplysm/capacitor-plugin-file-system";
```

#### `TStorage`

A string literal type representing storage types.

| Value | Android Path | Description |
|----|-------------|------|
| `"external"` | `Environment.getExternalStorageDirectory()` | External storage root |
| `"externalFiles"` | `Context.getExternalFilesDir(null)` | App-specific external files directory |
| `"externalCache"` | `Context.getExternalCacheDir()` | App-specific external cache directory |
| `"externalMedia"` | `Context.getExternalMediaDirs()[0]` | App-specific external media directory |
| `"appData"` | `ApplicationInfo.dataDir` | App data directory |
| `"appFiles"` | `Context.getFilesDir()` | App internal files directory |
| `"appCache"` | `Context.getCacheDir()` | App internal cache directory |

#### `IFileInfo`

```typescript
interface IFileInfo {
  name: string;        // File or directory name
  isDirectory: boolean; // Whether it's a directory
}
```

#### `IFileSystemPlugin`

The low-level Capacitor plugin interface. Not intended for direct use -- use the `FileSystem` static class instead.

```typescript
import type { IFileSystemPlugin } from "@simplysm/capacitor-plugin-file-system";
```

## Usage Examples

### Check and Request Permission

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

async function ensurePermission(): Promise<boolean> {
  const granted = await FileSystem.hasPermission();
  if (!granted) {
    await FileSystem.requestPermission();
    // On Android 11+, it navigates to settings screen,
    // so you need to check again after returning to the app.
    return await FileSystem.hasPermission();
  }
  return true;
}
```

### Read/Write Text Files

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

async function textFileExample(): Promise<void> {
  const storagePath = await FileSystem.getStoragePath("appFiles");
  const filePath = storagePath + "/config.json";

  // Write file
  const config = { theme: "dark", lang: "ko" };
  await FileSystem.writeFile(filePath, JSON.stringify(config, null, 2));

  // Read file
  const content = await FileSystem.readFileString(filePath);
  const parsed = JSON.parse(content);
  console.log(parsed.theme); // "dark"
}
```

### Read/Write Binary Files

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";
import type { Bytes } from "@simplysm/core-common";

async function binaryFileExample(): Promise<void> {
  const storagePath = await FileSystem.getStoragePath("appFiles");
  const filePath = storagePath + "/data.bin";

  // Write as Uint8Array
  const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
  await FileSystem.writeFile(filePath, bytes);

  // Read as Bytes (Uint8Array alias from @simplysm/core-common)
  const readBytes: Bytes = await FileSystem.readFileBytes(filePath);
  console.log(readBytes.length); // 5
}
```

### Directory Management

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

async function directoryExample(): Promise<void> {
  const storagePath = await FileSystem.getStoragePath("appFiles");
  const dirPath = storagePath + "/logs/2024";

  // Recursively create directory
  await FileSystem.mkdir(dirPath);

  // Create file
  await FileSystem.writeFile(dirPath + "/app.log", "Started\n");

  // List directory contents
  const files = await FileSystem.readdir(dirPath);
  for (const file of files) {
    console.log(`${file.name} (directory: ${file.isDirectory})`);
  }

  // Check existence
  const dirExists = await FileSystem.exists(dirPath);
  console.log(dirExists); // true

  // Recursively delete directory
  await FileSystem.remove(dirPath);
}
```

### Get FileProvider URI

On Android, a `content://` URI is needed when sharing files with other apps.

```typescript
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

async function shareFile(filePath: string): Promise<string> {
  // Android: returns content:// URI
  // Web: returns blob: URL (must call URL.revokeObjectURL() after use)
  const uri = await FileSystem.getFileUri(filePath);
  return uri;
}
```

> **Warning**: In web environments, the Blob URL returned by `getFileUri()` must be released by calling `URL.revokeObjectURL(uri)` after use to free memory.

## Android Configuration

### FileProvider

The plugin includes its own `FileSystemProvider`, and the authority is automatically set in the format `${applicationId}.filesystem.provider`. Shareable paths are:

- External storage (`external-path`)
- App-specific external files (`external-files-path`)
- App-specific external cache (`external-cache-path`)
- App internal files (`files-path`)
- App internal cache (`cache-path`)

### Minimum SDK Version

- `minSdkVersion`: 23 (Android 6.0)
- `compileSdkVersion`: 35

## Web Environment Behavior

In web environments, it operates as an IndexedDB-based virtual file system (`VirtualFileSystem`).

- Database name: `capacitor_web_virtual_fs`
- Permission-related methods (`hasPermission`, `requestPermission`) always succeed.
- `getStoragePath()` returns virtual paths in the format `/webfs/{type}`.
- `getFileUri()` returns a Blob URL, which must be released with `URL.revokeObjectURL()` after use.
- File data is base64-encoded and stored in IndexedDB.

## Dependencies

### Peer Dependencies

| Package | Version |
|--------|------|
| `@capacitor/core` | `^7.4.4` |

### Internal Dependencies

| Package | Description |
|--------|------|
| `@simplysm/core-common` | Common utilities such as base64 conversion, `Bytes` type |

## License

MIT
