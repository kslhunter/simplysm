# Capacitor Plugin API Naming Standardization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Rename public API names across 4 capacitor-plugin-* packages to align with Capacitor ecosystem conventions.

**Architecture:** Each package has 3 layers: plugin interface (TypeScript types), wrapper class (static methods), web implementation, plus Android native Java. Changes flow interface → wrapper → web → native, in dependency order (file-system first, then auto-update which depends on it, then broadcast and usb-storage independently).

**Tech Stack:** TypeScript, Java (Android Capacitor plugins), pnpm

---

### Task 1: capacitor-plugin-file-system — Rename interface file + types

**Files:**
- Rename: `packages/capacitor-plugin-file-system/src/IFileSystemPlugin.ts` → `packages/capacitor-plugin-file-system/src/FileSystemPlugin.ts`
- Modify: `packages/capacitor-plugin-file-system/src/FileSystemPlugin.ts` (the renamed file)
- Modify: `packages/capacitor-plugin-file-system/src/index.ts`

**Step 1: Rename the interface file via git**

```bash
cd /d/workspaces-13/simplysm
git mv packages/capacitor-plugin-file-system/src/IFileSystemPlugin.ts packages/capacitor-plugin-file-system/src/FileSystemPlugin.ts
```

**Step 2: Update type names in the renamed file**

Replace the entire content of `packages/capacitor-plugin-file-system/src/FileSystemPlugin.ts`:

```typescript
export type StorageType =
  | "external"
  | "externalFiles"
  | "externalCache"
  | "externalMedia"
  | "appData"
  | "appFiles"
  | "appCache";

export interface FileInfo {
  name: string;
  isDirectory: boolean;
}

export interface FileSystemPlugin {
  checkPermissions(): Promise<{ granted: boolean }>;
  requestPermissions(): Promise<void>;
  readdir(options: { path: string }): Promise<{ files: FileInfo[] }>;
  getStoragePath(options: { type: StorageType }): Promise<{ path: string }>;
  getUri(options: { path: string }): Promise<{ uri: string }>;
  writeFile(options: { path: string; data: string; encoding?: "utf8" | "base64" }): Promise<void>;
  readFile(options: { path: string; encoding?: "utf8" | "base64" }): Promise<{ data: string }>;
  remove(options: { path: string }): Promise<void>;
  mkdir(options: { path: string }): Promise<void>;
  exists(options: { path: string }): Promise<{ exists: boolean }>;
}
```

**Step 3: Update index.ts export path**

Replace content of `packages/capacitor-plugin-file-system/src/index.ts`:

```typescript
// File System
export * from "./FileSystem";
export * from "./FileSystemPlugin";
```

Note: The export `"./FileSystemPlugin"` now refers to the renamed file (was `"./IFileSystemPlugin"`).

**Step 4: Commit**

```bash
git add -A packages/capacitor-plugin-file-system/src/FileSystemPlugin.ts packages/capacitor-plugin-file-system/src/index.ts
git commit -m "refactor(file-system): rename interface file and types to Capacitor conventions"
```

---

### Task 2: capacitor-plugin-file-system — Update wrapper class

**Files:**
- Modify: `packages/capacitor-plugin-file-system/src/FileSystem.ts`

**Step 1: Rewrite FileSystem.ts with all renames + readFile merge**

The registered plugin variable `FileSystemPlugin` conflicts with the new interface name `FileSystemPlugin`. Rename it to camelCase `fileSystemPlugin`. Also rename all method calls and merge `readFileString`/`readFileBytes` into overloaded `readFile`.

Replace full content of `packages/capacitor-plugin-file-system/src/FileSystem.ts`:

