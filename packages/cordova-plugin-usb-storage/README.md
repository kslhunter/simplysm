# @simplysm/cordova-plugin-usb-storage

Cordova USB Storage Plugin (legacy) -- USB mass storage device interaction for Android via the Cordova bridge. Enumerate connected USB devices, manage access permissions, read directories, and read files from USB mass storage devices. This is the legacy Cordova counterpart to `@simplysm/capacitor-plugin-usb-storage`.

## Installation

```bash
npm install @simplysm/cordova-plugin-usb-storage
```

## API Overview

| API | Type | Description |
|-----|------|-------------|
| `CordovaUsbStorage` | Abstract class | Static methods for USB mass storage device interaction via the Cordova bridge |

## API Reference

### `CordovaUsbStorage`

Abstract class with static methods for USB mass storage device interaction through the Cordova bridge.

```typescript
export abstract class CordovaUsbStorage {
  static async getDevices(): Promise<
    {
      deviceName: string;
      manufacturerName: string;
      productName: string;
      vendorId: number;
      productId: number;
    }[]
  >;
  static async requestPermission(filter: {
    vendorId: number;
    productId: number;
  }): Promise<boolean>;
  static async hasPermission(filter: {
    vendorId: number;
    productId: number;
  }): Promise<boolean>;
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
| `getDevices` | -- | `Promise<{ deviceName, manufacturerName, productName, vendorId, productId }[]>` | Get a list of connected USB storage devices |
| `requestPermission` | `filter: { vendorId: number; productId: number }` | `Promise<boolean>` | Request access permission for a USB device; returns whether permission was granted |
| `hasPermission` | `filter: { vendorId: number; productId: number }` | `Promise<boolean>` | Check if access permission is granted for a USB device |
| `readdir` | `filter: { vendorId, productId }, dirPath: string` | `Promise<string[]>` | List file and directory names in a directory on the USB device |
| `read` | `filter: { vendorId, productId }, filePath: string` | `Promise<Buffer \| undefined>` | Read a file from the USB device as a Buffer; returns `undefined` if data is not available |

#### `getDevices` return fields

| Field | Type | Description |
|-------|------|-------------|
| `deviceName` | `string` | System device name |
| `manufacturerName` | `string` | USB device manufacturer name |
| `productName` | `string` | USB device product name |
| `vendorId` | `number` | USB vendor ID |
| `productId` | `number` | USB product ID |

## Usage Examples

### List USB devices and read a file

```typescript
import { CordovaUsbStorage } from "@simplysm/cordova-plugin-usb-storage";

// Get connected USB devices
const devices = await CordovaUsbStorage.getDevices();
if (devices.length === 0) {
  console.log("No USB devices connected");
  return;
}

const device = devices[0];
console.log(`Found: ${device.productName} by ${device.manufacturerName}`);

// Request permission
const granted = await CordovaUsbStorage.requestPermission({
  vendorId: device.vendorId,
  productId: device.productId,
});

if (granted) {
  // List root directory
  const files = await CordovaUsbStorage.readdir(
    { vendorId: device.vendorId, productId: device.productId },
    "/",
  );
  console.log("Files:", files);

  // Read a file
  const data = await CordovaUsbStorage.read(
    { vendorId: device.vendorId, productId: device.productId },
    "/data.txt",
  );
  if (data) {
    console.log("Content:", data.toString("utf-8"));
  }
}
```
