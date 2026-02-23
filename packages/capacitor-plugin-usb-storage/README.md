# @simplysm/capacitor-plugin-usb-storage

Capacitor plugin for interacting with USB mass storage devices on Android. Uses the libaums library for USB Mass Storage access. On the web platform, methods return empty/default values with alert notifications.

## Installation

```bash
yarn add @simplysm/capacitor-plugin-usb-storage
```

## API

### UsbStorage

Abstract static class providing USB storage access methods.

```typescript
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";
```

#### `UsbStorage.getDevices(): Promise<IUsbDeviceInfo[]>`

Returns a list of connected USB storage devices.

```typescript
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";

const devices = await UsbStorage.getDevices();
for (const device of devices) {
  console.log(device.deviceName, device.vendorId, device.productId);
}
```

#### `UsbStorage.requestPermission(filter: { vendorId: number; productId: number }): Promise<boolean>`

Requests USB device access permission from the user. Returns whether permission was granted.

```typescript
const granted = await UsbStorage.requestPermission({
  vendorId: 0x1234,
  productId: 0x5678,
});
```

#### `UsbStorage.hasPermission(filter: { vendorId: number; productId: number }): Promise<boolean>`

Checks if USB device access permission is already granted.

```typescript
const hasPerm = await UsbStorage.hasPermission({
  vendorId: 0x1234,
  productId: 0x5678,
});
```

#### `UsbStorage.readdir(filter: { vendorId: number; productId: number }, dirPath: string): Promise<string[]>`

Reads the contents of a directory on the USB storage device. Returns an array of file/folder names.

```typescript
const files = await UsbStorage.readdir({ vendorId: 0x1234, productId: 0x5678 }, "/Documents");
```

#### `UsbStorage.read(filter: { vendorId: number; productId: number }, filePath: string): Promise<Buffer | undefined>`

Reads a file from the USB storage device. Returns the file data as a Buffer, or `undefined` if the file data is null.

```typescript
const data = await UsbStorage.read(
  { vendorId: 0x1234, productId: 0x5678 },
  "/Documents/report.pdf",
);
if (data) {
  console.log("File size:", data.length);
}
```

## Types

### IUsbDeviceInfo

Information about a connected USB device.

```typescript
import { IUsbDeviceInfo } from "@simplysm/capacitor-plugin-usb-storage";
```

```typescript
interface IUsbDeviceInfo {
  deviceName: string;
  manufacturerName: string;
  productName: string;
  vendorId: number;
  productId: number;
}
```

### IUsbDeviceFilter

Filter for identifying a specific USB device by vendor and product ID.

```typescript
import { IUsbDeviceFilter } from "@simplysm/capacitor-plugin-usb-storage";
```

```typescript
interface IUsbDeviceFilter {
  vendorId: number;
  productId: number;
}
```

### IUsbStoragePlugin

Raw Capacitor plugin interface. Typically used internally by `UsbStorage`.

```typescript
import { IUsbStoragePlugin } from "@simplysm/capacitor-plugin-usb-storage";
```

```typescript
interface IUsbStoragePlugin {
  getDevices(): Promise<{ devices: IUsbDeviceInfo[] }>;
  requestPermission(options: IUsbDeviceFilter): Promise<{ granted: boolean }>;
  hasPermission(options: IUsbDeviceFilter): Promise<{ granted: boolean }>;
  readdir(options: IUsbDeviceFilter & { path: string }): Promise<{ files: string[] }>;
  read(options: IUsbDeviceFilter & { path: string }): Promise<{ data: string | null }>;
}
```
