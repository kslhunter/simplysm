import { IndexedStore } from "./indexed-store";

// TODO: WORKER를 위해 IndexedDb 패키지 분리
export class IndexedDbContext {
  indexedDb?: IDBDatabase;
  indexedTrans?: IDBTransaction;

  constructor(
    public dbName: string,
    private readonly _version: number,
    private readonly _upgradeFn: (oldVersion: number) => void,
  ) {}

  async connectAsync<R>(fn: () => Promise<R>): Promise<R> {
    return await new Promise<R>((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this._version);

      req.onerror = () => {
        reject(req.error);
      };

      req.onsuccess = async () => {
        this.indexedDb = req.result;
        try {
          resolve(await fn());
        } catch (err) {
          reject(err);
        }
        this.indexedDb.close();
        this.indexedDb = undefined;
      };

      req.onupgradeneeded = (e) => {
        this.indexedDb = req.result;
        this._upgradeFn(e.oldVersion);
      };
    });
  }

  async transAsync<R>(stores: IndexedStore<any>[], mode: IDBTransactionMode, fn: () => Promise<R>): Promise<R> {
    if (!this.indexedDb) throw new Error(`${this.dbName}(IndexedDB)가 연결되어있지 않습니다.`);

    return await new Promise<R>(async (resolve, reject) => {
      try {
        this.indexedTrans = this.indexedDb!.transaction(
          stores.map((item) => item.def.name),
          mode,
        );
        const result = await fn();

        this.indexedTrans.oncomplete = () => {
          resolve(result);
        };

        this.indexedTrans.onerror = () => {
          reject(this.indexedTrans!.error);
        };
      } catch (err) {
        try {
          this.indexedTrans!.abort();
        } catch {}
        reject(err);
      }
    });
  }

  forceInit() {
    if (!this.indexedDb) throw new Error(`${this.dbName}(IndexedDB)가 연결되어있지 않습니다.`);

    for (const objectStoreName of Array.from(this.indexedDb.objectStoreNames)) {
      this.indexedDb.deleteObjectStore(objectStoreName);
    }

    const storeDefs = Object.keys(this)
      .filter((key) => !key.startsWith("_"))
      .map((key) => this[key])
      .ofType<IndexedStore<any>>(IndexedStore)
      .map((store) => store.def)
      .filterExists();

    for (const storeDef of storeDefs) {
      const store = this.indexedDb.createObjectStore(
        storeDef.name,
        storeDef.key
          ? storeDef.key.autoIncrement
            ? {
                keyPath: storeDef.key.columns[0].name,
                autoIncrement: true,
              }
            : {
                keyPath: storeDef.key.columns.orderBy((item) => item.order).map((item) => item.name),
              }
          : undefined,
      );

      for (const index of storeDef.indexes) {
        store.createIndex(
          index.name,
          index.columns.orderBy((item) => item.order).map((item) => item.name),
          {
            multiEntry: index.multiEntry,
            unique: index.unique,
          },
        );
      }

      /*await new Promise<void>((resolve, reject) => {
        store.transaction.oncomplete = () => {
          resolve();
        };

        store.transaction.onerror = () => {
          reject(store.transaction.error);
        };
      });*/
    }
  }
}
