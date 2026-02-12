# @simplysm/capacitor-plugin-usb-storage

A Capacitor plugin for accessing USB Mass Storage devices. On Android, it directly accesses the USB storage device's file system through the [libaums](https://github.com/magnusja/libaums) library, while in web environments it provides an IndexedDB-based virtual USB storage to support development and testing.

## Installation

```bash
pnpm add @simplysm/capacitor-plugin-usb-storage
npx cap sync
```

### Peer Dependencies

| Package | Version |
|--------|------|
| `@capacitor/core` | `^7.4.4` |

### Internal Dependencies

| Package | Description |
|--------|------|
| `@simplysm/core-common` | Common utilities such as Base64 conversion, `Bytes` type |

## Supported Platforms

| Platform | Supported | Implementation |
|--------|-----------|-----------|
| Android | Yes | USB Mass Storage access through libaums 0.9.1 |
| Web | Yes (emulation) | IndexedDB-based virtual USB storage |
| iOS | No | -- |

### Android Requirements

- `compileSdk`: 35
- `minSdk`: 23 (Android 6.0 or higher)
- Maximum file read size: 100MB

## Main API

### UsbStorage (Static Class)

The main entry point of the plugin. All methods are static and operate asynchronously.

```typescript
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";
```

| Method | Return Type | Description |
|--------|-----------|------|
| `getDevices()` | `Promise<IUsbDeviceInfo[]>` | Retrieve list of connected USB devices |
| `requestPermission(filter)` | `Promise<boolean>` | Request USB device access permission |
| `hasPermission(filter)` | `Promise<boolean>` | Check if USB device access permission is granted |
| `readdir(filter, dirPath)` | `Promise<IUsbFileInfo[]>` | Read list of files/folders in directory |
| `read(filter, filePath)` | `Promise<Bytes \| undefined>` | Read file contents as binary |

### IUsbStoragePlugin (Raw Plugin Interface)

The low-level Capacitor plugin interface. Most users should use the `UsbStorage` static class instead.
This interface is useful for advanced scenarios such as creating custom plugin implementations.

```typescript
import type { IUsbStoragePlugin } from "@simplysm/capacitor-plugin-usb-storage";
```

| Method | Return Type | Description |
|--------|-----------|------|
| `getDevices()` | `Promise<{ devices: IUsbDeviceInfo[] }>` | Get connected USB devices (raw) |
| `requestPermission(options)` | `Promise<{ granted: boolean }>` | Request USB permission (raw) |
| `hasPermission(options)` | `Promise<{ granted: boolean }>` | Check USB permission (raw) |
| `readdir(options)` | `Promise<{ files: IUsbFileInfo[] }>` | List directory contents (raw) |
| `read(options)` | `Promise<{ data: string \| null }>` | Read file as Base64 string (raw) |

### Interfaces

```typescript
import type { IUsbDeviceInfo, IUsbDeviceFilter, IUsbFileInfo } from "@simplysm/capacitor-plugin-usb-storage";
```

#### IUsbDeviceInfo

Represents USB device information.

| Property | Type | Description |
|------|------|------|
| `deviceName` | `string` | Device name (system path) |
| `manufacturerName` | `string` | Manufacturer name |
| `productName` | `string` | Product name |
| `vendorId` | `number` | USB Vendor ID |
| `productId` | `number` | USB Product ID |

#### IUsbDeviceFilter

A filter for identifying specific USB devices. Specifies the device using the combination of `vendorId` and `productId`.

| Property | Type | Description |
|------|------|------|
| `vendorId` | `number` | USB Vendor ID |
| `productId` | `number` | USB Product ID |

#### IUsbFileInfo

Represents file or directory information.

| Property | Type | Description |
|------|------|------|
| `name` | `string` | File/directory name |
| `isDirectory` | `boolean` | Whether it's a directory |

## Usage Examples

### List Devices and Request Permission

```typescript
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";

// Retrieve connected USB device list
const devices = await UsbStorage.getDevices();
console.log("Connected devices:", devices);

if (devices.length > 0) {
  const device = devices[0];
  const filter = { vendorId: device.vendorId, productId: device.productId };

  // Check permission
  const hasPerm = await UsbStorage.hasPermission(filter);
  if (!hasPerm) {
    // Request permission (displays system dialog on Android)
    const granted = await UsbStorage.requestPermission(filter);
    if (!granted) {
      console.log("USB device access permission was denied.");
      return;
    }
  }
}
```

