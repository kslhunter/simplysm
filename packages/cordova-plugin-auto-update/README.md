# @simplysm/cordova-plugin-auto-update

Cordova Auto Update Plugin (legacy) -- APK installation and OTA update for Android. Provides permission management for APK installation, APK install via Cordova bridge, version info retrieval, and a full auto-update flow using `SdServiceClient` or external storage. This is the legacy Cordova counterpart to `@simplysm/capacitor-plugin-auto-update`.

## Installation

```bash
npm install @simplysm/cordova-plugin-auto-update
```

## API Overview

| API | Type | Description |
|-----|------|-------------|
| `CordovaApkInstaller` | Abstract class | Static methods for APK installation permission management, APK install, and version info |
| `CordovaAutoUpdate` | Abstract class | Static methods for OTA auto-update flows (server-based and external-storage-based) |

## API Reference

### `CordovaApkInstaller`

Abstract class with static methods for APK installation and permission management via the Cordova bridge.

```typescript
export abstract class CordovaApkInstaller {
  static async hasPermissionManifest(): Promise<boolean>;
  static async hasPermission(): Promise<boolean>;
  static async requestPermission(): Promise<void>;
  static async install(apkUri: string): Promise<void>;
  static async getVersionInfo(): Promise<{
    versionName: string;
    versionCode: string;
  }>;
}
```

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `hasPermissionManifest` | -- | `Promise<boolean>` | Check if `REQUEST_INSTALL_PACKAGES` is declared in the AndroidManifest |
| `hasPermission` | -- | `Promise<boolean>` | Check if install packages permission is currently granted |
| `requestPermission` | -- | `Promise<void>` | Request install permission (navigates to settings screen) |
| `install` | `apkUri: string` | `Promise<void>` | Install an APK from a content:// URI |
| `getVersionInfo` | -- | `Promise<{ versionName: string; versionCode: string }>` | Retrieve current app version name and code |

#### `getVersionInfo` return fields

| Field | Type | Description |
|-------|------|-------------|
| `versionName` | `string` | Human-readable version name (e.g. `"1.2.3"`) |
| `versionCode` | `string` | Numeric version code used by Android |

### `CordovaAutoUpdate`

Abstract class providing a complete OTA auto-update flow via the Cordova bridge. Supports server-based update via `SdServiceClient` and external-storage-based update from APK files.

```typescript
export abstract class CordovaAutoUpdate {
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
import { CordovaApkInstaller } from "@simplysm/cordova-plugin-auto-update";

const hasPermission = await CordovaApkInstaller.hasPermission();
if (!hasPermission) {
  await CordovaApkInstaller.requestPermission();
}

await CordovaApkInstaller.install("content://com.example.fileprovider/apk/update.apk");

const versionInfo = await CordovaApkInstaller.getVersionInfo();
console.log(versionInfo.versionName, versionInfo.versionCode);
```

### Run OTA auto-update from server

```typescript
import { CordovaAutoUpdate } from "@simplysm/cordova-plugin-auto-update";
import { SdServiceClient } from "@simplysm/sd-service-client";

const serviceClient = new SdServiceClient("https://my-server.com");

await CordovaAutoUpdate.runAsync({
  log: (messageHtml) => {
    document.getElementById("status")!.innerHTML = messageHtml;
  },
  serviceClient,
});
```
