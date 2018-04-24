import {JsonConvert} from "../utils/JsonConvert";
import {Type} from "../types/Type";

declare global {
    interface ArrayConstructor {
        firstOrEmptyObject<T>(arr: T[] | undefined, predicate?: (item: T, index: number) => boolean): Partial<T>;
    }

    interface Array<T> {
        groupBy<K extends keyof T>(keyPredicate: K[]): Map<Pick<T, K>, T[]>;

        groupBy<K>(keyPredicate: (item: T, index: number) => K): Map<K, T[]>;

        groupBy<K, V>(keyPredicate: (item: T, index: number) => K, valuePredicate: (item: T, index: number) => V): Map<K, V[]>;

        toMap<K>(keyPredicate: (item: T, index: number) => K): Map<K, T>;

        toMap<K, V>(keyPredicate: (item: T, index: number) => K, valuePredicate: (item: T, index: number) => V): Map<K, V>;

        mapMany<R>(predicate: (item: T, index: number) => R[]): R[];

        first(predicate?: (item: T, index: number) => boolean): T;

        firstOr<R>(replacement: R, predicate?: (item: T, index: number) => boolean): T | R;

        firstOrEmptyObject(predicate?: (item: T, index: number) => boolean): Partial<T>;

        single(predicate?: (item: T, index: number) => boolean): T;

        singleOr<R>(replacement: R, predicate?: (item: T, index: number) => boolean): T | R;

        last(predicate?: (item: T, index: number) => boolean): T;

        lastOr<R>(replacement: R, predicate?: (item: T, index: number) => boolean): T | R;

        sum(): number;

        max(): number;

        min(): number;

        sum<U>(predicate: (item: T) => number | undefined): number;

        max<U>(predicate: (item: T) => number | undefined): number;

        min<U>(predicate: (item: T) => number | undefined): number;

        distinct(predicate?: (item: T, index: number) => boolean): T[];

        orderBy(predicate?: (item: T) => any): T[];

        orderByDesc(predicate?: (item: T) => any): T[];

        pushRange(items: T[]): void;

        insert(index: number, item: T): void;

        remove(item: T | undefined): void;

        removeRange(items: T[]): T[];

        removeRange(predicate: (item: T, index: number) => boolean): T[];

        clear(): void;

        replaceAll(arr: any[]): void;

        mapAsync<R>(predicate: (item: T, index: number) => Promise<R>): Promise<R[]>;

        diff(target: T[]): T[];

        differenceWith<K extends keyof T>(target: T[], keyProps?: K[]): { source?: T; target?: T }[];

        filterExists(): NonNullable<T>[];

        ofType<N>(type: Type<N>): N[];

        merge<K extends keyof T>(target: Partial<T>[], keyProps?: K[]): void;
    }
}

Array.firstOrEmptyObject = function (arr: any[] | undefined, predicate?: (item: any, index: number) => boolean): any {
    if (!arr) {
        return {};
    }
    return arr.firstOr({}, predicate);
};

Array.prototype.groupBy = function (keyPredicate: string[] | ((item: any, index: number) => any), valuePredicate?: (item: any, index: number) => any): Map<any, any[]> {
    const result = new Map<any, any[]>();

    for (let i = 0; i < this.length; i++) {
        const item = this[i];

        let key: any;
        if (keyPredicate instanceof Array) {
            key = {};
            for (const keyPropName of keyPredicate) {
                key[keyPropName] = item[keyPropName];
            }
        }
        else {
            key = keyPredicate(item, i);
        }

        const value = valuePredicate ? valuePredicate(item, i) : item;

        const existsRecord = Array.from(result.entries())
            .singleOr(
                undefined,
                item1 => JSON.stringify(item1[0]) === JSON.stringify(key)
            );

        if (existsRecord) {
            existsRecord[1].push(value);
        }
        else {
            result.set(key, [value]);
        }
    }
    return result;
};

Array.prototype.toMap = function (keyPredicate: (item: any, index: number) => any, valuePredicate?: (item: any, index: number) => any): Map<any, any> {
    const result = new Map<string, any>();

    for (let i = 0; i < this.length; i++) {
        const item = this[i];

        const key = keyPredicate(item, i);
        const value = valuePredicate ? valuePredicate(item, i) : item;

        if (result.has(key)) {
            throw Error(`키가 중복됩니다: ${JsonConvert.stringify(key)}`);
        }
        result.set(key, value);
    }
    return result;
};

