# @simplysm/capacitor-plugin-auto-update

A Capacitor plugin that supports automatic updates for Android apps. It provides the complete update flow including checking the latest APK version from the server, downloading, and installing it. It also supports updates through APK files on external storage.

## Supported Platforms

| Platform | Supported | Notes |
|--------|-----------|------|
| Android | Yes | API 23+ (minSdk 23), compileSdk 35 |
| Web | Partial | Fallback implementation provided (alert notification, permission checks skipped) |
| iOS | No | Not supported |

## Installation

```bash
pnpm add @simplysm/capacitor-plugin-auto-update
```

### Peer Dependencies

```bash
pnpm add @capacitor/core@^7.4.4
```

### Internal Dependencies

This package depends on the following `@simplysm` packages.

| Package | Purpose |
|--------|------|
| `@simplysm/core-common` | Path utilities, HTML templates, `waitUntil`, etc. |
| `@simplysm/core-browser` | `downloadBytes` (file download) |
| `@simplysm/capacitor-plugin-file-system` | File read/write, URI conversion, storage paths |
| `@simplysm/service-client` | `ServiceClient` (server communication) |
| `@simplysm/service-common` | `AutoUpdateService` interface definition |

## Android Configuration

### AndroidManifest.xml

The plugin requires `REQUEST_INSTALL_PACKAGES` permission for APK installation. This is already declared in the plugin's manifest, so you don't need to add it separately in your app.

```xml
<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
```

### Capacitor Plugin Registration

The plugin is automatically registered in `capacitor.config.ts` or in the Android project. The Android source path is specified in the `capacitor` field of `package.json`.

## Main API

This package exports two main classes.

### ApkInstaller

A low-level API responsible for APK installation and permission management. All methods are `static`.

| Method | Return Type | Description |
|--------|-----------|------|
| `hasPermissionManifest()` | `Promise<boolean>` | Check if `REQUEST_INSTALL_PACKAGES` permission is declared in AndroidManifest.xml |
| `hasPermission()` | `Promise<boolean>` | Check if `REQUEST_INSTALL_PACKAGES` permission is currently granted |
| `requestPermission()` | `Promise<void>` | Request installation permission (navigates to Android settings screen) |
| `install(apkUri)` | `Promise<void>` | Execute APK installation. `apkUri` is a `content://` URI (FileProvider URI) |
| `getVersionInfo()` | `Promise<IVersionInfo>` | Retrieve current app version information |

### AutoUpdate

A high-level API that manages the complete automatic update flow. All methods are `static`.

| Method | Return Type | Description |
|--------|-----------|------|
| `run(opt)` | `Promise<void>` | Execute server-based automatic update |
| `runByExternalStorage(opt)` | `Promise<void>` | Execute external storage-based automatic update |

### IVersionInfo

An interface representing app version information.

| Property | Type | Description |
|------|------|------|
| `versionName` | `string` | App version name (e.g., `"1.2.3"`) |
| `versionCode` | `string` | App version code (integer represented as string) |

### IApkInstallerPlugin

Capacitor native plugin interface. Generally used indirectly through the `ApkInstaller` class.

| Method | Return Type | Description |
|--------|-----------|------|
| `install(options)` | `Promise<void>` | Install APK specified in `options.uri` |
| `hasPermission()` | `Promise<{ granted: boolean }>` | Check installation permission |
| `requestPermission()` | `Promise<void>` | Request installation permission |
| `hasPermissionManifest()` | `Promise<{ declared: boolean }>` | Check manifest permission declaration |
| `getVersionInfo()` | `Promise<IVersionInfo>` | Retrieve version information |

## Usage Examples

### Server-Based Automatic Update

The most common usage method for checking and updating to the latest APK deployed on the server. It connects to the server's `AutoUpdateService` through `ServiceClient` to retrieve the latest version information.

```typescript
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";
import { createServiceClient } from "@simplysm/service-client";

const serviceClient = createServiceClient("my-app", {
  host: "your-server.example.com",
  port: 443,
  ssl: true,
});

await AutoUpdate.run({
  log: (messageHtml: string) => {
    // Display update progress in UI
    document.getElementById("update-status")!.innerHTML = messageHtml;
  },
  serviceClient,
});
```

Internal flow of the `run` method:

1. Call server's `AutoUpdateService.getLastVersion("android")` to check latest version
2. Check and request `REQUEST_INSTALL_PACKAGES` permission (wait up to 5 minutes)
3. Compare current app version with server version using semver
4. Download APK if server version is higher (provides progress callback)
5. Save APK file to app cache and execute installation intent
6. Freeze app after installation (encourage user to restart)

### External Storage-Based Update

A method for updating using an APK file pre-placed on external storage (e.g., USB, SD card) without network connectivity. The APK filename must be in semver format (e.g., `1.2.3.apk`).

```typescript
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";

await AutoUpdate.runByExternalStorage({
  log: (messageHtml: string) => {
    document.getElementById("update-status")!.innerHTML = messageHtml;
  },
  dirPath: "MyApp/updates",
});
```

Internal flow of the `runByExternalStorage` method:

1. Check and request `REQUEST_INSTALL_PACKAGES` permission
2. Retrieve `.apk` file list from specified directory in external storage
3. Extract version from filenames and determine latest version using semver
4. Compare with current app version and execute installation if latest version

### Direct Use of ApkInstaller

Use `ApkInstaller` when you need to directly control the update flow.

```typescript
import { ApkInstaller } from "@simplysm/capacitor-plugin-auto-update";

// Check current app version
const versionInfo = await ApkInstaller.getVersionInfo();
console.log(`Current version: ${versionInfo.versionName} (${versionInfo.versionCode})`);

// Check and request permission
const hasManifest = await ApkInstaller.hasPermissionManifest();
if (!hasManifest) {
  throw new Error("REQUEST_INSTALL_PACKAGES permission is not declared in AndroidManifest.xml.");
}

const hasPermission = await ApkInstaller.hasPermission();
if (!hasPermission) {
  await ApkInstaller.requestPermission();
  // Need to wait until user grants permission in settings screen
}

// Install APK (requires content:// URI)
await ApkInstaller.install("content://com.example.fileprovider/apk/update.apk");
```

## Web Environment Behavior

When running in a web browser, the `ApkInstallerWeb` fallback is automatically used.

| Method | Web Behavior |
|--------|---------|
| `install()` | Show alert about unsupported feature then return normally |
| `hasPermission()` | Always return `{ granted: true }` |
| `requestPermission()` | No operation (no-op) |
| `hasPermissionManifest()` | Always return `{ declared: true }` |
| `getVersionInfo()` | Return `import.meta.env.__VER__` value as `versionName` (or `"0.0.0"` if not available) |

## Server-Side Requirements

To use the `AutoUpdate.run()` method, the server must implement the `AutoUpdateService` interface.

```typescript
interface AutoUpdateService {
  getLastVersion(platform: string): Promise<
    | { version: string; downloadPath: string }
    | undefined
  >;
}
```

- `platform`: The string `"android"` is passed
- `version`: Version string in semver format (e.g., `"1.2.3"`)
- `downloadPath`: Download path for the APK file (combined with server host URL)

## License

MIT
