import { open, type Database } from "lmdb";

/**
 * lmdb 기반 persistent key-value 캐시 스토어.
 * JavaScriptTransformer의 JS 변환 결과를 디스크에 캐싱하여
 * 프로세스 재시작 후에도 캐시를 재사용한다.
 *
 * @angular/build의 CacheStore 인터페이스와 구조적으로 호환된다.
 */
export class LmdbCacheStore<V = unknown> {
  private readonly _cachePath: string;
  private _db: Database | undefined;

  constructor(cachePath: string) {
    this._cachePath = cachePath;
  }

  private _ensureDb(): Database {
    this._db ??= open({
      path: this._cachePath,
      compression: true,
    });
    return this._db;
  }

  get(key: string): V | undefined {
    return this._ensureDb().get(key) as V | undefined;
  }

  has(key: string): boolean {
    return this._ensureDb().doesExist(key);
  }

  async set(key: string, value: V): Promise<this> {
    await this._ensureDb().put(key, value);
    return this;
  }

  async close(): Promise<void> {
    try {
      await this._db?.close();
    } catch {
      // close 실패는 치명적이지 않음
    }
  }
}