```typescript
import { registerPlugin } from "@capacitor/core";
import type { FileInfo, FileSystemPlugin, StorageType } from "./FileSystemPlugin";
import type { Bytes } from "@simplysm/core-common";
import { bytesToBase64, bytesFromBase64 } from "@simplysm/core-common";

const fileSystemPlugin = registerPlugin<FileSystemPlugin>("FileSystem", {
  web: async () => {
    const { FileSystemWeb } = await import("./web/FileSystemWeb");
    return new FileSystemWeb();
  },
});

/**
 * File system access plugin
 * - Android 11+: Full file system access via MANAGE_EXTERNAL_STORAGE permission
 * - Android 10-: READ/WRITE_EXTERNAL_STORAGE permission
 * - Browser: IndexedDB-based emulation
 */
export abstract class FileSystem {
  /**
   * Check permission
   */
  static async checkPermissions(): Promise<boolean> {
    const result = await fileSystemPlugin.checkPermissions();
    return result.granted;
  }

  /**
   * Request permission
   * - Android 11+: Navigate to settings
   * - Android 10-: Show permission dialog
   */
  static async requestPermissions(): Promise<void> {
    await fileSystemPlugin.requestPermissions();
  }

  /**
   * Read directory
   */
  static async readdir(dirPath: string): Promise<FileInfo[]> {
    const result = await fileSystemPlugin.readdir({ path: dirPath });
    return result.files;
  }

  /**
   * Get storage path
   * @param type Storage type
   * - external: External storage root (Environment.getExternalStorageDirectory)
   * - externalFiles: App-specific external files directory
   * - externalCache: App-specific external cache directory
   * - externalMedia: App-specific external media directory
   * - appData: App data directory
   * - appFiles: App files directory
   * - appCache: App cache directory
   */
  static async getStoragePath(type: StorageType): Promise<string> {
    const result = await fileSystemPlugin.getStoragePath({ type });
    return result.path;
  }

  /**
   * Get file URI (FileProvider)
   */
  static async getUri(filePath: string): Promise<string> {
    const result = await fileSystemPlugin.getUri({ path: filePath });
    return result.uri;
  }

  /**
   * Write file
   */
  static async writeFile(filePath: string, data: string | Bytes): Promise<void> {
    if (typeof data !== "string") {
      // Bytes (Uint8Array) - works safely in cross-realm environments
      await fileSystemPlugin.writeFile({
        path: filePath,
        data: bytesToBase64(data),
        encoding: "base64",
      });
    } else {
      await fileSystemPlugin.writeFile({
        path: filePath,
        data,
        encoding: "utf8",
      });
    }
  }

  /**
   * Read file (default: Bytes, with encoding "utf8": string)
   */
  static async readFile(filePath: string): Promise<Bytes>;
  static async readFile(filePath: string, encoding: "utf8"): Promise<string>;
  static async readFile(filePath: string, encoding?: "utf8"): Promise<string | Bytes> {
    if (encoding === "utf8") {
      const result = await fileSystemPlugin.readFile({ path: filePath, encoding: "utf8" });
      return result.data;
    } else {
      const result = await fileSystemPlugin.readFile({ path: filePath, encoding: "base64" });
      return bytesFromBase64(result.data);
    }
  }

  /**
   * Delete file/directory (recursive)
   */
  static async remove(targetPath: string): Promise<void> {
    await fileSystemPlugin.remove({ path: targetPath });
  }

  /**
   * Create directory (recursive)
   */
  static async mkdir(targetPath: string): Promise<void> {
    await fileSystemPlugin.mkdir({ path: targetPath });
  }

  /**
   * Check existence
   */
  static async exists(targetPath: string): Promise<boolean> {
    const result = await fileSystemPlugin.exists({ path: targetPath });
    return result.exists;
  }
}
```

**Step 2: Verify typecheck**

```bash
pnpm typecheck packages/capacitor-plugin-file-system
```

Expected: may fail due to web implementation not yet updated — proceed to Task 3.

**Step 3: Commit**

```bash
git add packages/capacitor-plugin-file-system/src/FileSystem.ts
git commit -m "refactor(file-system): rename methods to Capacitor conventions and merge readFile"
```

---

### Task 3: capacitor-plugin-file-system — Update web implementation

**Files:**
- Modify: `packages/capacitor-plugin-file-system/src/web/FileSystemWeb.ts`

**Step 1: Update FileSystemWeb with renamed types and methods**

Replace full content of `packages/capacitor-plugin-file-system/src/web/FileSystemWeb.ts`:

```typescript
import { WebPlugin } from "@capacitor/core";
import type { FileInfo, FileSystemPlugin, StorageType } from "../FileSystemPlugin";
import { VirtualFileSystem } from "./VirtualFileSystem";
import { bytesToBase64, bytesFromBase64 } from "@simplysm/core-common";

export class FileSystemWeb extends WebPlugin implements FileSystemPlugin {
  private readonly _fs = new VirtualFileSystem("capacitor_web_virtual_fs");
  private readonly _textEncoder = new TextEncoder();
  private readonly _textDecoder = new TextDecoder();

  async checkPermissions(): Promise<{ granted: boolean }> {
    return Promise.resolve({ granted: true });
  }

  async requestPermissions(): Promise<void> {}

  async readdir(options: { path: string }): Promise<{ files: FileInfo[] }> {
    const entry = await this._fs.getEntry(options.path);
    if (!entry || entry.kind !== "dir") {
      throw new Error("Directory does not exist");
    }
    const files = await this._fs.listChildren(options.path);
    return { files };
  }

  async getStoragePath(options: { type: StorageType }): Promise<{ path: string }> {
    const base = "/webfs";
    let storagePath: string;
    switch (options.type) {
      case "external":
        storagePath = base + "/external";
        break;
      case "externalFiles":
        storagePath = base + "/externalFiles";
        break;
      case "externalCache":
        storagePath = base + "/externalCache";
        break;
      case "externalMedia":
        storagePath = base + "/externalMedia";
        break;
      case "appData":
        storagePath = base + "/appData";
        break;
      case "appFiles":
        storagePath = base + "/appFiles";
        break;
      case "appCache":
        storagePath = base + "/appCache";
        break;
      default:
        throw new Error("Unknown storage type: " + options.type);
    }
    await this._fs.ensureDir(storagePath);
    return { path: storagePath };
  }

  /**
   * Return the Blob URL of a file.
   * @warning The returned URI must be released by calling `URL.revokeObjectURL(uri)` after use.
   * Failure to release may cause memory leaks.
   */
  async getUri(options: { path: string }): Promise<{ uri: string }> {
    const entry = await this._fs.getEntry(options.path);
    if (!entry || entry.kind !== "file" || entry.dataBase64 == null) {
      throw new Error("File not found: " + options.path);
    }
    const bytes = bytesFromBase64(entry.dataBase64);
    const blob = new Blob([bytes as BlobPart]);
    return { uri: URL.createObjectURL(blob) };
  }

  async writeFile(options: {
    path: string;
    data: string;
    encoding?: "utf8" | "base64";
  }): Promise<void> {
    const idx = options.path.lastIndexOf("/");
    const dir = idx === -1 ? "." : options.path.substring(0, idx) || "/";
    await this._fs.ensureDir(dir);
    const dataBase64 =
      options.encoding === "base64"
        ? options.data
        : bytesToBase64(this._textEncoder.encode(options.data));
    await this._fs.putEntry({ path: options.path, kind: "file", dataBase64 });
  }

  async readFile(options: {
    path: string;
    encoding?: "utf8" | "base64";
  }): Promise<{ data: string }> {
    const entry = await this._fs.getEntry(options.path);
    if (!entry || entry.kind !== "file" || entry.dataBase64 == null) {
      throw new Error("File not found: " + options.path);
    }
    const data =
      options.encoding === "base64"
        ? entry.dataBase64
        : this._textDecoder.decode(bytesFromBase64(entry.dataBase64));
    return { data };
  }

  async remove(options: { path: string }): Promise<void> {
    const ok = await this._fs.deleteByPrefix(options.path);
    if (!ok) {
      throw new Error("Deletion failed");
    }
  }

  async mkdir(options: { path: string }): Promise<void> {
    await this._fs.ensureDir(options.path);
  }

  async exists(options: { path: string }): Promise<{ exists: boolean }> {
    const entry = await this._fs.getEntry(options.path);
    return { exists: !!entry };
  }
}
```

