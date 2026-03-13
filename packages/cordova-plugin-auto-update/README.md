# @simplysm/cordova-plugin-auto-update

> **Deprecated**: This package is no longer maintained. Use the Capacitor equivalent instead.

Cordova plugin for Android APK auto-update. Downloads and installs the latest APK version from a remote server or external storage.

## Platform Support

- **Android only**

## Installation

```bash
cordova plugin add @simplysm/cordova-plugin-auto-update
```

The plugin automatically adds the `REQUEST_INSTALL_PACKAGES` permission to `AndroidManifest.xml` and depends on `@simplysm/cordova-plugin-file-system`.

## API

### CordovaAutoUpdate

Abstract utility class that orchestrates the full auto-update flow: version check, APK download, permission handling, and installation.

#### `static runAsync(opt)`

Performs a server-based auto-update. Connects to a remote service to check for the latest version, downloads the APK if an update is available, and triggers installation.

| Parameter | Type | Description |
|---|---|---|
| `opt.log` | `(messageHtml: string) => void` | Callback to display status/progress messages (HTML) |
| `opt.serviceClient` | `SdServiceClient` | Service client connected to a server implementing `ISdAutoUpdateService` |

The method compares `process.env["SD_VERSION"]` against the server's latest version. If they differ, it downloads the APK, saves it to app cache storage, and launches the installer. The app freezes after triggering install (or on error) to await restart.

```ts
import { CordovaAutoUpdate } from "@simplysm/cordova-plugin-auto-update";

await CordovaAutoUpdate.runAsync({
  log: (html) => { document.body.innerHTML = html; },
  serviceClient: myServiceClient,
});
```

#### `static runByExternalStorageAsync(opt)`

Performs an update from APK files stored on external storage. Scans a directory for versioned APK files (e.g., `1.2.3.apk`) and installs the highest version if it differs from the current app version.

| Parameter | Type | Description |
|---|---|---|
| `opt.log` | `(messageHtml: string) => void` | Callback to display status/progress messages (HTML) |
| `opt.dirPath` | `string` | Directory path (relative to external storage root) containing versioned APK files |

APK files must be named as `<semver>.apk` (e.g., `1.0.0.apk`). The method uses `semver.maxSatisfying` to determine the latest version.

```ts
import { CordovaAutoUpdate } from "@simplysm/cordova-plugin-auto-update";

await CordovaAutoUpdate.runByExternalStorageAsync({
  log: (html) => { document.body.innerHTML = html; },
  dirPath: "MyApp/updates",
});
```

### CordovaApkInstaller

Abstract utility class providing low-level Cordova bridge methods for APK installation and permission management on Android.

#### `static hasPermissionManifest(): Promise<boolean>`

Checks whether the `REQUEST_INSTALL_PACKAGES` permission is declared in the app's `AndroidManifest.xml`.

#### `static hasPermission(): Promise<boolean>`

Checks whether the app currently has runtime permission to install unknown apps. Returns `true` on Android versions below Oreo (API 26).

#### `static requestPermission(): Promise<void>`

Opens the system settings screen for managing unknown app sources, prompting the user to grant install permission. Only effective on Android Oreo (API 26) and above.

#### `static install(apkUri: string): Promise<void>`

Triggers APK installation via an `ACTION_VIEW` intent.

| Parameter | Type | Description |
|---|---|---|
| `apkUri` | `string` | Content URI of the APK file (obtain via `CordovaFileSystem.getFileUriAsync`) |

#### `static getVersionInfo(): Promise<{ versionName: string; versionCode: string }>`

Returns the current app's version name and version code from the Android `PackageManager`.
