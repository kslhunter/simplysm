import { Type } from "../types/Type";
import { WrappedType } from "../types/WrappedType";
import { DateOnly } from "../types/DateOnly";
import { DateTime } from "../types/DateTime";
import { Time } from "../types/Time";
declare global {
    interface Array<T> {
        single(predicate?: (item: T, index: number) => boolean): T | undefined;
        first(predicate?: (item: T, index: number) => boolean): T | undefined;
        filterAsync(predicate: (item: T, index: number) => Promise<boolean>): Promise<T[]>;
        last(predicate?: (item: T, index: number) => boolean): T | undefined;
        filterExists(): NonNullable<T>[];
        ofType<N extends T>(type: Type<WrappedType<N>>): N[];
        mapAsync<R>(selector: (item: T, index: number) => Promise<R>): Promise<R[]>;
        mapMany(): T;
        mapMany<R>(selector: (item: T, index: number) => R[]): R[];
        mapManyAsync<R>(selector: (item: T, index: number) => Promise<R[]>): Promise<R[]>;
        parallelAsync<R>(fn: (item: T, index: number) => Promise<R>): Promise<R[]>;
        groupBy<K>(keySelector: (item: T, index: number) => K): {
            key: K;
            values: T[];
        }[];
        groupBy<K, V>(keySelector: (item: T, index: number) => K, valueSelector: (item: T, index: number) => V): {
            key: K;
            values: V[];
        }[];
        toMap<K>(keySelector: (item: T, index: number) => K): Map<K, T>;
        toMap<K, V>(keySelector: (item: T, index: number) => K, valueSelector: (item: T, index: number) => V): Map<K, V>;
        toMapAsync<K>(keySelector: (item: T, index: number) => Promise<K>): Promise<Map<K, T>>;
        toMapAsync<K, V>(keySelector: (item: T, index: number) => Promise<K> | K, valueSelector: (item: T, index: number) => Promise<V> | V): Promise<Map<K, V>>;
        toObject(keySelector: (item: T, index: number) => string): Record<string, T>;
        toObject<V>(keySelector: (item: T, index: number) => string, valueSelector: (item: T, index: number) => V): Record<string, V>;
        distinct(matchAddress?: boolean): T[];
        distinctThis(matchAddress?: boolean): void;
        orderBy(selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined): T[];
        orderByDesc(selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined): T[];
        diffs<P>(target: P[], options?: {
            keys?: string[];
            excludes?: string[];
        }): TArrayDiffsResult<T, P>[];
        oneWayDiffs<K extends keyof T>(orgItems: T[] | Map<T[K], T>, key: K, options?: {
            includeSame?: boolean;
            excludes?: string[];
        }): TArrayDiffs2Result<T>[];
        merge<P>(target: P[], options?: {
            keys?: string[];
            excludes?: string[];
        }): (T | P | (T & P))[];
        sum(selector?: (item: T, index: number) => number): number;
        min(): T | undefined;
        min<P extends number | string>(selector?: (item: T, index: number) => P): P | undefined;
        max(): T | undefined;
        max<P extends number | string>(selector?: (item: T, index: number) => P): P | undefined;
        shuffle(): T[];
        insert(index: number, ...items: T[]): this;
        remove(item: T): this;
        remove(selector: (item: T, index: number) => boolean): this;
        clear(): this;
    }
    interface ReadonlyArray<T> {
        single(predicate?: (item: T, index: number) => boolean): T | undefined;
        first(predicate?: (item: T, index: number) => boolean): T | undefined;
        filterAsync(predicate: (item: T, index: number) => Promise<boolean>): Promise<T[]>;
        last(predicate?: (item: T, index: number) => boolean): T | undefined;
        filterExists(): NonNullable<T>[];
        ofType<N extends T>(type: Type<WrappedType<N>>): N[];
        mapAsync<R>(selector: (item: T, index: number) => Promise<R>): Promise<R[]>;
        mapMany(): T;
        mapMany<R>(selector: (item: T, index: number) => R[]): R[];
        mapManyAsync<R>(selector: (item: T, index: number) => Promise<R[]>): Promise<R[]>;
        parallelAsync<R>(fn: (item: T, index: number) => Promise<R>): Promise<R[]>;
        groupBy<K>(keySelector: (item: T, index: number) => K): {
            key: K;
            values: T[];
        }[];
        groupBy<K, V>(keySelector: (item: T, index: number) => K, valueSelector: (item: T, index: number) => V): {
            key: K;
            values: V[];
        }[];
        toMap<K>(keySelector: (item: T, index: number) => K): Map<K, T>;
        toMap<K, V>(keySelector: (item: T, index: number) => K, valueSelector: (item: T, index: number) => V): Map<K, V>;
        toMapAsync<K>(keySelector: (item: T, index: number) => Promise<K>): Promise<Map<K, T>>;
        toMapAsync<K, V>(keySelector: (item: T, index: number) => Promise<K> | K, valueSelector: (item: T, index: number) => Promise<V> | V): Promise<Map<K, V>>;
        toObject(keySelector: (item: T, index: number) => string): Record<string, T>;
        toObject<V>(keySelector: (item: T, index: number) => string, valueSelector: (item: T, index: number) => V): Record<string, V>;
        distinct(matchAddress?: boolean): T[];
        orderBy(selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined): T[];
        orderByDesc(selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined): T[];
        diffs<P>(target: P[], options?: {
            keys?: string[];
            excludes?: string[];
        }): TArrayDiffsResult<T, P>[];
        oneWayDiffs<K extends keyof T>(orgItems: T[] | Map<T[K], T>, key: K, options?: {
            includeSame?: boolean;
            excludes?: string[];
        }): TArrayDiffs2Result<T>[];
        merge<P>(target: P[], options?: {
            keys?: string[];
            excludes?: string[];
        }): (T | P | (T & P))[];
        sum(selector?: (item: T, index: number) => number): number;
        min(): T | undefined;
        min<P extends number | string>(selector?: (item: T, index: number) => P): P | undefined;
        max(): T | undefined;
        max<P extends number | string>(selector?: (item: T, index: number) => P): P | undefined;
    }
}
export declare type TArrayDiffsResult<T, P> = {
    source: undefined;
    target: P;
} | // INSERT
{
    source: T;
    target: undefined;
} | // DELETE
{
    source: T;
    target: P;
};
export declare type TArrayDiffs2Result<T> = {
    type: "create";
    item: T;
} | {
    type: "update";
    item: T;
    orgItem: T;
} | {
    type: "same";
    item: T;
    orgItem: T;
};
