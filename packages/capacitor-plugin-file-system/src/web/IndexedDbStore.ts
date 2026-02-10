export interface IStoreConfig {
  name: string;
  keyPath: string;
}

export class IndexedDbStore {
  constructor(
    private readonly _dbName: string,
    private readonly _dbVersion: number,
    private readonly _storeConfigs: IStoreConfig[],
  ) {}

  async open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this._dbName, this._dbVersion);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const config of this._storeConfigs) {
          if (!db.objectStoreNames.contains(config.name)) {
            db.createObjectStore(config.name, { keyPath: config.keyPath });
          }
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error("Database blocked by another connection"));
    });
  }

  async withStore<T>(
    storeName: string,
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> {
    const db = await this.open();
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

  async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    return this.withStore(storeName, "readonly", async (store) => {
      return new Promise((resolve, reject) => {
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      });
    });
  }

  async put(storeName: string, value: unknown): Promise<void> {
    return this.withStore(storeName, "readwrite", async (store) => {
      return new Promise((resolve, reject) => {
        const req = store.put(value);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    return this.withStore(storeName, "readonly", async (store) => {
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result as T[]);
        req.onerror = () => reject(req.error);
      });
    });
  }
}
