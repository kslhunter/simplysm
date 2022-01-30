interface Map<K, V> {
    getOrCreate(key: K, newValue: V): V;
    getOrCreate(key: K, newValueFn: () => V): V;
}
