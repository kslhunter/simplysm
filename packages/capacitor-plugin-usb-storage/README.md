# @simplysm/capacitor-plugin-usb-storage

Capacitor plugin for accessing USB mass storage devices on Android.

- **Android**: USB Mass Storage access via the libaums library
- **Browser**: IndexedDB-based virtual USB storage emulation for development

## Installation

```bash
npm install @simplysm/capacitor-plugin-usb-storage
```

## API Overview

### Interfaces

| API | Type | Description |
|-----|------|-------------|
| `UsbDeviceInfo` | Interface | Metadata about a connected USB mass storage device |
| `UsbDeviceFilter` | Interface | Vendor/product ID pair used to target a specific USB device |
| `UsbFileInfo` | Interface | File entry metadata from a USB storage directory listing |
| `UsbStoragePlugin` | Interface | Native plugin interface for USB storage operations |

### Classes

| API | Type | Description |
|-----|------|-------------|
| `UsbStorage` | Class | Static API for USB mass storage access |

## `UsbDeviceInfo`

Metadata about a connected USB mass storage device.

```typescript
interface UsbDeviceInfo {
  deviceName: string;
  manufacturerName: string;
  productName: string;
  vendorId: number;
  productId: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `deviceName` | `string` | System-assigned device name |
| `manufacturerName` | `string` | USB device manufacturer name |
| `productName` | `string` | USB device product name |
| `vendorId` | `number` | USB vendor ID |
| `productId` | `number` | USB product ID |

## `UsbDeviceFilter`

Identifies a specific USB device by its vendor and product IDs. Used as a parameter for all device-specific operations.

```typescript
interface UsbDeviceFilter {
  vendorId: number;
  productId: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `vendorId` | `number` | USB vendor ID of the target device |
| `productId` | `number` | USB product ID of the target device |

## `UsbFileInfo`

Metadata for a single file or directory entry on a USB storage device.

```typescript
interface UsbFileInfo {
  name: string;
  isDirectory: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Name of the file or directory |
| `isDirectory` | `boolean` | `true` if the entry is a directory |

## `UsbStoragePlugin`

Native plugin interface for USB storage operations. Use the `UsbStorage` class for a simplified API.

```typescript
interface UsbStoragePlugin {
  getDevices(): Promise<{ devices: UsbDeviceInfo[] }>;
  requestPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  checkPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  readdir(options: UsbDeviceFilter & { path: string }): Promise<{ files: UsbFileInfo[] }>;
  readFile(options: UsbDeviceFilter & { path: string }): Promise<{ data: string | null }>;
}
```

| Method | Signature | Description |
|--------|-----------|-------------|
| `getDevices` | `() => Promise<{ devices: UsbDeviceInfo[] }>` | List all connected USB mass storage devices |
| `requestPermissions` | `(options: UsbDeviceFilter) => Promise<{ granted: boolean }>` | Request permission to access a specific USB device |
| `checkPermissions` | `(options: UsbDeviceFilter) => Promise<{ granted: boolean }>` | Check if permission is granted for a specific USB device |
| `readdir` | `(options: UsbDeviceFilter & { path: string }) => Promise<{ files: UsbFileInfo[] }>` | List files in a directory on the USB device |
| `readFile` | `(options: UsbDeviceFilter & { path: string }) => Promise<{ data: string \| null }>` | Read a file from the USB device as a base64 string |

## `UsbStorage`

Abstract class with static methods for USB storage operations. On Android it uses the libaums library for direct USB communication. On the browser it falls back to IndexedDB-based virtual USB storage emulation.

```typescript
abstract class UsbStorage {
  static async getDevices(): Promise<UsbDeviceInfo[]>;
  static async requestPermissions(filter: UsbDeviceFilter): Promise<boolean>;
  static async checkPermissions(filter: UsbDeviceFilter): Promise<boolean>;
  static async readdir(filter: UsbDeviceFilter, dirPath: string): Promise<UsbFileInfo[]>;
  static async readFile(filter: UsbDeviceFilter, filePath: string): Promise<Bytes | undefined>;
}
```

| Method | Signature | Description |
|--------|-----------|-------------|
| `getDevices` | `static async getDevices(): Promise<UsbDeviceInfo[]>` | List all connected USB mass storage devices |
| `requestPermissions` | `static async requestPermissions(filter: UsbDeviceFilter): Promise<boolean>` | Request permission to access the specified USB device. Returns `true` if granted. |
| `checkPermissions` | `static async checkPermissions(filter: UsbDeviceFilter): Promise<boolean>` | Check if permission is granted for the specified USB device |
| `readdir` | `static async readdir(filter: UsbDeviceFilter, dirPath: string): Promise<UsbFileInfo[]>` | List files and directories at the given path on the USB device |
| `readFile` | `static async readFile(filter: UsbDeviceFilter, filePath: string): Promise<Bytes \| undefined>` | Read a file from the USB device. Returns `Bytes` on success, `undefined` if the file data is null. |

## Usage Examples

### Discover and access a USB device

```typescript
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";

// List connected USB devices
const devices = await UsbStorage.getDevices();
if (devices.length === 0) {
  return; // No USB devices connected
}

const device = devices[0];
const filter = { vendorId: device.vendorId, productId: device.productId };

// Request permission
const granted = await UsbStorage.requestPermissions(filter);
if (!granted) {
  return; // Permission denied
}

// List root directory
const files = await UsbStorage.readdir(filter, "/");
for (const file of files) {
  if (!file.isDirectory) {
    const data = await UsbStorage.readFile(filter, `/${file.name}`);
    if (data !== undefined) {
      // process binary data
    }
  }
}
```
