export class VirtualFileSystem {
  _dbName;
  _STORE_NAME = "entries";
  _DB_VERSION = 1;
  constructor(_dbName) {
    this._dbName = _dbName;
  }
  async _openDb() {
    return await new Promise((resolve, reject) => {
      const req = indexedDB.open(this._dbName, this._DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this._STORE_NAME)) {
          db.createObjectStore(this._STORE_NAME, { keyPath: "path" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async _withStore(mode, fn) {
    const db = await this._openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(this._STORE_NAME, mode);
      const store = tx.objectStore(this._STORE_NAME);
      let result;
      Promise.resolve(fn(store))
        .then((r) => {
          result = r;
        })
        .catch(reject);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
    });
  }
  async getEntry(filePath) {
    return await this._withStore("readonly", async (store) => {
      return await new Promise((resolve, reject) => {
        const req = store.get(filePath);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    });
  }
  async putEntry(entry) {
    return await this._withStore("readwrite", async (store) => {
      return await new Promise((resolve, reject) => {
        const req = store.put(entry);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    });
  }
  async deleteByPrefix(pathPrefix) {
    return await this._withStore("readwrite", async (store) => {
      return await new Promise((resolve, reject) => {
        const req = store.openCursor();
        let found = false;
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) {
            resolve(found);
            return;
          }
          const key = String(cursor.key);
          if (key === pathPrefix || key.startsWith(pathPrefix + "/")) {
            found = true;
            cursor.delete();
          }
          cursor.continue();
        };
        req.onerror = () => reject(req.error);
      });
    });
  }
  async listChildren(dirPath) {
    const prefix = dirPath === "/" ? "/" : dirPath + "/";
    return await this._withStore("readonly", async (store) => {
      return await new Promise((resolve, reject) => {
        const req = store.openCursor();
        const map = new Map();
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
              const firstSeg = rest.split("/")[0];
              if (firstSeg && !map.has(firstSeg)) {
                const value = cursor.value;
                map.set(firstSeg, value.kind === "dir");
              }
            }
          }
          cursor.continue();
        };
        req.onerror = () => reject(req.error);
      });
    });
  }
  async ensureDir(dirPath) {
    if (dirPath === "/") {
      await this.putEntry({ path: "/", kind: "dir" });
      return;
    }
    const segments = dirPath.split("/").filter(Boolean);
    let acc = "";
    for (const seg of segments) {
      acc += "/" + seg;
      const existing = await this.getEntry(acc);
      if (!existing) {
        await this.putEntry({ path: acc, kind: "dir" });
      }
    }
  }
}
//# sourceMappingURL=VirtualFileSystem.js.map