Array.prototype.mapMany = function (predicate: (item: any, index: number) => any[]): any[] {
    return this.length > 0 ? this.map(predicate).reduce((p: any, n: any) => p.concat(n)) : [];
};

Array.prototype.first = function (predicate?: (item: any, index: number) => boolean): any {
    const result = this.firstOr(undefined, predicate);
    if (!result) {
        throw new Error("결과물이 없습니다.");
    }
    return result;
};

Array.prototype.firstOr = function (replacement: any, predicate?: (item: any, index: number) => boolean): any {
    if (this.length < 1) {
        return replacement;
    }

    if (predicate) {
        return this.find(predicate) || replacement;
    } else {
        return this[0] || replacement;
    }
};

Array.prototype.firstOrEmptyObject = function (predicate?: (item: any, index: number) => boolean): any {
    return this.firstOr({}, predicate);
};

Array.prototype.single = function (predicate?: (item: any, index: number) => boolean): any {
    const result = this.singleOr(undefined, predicate);
    if (!result) {
        throw new Error("결과물이 없습니다.");
    }
    return result;
};

Array.prototype.singleOr = function (replacement: any, predicate?: (item: any, index: number) => boolean): any {
    let result: any;

    for (let i = 0; i < this.length; i++) {
        const item = this[i];

        if (predicate ? predicate(item, i) : true) {
            if (result !== undefined) {
                throw new Error("복수의 결과물이 있습니다." + JsonConvert.stringify(result) + "\n" + JsonConvert.stringify(item));
            }
            result = item;
        }
    }

    return result || replacement;
};

Array.prototype.last = function (predicate?: (item: any, index: number) => boolean): any {
    const result = this.lastOr(undefined, predicate);
    if (!result) {
        throw new Error("결과물이 없습니다.");
    }
    return result;
};

Array.prototype.lastOr = function (replacement: any, predicate?: (item: any, index: number) => boolean): any {
    for (let i = this.length - 1; i >= 0; i--) {
        const item = this[i];

        if (predicate ? predicate(item, i) : true) {
            return item;
        }
    }
    return replacement;
};

Array.prototype.sum = function (predicate?: (item: any) => number | undefined): number {
    let result = 0;
    for (let item of this) {
        item = predicate ? predicate(item) : item;
        if (result) {
            result += (item || 0);
        } else {
            result = (item || 0);
        }
    }
    return result;
};

Array.prototype.max = function (predicate?: (item: any) => number | undefined): number {
    let result = Number.MIN_VALUE;
    for (let item of this) {
        item = predicate ? predicate(item) : item;

        result = result
            ? Math.max((item || Number.MIN_VALUE), result)
            : (item || Number.MIN_VALUE);
    }
    return result === Number.MIN_VALUE ? 0 : result;
};

Array.prototype.min = function (predicate?: (item: any) => number | undefined): number {
    let result = Number.MAX_VALUE;
    for (let item of this) {
        item = predicate ? predicate(item) : item;
        result = result
            ? Math.min((item || Number.MAX_VALUE), result)
            : (item || Number.MAX_VALUE);
    }
    return result === Number.MAX_VALUE ? 0 : result;
};

Array.prototype.distinct = function (predicate?: (item: any, index: number) => boolean): any[] {
    const result: any[] = [];
    for (let i = 0; i < this.length; i++) {
        const item = predicate ? predicate(this[i], i) : this[i];
        if (result.every(item1 => JsonConvert.stringify(item1) !== JsonConvert.stringify(item))) {
            result.push(item);
        }
    }
    return result;
};

Array.prototype.orderBy = function (predicate?: any): any[] {
    return this.concat().sort((p: any, n: any) => {
        if (predicate && typeof predicate === "function") {
            const pn = predicate(n);
            const pp = predicate(p);
            return pn > pp ? -1 : pn < pp ? 1 : 0;
        }
        else if (predicate && typeof predicate === "string") {
            const pn = n[predicate];
            const pp = p[predicate];
            return pn > pp ? -1 : pn < pp ? 1 : 0;
        }
        else {
            return n > p ? -1 : n < p ? 1 : 0;
        }
    });
};

Array.prototype.orderByDesc = function (predicate?: (item: any) => any): any[] {
    return this.concat().sort((p: any, n: any) => {
        const pn = predicate ? predicate(n) : n;
        const pp = predicate ? predicate(p) : p;
        return pn > pp ? 1 : pn < pp ? -1 : 0;
    });
};

