# @simplysm/capacitor-plugin-auto-update

Simplysm Package - Capacitor Auto Update Plugin

Provides Android APK auto-update capabilities for Capacitor apps. Includes APK installation via native Android intent and automated update flows from either a remote server or external storage.

## Installation

```bash
pnpm add @simplysm/capacitor-plugin-auto-update
```

## Main Modules

### APK Installer

#### `ApkInstaller`

Abstract class with static methods that wrap the native `ApkInstaller` Capacitor plugin.

- Android: executes APK install intent and manages `REQUEST_INSTALL_PACKAGES` permission.
- Browser (web fallback): `checkPermissions` returns `{ granted: true, manifest: true }`, `install` shows an alert and returns normally.

```ts
import { ApkInstaller } from "@simplysm/capacitor-plugin-auto-update";

// Check whether REQUEST_INSTALL_PACKAGES is declared in the manifest and currently granted
const { granted, manifest } = await ApkInstaller.checkPermissions();

// Navigate the user to the settings page to grant the permission
await ApkInstaller.requestPermissions();

// Install an APK given a content:// FileProvider URI
await ApkInstaller.install("content://com.example/files/latest.apk");

// Get the running app's version information
const info = await ApkInstaller.getVersionInfo();
// info.versionName  →  e.g. "1.2.3"
// info.versionCode  →  e.g. "10203"
```

**Static methods**

| Method | Signature | Description |
|---|---|---|
| `checkPermissions` | `() => Promise<{ granted: boolean; manifest: boolean }>` | Returns whether `REQUEST_INSTALL_PACKAGES` is granted and declared in the manifest. |
| `requestPermissions` | `() => Promise<void>` | Opens the system settings screen for the user to grant the permission. |
| `install` | `(apkUri: string) => Promise<void>` | Fires the install intent for the given `content://` URI. |
| `getVersionInfo` | `() => Promise<VersionInfo>` | Returns the running app's `versionName` and `versionCode`. |

---

### Auto Update

#### `AutoUpdate`

Abstract class with static methods that orchestrate the full auto-update flow.

**`AutoUpdate.run`**

Downloads the latest APK from a remote server using a `ServiceClient` connection and installs it.

1. Queries the server for the latest version via `AutoUpdateService.getLastVersion("android")`.
2. Checks and requests install permission if needed.
3. Compares the server version against the installed version using semver.
4. Downloads the APK to app cache storage and triggers installation.
5. Freezes the app (waits indefinitely) after install to prevent further execution.
6. On any error the log callback is called with an HTML error message and the app is frozen.

```ts
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";
import type { ServiceClient } from "@simplysm/service-client";

declare const serviceClient: ServiceClient;

await AutoUpdate.run({
  log: (messageHtml) => {
    document.getElementById("status")!.innerHTML = messageHtml;
  },
  serviceClient,
});
```

**Options**

| Property | Type | Description |
|---|---|---|
| `log` | `(messageHtml: string) => void` | Callback that receives HTML status messages to display to the user. |
| `serviceClient` | `ServiceClient` | Connected service client used to reach `AutoUpdateService` on the server. |

---

**`AutoUpdate.runByExternalStorage`**

Finds the newest APK file stored in a directory on the device's external storage and installs it.

1. Checks and requests install permission if needed.
2. Reads the specified directory on external storage, selecting `.apk` files whose basenames are valid semver strings.
3. Picks the highest version using `semver.maxSatisfying`.
4. Compares it against the installed version; skips if already up-to-date.
5. Triggers installation and freezes the app.
6. On any error the log callback is called with an HTML error message and the app is frozen.

```ts
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";

await AutoUpdate.runByExternalStorage({
  log: (messageHtml) => {
    document.getElementById("status")!.innerHTML = messageHtml;
  },
  dirPath: "MyApp/updates",
});
```

**Options**

| Property | Type | Description |
|---|---|---|
| `log` | `(messageHtml: string) => void` | Callback that receives HTML status messages to display to the user. |
| `dirPath` | `string` | Path relative to the external storage root where APK files are located. |

## Types

### `VersionInfo`

Version information returned by `ApkInstaller.getVersionInfo()`.

```ts
import type { VersionInfo } from "@simplysm/capacitor-plugin-auto-update";

interface VersionInfo {
  versionName: string; // Human-readable version string, e.g. "1.2.3"
  versionCode: string; // Integer build number as a string, e.g. "10203"
}
```

### `ApkInstallerPlugin`

Low-level interface implemented by the native Capacitor plugin. Use `ApkInstaller` (the abstract class) instead of this interface directly.

```ts
import type { ApkInstallerPlugin } from "@simplysm/capacitor-plugin-auto-update";

interface ApkInstallerPlugin {
  install(options: { uri: string }): Promise<void>;
  checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>;
  requestPermissions(): Promise<void>;
  getVersionInfo(): Promise<VersionInfo>;
}
```
