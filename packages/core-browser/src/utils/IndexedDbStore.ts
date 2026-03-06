export interface StoreConfig {
  name: string;
  keyPath: string;
}

export class IndexedDbStore {
  constructor(
    private readonly _dbName: string,
    private readonly _dbVersion: number,
    private readonly _storeConfigs: StoreConfig[],
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

  async withStore<TResult>(
    storeName: string,
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => Promise<TResult>,
  ): Promise<TResult> {
    const db = await this.open();
    try {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);

      // Await fn result first
      let result: TResult;
      let fnError: unknown;
      try {
        result = await fn(store);
      } catch (err) {
        fnError = err;
        tx.abort();
      }

      // Wait for transaction completion
      return await new Promise<TResult>((resolve, reject) => {
        if (fnError !== undefined) {
          tx.onerror = () => {
            db.close();
            reject(fnError);
          };
        } else {
          tx.oncomplete = () => {
            db.close();
            resolve(result!);
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        }
      });
    } catch (err) {
      db.close();
      throw err;
    }
  }

  async get<TValue>(storeName: string, key: IDBValidKey): Promise<TValue | undefined> {
    return this.withStore(storeName, "readonly", async (store) => {
      return new Promise((resolve, reject) => {
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result as TValue | undefined);
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

  async getAll<TItem>(storeName: string): Promise<TItem[]> {
    return this.withStore(storeName, "readonly", async (store) => {
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result as TItem[]);
        req.onerror = () => reject(req.error);
      });
    });
  }
}
