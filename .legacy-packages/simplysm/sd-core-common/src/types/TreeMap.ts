export class TreeMap<T> {
  private readonly _map = new Map<any, any>();

  set(keys: any[], val: T): void {
    this._getLastMap(keys).set(keys.last(), val);
  }

  get(keys: any[]): T | undefined {
    return this._getLastMap(keys).get(keys.last());
  }

  getOrCreate(keys: any[], value: T): T {
    return this._getLastMap(keys).getOrCreate(keys.last(), value);
  }

  clear() {
    this._map.clear();
  }

  private _getLastMap(keys: any[]): Map<any, T> {
    let currMap = this._map;
    for (const key of keys.slice(0, -1)) {
      currMap = currMap.getOrCreate(key, new Map());
    }
    return currMap;
  }
}
