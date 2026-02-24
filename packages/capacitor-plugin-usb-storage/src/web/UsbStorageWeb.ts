import { WebPlugin } from "@capacitor/core";
import type {
  IUsbDeviceFilter,
  IUsbDeviceInfo,
  IUsbFileInfo,
  IUsbStoragePlugin,
} from "../IUsbStoragePlugin";
import { VirtualUsbStorage } from "./VirtualUsbStorage";
import { bytesToBase64 } from "@simplysm/core-common";

export class UsbStorageWeb extends WebPlugin implements IUsbStoragePlugin {
  private readonly _storage = new VirtualUsbStorage();

  async getDevices(): Promise<{ devices: IUsbDeviceInfo[] }> {
    const devices = await this._storage.getDevices();
    return {
      devices: devices.map((d) => ({
        deviceName: d.deviceName,
        manufacturerName: d.manufacturerName,
        productName: d.productName,
        vendorId: d.vendorId,
        productId: d.productId,
      })),
    };
  }

  async requestPermission(_options: IUsbDeviceFilter): Promise<{ granted: boolean }> {
    return Promise.resolve({ granted: true });
  }

  async hasPermission(_options: IUsbDeviceFilter): Promise<{ granted: boolean }> {
    return Promise.resolve({ granted: true });
  }

  async readdir(options: IUsbDeviceFilter & { path: string }): Promise<{ files: IUsbFileInfo[] }> {
    const deviceKey = `${options.vendorId}:${options.productId}`;
    const devices = await this._storage.getDevices();
    const deviceExists = devices.some((d) => d.key === deviceKey);
    if (!deviceExists) {
      return { files: [] };
    }
    const entry = await this._storage.getEntry(deviceKey, options.path);
    if (!entry || entry.kind !== "dir") {
      return { files: [] };
    }
    const children = await this._storage.listChildren(deviceKey, options.path);
    return { files: children };
  }

  async read(options: IUsbDeviceFilter & { path: string }): Promise<{ data: string | null }> {
    const deviceKey = `${options.vendorId}:${options.productId}`;
    const devices = await this._storage.getDevices();
    const deviceExists = devices.some((d) => d.key === deviceKey);
    if (!deviceExists) {
      return { data: null };
    }
    const entry = await this._storage.getEntry(deviceKey, options.path);
    if (!entry || entry.kind !== "file" || entry.dataBase64 == null) {
      return { data: null };
    }
    return { data: entry.dataBase64 };
  }

  /**
   * Add a virtual USB device. (For testing/development)
   */
  async addVirtualDevice(device: {
    vendorId: number;
    productId: number;
    deviceName: string;
    manufacturerName: string;
    productName: string;
  }): Promise<void> {
    await this._storage.addDevice(device);
  }

  /**
   * Add a file to a virtual USB device. (For testing/development)
   */
  async addVirtualFile(
    filter: IUsbDeviceFilter,
    filePath: string,
    data: Uint8Array,
  ): Promise<void> {
    const deviceKey = `${filter.vendorId}:${filter.productId}`;
    const idx = filePath.lastIndexOf("/");
    const dir = idx === -1 ? "/" : filePath.substring(0, idx) || "/";
    await this._storage.ensureDir(deviceKey, dir);
    await this._storage.putEntry({
      deviceKey,
      path: filePath,
      kind: "file",
      dataBase64: bytesToBase64(data),
    });
  }

  /**
   * Add a directory to a virtual USB device. (For testing/development)
   */
  async addVirtualDirectory(filter: IUsbDeviceFilter, dirPath: string): Promise<void> {
    const deviceKey = `${filter.vendorId}:${filter.productId}`;
    await this._storage.ensureDir(deviceKey, dirPath);
  }
}
