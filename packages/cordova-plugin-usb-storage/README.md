# @simplysm/cordova-plugin-usb-storage

> **Deprecated** — This package is no longer maintained. Use the Capacitor equivalent instead.

Cordova plugin for interacting with USB mass storage devices on Android. Uses [libaums](https://github.com/magnusja/libaums) under the hood.

## Platform Support

| Platform | Supported |
|----------|-----------|
| Android  | Yes       |
| iOS      | No        |

## Installation

```bash
cordova plugin add @simplysm/cordova-plugin-usb-storage
```

## API Reference

All methods are static on the `CordovaUsbStorage` class.

```ts
import { CordovaUsbStorage } from "@simplysm/cordova-plugin-usb-storage";
```

### Device Filter

Several methods accept a `filter` parameter to identify a specific USB device:

```ts
interface DeviceFilter {
  vendorId: number;
  productId: number;
}
```

---

### `CordovaUsbStorage.getDevices()`

Returns a list of connected USB mass storage devices.

```ts
static async getDevices(): Promise<{
  deviceName: string;
  manufacturerName: string;
  productName: string;
  vendorId: number;
  productId: number;
}[]>
```

**Example**

```ts
const devices = await CordovaUsbStorage.getDevices();
for (const device of devices) {
  console.log(device.productName, device.vendorId, device.productId);
}
```

---

### `CordovaUsbStorage.requestPermission(filter)`

Requests access permission for a USB device. If permission has already been granted, resolves immediately with `true`.

```ts
static async requestPermission(filter: {
  vendorId: number;
  productId: number;
}): Promise<boolean>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filter.vendorId` | `number` | Vendor ID of the target device |
| `filter.productId` | `number` | Product ID of the target device |

**Returns** — `true` if permission was granted, `false` otherwise.

**Example**

```ts
const granted = await CordovaUsbStorage.requestPermission({
  vendorId: 1234,
  productId: 5678,
});
```

---

### `CordovaUsbStorage.hasPermission(filter)`

Checks whether the app already has permission to access the specified USB device.

```ts
static async hasPermission(filter: {
  vendorId: number;
  productId: number;
}): Promise<boolean>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filter.vendorId` | `number` | Vendor ID of the target device |
| `filter.productId` | `number` | Product ID of the target device |

**Returns** — `true` if permission is currently held.

**Example**

```ts
const hasPerm = await CordovaUsbStorage.hasPermission({
  vendorId: 1234,
  productId: 5678,
});
```

---

### `CordovaUsbStorage.readdir(filter, dirPath)`

Reads the contents of a directory on the USB storage device.

```ts
static async readdir(
  filter: { vendorId: number; productId: number },
  dirPath: string,
): Promise<string[]>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filter.vendorId` | `number` | Vendor ID of the target device |
| `filter.productId` | `number` | Product ID of the target device |
| `dirPath` | `string` | Path to the directory to list |

**Returns** — Array of file and folder names in the directory.

**Throws** — If the app does not have permission for the device.

**Example**

```ts
const entries = await CordovaUsbStorage.readdir(
  { vendorId: 1234, productId: 5678 },
  "/Documents",
);
```

---

### `CordovaUsbStorage.read(filter, filePath)`

Reads a file from the USB storage device.

```ts
static async read(
  filter: { vendorId: number; productId: number },
  filePath: string,
): Promise<Buffer | undefined>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filter.vendorId` | `number` | Vendor ID of the target device |
| `filter.productId` | `number` | Product ID of the target device |
| `filePath` | `string` | Path to the file to read |

**Returns** — A `Buffer` containing the file data, or `undefined` if the file was not found.

**Throws** — If the app does not have permission, or if the path points to a directory.

**Example**

```ts
const data = await CordovaUsbStorage.read(
  { vendorId: 1234, productId: 5678 },
  "/Documents/report.txt",
);
if (data !== undefined) {
  const text = data.toString("utf-8");
}
```

## Typical Workflow

```ts
// 1. Discover devices
const devices = await CordovaUsbStorage.getDevices();
const device = devices[0];

// 2. Request permission
const granted = await CordovaUsbStorage.requestPermission({
  vendorId: device.vendorId,
  productId: device.productId,
});
if (!granted) {
  throw new Error("Permission denied");
}

// 3. Browse and read files
const filter = { vendorId: device.vendorId, productId: device.productId };
const entries = await CordovaUsbStorage.readdir(filter, "/");
const fileData = await CordovaUsbStorage.read(filter, "/" + entries[0]);
```
