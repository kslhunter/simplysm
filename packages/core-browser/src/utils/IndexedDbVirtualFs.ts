import type { IndexedDbStore } from "./IndexedDbStore";

export interface VirtualFsEntry {
  kind: "file" | "dir";
  dataBase64?: string;
}

export class IndexedDbVirtualFs {
  constructor(
    private readonly _db: IndexedDbStore,
    private readonly _storeName: string,
    private readonly _keyField: string,
  ) {}

  async getEntry(fullKey: string): Promise<VirtualFsEntry | undefined> {
    return this._db.get<VirtualFsEntry>(this._storeName, fullKey);
  }

  async putEntry(fullKey: string, kind: "file" | "dir", dataBase64?: string): Promise<void> {
    await this._db.put(this._storeName, { [this._keyField]: fullKey, kind, dataBase64 });
  }

  async deleteByPrefix(keyPrefix: string): Promise<boolean> {
    return this._db.withStore(this._storeName, "readwrite", async (store) => {
      return new Promise((resolve, reject) => {
        const req = store.openCursor();
        let found = false;
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) {
            resolve(found);
            return;
          }
          const key = String(cursor.key);
          if (key === keyPrefix || key.startsWith(keyPrefix + "/")) {
            found = true;
            cursor.delete();
          }
          cursor.continue();
        };
        req.onerror = () => reject(req.error);
      });
    });
  }

  async listChildren(prefix: string): Promise<{ name: string; isDirectory: boolean }[]> {
    return this._db.withStore(this._storeName, "readonly", async (store) => {
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
                const firstSeg = segments[0];
                if (!map.has(firstSeg)) {
                  const isDir =
                    segments.length > 1 || (cursor.value as VirtualFsEntry).kind === "dir";
                  map.set(firstSeg, isDir);
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

  async ensureDir(
    fullKeyBuilder: (path: string) => string,
    dirPath: string,
  ): Promise<void> {
    if (dirPath === "/") {
      await this.putEntry(fullKeyBuilder("/"), "dir");
      return;
    }
    const segments = dirPath.split("/").filter(Boolean);
    let acc = "";
    for (const seg of segments) {
      acc += "/" + seg;
      const existing = await this.getEntry(fullKeyBuilder(acc));
      if (!existing) {
        await this.putEntry(fullKeyBuilder(acc), "dir");
      }
    }
  }
}
