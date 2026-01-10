/**
 * Array 확장 타입 정의
 */

import type { Type } from "../types";
import type { DateTime } from "../types/DateTime";
import type { DateOnly } from "../types/DateOnly";
import type { Time } from "../types/Time";

//#region 인터페이스

export interface ReadonlyArrayExt<T> {
  single(predicate?: (item: T, index: number) => boolean): T | undefined;

  first(predicate?: (item: T, index: number) => boolean): T | undefined;

  filterAsync(predicate: (item: T, index: number) => Promise<boolean>): Promise<T[]>;

  last(predicate?: (item: T, index: number) => boolean): T | undefined;

  filterExists(): NonNullable<T>[];

  ofType<N extends T>(type: Type<N>): N[];

  mapAsync<R>(selector: (item: T, index: number) => Promise<R>): Promise<R[]>;

  mapMany(): T;

  mapMany<R>(selector: (item: T, index: number) => R[]): R[];

  mapManyAsync<R>(selector: (item: T, index: number) => Promise<R[]>): Promise<R[]>;

  parallelAsync<R>(fn: (item: T, index: number) => Promise<R>): Promise<R[]>;

  groupBy<K>(keySelector: (item: T, index: number) => K): { key: K; values: T[] }[];

  groupBy<K, V>(
    keySelector: (item: T, index: number) => K,
    valueSelector: (item: T, index: number) => V,
  ): {
    key: K;
    values: V[];
  }[];

  toMap<K>(keySelector: (item: T, index: number) => K): Map<K, T>;

  toMap<K, V>(
    keySelector: (item: T, index: number) => K,
    valueSelector: (item: T, index: number) => V,
  ): Map<K, V>;

  toMapAsync<K>(keySelector: (item: T, index: number) => Promise<K>): Promise<Map<K, T>>;

  toMapAsync<K, V>(
    keySelector: (item: T, index: number) => Promise<K> | K,
    valueSelector: (item: T, index: number) => Promise<V> | V,
  ): Promise<Map<K, V>>;

  toArrayMap<K>(keySelector: (item: T, index: number) => K): Map<K, T[]>;

  toArrayMap<K, V>(
    keySelector: (item: T, index: number) => K,
    valueSelector: (item: T, index: number) => V,
  ): Map<K, V[]>;

  toSetMap<K>(keySelector: (item: T, index: number) => K): Map<K, Set<T>>;
  toSetMap<K, V>(
    keySelector: (item: T, index: number) => K,
    valueSelector: (item: T, index: number) => V,
  ): Map<K, Set<V>>;

  toMapValues<K, V>(
    keySelector: (item: T, index: number) => K,
    valueSelector: (items: T[]) => V,
  ): Map<K, V>;

  toObject(keySelector: (item: T, index: number) => string): Record<string, T>;

  toObject<V>(
    keySelector: (item: T, index: number) => string,
    valueSelector: (item: T, index: number) => V,
  ): Record<string, V>;

  toTree<K extends keyof T, P extends keyof T>(keyProp: K, parentKey: P): TreeArray<T>[];

  /**
   * 중복 제거
   * @param options matchAddress: 주소 비교 (true면 Set 사용), keyFn: 커스텀 키 함수 (O(n) 성능)
   */
  distinct(options?: boolean | { matchAddress?: boolean; keyFn?: (item: T) => string | number }): T[];

  orderBy(selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined): T[];

  orderByDesc(
    selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined,
  ): T[];

  diffs<P>(
    target: P[],
    options?: { keys?: string[]; excludes?: string[] },
  ): ArrayDiffsResult<T, P>[];

  oneWayDiffs<K extends keyof T>(
    orgItems: T[] | Map<T[K], T>,
    keyPropNameOrFn: K | ((item: T) => K),
    options?: {
      includeSame?: boolean;
      excludes?: string[];
      includes?: string[];
    },
  ): ArrayDiffs2Result<T>[];

  merge<P>(target: P[], options?: { keys?: string[]; excludes?: string[] }): (T | P | (T & P))[];

  sum(selector?: (item: T, index: number) => number): number;

  min(): T extends number | string ? T | undefined : never;

  min<P extends number | string>(selector?: (item: T, index: number) => P): P | undefined;

  max(): T extends number | string ? T | undefined : never;

  max<P extends number | string>(selector?: (item: T, index: number) => P): P | undefined;

  shuffle(): T[];
}

/**
 * 원본 배열을 변경하는 확장 메서드
 * @mutates 모든 메서드가 원본 배열을 직접 변경합니다
 */
export interface MutableArrayExt<T> {
  /** 원본 배열에서 중복 제거 @mutates */
  distinctThis(matchAddress?: boolean): T[];

  /** 원본 배열 오름차순 정렬 @mutates */
  orderByThis(
    selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined,
  ): T[];

  /** 원본 배열 내림차순 정렬 @mutates */
  orderByDescThis(
    selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined,
  ): T[];

  /** 원본 배열에 항목 삽입 @mutates */
  insert(index: number, ...items: T[]): this;

  /** 원본 배열에서 항목 제거 @mutates */
  remove(item: T): this;

  /** 원본 배열에서 조건에 맞는 항목 제거 @mutates */
  remove(selector: (item: T, index: number) => boolean): this;

  /** 원본 배열에서 항목 토글 (있으면 제거, 없으면 추가) @mutates */
  toggle(item: T): this;

  /** 원본 배열 비우기 @mutates */
  clear(): this;
}

//#endregion

//#region 내보내기 타입

export type ArrayDiffsResult<T, P> =
  | { source: undefined; target: P } // INSERT
  | { source: T; target: undefined } // DELETE
  | { source: T; target: P }; // UPDATE

export type ArrayDiffs2Result<T> =
  | { type: "create"; item: T; orgItem: undefined }
  | { type: "update"; item: T; orgItem: T }
  | { type: "same"; item: T; orgItem: T };

export type TreeArray<T> = T & { children: TreeArray<T>[] };

//#endregion
