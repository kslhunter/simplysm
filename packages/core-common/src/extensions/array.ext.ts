/**
 * Array 확장 메서드
 */

import "./map.ext";
import { ObjectUtils } from "../utils/object";
import type { Type } from "../types";
import { DateTime } from "../types/DateTime";
import { DateOnly } from "../types/DateOnly";
import { Time } from "../types/Time";
import { ArgumentError } from "../errors/ArgumentError";
import { SdError } from "../errors/SdError";
import { compareForOrder } from "./array-ext.helpers";
import type {
  ReadonlyArrayExt,
  MutableArrayExt,
  ArrayDiffsResult,
  ArrayDiffs2Result,
  TreeArray,
} from "./array-ext.types";

//#region 구현

const arrayReadonlyExtensions: ReadonlyArrayExt<any> & ThisType<any[]> = {
  single<T>(predicate?: (item: T, index: number) => boolean): T | undefined {
    const arr = predicate !== undefined ? this.filter(predicate) : this;
    if (arr.length > 1) {
      throw new ArgumentError("복수의 결과물이 있습니다.", { count: arr.length });
    }
    return arr[0];
  },

  first<T>(predicate?: (item: T, index: number) => boolean): T | undefined {
    return predicate !== undefined ? this.find(predicate) : this[0];
  },

  async filterAsync<T>(predicate: (item: T, index: number) => Promise<boolean>): Promise<T[]> {
    const arr: T[] = [];
    for (let i = 0; i < this.length; i++) {
      if (await predicate(this[i], i)) {
        arr.push(this[i]);
      }
    }
    return arr;
  },

  last<T>(predicate?: (item: T, index: number) => boolean): T | undefined {
    if (predicate !== undefined) {
      for (let i = this.length - 1; i >= 0; i--) {
        if (predicate(this[i], i)) {
          return this[i];
        }
      }

      return undefined;
    } else {
      return this[this.length - 1];
    }
  },

  filterExists<T>(): NonNullable<T>[] {
    return this.filter((item) => item != null);
  },

  ofType<T, N extends T>(type: Type<N>): N[] {
    return this.filter((item) => item instanceof type || item?.constructor === type) as N[];
  },

  async mapAsync<T, R>(selector: (item: T, index: number) => Promise<R>): Promise<R[]> {
    const result: R[] = [];
    for (let i = 0; i < this.length; i++) {
      result.push(await selector(this[i], i));
    }
    return result;
  },

  mapMany<T, R>(selector?: (item: T, index: number) => R[]): T | R[] {
    const arr = selector ? this.map(selector) : this;
    return arr.flat().filterExists();
  },

  async mapManyAsync<T, R>(selector?: (item: T, index: number) => Promise<R[]>): Promise<T | R[]> {
    const arr = selector !== undefined ? await this.mapAsync(selector) : this;
    return arr.mapMany();
  },

  async parallelAsync<T, R>(fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
    return await Promise.all(this.map(async (item, index) => await fn(item, index)));
  },

  // K도 Object일 수 있음
  groupBy<T, K, V>(
    keySelector: (item: T, index: number) => K,
    valueSelector?: (item: T, index: number) => V,
  ): {
    key: K;
    values: (V | T)[];
  }[] {
    const result: { key: K; values: (V | T)[] }[] = [];

    for (let i = 0; i < this.length; i++) {
      const keyObj = keySelector(this[i], i);
      const valueObj = valueSelector !== undefined ? valueSelector(this[i], i) : this[i];

      const existsRecord = result.find((item) => ObjectUtils.equal(item.key, keyObj));
      if (existsRecord !== undefined) {
        existsRecord.values.push(valueObj);
      } else {
        result.push({ key: keyObj, values: [valueObj] });
      }
    }

    return result;
  },

  toMap<T, K, V>(
    keySelector: (item: T, index: number) => K,
    valueSelector?: (item: T, index: number) => V,
  ): Map<K, V | T> {
    const result = new Map<K, V | T>();

    for (let i = 0; i < this.length; i++) {
      const item = this[i];

      const keyObj = keySelector(item, i);
      const valueObj = valueSelector !== undefined ? valueSelector(item, i) : item;

      if (result.has(keyObj)) {
        throw new ArgumentError("키가 중복되었습니다.", { duplicatedKey: keyObj });
      }
      result.set(keyObj, valueObj);
    }

    return result;
  },

  async toMapAsync<T, K, V>(
    keySelector: (item: T, index: number) => Promise<K> | K,
    valueSelector?: (item: T, index: number) => Promise<V> | V,
  ): Promise<Map<K, V | T>> {
    const result = new Map<K, V | T>();

    for (let i = 0; i < this.length; i++) {
      const item = this[i];

      const keyObj = await keySelector(item, i);
      const valueObj = valueSelector !== undefined ? await valueSelector(item, i) : item;

      if (result.has(keyObj)) {
        throw new ArgumentError("키가 중복되었습니다.", { duplicatedKey: keyObj });
      }
      result.set(keyObj, valueObj);
    }

    return result;
  },

  toArrayMap<T, K, V>(
    keySelector: (item: T, index: number) => K,
    valueSelector?: (item: T, index: number) => V,
  ): Map<K, (V | T)[]> {
    const result = new Map<K, (V | T)[]>();

    for (let i = 0; i < this.length; i++) {
      const item = this[i];

      const keyObj = keySelector(item, i);
      const valueObj = valueSelector !== undefined ? valueSelector(item, i) : item;

      const arr = result.getOrCreate(keyObj, []);
      arr.push(valueObj);
    }

    return result;
  },

  toSetMap<T, K, V>(
    keySelector: (item: T, index: number) => K,
    valueSelector?: (item: T, index: number) => V,
  ): Map<K, Set<V | T>> {
    const result = new Map<K, Set<V | T>>();

    for (let i = 0; i < this.length; i++) {
      const item = this[i];

      const keyObj = keySelector(item, i);
      const valueObj = valueSelector !== undefined ? valueSelector(item, i) : item;

      const set = result.getOrCreate(keyObj, new Set<V | T>());
      set.add(valueObj);
    }

    return result;
  },

  toMapValues<T, K, V>(
    keySelector: (item: T, index: number) => K,
    valueSelector: (items: T[]) => V,
  ): Map<K, V | T> {
    const itemsMap = new Map<K, T[]>();

    for (let i = 0; i < this.length; i++) {
      const item = this[i];

      const keyObj = keySelector(item, i);

      const arr = itemsMap.getOrCreate(keyObj, []);
      arr.push(item);
    }

    const result = new Map<K, V | T>();

    for (const key of itemsMap.keys()) {
      result.set(key, valueSelector(itemsMap.get(key)!));
    }

    return result;
  },

  toObject<T, V>(
    keySelector: (item: T, index: number) => string,
    valueSelector?: (item: T, index: number) => V,
  ): Record<string, V | T | undefined> {
    const result: Record<string, V | T | undefined> = {};

    for (let i = 0; i < this.length; i++) {
      const item = this[i];

      const key = keySelector(item, i);
      const valueObj = valueSelector !== undefined ? valueSelector(item, i) : item;

      if (result[key] !== undefined) {
        throw new ArgumentError("키가 중복되었습니다.", { duplicatedKey: key });
      }
      result[key] = valueObj;
    }

    return result;
  },

  toTree<T, K extends keyof T, P extends keyof T>(key: K, parentKey: P): TreeArray<T>[] {
    // O(n) 최적화: 맵 기반 인덱싱
    const childrenMap = this.toArrayMap((item) => item[parentKey]);

    const fn = (items: T[]): TreeArray<T>[] => {
      return items.map((item) => ({
        ...ObjectUtils.clone(item),
        children: fn(childrenMap.get(item[key]) ?? []),
      }));
    };

    const rootItems = this.filter((item1) => item1[parentKey] == null);
    return fn(rootItems);
  },

  distinct<T>(
    options?: boolean | { matchAddress?: boolean; keyFn?: (item: T) => string | number },
  ): T[] {
    // 옵션 정규화
    const opts =
      typeof options === "boolean" ? { matchAddress: options } : (options ?? {});

    // matchAddress: Set 기반 O(n)
    if (opts.matchAddress === true) return [...new Set(this)];

    // keyFn 제공 시: 커스텀 키 기반 O(n)
    if (opts.keyFn) {
      const seen = new Set<string | number>();
      const result: T[] = [];
      for (const item of this) {
        const key = opts.keyFn(item);
        if (!seen.has(key)) {
          seen.add(key);
          result.push(item);
        }
      }
      return result;
    }

    // 기본: 타입별 처리
    const seen = new Map<string, T>();
    const seenRefs = new Set<symbol | ((...args: unknown[]) => unknown)>(); // symbol/function용 O(n) 처리
    const result: T[] = [];

    for (const item of this) {
      // primitive 타입은 빠른 경로
      if (item === null || typeof item !== "object") {
        const type = typeof item;

        // symbol, function은 Set으로 identity 비교 (O(n))
        if (type === "symbol" || type === "function") {
          if (!seenRefs.has(item)) {
            seenRefs.add(item);
            result.push(item);
          }
          continue;
        }

        // 나머지 primitive는 타입 prefix + 특수 케이스 처리
        let key = type + ":";
        if (Object.is(item, -0)) {
          key += "-0";
        } else {
          key += String(item);
        }

        if (!seen.has(key)) {
          seen.set(key, item);
          result.push(item);
        }
        continue;
      }

      if (!result.some((item1) => ObjectUtils.equal(item1, item))) {
        result.push(item);
      }
    }

    return result;
  },

  orderBy<T>(
    selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined,
  ): T[] {
    return [...this].sort((p, n) => {
      const pp = selector == null ? p : selector(p);
      const pn = selector == null ? n : selector(n);
      return compareForOrder(pp, pn, false);
    });
  },

  orderByDesc<T>(
    selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined,
  ): T[] {
    return [...this].sort((p, n) => {
      const pp = selector == null ? p : selector(p);
      const pn = selector == null ? n : selector(n);
      return compareForOrder(pp, pn, true);
    });
  },

  diffs<T, P>(
    target: P[],
    options?: {
      keys?: string[];
      excludes?: string[];
    },
  ): ArrayDiffsResult<T, P>[] {
    const result: ArrayDiffsResult<T, P>[] = [];

    const uncheckedTarget = [...target];

    for (const sourceItem of this) {
      const sameTarget = uncheckedTarget.single((targetItem) =>
        ObjectUtils.equal(
          targetItem,
          sourceItem,
          options?.excludes !== undefined ? { excludes: options.excludes } : undefined,
        ),
      );

      if (sameTarget === undefined) {
        if (options?.keys !== undefined) {
          const sameKeyTargetItem = uncheckedTarget.single((targetItem) =>
            ObjectUtils.equal(targetItem, sourceItem, { includes: options.keys }),
          );
          if (sameKeyTargetItem !== undefined) {
            result.push({ source: sourceItem, target: sameKeyTargetItem });
            uncheckedTarget.remove(sameKeyTargetItem);
            continue;
          }
        }

        result.push({ source: sourceItem, target: undefined });
      } else {
        uncheckedTarget.remove(sameTarget);
      }
    }

    for (const uncheckedTargetItem of uncheckedTarget) {
      result.push({ source: undefined, target: uncheckedTargetItem });
    }

    return result;
  },

  oneWayDiffs<T extends Record<string, unknown>, K extends keyof T>(
    orgItems: T[] | Map<T[K], T>,
    keyPropNameOrFn: K | ((item: T) => K),
    options?: {
      includeSame?: boolean;
      excludes?: string[];
      includes?: string[];
    },
  ): ArrayDiffs2Result<T>[] {
    const orgItemMap =
      orgItems instanceof Map
        ? orgItems
        : orgItems.toMap((orgItem) =>
            typeof keyPropNameOrFn === "function"
              ? keyPropNameOrFn(orgItem)
              : orgItem[keyPropNameOrFn],
          );
    const includeSame = options?.includeSame ?? false;

    const diffs: ArrayDiffs2Result<T>[] = [];
    for (const item of this) {
      const keyValue =
        typeof keyPropNameOrFn === "function" ? keyPropNameOrFn(item) : item[keyPropNameOrFn];
      if (keyValue == null) {
        diffs.push({ type: "create", item, orgItem: undefined });
        continue;
      }

      const orgItem = orgItemMap.get(keyValue);
      if (!orgItem) {
        diffs.push({ type: "create", item, orgItem: undefined });
        continue;
      }

      if (
        ObjectUtils.equal(orgItem, item, {
          excludes: options?.excludes,
          includes: options?.includes,
        })
      ) {
        if (includeSame) {
          diffs.push({ type: "same", item, orgItem });
        }
        continue;
      }

      diffs.push({ type: "update", item, orgItem });
    }
    return diffs;
  },

  merge<T, P>(
    target: P[],
    options?: {
      keys?: string[];
      excludes?: string[];
    },
  ): (T | P | (T & P))[] {
    const diffs = this.diffs(target, options);

    const result: (T | P | (T & P))[] = ObjectUtils.clone(this);
    for (const diff of diffs) {
      // 변경시
      if (diff.source !== undefined && diff.target !== undefined) {
        const resultSourceItem = result.single((item) => ObjectUtils.equal(item, diff.source));
        if (resultSourceItem === undefined) {
          throw new SdError("예상치 못한 오류: merge에서 source 항목을 찾을 수 없습니다.");
        }
        result[result.indexOf(resultSourceItem)] = ObjectUtils.merge(diff.source, diff.target);
      }
      // 추가시
      else if (diff.target !== undefined) {
        result.push(diff.target);
      }
    }

    return result;
  },

  sum<T>(selector?: (item: T, index: number) => number): number {
    let result = 0;
    for (let i = 0; i < this.length; i++) {
      const item = selector !== undefined ? selector(this[i], i) : this[i];
      if (typeof item !== "number") {
        throw new ArgumentError("sum 은 number 에 대해서만 사용할 수 있습니다.", { type: typeof item });
      }
      result += item;
    }

    return result;
  },

  min<T>(selector?: (item: T, index: number) => string | number): string | number | undefined {
    let result: string | number | undefined;
    for (let i = 0; i < this.length; i++) {
      const item = selector !== undefined ? selector(this[i], i) : this[i];
      if (typeof item !== "number" && typeof item !== "string") {
        throw new ArgumentError("min 은 number/string 에 대해서만 사용할 수 있습니다.", { type: typeof item });
      }
      if (result === undefined || result > item) {
        result = item;
      }
    }

    return result;
  },

  max<T>(selector?: (item: T, index: number) => string | number): string | number | undefined {
    let result: string | number | undefined;
    for (let i = 0; i < this.length; i++) {
      const item = selector !== undefined ? selector(this[i], i) : this[i];
      if (typeof item !== "number" && typeof item !== "string") {
        throw new ArgumentError("max 은 number/string 에 대해서만 사용할 수 있습니다.", { type: typeof item });
      }
      if (result === undefined || result < item) {
        result = item;
      }
    }

    return result;
  },

  shuffle<T>(): T[] {
    if (this.length <= 1) {
      return [...this];
    }

    const result = [...this];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  },
};

