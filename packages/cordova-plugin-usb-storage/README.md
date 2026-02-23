# @simplysm/cordova-plugin-usb-storage

Cordova USB Storage Plugin for Android. Provides access to USB mass storage devices from a Cordova application.

> **Deprecated**: This package is no longer maintained. Please migrate to the Capacitor equivalent: `@simplysm/capacitor-plugin-usb-storage`.

## Installation

```bash
cordova plugin add @simplysm/cordova-plugin-usb-storage
```

Supported platforms: **Android**

## API

### CordovaUsbStorage

An abstract class with static methods for interacting with USB storage devices via the Cordova plugin bridge.

```typescript
import { CordovaUsbStorage } from "@simplysm/cordova-plugin-usb-storage";
```

#### `CordovaUsbStorage.getDevices(): Promise<{ deviceName: string; manufacturerName: string; productName: string; vendorId: number; productId: number }[]>`

Returns a list of currently connected USB devices.

```typescript
const devices = await CordovaUsbStorage.getDevices();
for (const device of devices) {
  console.log(device.productName, device.vendorId, device.productId);
}
```

#### `CordovaUsbStorage.requestPermission(filter: { vendorId: number; productId: number }): Promise<boolean>`

Requests user permission to access a specific USB device. Returns `true` if permission was granted.

```typescript
const granted = await CordovaUsbStorage.requestPermission({ vendorId: 1234, productId: 5678 });
if (granted) {
  console.log("Permission granted");
}
```

#### `CordovaUsbStorage.hasPermission(filter: { vendorId: number; productId: number }): Promise<boolean>`

Checks whether the application already has permission to access a specific USB device.

```typescript
const has = await CordovaUsbStorage.hasPermission({ vendorId: 1234, productId: 5678 });
if (!has) {
  await CordovaUsbStorage.requestPermission({ vendorId: 1234, productId: 5678 });
}
```

#### `CordovaUsbStorage.readdir(filter: { vendorId: number; productId: number }, dirPath: string): Promise<string[]>`

Reads the contents of a directory on the USB storage device. Returns an array of file and folder names.

```typescript
const entries = await CordovaUsbStorage.readdir({ vendorId: 1234, productId: 5678 }, "/");
console.log(entries); // ["folder1", "file.txt", ...]
```

#### `CordovaUsbStorage.read(filter: { vendorId: number; productId: number }, filePath: string): Promise<Buffer | undefined>`

Reads a file from the USB storage device. Returns a `Buffer` containing the file data, or `undefined` if the file does not exist.

```typescript
const data = await CordovaUsbStorage.read({ vendorId: 1234, productId: 5678 }, "/data/log.txt");
if (data) {
  const text = data.toString("utf-8");
  console.log(text);
}
```

## Types

### Device info object (returned by `getDevices`)

```typescript
{
  deviceName: string; // System-level device name
  manufacturerName: string; // USB manufacturer name
  productName: string; // USB product name
  vendorId: number; // USB vendor ID
  productId: number; // USB product ID
}
```

### Device filter object (used by `requestPermission`, `hasPermission`, `readdir`, `read`)

```typescript
{
  vendorId: number; // USB vendor ID
  productId: number; // USB product ID
}
```