**Step 2: Verify typecheck**

```bash
pnpm typecheck packages/capacitor-plugin-file-system
```

Expected: PASS

**Step 3: Commit**

```bash
git add packages/capacitor-plugin-file-system/src/web/FileSystemWeb.ts
git commit -m "refactor(file-system): update web implementation to match renamed API"
```

---

### Task 4: capacitor-plugin-file-system — Update native Java

**Files:**
- Modify: `packages/capacitor-plugin-file-system/android/src/main/java/kr/co/simplysm/capacitor/filesystem/FileSystemPlugin.java`

**Step 1: Rename Java methods**

In `FileSystemPlugin.java`, rename these `@PluginMethod` methods:
- `hasPermission` → `checkPermissions` (line 35)
- `requestPermission` → `requestPermissions` (line 50)
- `getFileUri` → `getUri` (line 158)

Also update the error log message in `getUri` (was "getFileUri failed").

**Step 2: Commit**

```bash
git add packages/capacitor-plugin-file-system/android/
git commit -m "refactor(file-system): rename native Java methods to Capacitor conventions"
```

---

### Task 5: capacitor-plugin-auto-update — Rename interface file + types + methods

**Files:**
- Rename: `packages/capacitor-plugin-auto-update/src/IApkInstallerPlugin.ts` → `packages/capacitor-plugin-auto-update/src/ApkInstallerPlugin.ts`
- Modify: `packages/capacitor-plugin-auto-update/src/ApkInstallerPlugin.ts` (renamed file)
- Modify: `packages/capacitor-plugin-auto-update/src/index.ts`

**Step 1: Rename the interface file via git**

```bash
git mv packages/capacitor-plugin-auto-update/src/IApkInstallerPlugin.ts packages/capacitor-plugin-auto-update/src/ApkInstallerPlugin.ts
```

**Step 2: Update type names and integrate hasPermissionManifest into checkPermissions**

Replace content of `packages/capacitor-plugin-auto-update/src/ApkInstallerPlugin.ts`:

```typescript
export interface VersionInfo {
  versionName: string;
  versionCode: string;
}

export interface ApkInstallerPlugin {
  install(options: { uri: string }): Promise<void>;
  checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>;
  requestPermissions(): Promise<void>;
  getVersionInfo(): Promise<VersionInfo>;
}
```

Note: `hasPermission`, `requestPermission`, and `hasPermissionManifest` are replaced by `checkPermissions` (returns both `granted` and `manifest`) and `requestPermissions`.

**Step 3: Update index.ts**

Replace content of `packages/capacitor-plugin-auto-update/src/index.ts`:

```typescript
// APK Installer
export * from "./ApkInstaller";
export * from "./ApkInstallerPlugin";

// Auto Update
export * from "./AutoUpdate";
```

**Step 4: Commit**

```bash
git add -A packages/capacitor-plugin-auto-update/src/ApkInstallerPlugin.ts packages/capacitor-plugin-auto-update/src/index.ts
git commit -m "refactor(auto-update): rename interface file and integrate checkPermissions"
```

---

### Task 6: capacitor-plugin-auto-update — Update wrapper + web + AutoUpdate

**Files:**
- Modify: `packages/capacitor-plugin-auto-update/src/ApkInstaller.ts`
- Modify: `packages/capacitor-plugin-auto-update/src/web/ApkInstallerWeb.ts`
- Modify: `packages/capacitor-plugin-auto-update/src/AutoUpdate.ts`

**Step 1: Rewrite ApkInstaller.ts**

