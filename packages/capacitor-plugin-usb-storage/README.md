# @simplysm/capacitor-plugin-usb-storage

Capacitor USB Storage Plugin -- USB mass storage device interaction for Android. Enumerate connected USB devices, manage access permissions, read directories, and read files from USB mass storage devices using the libaums library. Falls back to alert-based stubs on browser.

## Installation

```bash
npm install @simplysm/capacitor-plugin-usb-storage
```

**Peer dependencies:**

- `@capacitor/core` ^7.0.0

## API Overview

| API | Type | Description |
|-----|------|-------------|
| `UsbStorage` | Abstract class | Static methods for USB mass storage device interaction |
| `IUsbDeviceInfo` | Interface | USB device information (name, manufacturer, IDs) |
| `IUsbDeviceFilter` | Interface | Filter to identify a USB device by vendor/product ID |
| `IUsbStoragePlugin` | Interface | Low-level Capacitor plugin interface for USB storage operations |

## API Reference

### `IUsbDeviceInfo`

Information about a connected USB device.

```typescript
export interface IUsbDeviceInfo {
  deviceName: string;
  manufacturerName: string;
  productName: string;
  vendorId: number;
  productId: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `deviceName` | `string` | System device name |
| `manufacturerName` | `string` | USB device manufacturer name |
| `productName` | `string` | USB device product name |
| `vendorId` | `number` | USB vendor ID |
| `productId` | `number` | USB product ID |

### `IUsbDeviceFilter`

Filter used to identify a specific USB device by its vendor and product IDs.

```typescript
export interface IUsbDeviceFilter {
  vendorId: number;
  productId: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `vendorId` | `number` | USB vendor ID to match |
| `productId` | `number` | USB product ID to match |

### `IUsbStoragePlugin`

Low-level Capacitor plugin interface. Use `UsbStorage` instead for a simplified API.

```typescript
export interface IUsbStoragePlugin {
  getDevices(): Promise<{ devices: IUsbDeviceInfo[] }>;
  requestPermission(options: IUsbDeviceFilter): Promise<{ granted: boolean }>;
  hasPermission(options: IUsbDeviceFilter): Promise<{ granted: boolean }>;
  readdir(options: IUsbDeviceFilter & { path: string }): Promise<{ files: string[] }>;
  read(options: IUsbDeviceFilter & { path: string }): Promise<{ data: string | null }>;
}
```

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getDevices` | -- | `Promise<{ devices: IUsbDeviceInfo[] }>` | List connected USB devices |
| `requestPermission` | `options: IUsbDeviceFilter` | `Promise<{ granted: boolean }>` | Request access permission for a USB device |
| `hasPermission` | `options: IUsbDeviceFilter` | `Promise<{ granted: boolean }>` | Check if permission is granted for a USB device |
| `readdir` | `options: IUsbDeviceFilter & { path }` | `Promise<{ files: string[] }>` | List files in a directory on the USB device |
| `read` | `options: IUsbDeviceFilter & { path }` | `Promise<{ data: string \| null }>` | Read a file from the USB device as base64 |

### `UsbStorage`

Abstract class with static methods for USB mass storage device interaction.

- **Android**: Uses libaums library for USB Mass Storage access
- **Browser**: Shows alert and returns empty values

```typescript
export abstract class UsbStorage {
  static async getDevices(): Promise<IUsbDeviceInfo[]>;
  static async requestPermission(filter: { vendorId: number; productId: number }): Promise<boolean>;
  static async hasPermission(filter: { vendorId: number; productId: number }): Promise<boolean>;
  static async readdir(
    filter: { vendorId: number; productId: number },
    dirPath: string,
  ): Promise<string[]>;
  static async read(
    filter: { vendorId: number; productId: number },
    filePath: string,
  ): Promise<Buffer | undefined>;
}
```

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getDevices` | -- | `Promise<IUsbDeviceInfo[]>` | Get a list of connected USB storage devices |
| `requestPermission` | `filter: { vendorId: number; productId: number }` | `Promise<boolean>` | Request access permission for a USB device; returns whether permission was granted |
| `hasPermission` | `filter: { vendorId: number; productId: number }` | `Promise<boolean>` | Check if access permission is granted for a USB device |
| `readdir` | `filter: { vendorId, productId }, dirPath: string` | `Promise<string[]>` | List file and directory names in a directory on the USB device |
| `read` | `filter: { vendorId, productId }, filePath: string` | `Promise<Buffer \| undefined>` | Read a file from the USB device as a Buffer; returns `undefined` if data is null |

## Usage Examples

### List USB devices and read a file

```typescript
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";

// Get connected USB devices
const devices = await UsbStorage.getDevices();
if (devices.length === 0) {
  console.log("No USB devices connected");
  return;
}

const device = devices[0];
console.log(`Found: ${device.productName} by ${device.manufacturerName}`);

// Request permission
const granted = await UsbStorage.requestPermission({
  vendorId: device.vendorId,
  productId: device.productId,
});

if (granted) {
  // List root directory
  const files = await UsbStorage.readdir(
    { vendorId: device.vendorId, productId: device.productId },
    "/",
  );
  console.log("Files:", files);

  // Read a file
  const data = await UsbStorage.read(
    { vendorId: device.vendorId, productId: device.productId },
    "/data.txt",
  );
  if (data) {
    console.log("Content:", data.toString("utf-8"));
  }
}
```