### Read Directory Contents

```typescript
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";

const filter = { vendorId: 1234, productId: 5678 };

// Read root directory
const rootFiles = await UsbStorage.readdir(filter, "/");
for (const file of rootFiles) {
  const type = file.isDirectory ? "[DIR]" : "[FILE]";
  console.log(`${type} ${file.name}`);
}

// Read subdirectory
const subFiles = await UsbStorage.readdir(filter, "/Documents");
```

### Read File

```typescript
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";

const filter = { vendorId: 1234, productId: 5678 };

// Read file as binary (Bytes)
const data = await UsbStorage.read(filter, "/data/config.json");
if (data != null) {
  // Convert Bytes to string
  const text = new TextDecoder().decode(data);
  console.log("File contents:", text);
}
```

### Complete Flow Example

```typescript
import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";
import type { IUsbDeviceFilter } from "@simplysm/capacitor-plugin-usb-storage";

async function readUsbFile(filePath: string): Promise<string | undefined> {
  // 1. Search for device
  const devices = await UsbStorage.getDevices();
  if (devices.length === 0) {
    throw new Error("No USB device is connected.");
  }

  const device = devices[0];
  const filter: IUsbDeviceFilter = {
    vendorId: device.vendorId,
    productId: device.productId,
  };

  // 2. Secure permission
  const hasPerm = await UsbStorage.hasPermission(filter);
  if (!hasPerm) {
    const granted = await UsbStorage.requestPermission(filter);
    if (!granted) {
      throw new Error("USB device access permission is required.");
    }
  }

  // 3. Read file
  const data = await UsbStorage.read(filter, filePath);
  if (data == null) {
    return undefined;
  }

  return new TextDecoder().decode(data);
}
```

## Web Emulation (Development/Testing)

In web environments, the `UsbStorageWeb` class is automatically used, providing an IndexedDB-based virtual USB storage. Permission requests are always processed as approved.

`UsbStorageWeb` provides methods for adding virtual devices and files for development and testing purposes.

> **Note**: `UsbStorageWeb` is not re-exported from the main package entry point.
> Import it via a deep path as shown below.

```typescript
import { UsbStorageWeb } from "@simplysm/capacitor-plugin-usb-storage/dist/web/UsbStorageWeb";
```

| Method | Description |
|--------|------|
| `addVirtualDevice(device)` | Register a virtual USB device |
| `addVirtualFile(filter, filePath, data)` | Add a file to virtual device (parent directories created automatically) |
| `addVirtualDirectory(filter, dirPath)` | Add a directory to virtual device |

### Web Emulation Usage Example

```typescript
import { UsbStorageWeb } from "@simplysm/capacitor-plugin-usb-storage/dist/web/UsbStorageWeb";

const web = new UsbStorageWeb();

// Add virtual device
await web.addVirtualDevice({
  vendorId: 1234,
  productId: 5678,
  deviceName: "Virtual USB",
  manufacturerName: "Test Manufacturer",
  productName: "Test USB Drive",
});

const filter = { vendorId: 1234, productId: 5678 };

// Add virtual file
const content = new TextEncoder().encode("Hello, USB!");
await web.addVirtualFile(filter, "/test/hello.txt", content);

// Add virtual directory
await web.addVirtualDirectory(filter, "/test/subdir");
```

## Android Native Implementation Details

The Android native layer uses the `libaums` library to directly handle the USB Mass Storage protocol. Key operations are as follows.

- **Device Search**: Uses `UsbMassStorageDevice.getMassStorageDevices()` to query connected USB Mass Storage devices.
- **Permission Management**: Requests and verifies USB device access permission through Android's `UsbManager`. On Android 12 (API 31) and above, it uses `PendingIntent.FLAG_MUTABLE`, and on Android 13 (API 33) and above, it applies the `RECEIVER_NOT_EXPORTED` flag.
- **File System Access**: Mounts the file system of the first partition to perform directory navigation and file reading.
- **Data Transfer**: File data is Base64-encoded for transmission to the JavaScript layer.

## License

MIT