Rename registered plugin variable to camelCase. Merge `hasPermission` + `hasPermissionManifest` into `checkPermissions` returning `{ granted, manifest }`.

Replace full content of `packages/capacitor-plugin-auto-update/src/ApkInstaller.ts`:

```typescript
import { registerPlugin } from "@capacitor/core";
import type { ApkInstallerPlugin, VersionInfo } from "./ApkInstallerPlugin";

const apkInstallerPlugin = registerPlugin<ApkInstallerPlugin>("ApkInstaller", {
  web: async () => {
    const { ApkInstallerWeb } = await import("./web/ApkInstallerWeb");
    return new ApkInstallerWeb();
  },
});

/**
 * APK installation plugin
 * - Android: Executes APK install intent, manages REQUEST_INSTALL_PACKAGES permission
 * - Browser: Shows alert message and returns normally
 */
export abstract class ApkInstaller {
  /**
   * Check permissions (install permission granted + manifest declared)
   */
  static async checkPermissions(): Promise<{ granted: boolean; manifest: boolean }> {
    return apkInstallerPlugin.checkPermissions();
  }

  /**
   * Request REQUEST_INSTALL_PACKAGES permission (navigates to settings)
   */
  static async requestPermissions(): Promise<void> {
    await apkInstallerPlugin.requestPermissions();
  }

  /**
   * Install APK
   * @param apkUri content:// URI (FileProvider URI)
   */
  static async install(apkUri: string): Promise<void> {
    await apkInstallerPlugin.install({ uri: apkUri });
  }

  /**
   * Get app version info
   */
  static async getVersionInfo(): Promise<VersionInfo> {
    return apkInstallerPlugin.getVersionInfo();
  }
}
```

**Step 2: Rewrite ApkInstallerWeb.ts**

Replace full content of `packages/capacitor-plugin-auto-update/src/web/ApkInstallerWeb.ts`:

```typescript
import { WebPlugin } from "@capacitor/core";
import type { ApkInstallerPlugin, VersionInfo } from "../ApkInstallerPlugin";

export class ApkInstallerWeb extends WebPlugin implements ApkInstallerPlugin {
  install(_options: { uri: string }): Promise<void> {
    alert("[ApkInstaller] APK installation is not supported in web environment.");
    return Promise.resolve();
  }

  checkPermissions(): Promise<{ granted: boolean; manifest: boolean }> {
    // Skip permission check on web
    return Promise.resolve({ granted: true, manifest: true });
  }

  async requestPermissions(): Promise<void> {
    // No-op on web
  }

  getVersionInfo(): Promise<VersionInfo> {
    return Promise.resolve({
      versionName:
        (import.meta as unknown as { env?: Record<string, string> }).env?.["__VER__"] ?? "0.0.0",
      versionCode: "0",
    });
  }
}
```

**Step 3: Update AutoUpdate.ts**

Update references to renamed methods. Key changes:
- `ApkInstaller.hasPermissionManifest()` → `ApkInstaller.checkPermissions()` then check `.manifest`
- `ApkInstaller.hasPermission()` → `ApkInstaller.checkPermissions()` then check `.granted`
- `ApkInstaller.requestPermission()` → `ApkInstaller.requestPermissions()`
- `FileSystem.getFileUri(...)` → `FileSystem.getUri(...)` (from file-system package rename in Task 2)
- `IFileInfo` type is not directly used (only `fileInfo.isDirectory` / `fileInfo.name` accessed) — no type import changes needed

In `AutoUpdate.ts`, replace the `_checkPermission` method (lines 49-83) with:

```typescript
  private static async _checkPermission(log: (messageHtml: string) => void, targetHref?: string) {
    if (!navigator.userAgent.toLowerCase().includes("android")) {
      throw new Error("Only Android is supported.");
    }

    try {
      const { manifest } = await ApkInstaller.checkPermissions();
      if (!manifest) {
        this._throwAboutReinstall(1, targetHref);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[AutoUpdate] checkPermissions manifest check failed:", err);
      this._throwAboutReinstall(2, targetHref);
    }

    const { granted } = await ApkInstaller.checkPermissions();
    if (!granted) {
      log(html`
        Installation permission must be enabled.
        <style>
          button { ${this._BUTTON_CSS} }
          button:active { ${this._BUTTON_ACTIVE_CSS} }
        </style>
        <button onclick="location.reload()">Retry</button>
      `);
      await ApkInstaller.requestPermissions();
      // Wait up to 5 minutes (300 seconds) - time for user to grant permission in settings
      await waitUntil(
        async () => {
          const result = await ApkInstaller.checkPermissions();
          return result.granted;
        },
        1000,
        300,
      );
    }
  }
```

In `_installApk` method (line 98), replace:
```typescript
    const apkFileUri = await FileSystem.getFileUri(apkFilePath);
```
with:
```typescript
    const apkFileUri = await FileSystem.getUri(apkFilePath);
```

**Step 4: Verify typecheck**

```bash
pnpm typecheck packages/capacitor-plugin-auto-update
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/capacitor-plugin-auto-update/src/
git commit -m "refactor(auto-update): rename methods and integrate checkPermissions"
```

---

### Task 7: capacitor-plugin-auto-update — Update native Java

