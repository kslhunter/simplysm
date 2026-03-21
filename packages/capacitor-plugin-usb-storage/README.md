# @simplysm/capacitor-plugin-usb-storage

Capacitor USB Storage Plugin -- read files from USB mass storage devices on Android.

## Installation

```bash
npm install @simplysm/capacitor-plugin-usb-storage
```

## API Overview

### Types

| API | Type | Description |
|-----|------|-------------|
| `UsbDeviceInfo` | interface | USB device info (name, manufacturer, product, vendor/product IDs) |
| `UsbDeviceFilter` | interface | USB device filter by `vendorId` and `productId` |
| `UsbFileInfo` | interface | File entry info (`name`, `isDirectory`) |

### Interfaces

| API | Type | Description |
|-----|------|-------------|
| `UsbStoragePlugin` | interface | Low-level Capacitor plugin interface for USB storage operations |

### Classes

| API | Type | Description |
|-----|------|-------------|
| `UsbStorage` | abstract class | USB mass storage device access |

## `UsbDeviceInfo`

```typescript
interface UsbDeviceInfo {
  deviceName: string;
  manufacturerName: string;
  productName: string;
  vendorId: number;
  productId: number;
}
```

## `UsbDeviceFilter`

```typescript
interface UsbDeviceFilter {
  vendorId: number;
  productId: number;
}
```

## `UsbFileInfo`

```typescript
interface UsbFileInfo {
  name: string;
  isDirectory: boolean;
}
```

## `UsbStoragePlugin`

```typescript
interface UsbStoragePlugin {
  getDevices(): Promise<{ devices: UsbDeviceInfo[] }>;
  requestPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  checkPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  readdir(options: UsbDeviceFilter & { path: string }): Promise<{ files: UsbFileInfo[] }>;
  readFile(options: UsbDeviceFilter & { path: string }): Promise<{ data: string | null }>;
}
```

Low-level Capacitor plugin interface. Use `UsbStorage` static methods instead of calling this directly.

## `UsbStorage`

```typescript
abstract class UsbStorage {
  static async getDevices(): Promise<UsbDeviceInfo[]>;
  static async requestPermissions(filter: UsbDeviceFilter): Promise<boolean>;
  static async checkPermissions(filter: UsbDeviceFilter): Promise<boolean>;
  static async readdir(filter: UsbDeviceFilter, dirPath: string): Promise<UsbFileInfo[]>;
  static async readFile(filter: UsbDeviceFilter, filePath: string): Promise<Bytes | undefined>;
}
```

Plugin for interacting with USB storage devices.
- Android: USB Mass Storage access via libaums library.
- Browser: IndexedDB-based virtual USB storage emulation.

## Usage Examples

### List USB devices and read files

```typescript
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";

const devices = await UsbStorage.getDevices();
if (devices.length > 0) {
  const device = devices[0];
  const filter = { vendorId: device.vendorId, productId: device.productId };

  const granted = await UsbStorage.requestPermissions(filter);
  if (granted) {
    const files = await UsbStorage.readdir(filter, "/");
    const data = await UsbStorage.readFile(filter, "/readme.txt");
  }
}
```
