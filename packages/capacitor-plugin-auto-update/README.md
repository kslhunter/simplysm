# @simplysm/capacitor-plugin-auto-update

Capacitor Auto Update Plugin -- APK installation and OTA update for Android/Browser. Manages `REQUEST_INSTALL_PACKAGES` permission, installs APK files via intent, retrieves app version info, and provides a full OTA update flow via `SdServiceClient` or external storage.

## Installation

```bash
npm install @simplysm/capacitor-plugin-auto-update
```

**Peer dependencies:**

- `@capacitor/core` ^7.0.0
- `@simplysm/capacitor-plugin-file-system`

## API Overview

| API | Type | Description |
|-----|------|-------------|
| `ApkInstaller` | Abstract class | Static methods for APK installation permission management, APK install, and version info retrieval |
| `AutoUpdate` | Abstract class | Static methods for OTA auto-update flows (server-based and external-storage-based) |
| `IApkInstallerPlugin` | Interface | Low-level Capacitor plugin interface for APK installation |
| `IVersionInfo` | Interface | App version information structure |

## API Reference

### `IVersionInfo`

App version information returned by `ApkInstaller.getVersionInfo()`.

```typescript
export interface IVersionInfo {
  versionName: string;
  versionCode: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `versionName` | `string` | Human-readable version name (e.g. `"1.2.3"`) |
| `versionCode` | `string` | Numeric version code used by Android |

### `IApkInstallerPlugin`

Low-level Capacitor plugin interface. Use `ApkInstaller` instead for a simplified API.

```typescript
export interface IApkInstallerPlugin {
  install(options: { uri: string }): Promise<void>;
  hasPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<void>;
  hasPermissionManifest(): Promise<{ declared: boolean }>;
  getVersionInfo(): Promise<IVersionInfo>;
}
```

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `install` | `options: { uri: string }` | `Promise<void>` | Install an APK from a content:// URI |
| `hasPermission` | -- | `Promise<{ granted: boolean }>` | Check if install permission is granted |
| `requestPermission` | -- | `Promise<void>` | Request install permission (opens settings) |
| `hasPermissionManifest` | -- | `Promise<{ declared: boolean }>` | Check if permission is declared in manifest |
| `getVersionInfo` | -- | `Promise<IVersionInfo>` | Get current app version info |

### `ApkInstaller`

Abstract class with static methods for APK installation and permission management.

- **Android**: Executes APK install intents, manages `REQUEST_INSTALL_PACKAGES` permission
- **Browser**: Shows alert and returns normally

```typescript
export abstract class ApkInstaller {
  static async hasPermissionManifest(): Promise<boolean>;
  static async hasPermission(): Promise<boolean>;
  static async requestPermission(): Promise<void>;
  static async install(apkUri: string): Promise<void>;
  static async getVersionInfo(): Promise<IVersionInfo>;
}
```

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `hasPermissionManifest` | -- | `Promise<boolean>` | Check if `REQUEST_INSTALL_PACKAGES` is declared in the AndroidManifest |
| `hasPermission` | -- | `Promise<boolean>` | Check if install packages permission is currently granted |
| `requestPermission` | -- | `Promise<void>` | Request install permission (navigates to settings screen) |
| `install` | `apkUri: string` | `Promise<void>` | Install an APK from a `content://` URI (FileProvider URI) |
| `getVersionInfo` | -- | `Promise<IVersionInfo>` | Retrieve the current app version name and code |

### `AutoUpdate`

Abstract class providing a complete OTA auto-update flow. Supports two modes: server-based update via `SdServiceClient` and external-storage-based update from APK files on the device.

```typescript
export abstract class AutoUpdate {
  static async runAsync(opt: {
    log: (messageHtml: string) => void;
    serviceClient: SdServiceClient;
  }): Promise<void>;

  static async runByExternalStorageAsync(opt: {
    log: (messageHtml: string) => void;
    dirPath: string;
  }): Promise<void>;
}
```

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `runAsync` | `opt: { log, serviceClient }` | `Promise<void>` | Run OTA update: check server version via `SdServiceClient`, download APK, and install |
| `runByExternalStorageAsync` | `opt: { log, dirPath }` | `Promise<void>` | Run update from external storage: scan `dirPath` for APK files, find latest version via semver, and install |

#### `runAsync` option fields

| Field | Type | Description |
|-------|------|-------------|
| `log` | `(messageHtml: string) => void` | Callback to display status/progress messages (may contain HTML) |
| `serviceClient` | `SdServiceClient` | Connected service client instance; the server must implement `ISdAutoUpdateService` |

#### `runByExternalStorageAsync` option fields

| Field | Type | Description |
|-------|------|-------------|
| `log` | `(messageHtml: string) => void` | Callback to display status/progress messages (may contain HTML) |
| `dirPath` | `string` | Relative path within external storage containing versioned APK files (e.g. `1.2.3.apk`) |

## Usage Examples

### Check permission and install an APK

```typescript
import { ApkInstaller } from "@simplysm/capacitor-plugin-auto-update";

// Check if install permission is granted
const hasPermission = await ApkInstaller.hasPermission();
if (!hasPermission) {
  await ApkInstaller.requestPermission();
}

// Install APK from a content:// URI
await ApkInstaller.install("content://com.example.fileprovider/apk/update.apk");

// Get current app version
const versionInfo = await ApkInstaller.getVersionInfo();
console.log(versionInfo.versionName, versionInfo.versionCode);
```

### Run OTA auto-update from server

```typescript
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";
import { SdServiceClient } from "@simplysm/sd-service-client";

const serviceClient = new SdServiceClient("https://my-server.com");

await AutoUpdate.runAsync({
  log: (messageHtml) => {
    document.getElementById("status")!.innerHTML = messageHtml;
  },
  serviceClient,
});
```

### Run auto-update from external storage

```typescript
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";

await AutoUpdate.runByExternalStorageAsync({
  log: (messageHtml) => {
    document.getElementById("status")!.innerHTML = messageHtml;
  },
  dirPath: "updates/myapp",
});
```
