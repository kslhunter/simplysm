# Capacitor Plugin Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 13 issues (P0-P3) found in the capacitor-plugin-\* code review.

**Architecture:** 4 Capacitor plugins (auto-update, broadcast, file-system, usb-storage) each follow a 3-layer pattern: TypeScript interface → TypeScript facade (abstract class + static methods) → Android Java implementation + web fallback. Changes span Java, TypeScript, and IndexedDB utility code.

**Tech Stack:** TypeScript, Java (Android), Capacitor 7, IndexedDB (web fallbacks), semver

**Worktree:** `.worktrees/capacitor-plugin-review-fixes`

**Base path:** All file paths below are relative to the worktree root.

---

## Task 1: UsbStoragePlugin — Fix resource leak and add OOM guard

**Issues:** #1 (P0 resource leak), #3 (P1 OOM risk), #4 (P1 repeated init)

**Files:**

- Modify: `packages/capacitor-plugin-usb-storage/android/src/main/java/kr/co/simplysm/capacitor/usbstorage/UsbStoragePlugin.java`

**Step 1: Fix `readdir()` — add try-finally with device.close()**

In `readdir()` (line 156-189), wrap `device.init()` usage with try-finally:

```java
@PluginMethod
public void readdir(PluginCall call) {
    Integer vendorId = call.getInt("vendorId");
    Integer productId = call.getInt("productId");
    String path = call.getString("path");

    if (vendorId == null || productId == null || path == null) {
        call.reject("vendorId, productId, and path are required");
        return;
    }

    try {
        UsbMassStorageDevice device = getDevice(vendorId, productId);

        UsbManager usbManager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
        if (!usbManager.hasPermission(device.getUsbDevice())) {
            call.reject("No permission for this USB device");
            return;
        }

        device.init();
        try {
            FileSystem fs = device.getPartitions().get(0).getFileSystem();
            UsbFile root = fs.getRootDirectory();
            UsbFile dir = root.search(path);

            if (dir == null || !dir.isDirectory()) {
                call.reject("Directory not found: " + path);
                return;
            }

            UsbFile[] files = dir.listFiles();

            JSArray result = new JSArray();
            for (UsbFile file : files) {
                result.put(file.getName());
            }

            JSObject ret = new JSObject();
            ret.put("files", result);
            call.resolve(ret);
        } finally {
            device.close();
        }
    } catch (Exception e) {
        Log.e(TAG, "readdir failed", e);
        call.reject("readdir failed: " + e.getMessage());
    }
}
```

**Step 2: Fix `read()` — add try-finally with device.close() and file size guard**

In `read()` (line 192-249), add try-finally and a 100MB size limit:

```java
private static final long MAX_FILE_SIZE = 100L * 1024 * 1024; // 100MB

@PluginMethod
public void read(PluginCall call) {
    Integer vendorId = call.getInt("vendorId");
    Integer productId = call.getInt("productId");
    String path = call.getString("path");

    if (vendorId == null || productId == null || path == null) {
        call.reject("vendorId, productId, and path are required");
        return;
    }

    try {
        UsbMassStorageDevice device = getDevice(vendorId, productId);

        UsbManager usbManager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
        if (!usbManager.hasPermission(device.getUsbDevice())) {
            call.reject("No permission for this USB device");
            return;
        }

        device.init();
        try {
            FileSystem fs = device.getPartitions().get(0).getFileSystem();
            UsbFile root = fs.getRootDirectory();
            UsbFile usbFile = root.search(path);

            if (usbFile == null) {
                JSObject ret = new JSObject();
                ret.put("data", (String) null);
                call.resolve(ret);
                return;
            }

            if (usbFile.isDirectory()) {
                call.reject("Path is a directory: " + path);
                return;
            }

            long fileLength = usbFile.getLength();
            if (fileLength > MAX_FILE_SIZE) {
                call.reject("File too large: " + fileLength + " bytes (max " + MAX_FILE_SIZE + ")");
                return;
            }

            ByteBuffer buffer = ByteBuffer.allocate((int) fileLength);

            UsbFileInputStream inputStream = new UsbFileInputStream(usbFile);
            byte[] tmpBuf = new byte[fs.getChunkSize()];
            int count;
            while ((count = inputStream.read(tmpBuf)) != -1) {
                buffer.put(tmpBuf, 0, count);
            }
            inputStream.close();

            String base64Data = Base64.encodeToString(buffer.array(), Base64.NO_WRAP);

            JSObject ret = new JSObject();
            ret.put("data", base64Data);
            call.resolve(ret);
        } finally {
            device.close();
        }
    } catch (Exception e) {
        Log.e(TAG, "read failed", e);
        call.reject("read failed: " + e.getMessage());
    }
}
```

