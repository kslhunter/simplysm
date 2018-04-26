declare interface Array<T> {
    mapMany<R>(predicate: (item: T, index: number) => R[]): R[];

    last(predicate?: (item: T, index: number) => boolean): T | undefined;
}

Array.prototype.mapMany = function (predicate: (item: any, index: number) => any[]): any[] {
    return this.length > 0 ? this.map(predicate).reduce((p: any, n: any) => p.concat(n)) : [];
};

Array.prototype.last = function (predicate?: (item: any, index: number) => boolean): any {
    if (predicate) {
        for (let i = this.length - 1; i >= 0; i--) {
            if (predicate(this[i], i)) {
                return this[i];
            }
        }
    }
    else {
        return this[this.length - 1];
    }
};