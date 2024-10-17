import { Type } from "@simplysm/sd-core-common";
import { IdxDbContext } from "./IdxDbContext";
import { IdxDbStoreDefUtil } from "./IdxDbStoreDefUtil";

export class IdxStore<T extends object> {
  get def() {
    return IdxDbStoreDefUtil.get(this._type);
  }

  constructor(
    private _db: IdxDbContext,
    private _type: Type<T>,
  ) {}

  async get(query: IDBValidKey | IDBKeyRange, indexName?: string): Promise<T | undefined> {
    if (!this._db.idxDb) throw new Error(`${this._db.dbName}(IndexedDB)가 연결되어있지 않습니다.`);
    if (!this._db.idxTrans) throw new Error(`${this._db.dbName}(IndexedDB)의 transaction 설정이 되어있지 않습니다.`);

    return await new Promise<T>((resolve, reject) => {
      const store = this._db.idxTrans!.objectStore(this.def.name);
      const index = indexName != null ? store.index(indexName) : undefined;

      const req = (index ?? store).get(query);
      req.onerror = () => {
        reject(req.error);
      };
      req.onsuccess = () => {
        resolve(req.result);
      };
    });
  }

  async getAll(query?: IDBValidKey | IDBKeyRange, indexName?: string): Promise<T[]> {
    if (!this._db.idxDb) throw new Error(`${this._db.dbName}(IndexedDB)가 연결되어있지 않습니다.`);
    if (!this._db.idxTrans) throw new Error(`${this._db.dbName}(IndexedDB)의 transaction 설정이 되어있지 않습니다.`);

    return await new Promise<T[]>((resolve, reject) => {
      const store = this._db.idxTrans!.objectStore(this.def.name);
      const index = indexName != null ? store.index(indexName) : undefined;

      const req = (index ?? store).getAll(query);
      req.onerror = () => {
        reject(req.error);
      };
      req.onsuccess = () => {
        resolve(req.result);
      };
    });
  }

  async add(data: T): Promise<void> {
    if (!this._db.idxDb) throw new Error(`${this._db.dbName}(IndexedDB)가 연결되어있지 않습니다.`);
    if (!this._db.idxTrans) throw new Error(`${this._db.dbName}(IndexedDB)의 transaction 설정이 되어있지 않습니다.`);

    return await new Promise<void>((resolve, reject) => {
      const req = this._db.idxTrans!.objectStore(this.def.name).add(data);
      req.onerror = () => {
        reject(req.error);
      };
      req.onsuccess = () => {
        resolve();
      };
    });
  }

  async bulkAdds(...items: T[]) {
    if (!this._db.idxDb) throw new Error(`${this._db.dbName}(IndexedDB)가 연결되어있지 않습니다.`);
    if (!this._db.idxTrans) throw new Error(`${this._db.dbName}(IndexedDB)의 transaction 설정이 되어있지 않습니다.`);

    await Promise.all(items.map((item) => this.add(item)));

    //-- "success" 이벤트를 안받아야 빨라짐.
    /*return await new Promise<void>((resolve, reject) => {
      let lastReq: IDBRequest | undefined;
      for (const item of items) {
        const req = this._db.idxTrans!.objectStore(this.def.name).add(item);
        req.onerror = () => {
          reject(req.error);
        };

        lastReq = req;
      }

      if (lastReq) {
        lastReq.onsuccess = () => {
          resolve();
        };
      }
      else {
        resolve();
      }
      resolve();
    });*/
  }

  async put(data: T): Promise<void> {
    if (!this._db.idxDb) throw new Error(`${this._db.dbName}(IndexedDB)가 연결되어있지 않습니다.`);
    if (!this._db.idxTrans) throw new Error(`${this._db.dbName}(IndexedDB)의 transaction 설정이 되어있지 않습니다.`);

    return await new Promise<void>((resolve, reject) => {
      const req = this._db.idxTrans!.objectStore(this.def.name).put(data);
      req.onerror = () => {
        reject(req.error);
      };
      req.onsuccess = () => {
        resolve();
      };
    });
  }

  async bulkPuts(...items: T[]) {
    if (!this._db.idxDb) throw new Error(`${this._db.dbName}(IndexedDB)가 연결되어있지 않습니다.`);
    if (!this._db.idxTrans) throw new Error(`${this._db.dbName}(IndexedDB)의 transaction 설정이 되어있지 않습니다.`);

    //-- "success" 이벤트를 안받아야 빨라짐.
    return await new Promise<void>((resolve, reject) => {
      let lastReq: IDBRequest | undefined;
      for (const item of items) {
        const req = this._db.idxTrans!.objectStore(this.def.name).put(item);
        req.onerror = () => {
          reject(req.error);
          return;
        };

        lastReq = req;
      }

      if (lastReq) {
        lastReq.onsuccess = () => {
          resolve();
        };
      } else {
        resolve();
      }
    });
  }

  async delete(query: IDBValidKey | IDBKeyRange): Promise<void> {
    if (!this._db.idxDb) throw new Error(`${this._db.dbName}(IndexedDB)가 연결되어있지 않습니다.`);
    if (!this._db.idxTrans) throw new Error(`${this._db.dbName}(IndexedDB)의 transaction 설정이 되어있지 않습니다.`);

    return await new Promise<void>((resolve, reject) => {
      const req = this._db.idxTrans!.objectStore(this.def.name).delete(query);
      req.onerror = () => {
        reject(req.error);
      };
      req.onsuccess = () => {
        resolve();
      };
    });
  }

  async clear(): Promise<void> {
    if (!this._db.idxDb) throw new Error(`${this._db.dbName}(IndexedDB)가 연결되어있지 않습니다.`);
    if (!this._db.idxTrans) throw new Error(`${this._db.dbName}(IndexedDB)의 transaction 설정이 되어있지 않습니다.`);

    return await new Promise<void>((resolve, reject) => {
      const req = this._db.idxTrans!.objectStore(this.def.name).clear();
      req.onerror = () => {
        reject(req.error);
      };
      req.onsuccess = () => {
        resolve();
      };
    });
  }
}