**Step 3: Commit**

```
fix(capacitor-plugin-usb-storage): add device.close() and file size guard
```

---

## Task 2: FileSystemPlugin — Fix requestPermission for Android 10-

**Issues:** #2 (P0 missing permission request)

**Files:**

- Modify: `packages/capacitor-plugin-file-system/android/src/main/java/kr/co/simplysm/capacitor/filesystem/FileSystemPlugin.java:47-57`

**Step 1: Add runtime permission request for pre-Android 11**

Add import and modify `requestPermission()`:

```java
import androidx.core.app.ActivityCompat;
```

```java
private static final int PERMISSION_REQUEST_CODE = 1001;

@PluginMethod
public void requestPermission(PluginCall call) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        if (!Environment.isExternalStorageManager()) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
        }
    } else {
        boolean readGranted = ContextCompat.checkSelfPermission(getContext(),
            Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        boolean writeGranted = ContextCompat.checkSelfPermission(getContext(),
            Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;

        if (!readGranted || !writeGranted) {
            ActivityCompat.requestPermissions(getActivity(),
                new String[]{
                    Manifest.permission.READ_EXTERNAL_STORAGE,
                    Manifest.permission.WRITE_EXTERNAL_STORAGE
                },
                PERMISSION_REQUEST_CODE);
        }
    }
    call.resolve();
}
```

**Step 2: Commit**

```
fix(capacitor-plugin-file-system): add runtime permission request for Android 10-
```

---

## Task 3: DX — Rename checkPermission to hasPermission and align mkdirs/mkdir

**Issues:** #7 (P2 naming inconsistency), #9 (P2 method name mismatch)

**Files:**

- Modify: `packages/capacitor-plugin-file-system/src/IFileSystemPlugin.ts:16` — `checkPermission` → `hasPermission`
- Modify: `packages/capacitor-plugin-file-system/src/FileSystem.ts:23` — `checkPermission` → `hasPermission`
- Modify: `packages/capacitor-plugin-file-system/src/FileSystem.ts:115` — `mkdirs` → `mkdir`
- Modify: `packages/capacitor-plugin-file-system/src/web/FileSystemWeb.ts:11` — `checkPermission` → `hasPermission`
- Modify: `packages/capacitor-plugin-file-system/android/.../FileSystemPlugin.java:33` — method rename `checkPermission` → `hasPermission`

**Step 1: Rename in IFileSystemPlugin.ts**

```typescript
// line 16: change checkPermission to hasPermission
hasPermission(): Promise<{ granted: boolean }>;
```

**Step 2: Rename in FileSystem.ts**

```typescript
// line 23: rename method
static async hasPermission(): Promise<boolean> {
    const result = await FileSystemPlugin.hasPermission();
    return result.granted;
}

// line 115: rename mkdirs to mkdir
static async mkdir(targetPath: string): Promise<void> {
    await FileSystemPlugin.mkdir({ path: targetPath });
}
```

**Step 3: Rename in FileSystemWeb.ts**

```typescript
// line 11: rename method
async hasPermission(): Promise<{ granted: boolean }> {
    return Promise.resolve({ granted: true });
}
```

**Step 4: Rename in FileSystemPlugin.java**

```java
// line 33: rename method
@PluginMethod
public void hasPermission(PluginCall call) {
    // ... same body as checkPermission
}
```

