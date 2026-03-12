# @simplysm/capacitor-plugin-usb-storage

Capacitor plugin for reading USB mass storage devices.

- **Android**: USB Mass Storage access via the libaums library
- **Browser**: IndexedDB-based virtual USB storage emulation (for development/testing)

## Installation

```bash
npm install @simplysm/capacitor-plugin-usb-storage
```

### Peer Dependencies

| Package | Version |
|---------|---------|
| `@capacitor/core` | `^7.4.4` |

## API Reference

### `UsbStorage` (static class)

The main entry point. All methods are static and return Promises.

#### `UsbStorage.getDevices()`

Get a list of connected USB devices.

```ts
const devices: UsbDeviceInfo[] = await UsbStorage.getDevices();
```

**Returns:** `Promise<UsbDeviceInfo[]>`

---

#### `UsbStorage.requestPermissions(filter)`

Request access permission for a USB device.

```ts
const granted: boolean = await UsbStorage.requestPermissions({
  vendorId: 0x1234,
  productId: 0x5678,
});
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filter` | `UsbDeviceFilter` | Target device vendor/product IDs |

**Returns:** `Promise<boolean>` -- `true` if permission was granted.

---

#### `UsbStorage.checkPermissions(filter)`

Check whether access permission is already granted for a USB device.

```ts
const hasPermission: boolean = await UsbStorage.checkPermissions({
  vendorId: 0x1234,
  productId: 0x5678,
});
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filter` | `UsbDeviceFilter` | Target device vendor/product IDs |

**Returns:** `Promise<boolean>` -- `true` if permission is held.

---

#### `UsbStorage.readdir(filter, dirPath)`

Read directory contents from a USB storage device.

```ts
const files: UsbFileInfo[] = await UsbStorage.readdir(
  { vendorId: 0x1234, productId: 0x5678 },
  "/Documents",
);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filter` | `UsbDeviceFilter` | Target device vendor/product IDs |
| `dirPath` | `string` | Directory path to read |

**Returns:** `Promise<UsbFileInfo[]>`

---

#### `UsbStorage.readFile(filter, filePath)`

Read a file from a USB storage device. Returns the file contents as `Bytes`, or `undefined` if the file was not found.

```ts
import type { Bytes } from "@simplysm/core-common";

const data: Bytes | undefined = await UsbStorage.readFile(
  { vendorId: 0x1234, productId: 0x5678 },
  "/Documents/report.pdf",
);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filter` | `UsbDeviceFilter` | Target device vendor/product IDs |
| `filePath` | `string` | File path to read |

**Returns:** `Promise<Bytes | undefined>`

---

### Interfaces

#### `UsbDeviceInfo`

Information about a connected USB device.

```ts
interface UsbDeviceInfo {
  deviceName: string;
  manufacturerName: string;
  productName: string;
  vendorId: number;
  productId: number;
}
```

#### `UsbDeviceFilter`

Filter used to identify a specific USB device by vendor and product ID.

```ts
interface UsbDeviceFilter {
  vendorId: number;
  productId: number;
}
```

#### `UsbFileInfo`

Information about a file or directory on the USB device.

```ts
interface UsbFileInfo {
  name: string;
  isDirectory: boolean;
}
```

---

### `UsbStoragePlugin` (low-level interface)

The raw Capacitor plugin interface. Prefer using the `UsbStorage` static class instead.

```ts
interface UsbStoragePlugin {
  getDevices(): Promise<{ devices: UsbDeviceInfo[] }>;
  requestPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  checkPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  readdir(options: UsbDeviceFilter & { path: string }): Promise<{ files: UsbFileInfo[] }>;
  readFile(options: UsbDeviceFilter & { path: string }): Promise<{ data: string | null }>;
}
```

---

## Web Platform (Virtual USB Storage)

On the web platform, the plugin uses an IndexedDB-backed virtual file system for development and testing. The `UsbStorageWeb` class exposes additional helper methods to set up virtual devices and files.

### `UsbStorageWeb.addVirtualDevice(device)`

Register a virtual USB device.

```ts
await web.addVirtualDevice({
  vendorId: 0x1234,
  productId: 0x5678,
  deviceName: "Virtual USB",
  manufacturerName: "Test",
  productName: "Virtual Drive",
});
```

### `UsbStorageWeb.addVirtualFile(filter, filePath, data)`

Add a file to a virtual USB device.

```ts
const content = new TextEncoder().encode("hello");
await web.addVirtualFile(
  { vendorId: 0x1234, productId: 0x5678 },
  "/docs/readme.txt",
  content,
);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filter` | `UsbDeviceFilter` | Target virtual device |
| `filePath` | `string` | File path on the virtual device |
| `data` | `Uint8Array` | File contents |

### `UsbStorageWeb.addVirtualDirectory(filter, dirPath)`

Create a directory on a virtual USB device.

```ts
await web.addVirtualDirectory(
  { vendorId: 0x1234, productId: 0x5678 },
  "/docs/reports",
);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filter` | `UsbDeviceFilter` | Target virtual device |
| `dirPath` | `string` | Directory path to create |
