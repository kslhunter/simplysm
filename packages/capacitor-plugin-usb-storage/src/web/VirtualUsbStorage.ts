import { IndexedDbStore } from "./IndexedDbStore";

interface VirtualDevice {
  key: string;
  vendorId: number;
  productId: number;
  deviceName: string;
  manufacturerName: string;
  productName: string;
}

interface VirtualEntry {
  fullKey: string;
  deviceKey: string;
  path: string;
  kind: "file" | "dir";
  dataBase64?: string;
}

export class VirtualUsbStorage {
  private readonly _DEVICES_STORE = "devices";
  private readonly _FILES_STORE = "files";
  private readonly _db: IndexedDbStore;

  constructor() {
    this._db = new IndexedDbStore("capacitor_usb_virtual_storage", 1, [
      { name: this._DEVICES_STORE, keyPath: "key" },
      { name: this._FILES_STORE, keyPath: "fullKey" },
    ]);
  }

  async addDevice(device: Omit<VirtualDevice, "key">): Promise<void> {
    const key = `${device.vendorId}:${device.productId}`;
    const entry: VirtualDevice = { ...device, key };
    return this._db.put(this._DEVICES_STORE, entry);
  }

  async getDevices(): Promise<VirtualDevice[]> {
    return this._db.getAll<VirtualDevice>(this._DEVICES_STORE);
  }

  async getEntry(deviceKey: string, path: string): Promise<VirtualEntry | undefined> {
    const fullKey = `${deviceKey}:${path}`;
    return this._db.get<VirtualEntry>(this._FILES_STORE, fullKey);
  }

  async putEntry(entry: Omit<VirtualEntry, "fullKey">): Promise<void> {
    const fullKey = `${entry.deviceKey}:${entry.path}`;
    const fullEntry: VirtualEntry = { ...entry, fullKey };
    return this._db.put(this._FILES_STORE, fullEntry);
  }

  async listChildren(
    deviceKey: string,
    dirPath: string,
  ): Promise<{ name: string; isDirectory: boolean }[]> {
    const prefix = `${deviceKey}:${dirPath === "/" ? "/" : dirPath + "/"}`;
    return this._db.withStore(this._FILES_STORE, "readonly", async (store) => {
      return new Promise((resolve, reject) => {
        const req = store.openCursor();
        const map = new Map<string, boolean>();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) {
            resolve(
              Array.from(map.entries()).map(([name, isDirectory]) => ({ name, isDirectory })),
            );
            return;
          }
          const key = String(cursor.key);
          if (key.startsWith(prefix)) {
            const rest = key.slice(prefix.length);
            if (rest) {
              const segments = rest.split("/").filter(Boolean);
              if (segments.length > 0) {
                const firstName = segments[0];
                if (!map.has(firstName)) {
                  const isDir =
                    segments.length > 1 || (cursor.value as VirtualEntry).kind === "dir";
                  map.set(firstName, isDir);
                }
              }
            }
          }
          cursor.continue();
        };
        req.onerror = () => reject(req.error);
      });
    });
  }

  async ensureDir(deviceKey: string, dirPath: string): Promise<void> {
    if (dirPath === "/") {
      await this.putEntry({ deviceKey, path: "/", kind: "dir" });
      return;
    }
    const segments = dirPath.split("/").filter(Boolean);
    let acc = "";
    for (const seg of segments) {
      acc += "/" + seg;
      const existing = await this.getEntry(deviceKey, acc);
      if (!existing) {
        await this.putEntry({ deviceKey, path: acc, kind: "dir" });
      }
    }
  }
}