**Step 5: Update AutoUpdate.ts if it references FileSystem.checkPermission or FileSystem.mkdirs**

Check `AutoUpdate.ts` — it doesn't call `checkPermission()` or `mkdirs()` directly (those are on FileSystem, and AutoUpdate uses different paths). No changes needed there.

**Step 6: Run typecheck**

```bash
pnpm typecheck packages/capacitor-plugin-file-system
```

**Step 7: Commit**

```
refactor(capacitor-plugin-file-system): rename checkPermission to hasPermission and mkdirs to mkdir
```

---

## Task 4: DX — Unify error messages to English

**Issues:** #10 (P2 mixed language)

**Files:**

- Modify: `packages/capacitor-plugin-usb-storage/android/.../UsbStoragePlugin.java` — 3 Korean messages
- Modify: `packages/capacitor-plugin-auto-update/src/AutoUpdate.ts` — Korean UI messages are intentional (user-facing), skip those

**Step 1: Fix UsbStoragePlugin.java error messages**

```java
// line 161: "USB 장치에 대한 접근 권한이 없습니다." → "No permission for this USB device"
// line 208: same change
// line 226: "해당 경로는 폴더입니다." → "Path is a directory: " + path
// line 259: "USB 장치를 찾을 수 없습니다." → "USB device not found: vendorId=" + vendorId + ", productId=" + productId
```

Note: `AutoUpdate.ts` Korean messages (`안드로이드만 지원합니다`, `설치권한이 설정되어야합니다` etc.) are **user-facing HTML** shown in the app UI, so they should stay in Korean. Only developer-facing error messages (log/reject) should be in English.

**Step 2: Fix getDevice() to accept vendorId/productId for error message**

```java
private UsbMassStorageDevice getDevice(int vendorId, int productId) throws Exception {
    UsbMassStorageDevice[] devices = UsbMassStorageDevice.getMassStorageDevices(getContext());
    Optional<UsbMassStorageDevice> optDevice = Arrays.stream(devices).filter((tmpDevice) -> {
        UsbDevice tmpUsbDevice = tmpDevice.getUsbDevice();
        return tmpUsbDevice.getVendorId() == vendorId && tmpUsbDevice.getProductId() == productId;
    }).findFirst();

    if (!optDevice.isPresent()) {
        throw new Exception("USB device not found: vendorId=" + vendorId + ", productId=" + productId);
    }
    return optDevice.get();
}
```

**Step 3: Commit**

```
fix(capacitor-plugin-usb-storage): unify error messages to English
```

---

## Task 5: AutoUpdate — Use semver comparison instead of equality

**Issues:** #5 (P1 version comparison)

**Files:**

- Modify: `packages/capacitor-plugin-auto-update/src/AutoUpdate.ts:154,218`

**Step 1: Fix `run()` version comparison**

```typescript
// line 150-156: replace equality with semver comparison
const currentVersionInfo = await ApkInstaller.getVersionInfo();

// Only update if server version is newer
if (!semver.valid(currentVersionInfo.versionName) || !semver.valid(serverVersionInfo.version)) {
  // eslint-disable-next-line no-console
  console.log("Invalid semver version, skipping update check");
  return;
}
if (!semver.gt(serverVersionInfo.version, currentVersionInfo.versionName)) {
  return;
}
```

**Step 2: Fix `runByExternalStorage()` version comparison**

```typescript
// line 214-220: replace equality with semver comparison
const currentVersionInfo = await ApkInstaller.getVersionInfo();

if (!semver.valid(currentVersionInfo.versionName) || !semver.valid(latestVersion)) {
  // eslint-disable-next-line no-console
  console.log("Invalid semver version, skipping update check");
  return;
}
if (!semver.gt(latestVersion, currentVersionInfo.versionName)) {
  return;
}
```

**Step 3: Run typecheck**

```bash
pnpm typecheck packages/capacitor-plugin-auto-update
```

**Step 4: Commit**

