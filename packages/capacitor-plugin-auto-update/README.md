# @simplysm/capacitor-plugin-auto-update

Capacitor Auto Update Plugin -- APK installation and OTA update for Android Capacitor apps.

## Installation

```bash
npm install @simplysm/capacitor-plugin-auto-update
```

## API Overview

### Types

| API | Type | Description |
|-----|------|-------------|
| `VersionInfo` | interface | App version info (`versionName`, `versionCode`) |

### Interfaces

| API | Type | Description |
|-----|------|-------------|
| `ApkInstallerPlugin` | interface | Low-level Capacitor plugin interface for APK operations |

### Classes

| API | Type | Description |
|-----|------|-------------|
| `ApkInstaller` | abstract class | APK installation and permission management |
| `AutoUpdate` | abstract class | OTA update flow (server-based or external storage) |

## `VersionInfo`

```typescript
interface VersionInfo {
  versionName: string;
  versionCode: string;
}
```

## `ApkInstallerPlugin`

```typescript
interface ApkInstallerPlugin {
  install(options: { uri: string }): Promise<void>;
  checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>;
  requestPermissions(): Promise<void>;
  getVersionInfo(): Promise<VersionInfo>;
}
```

Low-level Capacitor plugin interface. Use `ApkInstaller` static methods instead of calling this directly.

## `ApkInstaller`

```typescript
abstract class ApkInstaller {
  static async checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>;
  static async requestPermissions(): Promise<void>;
  static async install(apkUri: string): Promise<void>;
  static async getVersionInfo(): Promise<VersionInfo>;
}
```

APK installation plugin.
- Android: Executes APK install intent, manages `REQUEST_INSTALL_PACKAGES` permission.
- Browser: Shows alert message and returns normally.

## `AutoUpdate`

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

- `run` -- Downloads the latest APK from a service server and installs it. Compares versions via semver.
- `runByExternalStorage` -- Finds the latest APK file in an external storage directory and installs it.

Both methods check install permissions, display progress via the `log` callback (HTML), and freeze the app after installation to await restart.

## Usage Examples

### Check permissions and install APK

```typescript
import { ApkInstaller } from "@simplysm/capacitor-plugin-auto-update";

const perms = await ApkInstaller.checkPermissions();
if (!perms.granted) {
  await ApkInstaller.requestPermissions();
}
await ApkInstaller.install("content://com.example.provider/latest.apk");
```

### Server-based auto update

```typescript
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";

await AutoUpdate.run({
  log: (html) => { document.getElementById("status")!.innerHTML = html; },
  serviceClient: myServiceClient,
});
```

### External storage auto update

```typescript
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";

await AutoUpdate.runByExternalStorage({
  log: (html) => { document.getElementById("status")!.innerHTML = html; },
  dirPath: "MyApp/updates",
});
```