const arrayMutableExtensions: MutableArrayExt<any> & ThisType<any[]> = {
  distinctThis<T>(matchAddress?: boolean): T[] {
    // 뒤에서부터 순회, 앞에 같은 요소가 있으면 제거
    for (let i = this.length - 1; i >= 0; i--) {
      const item = this[i];
      let hasDuplicateBefore = false;
      for (let j = 0; j < i; j++) {
        if (matchAddress === true ? this[j] === item : ObjectUtils.equal(this[j], item)) {
          hasDuplicateBefore = true;
          break;
        }
      }
      if (hasDuplicateBefore) {
        this.splice(i, 1);
      }
    }
    return this;
  },

  orderByThis<T>(
    selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined,
  ): T[] {
    return this.sort((p, n) => {
      const pp = selector?.(p) ?? p;
      const pn = selector?.(n) ?? n;
      return compareForOrder(pp, pn, false);
    });
  },

  orderByDescThis<T>(
    selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined,
  ): T[] {
    return this.sort((p, n) => {
      const pp = selector?.(p) ?? p;
      const pn = selector?.(n) ?? n;
      return compareForOrder(pp, pn, true);
    });
  },

  insert<T>(index: number, ...items: T[]): T[] {
    this.splice(index, 0, ...items);
    return this;
  },

  remove<T>(itemOrSelector: T | ((item: T, index: number) => boolean)): T[] {
    const shouldRemove =
      typeof itemOrSelector === "function"
        ? (itemOrSelector as (item: T, index: number) => boolean)
        : (item: T) => item === itemOrSelector;

    // 역방향 순회로 인덱스 변경 문제 방지 (O(n) 성능)
    for (let i = this.length - 1; i >= 0; i--) {
      if (shouldRemove(this[i], i)) {
        this.splice(i, 1);
      }
    }

    return this;
  },

  toggle<T>(this: T[], item: T): T[] {
    if (this.includes(item)) {
      this.remove(item);
    } else {
      this.push(item);
    }
    return this;
  },

  clear<T>(this: T[]): T[] {
    return this.remove(() => true);
  },
};

for (const [name, fn] of Object.entries({
  ...arrayReadonlyExtensions,
  ...arrayMutableExtensions,
})) {
  Object.defineProperty(Array.prototype, name, {
    value: fn,
    enumerable: false,
    writable: true,
    configurable: true,
  });
}

//#endregion

//#region 타입 선언

declare global {
  interface ReadonlyArray<T> extends ReadonlyArrayExt<T> {}
  interface Array<T> extends ReadonlyArrayExt<T>, MutableArrayExt<T> {}
}

//#endregion

export type { ArrayDiffsResult, ArrayDiffs2Result, TreeArray } from "./array-ext.types";