```
fix(capacitor-plugin-auto-update): use semver.gt() instead of equality for version comparison
```

---

## Task 6: Broadcast — Filter initial resolve in subscribe callback

**Issues:** #6 (P1 callback receives spurious initial resolve)

**Files:**

- Modify: `packages/capacitor-plugin-broadcast/src/Broadcast.ts:32-40`

**Step 1: Filter out initial resolve (no action field) in callback wrapper**

```typescript
static async subscribe(
    filters: string[],
    callback: (result: IBroadcastResult) => void,
): Promise<() => Promise<void>> {
    const { id } = await BroadcastPlugin.subscribe({ filters }, (result) => {
        // Filter out the initial resolve that only contains { id }
        if (result.action != null) {
            callback(result);
        }
    });
    return async () => {
        await BroadcastPlugin.unsubscribe({ id });
    };
}
```

**Step 2: Run typecheck**

```bash
pnpm typecheck packages/capacitor-plugin-broadcast
```

**Step 3: Commit**

```
fix(capacitor-plugin-broadcast): filter initial resolve from subscribe callback
```

---

## Task 7: AutoUpdate — Extract duplicated CSS constant

**Issues:** #12 (P3 CSS duplication)

**Files:**

- Modify: `packages/capacitor-plugin-auto-update/src/AutoUpdate.ts`

**Step 1: Extract common button CSS**

Add a private static constant at the top of the class:

```typescript
export abstract class AutoUpdate {
  private static readonly _BUTTON_CSS = `
    all: unset;
    color: blue;
    width: 100%;
    padding: 10px;
    line-height: 1.5em;
    font-size: 20px;
    position: fixed;
    bottom: 0;
    left: 0;
    border-top: 1px solid lightgrey;
  `;

  private static readonly _BUTTON_ACTIVE_CSS = `
    background: lightgrey;
  `;
```

**Step 2: Replace 3 duplicated CSS blocks with the constant**

In `_throwAboutReinstall()`:

```typescript
const downloadHtml =
  targetHref != null
    ? html`
        <style>
          ._button { ${this._BUTTON_CSS} }
          ._button:active { ${this._BUTTON_ACTIVE_CSS} }
        </style>
        <a class="_button" href="intent://${targetHref.replace(/^https?:\/\//, "")}#Intent;scheme=http;end">다운로드</a>
      `
    : "";
```

In `_checkPermission()`:

```typescript
log(html`
  설치권한이 설정되어야합니다.
  <style>
    button { ${this._BUTTON_CSS} }
    button:active { ${this._BUTTON_ACTIVE_CSS} }
  </style>
  <button onclick="location.reload()">재시도</button>
`);
```

In `_installApk()`:

```typescript
log(html`
  최신버전을 설치한 후 재시작하세요.
  <style>
    button { ${this._BUTTON_CSS} }
    button:active { ${this._BUTTON_ACTIVE_CSS} }
  </style>
  <button onclick="location.reload()">재시도</button>
`);
```

**Step 3: Run typecheck**

```bash
pnpm typecheck packages/capacitor-plugin-auto-update
```

**Step 4: Commit**

```
refactor(capacitor-plugin-auto-update): extract duplicated button CSS into constant
```

---

## Task 8: Web stubs — Remove unnecessary await Promise.resolve()

**Issues:** #13 (P3 readability)

**Files:**

- Modify: `packages/capacitor-plugin-auto-update/src/web/ApkInstallerWeb.ts:7,17`
- Modify: `packages/capacitor-plugin-broadcast/src/web/BroadcastWeb.ts:27`

**Step 1: Clean up ApkInstallerWeb.ts**

```typescript
async install(_options: { uri: string }): Promise<void> {
    alert("[ApkInstaller] 웹 환경에서는 APK 설치를 지원하지 않습니다.");
}

async requestPermission(): Promise<void> {
    // 웹에서는 no-op
}

async hasPermission(): Promise<{ granted: boolean }> {
    return { granted: true };
}

async hasPermissionManifest(): Promise<{ declared: boolean }> {
    return { declared: true };
}

async getVersionInfo(): Promise<IVersionInfo> {
    return {
        versionName: (import.meta as unknown as { env?: Record<string, string> }).env?.["__VER__"] ?? "0.0.0",
        versionCode: "0",
    };
}
```

