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
  private readonly _DB_NAME = "capacitor_usb_virtual_storage";
  private readonly _DB_VERSION = 1;
  private readonly _DEVICES_STORE = "devices";
  private readonly _FILES_STORE = "files";

  private async _openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this._DB_NAME, this._DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this._DEVICES_STORE)) {
          db.createObjectStore(this._DEVICES_STORE, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(this._FILES_STORE)) {
          db.createObjectStore(this._FILES_STORE, { keyPath: "fullKey" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error("Database blocked by another connection"));
    });
  }

  private async _withStore<T>(
    storeName: string,
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> {
    const db = await this._openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let result: T;
      Promise.resolve(fn(store))
        .then((r) => {
          result = r;
        })
        .catch((err) => {
          db.close();
          reject(err);
        });
      tx.oncomplete = () => {
        db.close();
        resolve(result);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }

  async addDevice(device: Omit<VirtualDevice, "key">): Promise<void> {
    const key = `${device.vendorId}:${device.productId}`;
    const entry: VirtualDevice = { ...device, key };
    return this._withStore(this._DEVICES_STORE, "readwrite", async (store) => {
      return new Promise((resolve, reject) => {
        const req = store.put(entry);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    });
  }

  async getDevices(): Promise<VirtualDevice[]> {
    return this._withStore(this._DEVICES_STORE, "readonly", async (store) => {
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    });
  }

  async getEntry(deviceKey: string, path: string): Promise<VirtualEntry | undefined> {
    const fullKey = `${deviceKey}:${path}`;
    return this._withStore(this._FILES_STORE, "readonly", async (store) => {
      return new Promise((resolve, reject) => {
        const req = store.get(fullKey);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    });
  }

  async putEntry(entry: Omit<VirtualEntry, "fullKey">): Promise<void> {
    const fullKey = `${entry.deviceKey}:${entry.path}`;
    const fullEntry: VirtualEntry = { ...entry, fullKey };
    return this._withStore(this._FILES_STORE, "readwrite", async (store) => {
      return new Promise((resolve, reject) => {
        const req = store.put(fullEntry);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    });
  }

  async listChildren(deviceKey: string, dirPath: string): Promise<{ name: string; isDirectory: boolean }[]> {
    const prefix = `${deviceKey}:${dirPath === "/" ? "/" : dirPath + "/"}`;
    return this._withStore(this._FILES_STORE, "readonly", async (store) => {
      return new Promise((resolve, reject) => {
        const req = store.openCursor();
        const map = new Map<string, boolean>();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) {
            resolve(Array.from(map.entries()).map(([name, isDirectory]) => ({ name, isDirectory })));
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
                  const isDir = segments.length > 1 || (cursor.value as VirtualEntry).kind === "dir";
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
