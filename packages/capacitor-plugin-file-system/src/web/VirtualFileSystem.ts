import type { IFileInfo } from "../IFileSystemPlugin";

interface FsEntry {
  path: string;
  kind: "file" | "dir";
  dataBase64?: string;
}

export class VirtualFileSystem {
  private readonly _STORE_NAME = "entries";
  private readonly _DB_VERSION = 1;

  constructor(private readonly _dbName: string) {}

  private async _openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this._dbName, this._DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this._STORE_NAME)) {
          db.createObjectStore(this._STORE_NAME, { keyPath: "path" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error("Database blocked by another connection"));
    });
  }

  private async _withStore<T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> {
    const db = await this._openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this._STORE_NAME, mode);
      const store = tx.objectStore(this._STORE_NAME);
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

  async getEntry(filePath: string): Promise<FsEntry | undefined> {
    return this._withStore("readonly", async (store) => {
      return new Promise((resolve, reject) => {
        const req = store.get(filePath);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    });
  }

  async putEntry(entry: FsEntry): Promise<void> {
    return this._withStore("readwrite", async (store) => {
      return new Promise((resolve, reject) => {
        const req = store.put(entry);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    });
  }

  async deleteByPrefix(pathPrefix: string): Promise<boolean> {
    return this._withStore("readwrite", async (store) => {
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

  /**
   * 디렉토리의 직접 자식 목록을 반환합니다.
   * @param dirPath 조회할 디렉토리 경로
   * @returns 자식 파일/디렉토리 목록
   * @note 암시적 디렉토리 처리: 파일 경로만 존재하고 디렉토리 엔트리가 없는 경우에도
   * 중간 경로는 디렉토리로 판정됩니다. 예: "/a/b/c.txt"만 저장된 상태에서
   * listChildren("/a") 호출 시 "b"는 isDirectory: true로 반환됩니다.
   */
  async listChildren(dirPath: string): Promise<IFileInfo[]> {
    const prefix = dirPath === "/" ? "/" : dirPath + "/";
    return this._withStore("readonly", async (store) => {
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
                  const isDir = segments.length > 1 || (cursor.value as FsEntry).kind === "dir";
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

  async ensureDir(dirPath: string): Promise<void> {
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
