export interface StoreConfig {
  name: string;
  keyPath: string;
}

export class IndexedDbStore {
  private _db: IDBDatabase | undefined;
  private _opening: Promise<IDBDatabase> | undefined;

  constructor(
    private readonly _dbName: string,
    private readonly _dbVersion: number,
    private readonly _storeConfigs: StoreConfig[],
  ) {}

  async open(): Promise<IDBDatabase> {
    if (this._db != null) {
      return this._db;
    }

    if (this._opening != null) {
      return this._opening;
    }

    this._opening = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(this._dbName, this._dbVersion);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const config of this._storeConfigs) {
          if (!db.objectStoreNames.contains(config.name)) {
            db.createObjectStore(config.name, { keyPath: config.keyPath });
          }
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          this._db = undefined;
          this._opening = undefined;
        };
        db.onclose = () => {
          this._db = undefined;
          this._opening = undefined;
        };
        this._db = db;
        this._opening = undefined;
        resolve(db);
      };
      req.onerror = () => {
        this._opening = undefined;
        reject(req.error);
      };
      req.onblocked = () => {
        this._opening = undefined;
        reject(new Error("Database blocked by another connection"));
      };
    });

    return this._opening;
  }

  async withStore<TResult>(
    storeName: string,
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => Promise<TResult>,
  ): Promise<TResult> {
    const db = await this.open();
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);

    // Await fn result first
    let result: TResult;
    let fnError: unknown;
    let hasFnError = false;
    try {
      result = await fn(store);
    } catch (err) {
      fnError = err;
      hasFnError = true;
      tx.abort();
    }

    // Wait for transaction completion
    return await new Promise<TResult>((resolve, reject) => {
      if (hasFnError) {
        tx.onabort = () => {
          reject(fnError);
        };
      } else {
        tx.oncomplete = () => {
          resolve(result!);
        };
        tx.onerror = () => {
          reject(tx.error);
        };
      }
    });
  }

  async get<TValue>(storeName: string, key: IDBValidKey): Promise<TValue | undefined> {
    return this.withStore(storeName, "readonly", async (store) => {
      return this._resolveRequest(store.get(key)) as Promise<TValue | undefined>;
    });
  }

  async put(storeName: string, value: unknown): Promise<void> {
    await this.withStore(storeName, "readwrite", async (store) => {
      await this._resolveRequest(store.put(value));
    });
  }

  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    await this.withStore(storeName, "readwrite", async (store) => {
      await this._resolveRequest(store.delete(key));
    });
  }

  async getAll<TItem>(storeName: string): Promise<TItem[]> {
    return this.withStore(storeName, "readonly", async (store) => {
      return this._resolveRequest(store.getAll()) as Promise<TItem[]>;
    });
  }

  private _resolveRequest<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  close(): void {
    this._db?.close();
    this._db = undefined;
    this._opening = undefined;
  }
}
