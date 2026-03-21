# @simplysm/capacitor-plugin-usb-storage

Simplysm Package - Capacitor USB Storage Plugin. Provides USB Mass Storage device access on Android via the libaums library, with IndexedDB-based browser emulation.

## Installation

```bash
npm install @simplysm/capacitor-plugin-usb-storage
```

## API Overview

### USB Storage

| API | Type | Description |
|-----|------|-------------|
| `UsbStorage` | class | USB storage access plugin (static methods) |
| `UsbStoragePlugin` | interface | Low-level Capacitor plugin interface for USB storage |
| `UsbDeviceInfo` | interface | USB device information |
| `UsbDeviceFilter` | interface | USB device filter (vendor/product ID pair) |
| `UsbFileInfo` | interface | File/directory entry on USB device |

---

### `UsbDeviceInfo`

| Field | Type | Description |
|-------|------|-------------|
| `deviceName` | `string` | Device name |
| `manufacturerName` | `string` | Manufacturer name |
| `productName` | `string` | Product name |
| `vendorId` | `number` | USB vendor ID |
| `productId` | `number` | USB product ID |

### `UsbDeviceFilter`

| Field | Type | Description |
|-------|------|-------------|
| `vendorId` | `number` | USB vendor ID |
| `productId` | `number` | USB product ID |

### `UsbFileInfo`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | File or directory name |
| `isDirectory` | `boolean` | Whether the entry is a directory |

### `UsbStoragePlugin`

| Method | Signature | Description |
|--------|-----------|-------------|
| `getDevices` | `() => Promise<{ devices: UsbDeviceInfo[] }>` | Get connected USB devices |
| `requestPermissions` | `(options: UsbDeviceFilter) => Promise<{ granted: boolean }>` | Request USB device permission |
| `checkPermissions` | `(options: UsbDeviceFilter) => Promise<{ granted: boolean }>` | Check USB device permission |
| `readdir` | `(options: UsbDeviceFilter & { path: string }) => Promise<{ files: UsbFileInfo[] }>` | Read directory from USB |
| `readFile` | `(options: UsbDeviceFilter & { path: string }) => Promise<{ data: string \| null }>` | Read file from USB (base64) |

### `UsbStorage`

Abstract class with static methods for USB Mass Storage access.

| Method | Signature | Description |
|--------|-----------|-------------|
| `getDevices` | `() => Promise<UsbDeviceInfo[]>` | Get list of connected USB devices |
| `requestPermissions` | `(filter: UsbDeviceFilter) => Promise<boolean>` | Request USB device access permission |
| `checkPermissions` | `(filter: UsbDeviceFilter) => Promise<boolean>` | Check USB device access permission |
| `readdir` | `(filter: UsbDeviceFilter, dirPath: string) => Promise<UsbFileInfo[]>` | Read directory contents from USB device |
| `readFile` | `(filter: UsbDeviceFilter, filePath: string) => Promise<Bytes \| undefined>` | Read file from USB device |

## Usage Examples

### List and read from USB device

```typescript
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";

// List connected devices
const devices = await UsbStorage.getDevices();

if (devices.length > 0) {
  const filter = { vendorId: devices[0].vendorId, productId: devices[0].productId };

  // Request permission
  const granted = await UsbStorage.requestPermissions(filter);

  if (granted) {
    // Read directory
    const files = await UsbStorage.readdir(filter, "/");

    // Read a file
    const data = await UsbStorage.readFile(filter, "/document.txt");
  }
}
```