**Step 2: Clean up BroadcastWeb.ts**

```typescript
async send(_options: { action: string; extras?: Record<string, unknown> }): Promise<void> {
    BroadcastWeb._warn();
}

async subscribe(
    _options: { filters: string[] },
    _callback: (result: IBroadcastResult) => void,
): Promise<{ id: string }> {
    BroadcastWeb._warn();
    return { id: "web-stub" };
}

async getLaunchIntent(): Promise<IBroadcastResult> {
    return {};
}
```

**Step 3: Run typecheck**

```bash
pnpm typecheck packages/capacitor-plugin-auto-update packages/capacitor-plugin-broadcast
```

**Step 4: Commit**

```
refactor(capacitor-plugins): remove unnecessary await Promise.resolve() in web stubs
```

---

## Task 9: UsbStorage readdir — Align return type with FileSystem

**Issues:** #8 (P2 inconsistent return type)

**Files:**

- Modify: `packages/capacitor-plugin-usb-storage/src/IUsbStoragePlugin.ts:18` — change `files: string[]` to `files: IUsbFileInfo[]`
- Modify: `packages/capacitor-plugin-usb-storage/src/IUsbStoragePlugin.ts` — add `IUsbFileInfo` interface
- Modify: `packages/capacitor-plugin-usb-storage/src/UsbStorage.ts:54` — update return type
- Modify: `packages/capacitor-plugin-usb-storage/src/web/UsbStorageWeb.ts:30-43` — update readdir
- Modify: `packages/capacitor-plugin-usb-storage/src/web/VirtualUsbStorage.ts:116` — update listChildren
- Modify: `packages/capacitor-plugin-usb-storage/android/.../UsbStoragePlugin.java:176-181` — include isDirectory in result
- Modify: `packages/capacitor-plugin-usb-storage/src/index.ts` — export new type

**Step 1: Add IUsbFileInfo interface to IUsbStoragePlugin.ts**

```typescript
export interface IUsbFileInfo {
  name: string;
  isDirectory: boolean;
}
```

**Step 2: Update IUsbStoragePlugin interface**

```typescript
readdir(options: IUsbDeviceFilter & { path: string }): Promise<{ files: IUsbFileInfo[] }>;
```

**Step 3: Update UsbStorage.ts facade**

```typescript
import type { IUsbDeviceFilter, IUsbDeviceInfo, IUsbFileInfo, IUsbStoragePlugin } from "./IUsbStoragePlugin";

static async readdir(filter: IUsbDeviceFilter, dirPath: string): Promise<IUsbFileInfo[]> {
    const result = await UsbStoragePlugin.readdir({ ...filter, path: dirPath });
    return result.files;
}
```

**Step 4: Update UsbStoragePlugin.java readdir to include isDirectory**

```java
JSArray result = new JSArray();
for (UsbFile file : files) {
    JSObject info = new JSObject();
    info.put("name", file.getName());
    info.put("isDirectory", file.isDirectory());
    result.put(info);
}
```

**Step 5: Update UsbStorageWeb.ts**

```typescript
async readdir(options: IUsbDeviceFilter & { path: string }): Promise<{ files: IUsbFileInfo[] }> {
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
```

Update VirtualUsbStorage.listChildren to return `{ name, isDirectory }[]`:

```typescript
async listChildren(deviceKey: string, dirPath: string): Promise<{ name: string; isDirectory: boolean }[]> {
    const prefix = `${deviceKey}:${dirPath === "/" ? "/" : dirPath + "/"}`;
    return this._withStore(this._FILES_STORE, "readonly", async (store) => {
        return new Promise((resolve, reject) => {
            const req = store.openCursor();
            const map = new Map<string, boolean>();
            req.onsuccess = () => {
                const cursor = req.result;
                if (!cursor) {
                    resolve(Array.from(map.entries()).map(([name, isDirectory]) => ({ name, isDirectory })));
                    return;
                }
                const key = String(cursor.key);
                if (key.startsWith(prefix)) {
                    const rest = key.slice(prefix.length);
                    if (rest) {
                        const segments = rest.split("/").filter(Boolean);
                        if (segments.length > 0) {
                            const firstName = segments[0];
                            if (!map.has(firstName)) {
                                const isDir = segments.length > 1 || (cursor.value as VirtualEntry).kind === "dir";
                                map.set(firstName, isDir);
                            }
                        }
                    }
                }
                cursor.continue();
            };
            req.onerror = () => reject(req.error);
        });
    });
}
```

**Step 6: Run typecheck**

```bash
pnpm typecheck packages/capacitor-plugin-usb-storage
```

**Step 7: Commit**

```
refactor(capacitor-plugin-usb-storage): align readdir return type with file-system plugin
```

---

## Task 10: Extract common IndexedDB utility from VirtualFS/VirtualUsbStorage

**Issues:** #11 (P3 duplication)

**Files:**

- Create: `packages/capacitor-plugin-file-system/src/web/IndexedDbStore.ts`
- Modify: `packages/capacitor-plugin-file-system/src/web/VirtualFileSystem.ts`
- Modify: `packages/capacitor-plugin-usb-storage/src/web/VirtualUsbStorage.ts`

**Step 1: Create IndexedDbStore utility**

```typescript
export class IndexedDbStore {
  constructor(
    private readonly _dbName: string,
    private readonly _dbVersion: number,
    private readonly _storeConfigs: { name: string; keyPath: string }[],
  ) {}

  async open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this._dbName, this._dbVersion);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const config of this._storeConfigs) {
          if (!db.objectStoreNames.contains(config.name)) {
            db.createObjectStore(config.name, { keyPath: config.keyPath });
          }
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error("Database blocked by another connection"));
    });
  }

  async withStore<T>(
    storeName: string,
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let result: T;
      Promise.resolve(fn(store))
        .then((r) => {
          result = r;
        })
        .catch((err) => {
          db.close();
          reject(err);
        });
      tx.oncomplete = () => {
        db.close();
        resolve(result);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }

  async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    return this.withStore(storeName, "readonly", async (store) => {
      return new Promise((resolve, reject) => {
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    });
  }

  async put<T>(storeName: string, value: T): Promise<void> {
    return this.withStore(storeName, "readwrite", async (store) => {
      return new Promise((resolve, reject) => {
        const req = store.put(value);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    return this.withStore(storeName, "readonly", async (store) => {
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    });
  }
}
```

**Step 2: Refactor VirtualFileSystem to use IndexedDbStore**

Replace `_openDb()`, `_withStore()`, `getEntry()`, `putEntry()` with calls to `IndexedDbStore`.

**Step 3: Copy IndexedDbStore to usb-storage package (or import if shared dependency exists)**

Since these are separate packages, copy `IndexedDbStore.ts` to `packages/capacitor-plugin-usb-storage/src/web/IndexedDbStore.ts` as well. (They're independent packages without cross-dependency for web fallbacks.)

**Step 4: Refactor VirtualUsbStorage to use IndexedDbStore**

Replace `_openDb()`, `_withStore()`, `addDevice()`, `getDevices()`, `getEntry()`, `putEntry()` with calls to `IndexedDbStore`.

**Step 5: Run typecheck**

```bash
pnpm typecheck packages/capacitor-plugin-file-system packages/capacitor-plugin-usb-storage
```

**Step 6: Commit**

```
refactor(capacitor-plugins): extract common IndexedDbStore utility from virtual storages
```

---

## Final Step: Run full typecheck

```bash
pnpm typecheck packages/capacitor-plugin-auto-update packages/capacitor-plugin-broadcast packages/capacitor-plugin-file-system packages/capacitor-plugin-usb-storage
```

Verify no type errors across all 4 plugins.