**Files:**
- Modify: `packages/capacitor-plugin-auto-update/android/src/main/java/kr/co/simplysm/capacitor/apkinstaller/ApkInstallerPlugin.java`

**Step 1: Replace `hasPermission` + `hasPermissionManifest` with single `checkPermissions`**

Remove the `hasPermission` method (lines 47-58) and `hasPermissionManifest` method (lines 73-99). Add a single `checkPermissions` method that returns both `granted` and `manifest`:

```java
    @PluginMethod
    public void checkPermissions(PluginCall call) {
        // Check granted
        boolean granted;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            granted = getContext().getPackageManager().canRequestPackageInstalls();
        } else {
            granted = true;
        }

        // Check manifest
        boolean manifest = false;
        try {
            Context context = getContext();
            String targetPermission = "android.permission.REQUEST_INSTALL_PACKAGES";
            String[] requestedPermissions = context.getPackageManager()
                .getPackageInfo(context.getPackageName(), PackageManager.GET_PERMISSIONS)
                .requestedPermissions;
            if (requestedPermissions != null) {
                for (String perm : requestedPermissions) {
                    if (targetPermission.equals(perm)) {
                        manifest = true;
                        break;
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "checkPermissions manifest check failed", e);
        }

        JSObject ret = new JSObject();
        ret.put("granted", granted);
        ret.put("manifest", manifest);
        call.resolve(ret);
    }
```

**Step 2: Rename `requestPermission` → `requestPermissions` (line 61)**

Change method name from `requestPermission` to `requestPermissions`.

**Step 3: Commit**

```bash
git add packages/capacitor-plugin-auto-update/android/
git commit -m "refactor(auto-update): rename native Java methods and integrate checkPermissions"
```

---

### Task 8: capacitor-plugin-broadcast — Rename interface file + types + listener pattern

**Files:**
- Rename: `packages/capacitor-plugin-broadcast/src/IBroadcastPlugin.ts` → `packages/capacitor-plugin-broadcast/src/BroadcastPlugin.ts`
- Modify: `packages/capacitor-plugin-broadcast/src/BroadcastPlugin.ts` (renamed file)
- Modify: `packages/capacitor-plugin-broadcast/src/index.ts`

**Step 1: Rename the interface file**

```bash
git mv packages/capacitor-plugin-broadcast/src/IBroadcastPlugin.ts packages/capacitor-plugin-broadcast/src/BroadcastPlugin.ts
```

**Step 2: Update types + event name + add removeAllListeners**

Replace content of `packages/capacitor-plugin-broadcast/src/BroadcastPlugin.ts`:

```typescript
import type { PluginListenerHandle } from "@capacitor/core";

export interface BroadcastResult {
  /** Broadcast action */
  action?: string;
  /** Extra data */
  extras?: Record<string, unknown>;
}

export interface BroadcastPlugin {
  /**
   * Register broadcast receiver
   */
  subscribe(
    options: { filters: string[] },
    callback: (result: BroadcastResult) => void,
  ): Promise<{ id: string }>;

  /**
   * Unsubscribe a specific broadcast receiver
   */
  unsubscribe(options: { id: string }): Promise<void>;

  /**
   * Unsubscribe all broadcast receivers
   */
  unsubscribeAll(): Promise<void>;

  /**
   * Send broadcast
   */
  send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>;

  /**
   * Get launch intent
   */
  getLaunchIntent(): Promise<BroadcastResult>;

  /**
   * Register listener for new intents received while app is running
   */
  addListener(
    eventName: "newIntent",
    listenerFunc: (data: BroadcastResult) => void,
  ): Promise<PluginListenerHandle>;

  /**
   * Remove all event listeners
   */
  removeAllListeners(): Promise<void>;
}
```

**Step 3: Update index.ts**

Replace content of `packages/capacitor-plugin-broadcast/src/index.ts`:

```typescript
// Broadcast
export * from "./Broadcast";
export * from "./BroadcastPlugin";
```

**Step 4: Commit**

```bash
git add -A packages/capacitor-plugin-broadcast/src/BroadcastPlugin.ts packages/capacitor-plugin-broadcast/src/index.ts
git commit -m "refactor(broadcast): rename interface file, types, and event name"
```

---

### Task 9: capacitor-plugin-broadcast — Update wrapper + web

**Files:**
- Modify: `packages/capacitor-plugin-broadcast/src/Broadcast.ts`
- Modify: `packages/capacitor-plugin-broadcast/src/web/BroadcastWeb.ts`

**Step 1: Rewrite Broadcast.ts**

Rename registered plugin variable to camelCase. Replace `addNewIntentListener` with standard `addListener`. Add `removeAllListeners`. Update type references.

Replace full content of `packages/capacitor-plugin-broadcast/src/Broadcast.ts`:

