# @simplysm/capacitor-plugin-auto-update

Capacitor plugin for automatic APK updates on Android. Provides two update strategies: server-based download via `SdServiceClient` and external storage (USB) based updates using semver-versioned APK files.

## Installation

```bash
yarn add @simplysm/capacitor-plugin-auto-update
```

## API

### AutoUpdate

Abstract static class providing two auto-update strategies for Android APK installation.

```typescript
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";
```

#### `AutoUpdate.runAsync(opt): Promise<void>`

Downloads the latest APK from the server via `SdServiceClient`, compares versions, and installs if newer. Checks install permissions automatically.

```typescript
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";

await AutoUpdate.runAsync({
  log: (messageHtml) => {
    document.getElementById("status")!.innerHTML = messageHtml;
  },
  serviceClient: myServiceClient,
});
```

**Parameters:**

| Property        | Type                            | Description                                  |
| --------------- | ------------------------------- | -------------------------------------------- |
| `log`           | `(messageHtml: string) => void` | Callback for status/progress messages (HTML) |
| `serviceClient` | `SdServiceClient`               | Connected service client instance            |

#### `AutoUpdate.runByExternalStorageAsync(opt): Promise<void>`

Scans an external storage directory for APK files named by semver version (e.g., `1.2.3.apk`), finds the latest, and installs if newer than current.

```typescript
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";

await AutoUpdate.runByExternalStorageAsync({
  log: (messageHtml) => {
    document.getElementById("status")!.innerHTML = messageHtml;
  },
  dirPath: "my-app/updates",
});
```

**Parameters:**

| Property  | Type                            | Description                                                 |
| --------- | ------------------------------- | ----------------------------------------------------------- |
| `log`     | `(messageHtml: string) => void` | Callback for status/progress messages (HTML)                |
| `dirPath` | `string`                        | Relative path within external storage to scan for APK files |

---

### ApkInstaller

Abstract static class wrapping the native Capacitor APK installer plugin. Handles `REQUEST_INSTALL_PACKAGES` permission management and APK installation via Android intents.

```typescript
import { ApkInstaller } from "@simplysm/capacitor-plugin-auto-update";
```

#### `ApkInstaller.hasPermissionManifest(): Promise<boolean>`

Checks if `REQUEST_INSTALL_PACKAGES` permission is declared in the Android manifest.

#### `ApkInstaller.hasPermission(): Promise<boolean>`

Checks if `REQUEST_INSTALL_PACKAGES` permission is currently granted at runtime.

#### `ApkInstaller.requestPermission(): Promise<void>`

Opens the system settings screen for the user to grant install permission.

#### `ApkInstaller.install(apkUri: string): Promise<void>`

Launches the APK install intent. The `apkUri` should be a `content://` URI (FileProvider URI).

```typescript
import { ApkInstaller } from "@simplysm/capacitor-plugin-auto-update";

await ApkInstaller.install("content://com.example.fileprovider/apk/update.apk");
```

#### `ApkInstaller.getVersionInfo(): Promise<IVersionInfo>`

Returns the current app version information from the Android package manager.

```typescript
const info = await ApkInstaller.getVersionInfo();
console.log(info.versionName); // "1.2.3"
console.log(info.versionCode); // "10"
```

## Types

### IVersionInfo

```typescript
import { IVersionInfo } from "@simplysm/capacitor-plugin-auto-update";
```

```typescript
interface IVersionInfo {
  versionName: string;
  versionCode: string;
}
```

### IApkInstallerPlugin

Raw Capacitor plugin interface for APK installation. Typically used internally by `ApkInstaller`.

```typescript
import { IApkInstallerPlugin } from "@simplysm/capacitor-plugin-auto-update";
```

```typescript
interface IApkInstallerPlugin {
  install(options: { uri: string }): Promise<void>;
  hasPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<void>;
  hasPermissionManifest(): Promise<{ declared: boolean }>;
  getVersionInfo(): Promise<IVersionInfo>;
}
```
