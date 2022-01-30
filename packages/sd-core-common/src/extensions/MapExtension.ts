interface Map<K, V> {
  getOrCreate(key: K, newValue: V): V;

  getOrCreate(key: K, newValueFn: () => V): V;
}

((prototype) => {
  prototype.getOrCreate = function <K, V>(this: Map<K, V>, key: K, newValue: V | (() => V)): V {
    if (!this.has(key)) {
      if (newValue instanceof Function) {
        this.set(key, newValue());
      }
      else {
        this.set(key, newValue);
      }
    }

    return this.get(key)!;
  };
})(Map.prototype);