```typescript
import { registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import type { BroadcastPlugin, BroadcastResult } from "./BroadcastPlugin";

const broadcastPlugin = registerPlugin<BroadcastPlugin>("Broadcast", {
  web: async () => {
    const { BroadcastWeb } = await import("./web/BroadcastWeb");
    return new BroadcastWeb();
  },
});

/**
 * Android Broadcast send/receive plugin
 * - For industrial device integration (barcode scanners, PDAs, etc.)
 */
export abstract class Broadcast {
  /**
   * Register broadcast receiver
   * @returns Unsubscribe function
   *
   * @example
   * ```ts
   * const unsub = await Broadcast.subscribe(
   *   ["com.symbol.datawedge.api.RESULT_ACTION"],
   *   (result) => console.log(result.extras)
   * );
   *
   * // Unsubscribe
   * unsub();
   * ```
   */
  static async subscribe(
    filters: string[],
    callback: (result: BroadcastResult) => void,
  ): Promise<() => Promise<void>> {
    const { id } = await broadcastPlugin.subscribe({ filters }, (result) => {
      // Filter out the initial resolve that only contains { id }
      if (result.action != null) {
        callback(result);
      }
    });
    return async () => {
      await broadcastPlugin.unsubscribe({ id });
    };
  }

  /**
   * Unsubscribe all broadcast receivers
   */
  static async unsubscribeAll(): Promise<void> {
    await broadcastPlugin.unsubscribeAll();
  }

  /**
   * Send broadcast
   *
   * @example
   * ```ts
   * await Broadcast.send({
   *   action: "com.symbol.datawedge.api.ACTION",
   *   extras: {
   *     "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING"
   *   }
   * });
   * ```
   */
  static async send(options: { action: string; extras?: Record<string, unknown> }): Promise<void> {
    await broadcastPlugin.send(options);
  }

  /**
   * Get launch intent
   */
  static async getLaunchIntent(): Promise<BroadcastResult> {
    return broadcastPlugin.getLaunchIntent();
  }

  /**
   * Register listener for events
   * @returns Listener handle (release with handle.remove())
   */
  static async addListener(
    eventName: "newIntent",
    callback: (result: BroadcastResult) => void,
  ): Promise<PluginListenerHandle> {
    return broadcastPlugin.addListener(eventName, callback);
  }

  /**
   * Remove all event listeners
   */
  static async removeAllListeners(): Promise<void> {
    await broadcastPlugin.removeAllListeners();
  }
}
```

**Step 2: Rewrite BroadcastWeb.ts**

Replace full content of `packages/capacitor-plugin-broadcast/src/web/BroadcastWeb.ts`:

```typescript
import { WebPlugin } from "@capacitor/core";
import type { BroadcastPlugin, BroadcastResult } from "../BroadcastPlugin";

export class BroadcastWeb extends WebPlugin implements BroadcastPlugin {
  private static readonly _warn = () =>
    // eslint-disable-next-line no-console
    console.warn("[Broadcast] Broadcast is not supported in web environment.");

  subscribe(
    _options: { filters: string[] },
    _callback: (result: BroadcastResult) => void,
  ): Promise<{ id: string }> {
    BroadcastWeb._warn();
    return Promise.resolve({ id: "web-stub" });
  }

  async unsubscribe(_options: { id: string }): Promise<void> {
    // No-op on web
  }

  async unsubscribeAll(): Promise<void> {
    // No-op on web
  }

  send(_options: { action: string; extras?: Record<string, unknown> }): Promise<void> {
    BroadcastWeb._warn();
    return Promise.resolve();
  }

  getLaunchIntent(): Promise<BroadcastResult> {
    return Promise.resolve({});
  }
}
```

Note: `removeAllListeners()` is inherited from `WebPlugin` — no override needed.

**Step 3: Verify typecheck**

```bash
pnpm typecheck packages/capacitor-plugin-broadcast
```

Expected: PASS

**Step 4: Commit**

```bash
git add packages/capacitor-plugin-broadcast/src/
git commit -m "refactor(broadcast): update wrapper and web to standard listener pattern"
```

---

### Task 10: capacitor-plugin-broadcast — Update native Java

**Files:**
- Modify: `packages/capacitor-plugin-broadcast/android/src/main/java/kr/co/simplysm/capacitor/broadcast/BroadcastPlugin.java`

**Step 1: Change event name in handleOnNewIntent**

In `BroadcastPlugin.java` line 37, change:
```java
notifyListeners("onNewIntent", intentToJson(intent));
```
to:
```java
notifyListeners("newIntent", intentToJson(intent));
```

No other native changes needed — `removeAllListeners` is handled by Capacitor's Plugin base class.

**Step 2: Commit**

```bash
git add packages/capacitor-plugin-broadcast/android/
git commit -m "refactor(broadcast): rename native event name to 'newIntent'"
```

---

### Task 11: capacitor-plugin-usb-storage — Rename interface file + types + methods

**Files:**
- Rename: `packages/capacitor-plugin-usb-storage/src/IUsbStoragePlugin.ts` → `packages/capacitor-plugin-usb-storage/src/UsbStoragePlugin.ts`
- Modify: `packages/capacitor-plugin-usb-storage/src/UsbStoragePlugin.ts` (renamed file)
- Modify: `packages/capacitor-plugin-usb-storage/src/index.ts`

**Step 1: Rename the interface file**

```bash
git mv packages/capacitor-plugin-usb-storage/src/IUsbStoragePlugin.ts packages/capacitor-plugin-usb-storage/src/UsbStoragePlugin.ts
```

**Step 2: Update type names and method names**

