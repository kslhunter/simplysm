import { IdxStore } from "./IdxStore";

export class IdxDbContext {
  idxDb?: IDBDatabase;
  idxTrans?: IDBTransaction;

  constructor(
    public dbName: string,
    private _version: number,
    private _upgradeFn: (oldVersion: number) => void,
  ) {}

  async connectAsync<R>(fn: () => Promise<R>): Promise<R> {
    return await new Promise<R>((resolve, reject) => {
      const req = window.indexedDB.open(this.dbName, this._version);

      req.onerror = () => {
        reject(req.error);
      };

      req.onsuccess = async () => {
        this.idxDb = req.result;
        try {
          resolve(await fn());
        } catch (err) {
          reject(err);
        }
        this.idxDb.close();
        this.idxDb = undefined;
      };

      req.onupgradeneeded = (e) => {
        this.idxDb = req.result;
        this._upgradeFn(e.oldVersion);
      };
    });
  }

  async transAsync<R>(stores: IdxStore<any>[], mode: IDBTransactionMode, fn: () => Promise<R>): Promise<R> {
    if (!this.idxDb) throw new Error(`${this.dbName}(IndexedDB)가 연결되어있지 않습니다.`);

    return await new Promise<R>(async (resolve, reject) => {
      try {
        this.idxTrans = this.idxDb!.transaction(
          stores.map((item) => item.def.name),
          mode,
        );
        const result = await fn();

        this.idxTrans.oncomplete = () => {
          resolve(result);
        };

        this.idxTrans.onerror = () => {
          reject(this.idxTrans!.error);
        };
      } catch (err) {
        try {
          this.idxTrans!.abort();
        } catch {}
        reject(err);
      }
    });
  }

  forceInit() {
    if (!this.idxDb) throw new Error(`${this.dbName}(IndexedDB)가 연결되어있지 않습니다.`);

    for (const objectStoreName of Array.from(this.idxDb.objectStoreNames)) {
      this.idxDb.deleteObjectStore(objectStoreName);
    }

    const storeDefs = Object.keys(this)
      .filter((key) => !key.startsWith("_"))
      .map((key) => this[key])
      .ofType<IdxStore<any>>(IdxStore)
      .map((store) => store.def)
      .filterExists();

    for (const storeDef of storeDefs) {
      const store = this.idxDb.createObjectStore(
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

      for (const idx of storeDef.idxs) {
        store.createIndex(
          idx.name,
          idx.columns.orderBy((item) => item.order).map((item) => item.name),
          {
            multiEntry: idx.multiEntry,
            unique: idx.unique,
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
