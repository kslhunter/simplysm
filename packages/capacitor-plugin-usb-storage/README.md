# @simplysm/capacitor-plugin-usb-storage

Simplysm Package - Capacitor USB Storage Plugin

Provides access to USB Mass Storage devices from a Capacitor application.

- **Android**: USB Mass Storage access via the libaums library.
- **Browser**: IndexedDB-based virtual USB storage emulation for development.

## Installation

```bash
pnpm add @simplysm/capacitor-plugin-usb-storage
```

## Main Modules

### UsbStorage

An abstract class that exposes static methods for interacting with USB storage devices.

```typescript
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";
```

#### `UsbStorage.getDevices()`

Returns a list of currently connected USB devices.

```typescript
static async getDevices(): Promise<UsbDeviceInfo[]>
```

```typescript
const devices = await UsbStorage.getDevices();
for (const device of devices) {
  console.log(device.productName, device.vendorId, device.productId);
}
```

#### `UsbStorage.requestPermissions(filter)`

Requests access permission for a specific USB device identified by its vendor and product IDs.

```typescript
static async requestPermissions(filter: UsbDeviceFilter): Promise<boolean>
```

```typescript
const granted = await UsbStorage.requestPermissions({ vendorId: 0x1234, productId: 0x5678 });
if (granted) {
  console.log("Permission granted");
}
```

#### `UsbStorage.checkPermissions(filter)`

Checks whether access permission for a specific USB device is currently held.

```typescript
static async checkPermissions(filter: UsbDeviceFilter): Promise<boolean>
```

```typescript
const alreadyGranted = await UsbStorage.checkPermissions({ vendorId: 0x1234, productId: 0x5678 });
```

#### `UsbStorage.readdir(filter, dirPath)`

Reads the contents of a directory on the USB storage device.

```typescript
static async readdir(filter: UsbDeviceFilter, dirPath: string): Promise<UsbFileInfo[]>
```

```typescript
const filter = { vendorId: 0x1234, productId: 0x5678 };
const entries = await UsbStorage.readdir(filter, "/");
for (const entry of entries) {
  console.log(entry.name, entry.isDirectory ? "(dir)" : "(file)");
}
```

#### `UsbStorage.readFile(filter, filePath)`

Reads a file from the USB storage device and returns its contents as `Bytes`. Returns `undefined` if the file does not exist.

```typescript
static async readFile(filter: UsbDeviceFilter, filePath: string): Promise<Bytes | undefined>
```

```typescript
const filter = { vendorId: 0x1234, productId: 0x5678 };
const bytes = await UsbStorage.readFile(filter, "/data/file.bin");
if (bytes !== undefined) {
  console.log("File size:", bytes.length);
}
```

## Types

```typescript
import type {
  UsbDeviceInfo,
  UsbDeviceFilter,
  UsbFileInfo,
  UsbStoragePlugin,
} from "@simplysm/capacitor-plugin-usb-storage";
```

### `UsbDeviceInfo`

Describes a connected USB device.

```typescript
interface UsbDeviceInfo {
  deviceName: string;
  manufacturerName: string;
  productName: string;
  vendorId: number;
  productId: number;
}
```

### `UsbDeviceFilter`

Identifies a USB device by its vendor and product IDs. Used as a selector in permission and file-system calls.

```typescript
interface UsbDeviceFilter {
  vendorId: number;
  productId: number;
}
```

### `UsbFileInfo`

Describes a single entry (file or directory) returned by `readdir`.

```typescript
interface UsbFileInfo {
  name: string;
  isDirectory: boolean;
}
```

### `UsbStoragePlugin`

The raw Capacitor plugin interface registered under the `"UsbStorage"` plugin name. Prefer using the `UsbStorage` abstract class instead of calling this interface directly.

```typescript
interface UsbStoragePlugin {
  getDevices(): Promise<{ devices: UsbDeviceInfo[] }>;
  requestPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  checkPermissions(options: UsbDeviceFilter): Promise<{ granted: boolean }>;
  readdir(options: UsbDeviceFilter & { path: string }): Promise<{ files: UsbFileInfo[] }>;
  readFile(options: UsbDeviceFilter & { path: string }): Promise<{ data: string | null }>;
}
```
