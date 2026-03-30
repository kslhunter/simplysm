import type { VirtualFsEntry } from "@simplysm/core-browser";
import { IndexedDbStore, IndexedDbVirtualFs } from "@simplysm/core-browser";

interface VirtualDevice {
  key: string;
  vendorId: number;
  productId: number;
  deviceName: string;
  manufacturerName: string;
  productName: string;
}

export class VirtualUsbStorage {
  private readonly _DEVICES_STORE = "devices";
  private readonly _FILES_STORE = "files";
  private readonly _db: IndexedDbStore;
  private readonly _vfs: IndexedDbVirtualFs;

  constructor() {
    this._db = new IndexedDbStore("capacitor_usb_virtual_storage", 1, [
      { name: this._DEVICES_STORE, keyPath: "key" },
      { name: this._FILES_STORE, keyPath: "fullKey" },
    ]);
    this._vfs = new IndexedDbVirtualFs(this._db, this._FILES_STORE, "fullKey");
  }

  async addDevice(device: Omit<VirtualDevice, "key">): Promise<void> {
    const key = `${device.vendorId}:${device.productId}`;
    const entry: VirtualDevice = { ...device, key };
    return this._db.put(this._DEVICES_STORE, entry);
  }

  async getDevices(): Promise<VirtualDevice[]> {
    return this._db.getAll<VirtualDevice>(this._DEVICES_STORE);
  }

  async getEntry(deviceKey: string, path: string): Promise<VirtualFsEntry | undefined> {
    const fullKey = `${deviceKey}:${path}`;
    return this._vfs.getEntry(fullKey);
  }

  async putEntry(entry: { deviceKey: string; path: string; kind: "file" | "dir"; dataBase64?: string }): Promise<void> {
    const fullKey = `${entry.deviceKey}:${entry.path}`;
    return this._vfs.putEntry(fullKey, entry.kind, entry.dataBase64);
  }

  async listChildren(
    deviceKey: string,
    dirPath: string,
  ): Promise<{ name: string; isDirectory: boolean }[]> {
    const prefix = `${deviceKey}:${dirPath === "/" ? "/" : dirPath + "/"}`;
    return this._vfs.listChildren(prefix);
  }

  async ensureDir(deviceKey: string, dirPath: string): Promise<void> {
    return this._vfs.ensureDir((path) => `${deviceKey}:${path}`, dirPath);
  }
}