Replace content of `packages/capacitor-plugin-usb-storage/src/UsbStoragePlugin.ts`:

```typescript
export interface UsbDeviceInfo {
  deviceName: string;
  manufacturerName: string;
  productName: string;
  vendorId: number;
  productId: number;
}

export interface UsbDeviceFilter {
  vendorId: number;
  productId: number;
}

export interface UsbFileInfo {
  name: string;
  isDirectory: boolean;
}

export interface UsbStoragePlugin {
  getDevices(): Promise<{ devices: UsbDeviceInfo[] }>;
  requestPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  checkPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  readdir(options: UsbDeviceFilter & { path: string }): Promise<{ files: UsbFileInfo[] }>;
  read(options: UsbDeviceFilter & { path: string }): Promise<{ data: string | null }>;
}
```

**Step 3: Update index.ts**

Replace content of `packages/capacitor-plugin-usb-storage/src/index.ts`:

```typescript
// USB Storage
export * from "./UsbStoragePlugin";
export * from "./UsbStorage";
```

**Step 4: Commit**

```bash
git add -A packages/capacitor-plugin-usb-storage/src/UsbStoragePlugin.ts packages/capacitor-plugin-usb-storage/src/index.ts
git commit -m "refactor(usb-storage): rename interface file and types to Capacitor conventions"
```

---

### Task 12: capacitor-plugin-usb-storage — Update wrapper + web

**Files:**
- Modify: `packages/capacitor-plugin-usb-storage/src/UsbStorage.ts`
- Modify: `packages/capacitor-plugin-usb-storage/src/web/UsbStorageWeb.ts`

**Step 1: Rewrite UsbStorage.ts**

Replace full content of `packages/capacitor-plugin-usb-storage/src/UsbStorage.ts`:

```typescript
import { registerPlugin } from "@capacitor/core";
import type {
  UsbDeviceFilter,
  UsbDeviceInfo,
  UsbFileInfo,
  UsbStoragePlugin,
} from "./UsbStoragePlugin";
import type { Bytes } from "@simplysm/core-common";
import { bytesFromBase64 } from "@simplysm/core-common";

const usbStoragePlugin = registerPlugin<UsbStoragePlugin>("UsbStorage", {
  web: async () => {
    const { UsbStorageWeb } = await import("./web/UsbStorageWeb");
    return new UsbStorageWeb();
  },
});

/**
 * Plugin for interacting with USB storage devices
 * - Android: USB Mass Storage access via libaums library
 * - Browser: IndexedDB-based virtual USB storage emulation
 */
export abstract class UsbStorage {
  /**
   * Get list of connected USB devices
   * @returns Array of connected USB device info
   */
  static async getDevices(): Promise<UsbDeviceInfo[]> {
    const result = await usbStoragePlugin.getDevices();
    return result.devices;
  }

  /**
   * Request USB device access permission
   * @param filter vendorId and productId of the USB device to request permission for
   * @returns Whether permission was granted
   */
  static async requestPermissions(filter: UsbDeviceFilter): Promise<boolean> {
    const result = await usbStoragePlugin.requestPermissions(filter);
    return result.granted;
  }

  /**
   * Check if USB device access permission is granted
   * @param filter vendorId and productId of the USB device to check permission for
   * @returns Whether permission is held
   */
  static async checkPermissions(filter: UsbDeviceFilter): Promise<boolean> {
    const result = await usbStoragePlugin.checkPermissions(filter);
    return result.granted;
  }

  /**
   * Read directory contents from USB storage device
   * @param filter vendorId and productId of the target USB device
   * @param dirPath Directory path to read
   * @returns Array of file/folder info in the directory
   */
  static async readdir(filter: UsbDeviceFilter, dirPath: string): Promise<UsbFileInfo[]> {
    const result = await usbStoragePlugin.readdir({ ...filter, path: dirPath });
    return result.files;
  }

  /**
   * Read a file from USB storage device
   * @param filter vendorId and productId of the target USB device
   * @param filePath File path to read
   * @returns Bytes containing file data, or undefined
   */
  static async read(filter: UsbDeviceFilter, filePath: string): Promise<Bytes | undefined> {
    const result = await usbStoragePlugin.read({ ...filter, path: filePath });
    if (result.data == null) {
      return undefined;
    }
    return bytesFromBase64(result.data);
  }
}
```

**Step 2: Rewrite UsbStorageWeb.ts**

Replace full content of `packages/capacitor-plugin-usb-storage/src/web/UsbStorageWeb.ts`:

