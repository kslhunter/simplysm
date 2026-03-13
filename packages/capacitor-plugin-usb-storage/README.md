# @simplysm/capacitor-plugin-usb-storage

Capacitor plugin for accessing USB Mass Storage devices. Uses the [libaums](https://github.com/magnusja/libaums) library on Android to read files and directories from USB storage.

## Installation

```bash
npm install @simplysm/capacitor-plugin-usb-storage
npx cap sync
```

### Requirements

- `@capacitor/core` ^7.0.0

### Platform Support

| Platform | Supported |
|----------|-----------|
| Android  | Yes       |
| Web      | Stub only (shows alert) |

## API

### `UsbStorage`

Static utility class for interacting with USB Mass Storage devices.

#### `UsbStorage.getDevices()`

Returns a list of connected USB Mass Storage devices.

**Returns:** `Promise<IUsbDeviceInfo[]>`

```ts
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";

const devices = await UsbStorage.getDevices();
for (const device of devices) {
  console.log(device.productName, device.vendorId, device.productId);
}
```

#### `UsbStorage.requestPermission(filter)`

Requests access permission for a specific USB device. If permission is already granted, resolves immediately.

| Parameter          | Type     | Description              |
|--------------------|----------|--------------------------|
| `filter.vendorId`  | `number` | USB vendor ID            |
| `filter.productId` | `number` | USB product ID           |

**Returns:** `Promise<boolean>` -- whether permission was granted.

```ts
const granted = await UsbStorage.requestPermission({
  vendorId: 1234,
  productId: 5678,
});
```

#### `UsbStorage.hasPermission(filter)`

Checks whether the app already has permission to access a specific USB device.

| Parameter          | Type     | Description              |
|--------------------|----------|--------------------------|
| `filter.vendorId`  | `number` | USB vendor ID            |
| `filter.productId` | `number` | USB product ID           |

**Returns:** `Promise<boolean>` -- whether permission is held.

```ts
const hasPerm = await UsbStorage.hasPermission({
  vendorId: 1234,
  productId: 5678,
});
```

#### `UsbStorage.readdir(filter, dirPath)`

Reads the contents of a directory on the USB storage device.

| Parameter          | Type     | Description                        |
|--------------------|----------|------------------------------------|
| `filter.vendorId`  | `number` | USB vendor ID                      |
| `filter.productId` | `number` | USB product ID                     |
| `dirPath`          | `string` | Path to the directory to list      |

**Returns:** `Promise<string[]>` -- file and folder names in the directory.

```ts
const files = await UsbStorage.readdir(
  { vendorId: 1234, productId: 5678 },
  "/Documents",
);
```

#### `UsbStorage.read(filter, filePath)`

Reads a file from the USB storage device. The file data is transferred as base64 from the native layer and returned as a `Buffer`.

| Parameter          | Type     | Description                        |
|--------------------|----------|------------------------------------|
| `filter.vendorId`  | `number` | USB vendor ID                      |
| `filter.productId` | `number` | USB product ID                     |
| `filePath`         | `string` | Path to the file to read           |

**Returns:** `Promise<Buffer | undefined>` -- file contents as a Buffer, or `undefined` if the file was not found.

```ts
const data = await UsbStorage.read(
  { vendorId: 1234, productId: 5678 },
  "/Documents/report.csv",
);
if (data != null) {
  const text = data.toString("utf-8");
}
```

### `IUsbDeviceInfo`

Device information returned by `getDevices`.

| Property           | Type     | Description              |
|--------------------|----------|--------------------------|
| `deviceName`       | `string` | Android device path      |
| `manufacturerName` | `string` | Manufacturer name        |
| `productName`      | `string` | Product name             |
| `vendorId`         | `number` | USB vendor ID            |
| `productId`        | `number` | USB product ID           |

### `IUsbDeviceFilter`

Filter used to identify a specific USB device.

| Property    | Type     | Description    |
|-------------|----------|----------------|
| `vendorId`  | `number` | USB vendor ID  |
| `productId` | `number` | USB product ID |

### `IUsbStoragePlugin`

Low-level plugin interface registered via `registerPlugin`. Use the `UsbStorage` class instead for a simpler API.

| Method              | Signature                                                                              |
|---------------------|----------------------------------------------------------------------------------------|
| `getDevices`        | `() => Promise<{ devices: IUsbDeviceInfo[] }>`                                         |
| `requestPermission` | `(options: IUsbDeviceFilter) => Promise<{ granted: boolean }>`                         |
| `hasPermission`     | `(options: IUsbDeviceFilter) => Promise<{ granted: boolean }>`                         |
| `readdir`           | `(options: IUsbDeviceFilter & { path: string }) => Promise<{ files: string[] }>`       |
| `read`              | `(options: IUsbDeviceFilter & { path: string }) => Promise<{ data: string \| null }>`  |
