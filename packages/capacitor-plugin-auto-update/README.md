# @simplysm/capacitor-plugin-auto-update

Capacitor plugin for automatic APK updates on Android. Provides APK installation with permission management and automatic update flows via a remote server or external storage.

- **Android**: Launches APK install intents, manages `REQUEST_INSTALL_PACKAGES` permission
- **Browser**: Displays notification messages and returns normally (for development)

## Installation

```bash
npm install @simplysm/capacitor-plugin-auto-update
```

## API Overview

### Interfaces

| API | Type | Description |
|-----|------|-------------|
| `VersionInfo` | Interface | App version information |
| `ApkInstallerPlugin` | Interface | Native plugin interface for APK installation |

### Classes

| API | Type | Description |
|-----|------|-------------|
| `ApkInstaller` | Class | Static API for APK installation, permission management, and version info |
| `AutoUpdate` | Class | Static API for downloading and installing APK updates from a server or external storage |

## `VersionInfo`

Holds application version information.

```typescript
interface VersionInfo {
  versionName: string;
  versionCode: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `versionName` | `string` | Human-readable version name (e.g. `"1.2.3"`) |
| `versionCode` | `string` | Numeric version code used by the Android system |

## `ApkInstallerPlugin`

Native plugin interface for APK installation. Use the `ApkInstaller` class for a simplified API.

```typescript
interface ApkInstallerPlugin {
  install(options: { uri: string }): Promise<void>;
  checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>;
  requestPermissions(): Promise<void>;
  getVersionInfo(): Promise<VersionInfo>;
}
```

| Method | Signature | Description |
|--------|-----------|-------------|
| `install` | `(options: { uri: string }) => Promise<void>` | Install APK from the given `content://` URI |
| `checkPermissions` | `() => Promise<{ granted: boolean; manifest: boolean }>` | Check whether install permissions are granted and declared in manifest |
| `requestPermissions` | `() => Promise<void>` | Request the `REQUEST_INSTALL_PACKAGES` permission |
| `getVersionInfo` | `() => Promise<VersionInfo>` | Retrieve current app version info |

## `ApkInstaller`

Abstract class with static methods for APK installation and permission management. On Android it runs the APK install intent and manages the `REQUEST_INSTALL_PACKAGES` permission. On the browser it shows a notification and returns normally.

```typescript
abstract class ApkInstaller {
  static async checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>;
  static async requestPermissions(): Promise<void>;
  static async install(apkUri: string): Promise<void>;
  static async getVersionInfo(): Promise<VersionInfo>;
}
```

| Method | Signature | Description |
|--------|-----------|-------------|
| `checkPermissions` | `static async checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>` | Check whether install permission is granted and declared in manifest |
| `requestPermissions` | `static async requestPermissions(): Promise<void>` | Request `REQUEST_INSTALL_PACKAGES` permission (navigates to settings screen) |
| `install` | `static async install(apkUri: string): Promise<void>` | Install an APK from a `content://` URI (FileProvider URI) |
| `getVersionInfo` | `static async getVersionInfo(): Promise<VersionInfo>` | Get the current app version name and version code |

## `AutoUpdate`

Abstract class with static methods for orchestrating the full automatic update flow. Handles permission checks, version comparison, APK download, and installation.

```typescript
abstract class AutoUpdate {
  static async run(opt: {
    log: (messageHtml: string) => void;
    serviceClient: ServiceClient;
  }): Promise<void>;

  static async runByExternalStorage(opt: {
    log: (messageHtml: string) => void;
    dirPath: string;
  }): Promise<void>;
}
```

| Method | Signature | Description |
|--------|-----------|-------------|
| `run` | `static async run(opt: { log: (messageHtml: string) => void; serviceClient: ServiceClient }): Promise<void>` | Download the latest APK from a remote server via `ServiceClient` and install it. Progress is reported through the `log` callback as HTML strings. |
| `runByExternalStorage` | `static async runByExternalStorage(opt: { log: (messageHtml: string) => void; dirPath: string }): Promise<void>` | Find the latest versioned APK file from an external storage directory and install it. Scans `dirPath` for files named `{semver}.apk`. |

### Parameters for `run`

| Field | Type | Description |
|-------|------|-------------|
| `log` | `(messageHtml: string) => void` | Callback to display progress/status HTML messages |
| `serviceClient` | `ServiceClient` | `@simplysm/service-client` instance for server communication |

### Parameters for `runByExternalStorage`

| Field | Type | Description |
|-------|------|-------------|
| `log` | `(messageHtml: string) => void` | Callback to display progress/status HTML messages |
| `dirPath` | `string` | Relative path within external storage containing versioned APK files |

## Usage Examples

### Check permissions and install an APK

```typescript
import { ApkInstaller } from "@simplysm/capacitor-plugin-auto-update";

const perms = await ApkInstaller.checkPermissions();
if (!perms.manifest) {
  throw new Error("REQUEST_INSTALL_PACKAGES not declared in AndroidManifest.xml");
}
if (!perms.granted) {
  await ApkInstaller.requestPermissions();
}

await ApkInstaller.install("content://com.example.provider/apk/update.apk");
```

### Auto-update from a remote server

```typescript
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";

await AutoUpdate.run({
  log: (messageHtml) => {
    document.getElementById("status")!.innerHTML = messageHtml;
  },
  serviceClient: myServiceClient,
});
```

### Auto-update from external storage

```typescript
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";

await AutoUpdate.runByExternalStorage({
  log: (messageHtml) => {
    document.getElementById("status")!.innerHTML = messageHtml;
  },
  dirPath: "MyApp/updates",
});
```
