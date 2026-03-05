# Capacitor Plugin API Naming Standardization

## Goal

Align 4 `capacitor-plugin-*` packages' public API names with Capacitor ecosystem conventions, based on comparative analysis against official Capacitor plugins (@capacitor/filesystem, @capacitor/camera, @capacitor/app) and community plugins (@capawesome/capacitor-live-update).

## Approach

**Pragmatic Standardization (Approach B):**
- Rename methods/types to match Capacitor conventions
- Keep Broadcast `subscribe` as-is (domain-specific BroadcastReceiver operation)
- Wrapper classes maintain simplified return types (boolean instead of PermissionStatus objects)

## Scope

- TypeScript source files (plugin interfaces, wrapper classes, web implementations)
- Native Android/iOS code (method names, event names)
- File renames for I-prefixed interface files
- No external consumers — breaking changes are safe

## Changes by Package

### 1. capacitor-plugin-file-system

#### Type/Interface Renames
| Current File | New File |
|---|---|
| `IFileSystemPlugin.ts` | `FileSystemPlugin.ts` |

| Current Name | New Name |
|---|---|
| `IFileSystemPlugin` | `FileSystemPlugin` |
| `IFileInfo` | `FileInfo` |
| `TStorage` | `StorageType` |

#### Method Renames (Plugin + Wrapper + Native)
| Current | New |
|---|---|
| `hasPermission()` | `checkPermissions()` |
| `requestPermission()` | `requestPermissions()` |
| `getFileUri()` | `getUri()` |

#### Method Merge (Wrapper only)
| Current | New |
|---|---|
| `readFileString(filePath)` | `readFile(filePath): Promise<Bytes>` (default: bytes) |
| `readFileBytes(filePath)` | `readFile(filePath, "utf8"): Promise<string>` (with encoding) |

Plugin interface `readFile` is already a single method — no change needed there.

### 2. capacitor-plugin-auto-update

#### Type/Interface Renames
| Current File | New File |
|---|---|
| `IApkInstallerPlugin.ts` | `ApkInstallerPlugin.ts` |

| Current Name | New Name |
|---|---|
| `IApkInstallerPlugin` | `ApkInstallerPlugin` |
| `IVersionInfo` | `VersionInfo` |

#### Method Renames (Plugin + Wrapper + Native)
| Current | New |
|---|---|
| `hasPermission()` | `checkPermissions()` |
| `requestPermission()` | `requestPermissions()` |

#### Method Integration (Plugin + Wrapper + Native)
- `hasPermissionManifest()` removed as separate method
- Integrated into `checkPermissions()` return value:
  - Plugin: `checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>`
  - Wrapper: `checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>`

#### Cross-package Import Updates
- `IFileInfo` -> `FileInfo`, `TStorage` -> `StorageType` in `AutoUpdate.ts`

### 3. capacitor-plugin-broadcast

#### Type/Interface Renames
| Current File | New File |
|---|---|
| `IBroadcastPlugin.ts` | `BroadcastPlugin.ts` |

| Current Name | New Name |
|---|---|
| `IBroadcastPlugin` | `BroadcastPlugin` |
| `IBroadcastResult` | `BroadcastResult` |

#### Event Name Change (Plugin + Native)
| Current | New |
|---|---|
| `"onNewIntent"` | `"newIntent"` |

#### Listener Pattern Change
| Layer | Current | New |
|---|---|---|
| Wrapper | `addNewIntentListener(callback)` | `addListener('newIntent', callback)` |
| Plugin + Wrapper | *(missing)* | `removeAllListeners(): Promise<void>` (new) |

#### Preserved Methods (no change)
- `subscribe(filters, callback)` — BroadcastReceiver registration (domain-specific)
- `unsubscribeAll()` — BroadcastReceiver unregistration (different from removeAllListeners)
- `send(options)` — broadcast sending
- `getLaunchIntent()` — launch intent retrieval

### 4. capacitor-plugin-usb-storage

#### Type/Interface Renames
| Current File | New File |
|---|---|
| `IUsbStoragePlugin.ts` | `UsbStoragePlugin.ts` |

| Current Name | New Name |
|---|---|
| `IUsbStoragePlugin` | `UsbStoragePlugin` |
| `IUsbDeviceInfo` | `UsbDeviceInfo` |
| `IUsbDeviceFilter` | `UsbDeviceFilter` |
| `IUsbFileInfo` | `UsbFileInfo` |

#### Method Renames (Plugin + Wrapper + Native)
| Current | New |
|---|---|
| `hasPermission(options)` | `checkPermissions(options)` |
| `requestPermission(options)` | `requestPermissions(options)` |

## Design Decisions

1. **Broadcast `subscribe` preserved** — BroadcastReceiver registration is a domain-specific Android operation, not a Capacitor event listener. Splitting into `register` + `addListener` would reduce usability.
2. **`unsubscribeAll()` and `removeAllListeners()` coexist** — They serve different purposes: receiver unregistration vs event listener removal.
3. **Wrapper returns simplified types** — `checkPermissions()` returns `boolean` (file-system, usb-storage) or `{ granted, manifest }` (auto-update) instead of Capacitor's full `PermissionStatus` object.
4. **`readFile` default returns Bytes** — No encoding = binary read. `encoding: "utf8"` = text read. The base64 encoding is an internal bridge detail, not exposed to users.
5. **`remove()` kept as-is** — Handles both files and directories (like `rm -rf`), so `deleteFile` would be inaccurate.
6. **`getLaunchIntent()` kept as-is** — Returns Android Intent data (action + extras), not a URL. `getLaunchUrl()` would lose semantic accuracy.
7. **`extras` kept as-is** — Broadcast plugin is an Android-specific raw-level package; Android Intent terminology is appropriate.
