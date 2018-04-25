declare interface Array<T> {
    mapMany<R>(predicate: (item: T, index: number) => R[]): R[];
}

Array.prototype.mapMany = function (predicate: (item: any, index: number) => any[]): any[] {
    return this.length > 0 ? this.map(predicate).reduce((p: any, n: any) => p.concat(n)) : [];
};