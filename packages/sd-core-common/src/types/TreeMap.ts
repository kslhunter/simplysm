export class TreeMap<T> {
  #map = new Map<any, any>();

  set(keys: any[], val: T): void {
    this.#getLastMap(keys).set(keys.last(), val);
  }

  get(keys: any[]): T | undefined {
    return this.#getLastMap(keys).get(keys.last());
  }

  getOrCreate(keys: any[], value: T): T {
    return this.#getLastMap(keys).getOrCreate(keys.last(), value);
  }

  clear() {
    this.#map.clear();
  }

  #getLastMap(keys: any[]): Map<any, T> {
    let currMap = this.#map;
    for (const key of keys.slice(0, -1)) {
      currMap = currMap.getOrCreate(key, new Map());
    }
    return currMap;
  }
}