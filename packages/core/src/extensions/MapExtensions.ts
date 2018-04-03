interface Map<K, V> {
    toPairedArray(): [K, V][];
}

Map.prototype.toPairedArray = function (): [any, any][] {
    return Array.from(this.entries());
};