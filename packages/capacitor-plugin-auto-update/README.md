# @simplysm/capacitor-plugin-auto-update

Simplysm Package - Capacitor Auto Update Plugin. Provides APK installation and OTA auto-update functionality for Android Capacitor apps.

## Installation

```bash
npm install @simplysm/capacitor-plugin-auto-update
```

## API Overview

### APK Installer

| API | Type | Description |
|-----|------|-------------|
| `ApkInstaller` | class | APK installation plugin (static methods) |
| `ApkInstallerPlugin` | interface | Low-level Capacitor plugin interface for APK installation |
| `VersionInfo` | interface | App version information |

### Auto Update

| API | Type | Description |
|-----|------|-------------|
| `AutoUpdate` | class | OTA auto-update manager (static methods) |

---

### `VersionInfo`

| Field | Type | Description |
|-------|------|-------------|
| `versionName` | `string` | App version name (e.g., `"1.0.0"`) |
| `versionCode` | `string` | App version code |

### `ApkInstallerPlugin`

| Method | Signature | Description |
|--------|-----------|-------------|
| `install` | `(options: { uri: string }) => Promise<void>` | Install APK from URI |
| `checkPermissions` | `() => Promise<{ granted: boolean; manifest: boolean }>` | Check install permissions |
| `requestPermissions` | `() => Promise<void>` | Request install permissions |
| `getVersionInfo` | `() => Promise<VersionInfo>` | Get app version info |

### `ApkInstaller`

Abstract class with static methods. Android executes APK install intent; browser shows alert and returns normally.

| Method | Signature | Description |
|--------|-----------|-------------|
| `checkPermissions` | `() => Promise<{ granted: boolean; manifest: boolean }>` | Check install permission (granted + manifest declared) |
| `requestPermissions` | `() => Promise<void>` | Request REQUEST_INSTALL_PACKAGES permission (navigates to settings) |
| `install` | `(apkUri: string) => Promise<void>` | Install APK from a `content://` URI (FileProvider URI) |
| `getVersionInfo` | `() => Promise<VersionInfo>` | Get app version info |

### `AutoUpdate`

Abstract class with static methods for OTA update management.

| Method | Signature | Description |
|--------|-----------|-------------|
| `run` | `(opt: { log: (messageHtml: string) => void; serviceClient: ServiceClient }) => Promise<void>` | Run auto-update via server (checks version, downloads APK, installs) |
| `runByExternalStorage` | `(opt: { log: (messageHtml: string) => void; dirPath: string }) => Promise<void>` | Run auto-update from external storage directory |

## Usage Examples

### Check and install APK

```typescript
import { ApkInstaller } from "@simplysm/capacitor-plugin-auto-update";

// Check permissions
const perms = await ApkInstaller.checkPermissions();
if (!perms.granted) {
  await ApkInstaller.requestPermissions();
}

// Install APK
await ApkInstaller.install("content://com.example.fileprovider/apk/update.apk");

// Get version info
const version = await ApkInstaller.getVersionInfo();
```

### Run OTA auto-update

```typescript
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";

await AutoUpdate.run({
  log: (messageHtml) => { /* display status */ },
  serviceClient: myServiceClient,
});
```
