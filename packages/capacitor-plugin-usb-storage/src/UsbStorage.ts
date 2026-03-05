import { registerPlugin } from "@capacitor/core";
import type {
  UsbDeviceFilter,
  UsbDeviceInfo,
  UsbFileInfo,
  UsbStoragePlugin,
} from "./UsbStoragePlugin";
import type { Bytes } from "@simplysm/core-common";
import { bytes } from "@simplysm/core-common";

const usbStoragePlugin = registerPlugin<UsbStoragePlugin>("UsbStorage", {
  web: async () => {
    const { UsbStorageWeb } = await import("./web/UsbStorageWeb");
    return new UsbStorageWeb();
  },
});

/**
 * Plugin for interacting with USB storage devices
 * - Android: USB Mass Storage access via libaums library
 * - Browser: IndexedDB-based virtual USB storage emulation
 */
export abstract class UsbStorage {
  /**
   * Get list of connected USB devices
   * @returns Array of connected USB device info
   */
  static async getDevices(): Promise<UsbDeviceInfo[]> {
    const result = await usbStoragePlugin.getDevices();
    return result.devices;
  }

  /**
   * Request USB device access permission
   * @param filter vendorId and productId of the USB device to request permission for
   * @returns Whether permission was granted
   */
  static async requestPermissions(filter: UsbDeviceFilter): Promise<boolean> {
    const result = await usbStoragePlugin.requestPermissions(filter);
    return result.granted;
  }

  /**
   * Check if USB device access permission is granted
   * @param filter vendorId and productId of the USB device to check permission for
   * @returns Whether permission is held
   */
  static async checkPermissions(filter: UsbDeviceFilter): Promise<boolean> {
    const result = await usbStoragePlugin.checkPermissions(filter);
    return result.granted;
  }

  /**
   * Read directory contents from USB storage device
   * @param filter vendorId and productId of the target USB device
   * @param dirPath Directory path to read
   * @returns Array of file/folder info in the directory
   */
  static async readdir(filter: UsbDeviceFilter, dirPath: string): Promise<UsbFileInfo[]> {
    const result = await usbStoragePlugin.readdir({ ...filter, path: dirPath });
    return result.files;
  }

  /**
   * Read a file from USB storage device
   * @param filter vendorId and productId of the target USB device
   * @param filePath File path to read
   * @returns Bytes containing file data, or undefined
   */
  static async read(filter: UsbDeviceFilter, filePath: string): Promise<Bytes | undefined> {
    const result = await usbStoragePlugin.read({ ...filter, path: filePath });
    if (result.data == null) {
      return undefined;
    }
    return bytes.fromBase64(result.data);
  }
}
