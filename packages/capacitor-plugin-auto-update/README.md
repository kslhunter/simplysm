# @simplysm/capacitor-plugin-auto-update

Capacitor 7 plugin for auto-updating Android apps via APK installation. Provides two update strategies: server-based updates through `SdServiceClient` and external storage-based updates from a local directory.

## Installation

```bash
npm install @simplysm/capacitor-plugin-auto-update
```

### Peer Dependencies

- `@capacitor/core` ^7.0.0
- `@simplysm/capacitor-plugin-file-system`

### Android Setup

Register the plugin in your `MainActivity`:

```java
import kr.co.simplysm.capacitor.apkinstaller.ApkInstallerPlugin;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    registerPlugin(ApkInstallerPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
```

The plugin declares `REQUEST_INSTALL_PACKAGES` permission in its `AndroidManifest.xml`.

## API

### `AutoUpdate`

Abstract utility class that orchestrates the full update flow: version check, download, permission handling, and APK installation.

#### `AutoUpdate.runAsync(opt)`

Performs a server-based auto-update. Connects to the server via `SdServiceClient`, compares the current app version (`process.env["SD_VERSION"]`) against the server's latest version, downloads the APK if outdated, and triggers installation.

```typescript
await AutoUpdate.runAsync({
  log: (messageHtml: string) => {
    // Display progress/status HTML to the user
  },
  serviceClient: sdServiceClient,
});
```

| Parameter | Type | Description |
|---|---|---|
| `opt.log` | `(messageHtml: string) => void` | Callback to display status messages (may contain HTML) |
| `opt.serviceClient` | `SdServiceClient` | Connected service client instance. The server must implement `ISdAutoUpdateService`. |

#### `AutoUpdate.runByExternalStorageAsync(opt)`

Performs an update from APK files stored in external storage. Scans the specified directory for APK files named by semver version (e.g., `1.2.3.apk`), selects the highest version, and installs it if newer than the current version.

```typescript
await AutoUpdate.runByExternalStorageAsync({
  log: (messageHtml: string) => {
    // Display progress/status HTML to the user
  },
  dirPath: "MyApp/updates",
});
```

| Parameter | Type | Description |
|---|---|---|
| `opt.log` | `(messageHtml: string) => void` | Callback to display status messages (may contain HTML) |
| `opt.dirPath` | `string` | Relative path within external storage containing versioned APK files |

### `ApkInstaller`

Low-level static API wrapping the native Capacitor plugin for APK installation and permission management. On web, all methods resolve with no-op behavior.

#### `ApkInstaller.hasPermissionManifest()`

Checks whether `REQUEST_INSTALL_PACKAGES` is declared in the app's `AndroidManifest.xml`.

```typescript
const declared: boolean = await ApkInstaller.hasPermissionManifest();
```

#### `ApkInstaller.hasPermission()`

Checks whether the app currently has permission to install unknown apps (Android 8.0+). Returns `true` on older versions.

```typescript
const granted: boolean = await ApkInstaller.hasPermission();
```

#### `ApkInstaller.requestPermission()`

Opens the system settings screen for managing unknown app install sources (Android 8.0+).

```typescript
await ApkInstaller.requestPermission();
```

#### `ApkInstaller.install(apkUri)`

Triggers APK installation via `ACTION_VIEW` intent.

```typescript
await ApkInstaller.install(apkUri);
```

| Parameter | Type | Description |
|---|---|---|
| `apkUri` | `string` | `content://` URI of the APK file (FileProvider URI) |

#### `ApkInstaller.getVersionInfo()`

Returns the current app's version name and version code.

```typescript
const info: IVersionInfo = await ApkInstaller.getVersionInfo();
// info.versionName - e.g., "1.2.3"
// info.versionCode - e.g., "10"
```

### Interfaces

#### `IVersionInfo`

```typescript
interface IVersionInfo {
  versionName: string;
  versionCode: string;
}
```

#### `IApkInstallerPlugin`

Low-level Capacitor plugin interface. Use `ApkInstaller` static methods instead of calling this directly.

```typescript
interface IApkInstallerPlugin {
  install(options: { uri: string }): Promise<void>;
  hasPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<void>;
  hasPermissionManifest(): Promise<{ declared: boolean }>;
  getVersionInfo(): Promise<IVersionInfo>;
}
```

## Platform Support

| Platform | Behavior |
|---|---|
| Android | Full APK installation with permission management |
| Web | No-op stubs (permission checks return `true`, install shows an alert) |
| iOS | Not supported |
