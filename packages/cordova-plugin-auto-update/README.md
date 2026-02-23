# @simplysm/cordova-plugin-auto-update

Cordova Plugin Auto Update — Android APK auto-update support for Cordova apps.

> **Deprecated**: This package is no longer maintained. Please migrate to the Capacitor equivalent (`@simplysm/capacitor-plugin-auto-update`).

## Installation

```bash
cordova plugin add @simplysm/cordova-plugin-auto-update
```

Requires the `@simplysm/cordova-plugin-file-system` plugin (installed automatically as a dependency).

The plugin adds the `android.permission.REQUEST_INSTALL_PACKAGES` permission to `AndroidManifest.xml` automatically.

**Platform support**: Android only.

---

## API

### `CordovaAutoUpdate`

Abstract class. All methods are static. Handles the full auto-update lifecycle: version check, APK download, permission handling, and installation.

#### `CordovaAutoUpdate.runAsync(opt)`

Fetches the latest version from the server and, if a newer version exists, downloads and installs the APK automatically.

```typescript
import { CordovaAutoUpdate } from "@simplysm/cordova-plugin-auto-update";
import { SdServiceClient } from "@simplysm/sd-service-client";

const client = new SdServiceClient("http://your-server");
await client.connectAsync();

await CordovaAutoUpdate.runAsync({
  log: (messageHtml) => {
    document.getElementById("status")!.innerHTML = messageHtml;
  },
  serviceClient: client,
});
```

**Parameters:**

| Name                | Type                            | Description                                                                 |
| ------------------- | ------------------------------- | --------------------------------------------------------------------------- |
| `opt.log`           | `(messageHtml: string) => void` | Callback that receives HTML status messages to display to the user.         |
| `opt.serviceClient` | `SdServiceClient`               | Connected service client used to query `SdAutoUpdateService` on the server. |

**Behavior:**

1. Calls `SdAutoUpdateService.getLastVersion("android")` on the server to obtain the latest version info.
2. Checks and requests the `REQUEST_INSTALL_PACKAGES` permission. If the permission is not declared in `AndroidManifest.xml` (code 1 or 2), throws with an HTML error message that includes a download link.
3. Compares the server version against `process.env["SD_VERSION"]`. Returns immediately if the version already matches.
4. Downloads the APK to the app cache directory and launches the installer.
5. After triggering installation, or on any error, the app is frozen (indefinite wait) to prevent further execution.

---

#### `CordovaAutoUpdate.runByExternalStorageAsync(opt)`

Checks a directory on external storage for APK files and installs the latest one if it is newer than the current app version.

```typescript
import { CordovaAutoUpdate } from "@simplysm/cordova-plugin-auto-update";

await CordovaAutoUpdate.runByExternalStorageAsync({
  log: (messageHtml) => {
    document.getElementById("status")!.innerHTML = messageHtml;
  },
  dirPath: "MyApp/updates",
});
```

**Parameters:**

| Name          | Type                            | Description                                                                          |
| ------------- | ------------------------------- | ------------------------------------------------------------------------------------ |
| `opt.log`     | `(messageHtml: string) => void` | Callback that receives HTML status messages.                                         |
| `opt.dirPath` | `string`                        | Subdirectory path relative to the external storage root where APK files are located. |

**Behavior:**

- Checks and requests the `REQUEST_INSTALL_PACKAGES` permission before scanning files.
- Reads APK files from `<external-storage>/<dirPath>/`.
- APK filenames must use a semver-compatible version as the file name (e.g., `1.2.3.apk`).
- Selects the highest version using `semver.maxSatisfying`.
- Compares against `process.env["SD_VERSION"]`. Returns immediately if already up to date or no APKs are found.
- Installs the latest APK and freezes the app afterward.
- On any error, logs the error message and freezes the app.

---

### `CordovaApkInstaller`

Abstract class. All methods are static. Low-level interface to the native `CordovaApkInstaller` Cordova plugin that handles APK installation on Android.

#### `CordovaApkInstaller.hasPermissionManifest()`

Returns `true` if `android.permission.REQUEST_INSTALL_PACKAGES` is declared in the app's `AndroidManifest.xml`.

```typescript
import { CordovaApkInstaller } from "@simplysm/cordova-plugin-auto-update";

const declared = await CordovaApkInstaller.hasPermissionManifest();
console.log(declared); // true | false
```

**Returns:** `Promise<boolean>`

---

#### `CordovaApkInstaller.hasPermission()`

Returns `true` if the user has granted the "install unknown apps" permission at runtime (Android 8.0+). Always returns `true` on Android versions below 8.0.

```typescript
const granted = await CordovaApkInstaller.hasPermission();
console.log(granted); // true | false
```

**Returns:** `Promise<boolean>`

---

#### `CordovaApkInstaller.requestPermission()`

Opens the Android system settings screen for managing unknown app sources, allowing the user to grant the install permission. No-op on Android versions below 8.0.

```typescript
await CordovaApkInstaller.requestPermission();
```

**Returns:** `Promise<void>`

---

#### `CordovaApkInstaller.install(apkUri)`

Launches the Android package installer for the APK at the given content URI.

```typescript
import { CordovaFileSystem } from "@simplysm/cordova-plugin-file-system";
import { CordovaApkInstaller } from "@simplysm/cordova-plugin-auto-update";

const uri = await CordovaFileSystem.getFileUriAsync("/data/app/cache/latest.apk");
await CordovaApkInstaller.install(uri);
```

**Parameters:**

| Name     | Type     | Description                                                                   |
| -------- | -------- | ----------------------------------------------------------------------------- |
| `apkUri` | `string` | Content URI of the APK file (obtain via `CordovaFileSystem.getFileUriAsync`). |

**Returns:** `Promise<void>`

---

#### `CordovaApkInstaller.getVersionInfo()`

Returns the current app's version name and version code as reported by the Android `PackageManager`.

```typescript
const info = await CordovaApkInstaller.getVersionInfo();
console.log(info.versionName); // e.g. "1.2.3"
console.log(info.versionCode); // e.g. "10203"
```

**Returns:** `Promise<{ versionName: string; versionCode: string }>`

| Property      | Type     | Description                                                                |
| ------------- | -------- | -------------------------------------------------------------------------- |
| `versionName` | `string` | Human-readable version string (e.g., `"1.2.3"`).                           |
| `versionCode` | `string` | Numeric version code as a string. On Android 9+ uses `getLongVersionCode`. |

---

## Types

This package has no additional exported types beyond the classes documented above.

The server-side counterpart must implement `ISdAutoUpdateService` from `@simplysm/sd-service-common`, specifically its `getLastVersion(platform: string)` method, which returns an object with `version` and `downloadPath` fields.