Array.prototype.pushRange = function (items: any[]): void {
    if (!(items instanceof Array)) {
        throw TypeError(typeof items);
    }

    for (const item of items) {
        this.push(item);
    }
};

Array.prototype.insert = function (index: number, item: any): void {
    this.splice(index, 0, item);
};

Array.prototype.remove = function (item: any): void {
    const index = this.indexOf(item);
    if (index > -1) {
        this.splice(index, 1);
    }
};

Array.prototype.removeRange = function (itemsOrPredicate: any[] | ((item: any, index: number) => boolean)): any[] {
    const removeItems = (typeof itemsOrPredicate === "function")
        ? this.filter(itemsOrPredicate)
        : itemsOrPredicate;

    for (const item of removeItems) {
        this.remove(item);
    }

    return this;
};

Array.prototype.clear = function (): void {
    this.splice(0, this.length);
};

Array.prototype.replaceAll = function (arr: any[]): void {
    this.splice.apply(this, [0, this.length].concat(arr));
};

Array.prototype.mapAsync = async function (predicate: (item: any, index: number) => Promise<any>): Promise<any[]> {
    const result: any[] = [];
    for (let i = 0; i < this.length; i++) {
        result.push(await predicate(this[i], i));
    }
    return result;
};

Array.prototype.diff = function (target: any[]): any[] {
    const compare = (act: any, exp: any) => {
        const _compareOneWay = (act: any, exp: any) => {
            if (act instanceof Date) {
                if (!(exp instanceof Date)) {
                    return false;
                }
                if (Math.abs(act.getTime() - exp.getTime()) > 200) {
                    return false;
                }
            }
            else if (act instanceof Array) {
                if (!(exp instanceof Array)) {
                    return false;
                }
                for (const s of act) {
                    if (!exp.find(t => compare(s, t))) {
                        return false;
                    }
                }
            }
            else if (act instanceof Object) {
                if (!(exp instanceof Object)) {
                    return false;
                }
                for (const key of Object.keys(act)) {
                    if (!compare(act[key], exp[key])) {
                        return false;
                    }
                }
            }
            else if (act !== exp) {
                return false;
            }

            return true;
        };

        return _compareOneWay(act, exp) && _compareOneWay(exp, act);
    };

    const result = [];
    for (const s of this) {
        if (!target.find(t => compare(s, t))) {
            result.push(s);
        }
    }

    return result;
};

Array.prototype.differenceWith = function (target: any[], keyProps?: string[]): { source?: any; target?: any }[] {
    if (target.length < 1) {
        return this.map(item => ({source: item}));
    }

    const result = [];

    target = ([] as any[]).concat(target);
    for (const item of this) {
        const targetItem = target.find(targetItem => {
            if (keyProps) {
                return keyProps.every(keyProp => targetItem[keyProp] === item[keyProp]);
            }
            else {
                return Object.equal(targetItem, item);
            }
        });

        // 추가됨
        if (!targetItem) {
            result.push({source: item});
        }
        else {
            // 수정됨
            if (keyProps && !Object.equal(item, targetItem)) {
                result.push({source: item, target: targetItem});
            }
            target.remove(targetItem);
        }
    }

    for (const remainedTargetItem of target) {
        result.push({target: remainedTargetItem});
    }

    /*for (const targetItem of target) {
        const item = this.find(item => {
            if (keyProps) {
                return keyProps.every(keyProp => item[keyProp] === targetItem[keyProp]);
            }
            else {
                return Object.equal(item, targetItem);
            }
        });

        // 삭제됨
        if (!item) {
            result.push({target: targetItem});
        }
    }*/

    return result;
};

Array.prototype.filterExists = function (): any[] {
    return this.filter(item => item);
};

Array.prototype.ofType = function <N>(type: Type<N>): N[] {
    return this.filter(item => item instanceof type);
};

Array.prototype.merge = function (target: any[], keyProps?: string[]): void {
    if (!keyProps) {
        this.forEach((item, i) => {
            Object.assign(item, target[i]);
        });
        if (target.length > this.length) {
            this.pushRange(target.splice(this.length));
        }
    }
    else {
        for (const targetItem of target) {
            const item = this.singleOr(undefined, item => keyProps.every(keyProp => item[keyProp] === targetItem[keyProp]));
            if (item) {
                Object.assign(item, targetItem);
            }
            else {
                this.push(targetItem);
            }
        }
    }
};