```typescript
import { WebPlugin } from "@capacitor/core";
import type {
  UsbDeviceFilter,
  UsbDeviceInfo,
  UsbFileInfo,
  UsbStoragePlugin,
} from "../UsbStoragePlugin";
import { VirtualUsbStorage } from "./VirtualUsbStorage";
import { bytesToBase64 } from "@simplysm/core-common";

export class UsbStorageWeb extends WebPlugin implements UsbStoragePlugin {
  private readonly _storage = new VirtualUsbStorage();

  async getDevices(): Promise<{ devices: UsbDeviceInfo[] }> {
    const devices = await this._storage.getDevices();
    return {
      devices: devices.map((d) => ({
        deviceName: d.deviceName,
        manufacturerName: d.manufacturerName,
        productName: d.productName,
        vendorId: d.vendorId,
        productId: d.productId,
      })),
    };
  }

  async requestPermissions(_options: UsbDeviceFilter): Promise<{ granted: boolean }> {
    return Promise.resolve({ granted: true });
  }

  async checkPermissions(_options: UsbDeviceFilter): Promise<{ granted: boolean }> {
    return Promise.resolve({ granted: true });
  }

  async readdir(options: UsbDeviceFilter & { path: string }): Promise<{ files: UsbFileInfo[] }> {
    const deviceKey = `${options.vendorId}:${options.productId}`;
    const devices = await this._storage.getDevices();
    const deviceExists = devices.some((d) => d.key === deviceKey);
    if (!deviceExists) {
      return { files: [] };
    }
    const entry = await this._storage.getEntry(deviceKey, options.path);
    if (!entry || entry.kind !== "dir") {
      return { files: [] };
    }
    const children = await this._storage.listChildren(deviceKey, options.path);
    return { files: children };
  }

  async read(options: UsbDeviceFilter & { path: string }): Promise<{ data: string | null }> {
    const deviceKey = `${options.vendorId}:${options.productId}`;
    const devices = await this._storage.getDevices();
    const deviceExists = devices.some((d) => d.key === deviceKey);
    if (!deviceExists) {
      return { data: null };
    }
    const entry = await this._storage.getEntry(deviceKey, options.path);
    if (!entry || entry.kind !== "file" || entry.dataBase64 == null) {
      return { data: null };
    }
    return { data: entry.dataBase64 };
  }

  /**
   * Add a virtual USB device. (For testing/development)
   */
  async addVirtualDevice(device: {
    vendorId: number;
    productId: number;
    deviceName: string;
    manufacturerName: string;
    productName: string;
  }): Promise<void> {
    await this._storage.addDevice(device);
  }

  /**
   * Add a file to a virtual USB device. (For testing/development)
   */
  async addVirtualFile(
    filter: UsbDeviceFilter,
    filePath: string,
    data: Uint8Array,
  ): Promise<void> {
    const deviceKey = `${filter.vendorId}:${filter.productId}`;
    const idx = filePath.lastIndexOf("/");
    const dir = idx === -1 ? "/" : filePath.substring(0, idx) || "/";
    await this._storage.ensureDir(deviceKey, dir);
    await this._storage.putEntry({
      deviceKey,
      path: filePath,
      kind: "file",
      dataBase64: bytesToBase64(data),
    });
  }

  /**
   * Add a directory to a virtual USB device. (For testing/development)
   */
  async addVirtualDirectory(filter: UsbDeviceFilter, dirPath: string): Promise<void> {
    const deviceKey = `${filter.vendorId}:${filter.productId}`;
    await this._storage.ensureDir(deviceKey, dirPath);
  }
}
```

**Step 3: Verify typecheck**

```bash
pnpm typecheck packages/capacitor-plugin-usb-storage
```

Expected: PASS

**Step 4: Commit**

```bash
git add packages/capacitor-plugin-usb-storage/src/
git commit -m "refactor(usb-storage): rename methods to Capacitor conventions"
```

---

### Task 13: capacitor-plugin-usb-storage — Update native Java

**Files:**
- Modify: `packages/capacitor-plugin-usb-storage/android/src/main/java/kr/co/simplysm/capacitor/usbstorage/UsbStoragePlugin.java`

**Step 1: Rename Java methods**

- `requestPermission` → `requestPermissions` (line 65)
- `hasPermission` → `checkPermissions` (line 123)

Also update log messages and internal variable references to match new method names.

**Step 2: Commit**

```bash
git add packages/capacitor-plugin-usb-storage/android/
git commit -m "refactor(usb-storage): rename native Java methods to Capacitor conventions"
```

---

### Task 14: Final verification

**Step 1: Typecheck all 4 packages**

```bash
pnpm typecheck packages/capacitor-plugin-file-system packages/capacitor-plugin-auto-update packages/capacitor-plugin-broadcast packages/capacitor-plugin-usb-storage
```

Expected: PASS for all packages

**Step 2: Lint all 4 packages**

```bash
pnpm lint packages/capacitor-plugin-file-system packages/capacitor-plugin-auto-update packages/capacitor-plugin-broadcast packages/capacitor-plugin-usb-storage
```

Expected: PASS (fix any lint issues if needed)

**Step 3: Search for remaining old names**

Verify no stale references remain:

```bash
grep -r "IFileSystemPlugin\|IFileInfo\|TStorage\|IApkInstallerPlugin\|IVersionInfo\|IBroadcastPlugin\|IBroadcastResult\|IUsbStoragePlugin\|IUsbDeviceInfo\|IUsbDeviceFilter\|IUsbFileInfo\|hasPermission\|requestPermission\|getFileUri\|readFileString\|readFileBytes\|addNewIntentListener\|onNewIntent\|hasPermissionManifest" packages/capacitor-plugin-*/src/ --include="*.ts"
```

Expected: No matches (all old names replaced)

**Step 4: Final commit (if any fixes needed)**

```bash
git add -A packages/capacitor-plugin-*/
git commit -m "refactor: fix remaining references from API naming standardization"
```
