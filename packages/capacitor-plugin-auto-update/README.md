# @simplysm/capacitor-plugin-auto-update

Capacitor plugin for automatic APK updates on Android. Provides APK installation with permission management and two update strategies: server-based (via `ServiceClient`) and external-storage-based.

## Installation

```bash
npm install @simplysm/capacitor-plugin-auto-update
```

### Android Configuration

Add the `REQUEST_INSTALL_PACKAGES` permission to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
```

Register the plugin in your `MainActivity.java`:

```java
import kr.co.simplysm.capacitor.apkinstaller.ApkInstallerPlugin;

public class MainActivity extends BridgeActivity {
  @Override
  protected void init(Bundle savedInstanceState) {
    super.init(savedInstanceState);
    registerPlugin(ApkInstallerPlugin.class);
  }
}
```

## API

### `ApkInstaller`

Abstract utility class for low-level APK installation and permission management.

- **Android**: Executes APK install intent, manages `REQUEST_INSTALL_PACKAGES` permission.
- **Browser**: Shows an alert message and resolves normally (web fallback).

#### `ApkInstaller.checkPermissions()`

Check whether install permission is granted and declared in the manifest.

```ts
const result = await ApkInstaller.checkPermissions();
// result.granted  — true if the app can install packages
// result.manifest — true if REQUEST_INSTALL_PACKAGES is declared in AndroidManifest.xml
```

**Returns:** `Promise<{ granted: boolean; manifest: boolean }>`

#### `ApkInstaller.requestPermissions()`

Navigate the user to the system settings page to grant the `REQUEST_INSTALL_PACKAGES` permission (Android 8.0+).

```ts
await ApkInstaller.requestPermissions();
```

**Returns:** `Promise<void>`

#### `ApkInstaller.install(apkUri)`

Install an APK file from the given `content://` URI (FileProvider URI).

```ts
await ApkInstaller.install("content://com.example.provider/files/latest.apk");
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `apkUri` | `string` | A `content://` URI pointing to the APK file |

**Returns:** `Promise<void>`

#### `ApkInstaller.getVersionInfo()`

Get the current app version information.

```ts
const info = await ApkInstaller.getVersionInfo();
// info.versionName — e.g. "1.2.3"
// info.versionCode — e.g. "10"
```

**Returns:** `Promise<VersionInfo>`

---

### `AutoUpdate`

Abstract utility class that orchestrates the full update flow: version check, download, permission handling, and APK installation. Provides two update strategies.

#### `AutoUpdate.run(opt)`

Server-based update strategy. Connects to the server via `ServiceClient`, compares versions using semver, downloads the APK, and triggers installation.

```ts
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";

await AutoUpdate.run({
  log: (messageHtml) => {
    // Display progress/status messages (may contain HTML)
    document.getElementById("status")!.innerHTML = messageHtml;
  },
  serviceClient: myServiceClient,
});
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `opt.log` | `(messageHtml: string) => void` | Callback for progress/status messages (may include HTML) |
| `opt.serviceClient` | `ServiceClient` | Service client instance connected to a server that implements `AutoUpdateService` |

**Returns:** `Promise<void>`

**Flow:**
1. Queries `AutoUpdateService.getLastVersion("android")` for latest version info.
2. Checks and requests install permissions if needed.
3. Compares server version with current app version using semver.
4. Downloads the APK with progress reporting.
5. Triggers APK installation and freezes the app until restart.

#### `AutoUpdate.runByExternalStorage(opt)`

External-storage-based update strategy. Scans a directory on external storage for APK files named by semver version (e.g., `1.2.3.apk`), finds the latest, and triggers installation if newer than the current version.

```ts
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";

await AutoUpdate.runByExternalStorage({
  log: (messageHtml) => {
    document.getElementById("status")!.innerHTML = messageHtml;
  },
  dirPath: "updates/my-app",
});
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `opt.log` | `(messageHtml: string) => void` | Callback for progress/status messages (may include HTML) |
| `opt.dirPath` | `string` | Relative path within external storage containing versioned APK files |

**Returns:** `Promise<void>`

**Flow:**
1. Checks and requests install permissions if needed.
2. Reads the external storage directory for `.apk` files with semver-formatted names.
3. Finds the highest version using semver comparison.
4. Compares with the current app version.
5. Triggers APK installation and freezes the app until restart.

---

### `VersionInfo`

```ts
interface VersionInfo {
  versionName: string; // Semantic version string, e.g. "1.2.3"
  versionCode: string; // Android numeric version code, e.g. "10"
}
```

### `ApkInstallerPlugin`

Low-level Capacitor plugin interface. Use the `ApkInstaller` static class instead of calling this directly.

```ts
interface ApkInstallerPlugin {
  install(options: { uri: string }): Promise<void>;
  checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>;
  requestPermissions(): Promise<void>;
  getVersionInfo(): Promise<VersionInfo>;
}
```

## Dependencies

- `@simplysm/capacitor-plugin-file-system` -- File system access for reading/writing APK files
- `@simplysm/core-browser` -- `fetchUrlBytes` for downloading APK files with progress
- `@simplysm/core-common` -- Utility functions (`html`, `wait`, `path`)
- `@simplysm/service-client` -- Server communication for the server-based update strategy
- `@simplysm/service-common` -- `AutoUpdateService` type definition
- `semver` -- Semantic version comparison
- `@capacitor/core` -- Capacitor plugin system (peer dependency)
