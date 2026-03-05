# Capacitor Plugins Review Fixes Design

## Summary

Address 8 review findings across 4 capacitor-plugin-* packages: extract duplicated code to core-browser, simplify unnecessary complexity, fix convention violations, and unify API naming.

## Findings Addressed

| # | Severity | Finding | Package |
|---|----------|---------|---------|
| 1 | HIGH | IndexedDbStore duplicated (88 lines x 2) | file-system, usb-storage |
| 2 | MEDIUM | listChildren/ensureDir logic duplicated (~48 lines) | file-system, usb-storage |
| 3 | MEDIUM | getStoragePath switch redundant (24 lines -> 1 line) | file-system |
| 4 | WARNING | `readFile` vs `read` naming inconsistency | usb-storage |
| 5 | WARNING | `as unknown as` convention violation | auto-update |
| 6 | WARNING | Unnecessary `as BlobPart` cast | file-system |
| 7 | WARNING | Single-letter generic `<T>` violations (6 instances) | file-system, usb-storage |
| 8 | INFO | `IStoreConfig` interface I-prefix | file-system, usb-storage |

## Design

### Section 1: core-browser - Add IndexedDbStore + IndexedDbVirtualFs

**New file: `core-browser/src/utils/IndexedDbStore.ts`**

Move IndexedDbStore from capacitor plugins to core-browser. Convention fixes applied:
- `IStoreConfig` -> `StoreConfig` (remove I-prefix, finding #8)
- `<T>` -> `<TResult>`, `<TValue>`, `<TItem>` (descriptive generics, finding #7)

**New file: `core-browser/src/utils/IndexedDbVirtualFs.ts`**

Composition-based helper class encapsulating shared VirtualFS algorithms (finding #2):

```typescript
interface VirtualFsEntry {
  kind: "file" | "dir";
  dataBase64?: string;
}

class IndexedDbVirtualFs {
  constructor(db: IndexedDbStore, storeName: string, keyField: string)

  getEntry(fullKey: string): Promise<VirtualFsEntry | undefined>
  putEntry(fullKey: string, kind: "file" | "dir", dataBase64?: string): Promise<void>
  deleteByPrefix(keyPrefix: string): Promise<boolean>
  listChildren(prefix: string): Promise<{ name: string; isDirectory: boolean }[]>
  ensureDir(fullKeyBuilder: (path: string) => string, dirPath: string): Promise<void>
}
```

Key design decisions:
- `fullKey` parameter lets consumers handle their own key composition strategy
- `listChildren` takes a pre-built prefix string (consumer decides how to build it)
- `ensureDir` takes a `fullKeyBuilder` function for segment-by-segment directory creation
- `VirtualFsEntry` contains only shared fields (`kind`, `dataBase64`)

**Update: `core-browser/src/index.ts`**

Add exports:
```typescript
export * from "./utils/IndexedDbStore";
export * from "./utils/IndexedDbVirtualFs";
```

### Section 2: capacitor-plugin-file-system Refactoring

**package.json**: Add `@simplysm/core-browser` dependency

**VirtualFileSystem.ts**: Refactor to use composition
- Import `IndexedDbStore`, `IndexedDbVirtualFs` from `@simplysm/core-browser`
- Create `IndexedDbVirtualFs` instance with store name "entries", key field "path"
- Delegate `getEntry`, `putEntry`, `deleteByPrefix`, `listChildren`, `ensureDir` to `_vfs`
- Key strategy: identity (`path -> path`), prefix: `dirPath + "/"`

**FileSystemWeb.ts**: Simplify and fix casts
- `getStoragePath`: Replace 7-case switch with `const storagePath = base + "/" + options.type` (finding #3)
- `getUri`: Remove `as BlobPart` cast — `Uint8Array` is already a valid `BlobPart` (finding #6)

**Delete**: `src/web/IndexedDbStore.ts` (moved to core-browser)

### Section 3: capacitor-plugin-usb-storage Refactoring

**package.json**: Add `@simplysm/core-browser` dependency

**VirtualUsbStorage.ts**: Refactor to use composition
- Import `IndexedDbStore`, `IndexedDbVirtualFs` from `@simplysm/core-browser`
- Create `IndexedDbVirtualFs` instance with store name "files", key field "fullKey"
- Key strategy: `(path) -> deviceKey + ":" + path`
- Device management (`addDevice`, `getDevices`) remains in VirtualUsbStorage (separate "devices" store)

**API rename: `read` -> `readFile` (finding #4)**

All layers must be renamed in sync:
- `UsbStoragePlugin.ts:24`: `read(...)` -> `readFile(...)`
- `UsbStorage.ts:70`: `static async read(...)` -> `static async readFile(...)`
- `UsbStorageWeb.ts:50`: `async read(...)` -> `async readFile(...)`
- `UsbStoragePlugin.java:200`: `public void read(PluginCall call)` -> `public void readFile(PluginCall call)` + update error messages and log tags

**Delete**: `src/web/IndexedDbStore.ts` (moved to core-browser)

### Section 4: capacitor-plugin-auto-update Cast Fix

**ApkInstallerWeb.ts:22** (finding #5):
- Remove `as unknown as` cast on `import.meta`
- Use `import.meta.env?.["__VER__"]` directly
- If Vite types are not available in tsconfig, add `src/env.d.ts`:
  ```typescript
  interface ImportMetaEnv { __VER__?: string }
  interface ImportMeta { readonly env: ImportMetaEnv }
  ```

## Files Changed Summary

| Action | File |
|--------|------|
| NEW | `core-browser/src/utils/IndexedDbStore.ts` |
| NEW | `core-browser/src/utils/IndexedDbVirtualFs.ts` |
| EDIT | `core-browser/src/index.ts` |
| EDIT | `capacitor-plugin-file-system/package.json` |
| EDIT | `capacitor-plugin-file-system/src/web/VirtualFileSystem.ts` |
| EDIT | `capacitor-plugin-file-system/src/web/FileSystemWeb.ts` |
| DELETE | `capacitor-plugin-file-system/src/web/IndexedDbStore.ts` |
| EDIT | `capacitor-plugin-usb-storage/package.json` |
| EDIT | `capacitor-plugin-usb-storage/src/UsbStoragePlugin.ts` |
| EDIT | `capacitor-plugin-usb-storage/src/UsbStorage.ts` |
| EDIT | `capacitor-plugin-usb-storage/src/web/UsbStorageWeb.ts` |
| EDIT | `capacitor-plugin-usb-storage/src/web/VirtualUsbStorage.ts` |
| DELETE | `capacitor-plugin-usb-storage/src/web/IndexedDbStore.ts` |
| EDIT | `capacitor-plugin-usb-storage/android/.../UsbStoragePlugin.java` |
| EDIT | `capacitor-plugin-auto-update/src/web/ApkInstallerWeb.ts` |
| NEW? | `capacitor-plugin-auto-update/src/env.d.ts` (if needed) |
