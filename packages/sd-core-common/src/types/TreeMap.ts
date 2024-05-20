export class TreeMap {
  private readonly _map = new Map<any, any>();

  public set(keys: any[], val: any): void {
    this._getLastMap(keys).set(keys.last(), val);
  }

  public get(keys: any[]): any {
    return this._getLastMap(keys).get(keys.last());
  }

  private _getLastMap(keys: any[]) {
    let currMap = this._map;
    for (const key of keys.slice(0, -1)) {
      if (!currMap.has(key)) {
        currMap.set(key, new Map());
      }

      currMap = currMap.get(key);
    }
    return currMap;
  }
}