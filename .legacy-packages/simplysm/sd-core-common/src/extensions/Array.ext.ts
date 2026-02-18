import "./Map.ext";
import type { Type } from "../types/type/Type";
import type { WrappedType } from "../types/wrap/WrappedType";
import { NeverEntryError } from "../errors/NeverEntryError";
import { ObjectUtils } from "../utils/ObjectUtils";
import { DateOnly } from "../types/date-time/DateOnly";
import { DateTime } from "../types/date-time/DateTime";
import { Time } from "../types/date-time/Time";

// -----------------------------------------
// 인터페이스
// -----------------------------------------

interface IReadonlyArrayExt<T> {
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

  toTree<K extends keyof T, P extends keyof T>(keyProp: K, parentKey: P): ITreeArray<T>[];

  distinct(matchAddress?: boolean): T[];

  orderBy(selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined): T[];

  orderByDesc(
    selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined,
  ): T[];

  diffs<P>(
    target: P[],
    options?: { keys?: string[]; excludes?: string[] },
  ): TArrayDiffsResult<T, P>[];

  oneWayDiffs<K extends keyof T>(
    orgItems: T[] | Map<T[K], T>,
    keyPropNameOrFn: K | ((item: T) => K),
    options?: {
      includeSame?: boolean;
      excludes?: string[];
      includes?: string[];
    },
  ): TArrayDiffs2Result<T>[];

  merge<P>(target: P[], options?: { keys?: string[]; excludes?: string[] }): (T | P | (T & P))[];

  sum(selector?: (item: T, index: number) => number): number;

  min(): T extends number | string ? T | undefined : never;

  min<P extends number | string>(selector?: (item: T, index: number) => P): P | undefined;

  max(): T extends number | string ? T | undefined : never;

  max<P extends number | string>(selector?: (item: T, index: number) => P): P | undefined;

  shuffle(): T[];
}

interface IMutableArrayExt<T> {
  distinctThis(matchAddress?: boolean): T[];

  orderByThis(
    selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined,
  ): T[];

  orderByDescThis(
    selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined,
  ): T[];

  insert(index: number, ...items: T[]): this;

  remove(item: T): this;

  remove(selector: (item: T, index: number) => boolean): this;

  toggle(item: T): this;

  clear(): this;
}

// -----------------------------------------
// 헬퍼함수
// -----------------------------------------
function toComparable(value: unknown): string | number | boolean | undefined {
  if (value instanceof DateOnly || value instanceof DateTime || value instanceof Time) {
    return value.tick;
  }
  return value as string | number | boolean | undefined;
}

function compareForOrder(pp: unknown, pn: unknown, desc: boolean): number {
  const cpp = toComparable(pp);
  const cpn = toComparable(pn);

  if (cpn === cpp) return 0;
  if (cpp == null) return desc ? 1 : -1;
  if (cpn == null) return desc ? -1 : 1;

  if (typeof cpn === "string" && typeof cpp === "string") {
    return desc ? cpn.localeCompare(cpp) : cpp.localeCompare(cpn);
  }
  if (typeof cpn === "number" && typeof cpp === "number") {
    return desc ? (cpn < cpp ? -1 : cpn > cpp ? 1 : 0) : cpn > cpp ? -1 : cpn < cpp ? 1 : 0;
  }
  if (typeof cpn === "boolean" && typeof cpp === "boolean") {
    return cpn === cpp ? 0 : cpn ? (desc ? 1 : -1) : desc ? -1 : 1;
  }

  throw new Error(`orderBy를 사용할 수 없는 타입입니다. (${typeof cpp}, ${typeof cpn})`);
}

// -----------------------------------------
// 구현
// -----------------------------------------

const arrayReadonlyExtensions: IReadonlyArrayExt<any> & ThisType<any[]> = {
  single<T>(predicate?: (item: T, index: number) => boolean): T | undefined {
    const arr = predicate !== undefined ? this.filter(predicate) : this;
    if (arr.length > 1) {
      throw new Error(`복수의 결과물이 있습니다. (${arr.length}개)`);
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

  ofType<T, N extends T>(type: Type<WrappedType<N>>): N[] {
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
        throw new Error(`키가 중복되었습니다. (중복된키: ${JSON.stringify(keyObj)})`);
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
        throw new Error(`키가 중복되었습니다. (중복된키: ${JSON.stringify(keyObj)})`);
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
        throw new Error(`키가 중복되었습니다. (중복된키: ${key})`);
      }
      result[key] = valueObj;
    }

    return result;
  },

  toTree<T, K extends keyof T, P extends keyof T>(key: K, parentKey: P): ITreeArray<T>[] {
    const fn = (items: T[]): ITreeArray<T>[] => {
      return items.map((item) => ({
        ...ObjectUtils.clone(item),
        children: fn(this.filter((item1) => item1[parentKey] === item[key])),
      }));
    };

    const rootItems = this.filter((item1) => item1[parentKey] == null);
    return fn(rootItems);
  },

  distinct<T>(matchAddress?: boolean): T[] {
    if (matchAddress === true) return [...new Set(this)];

    const seen = new Map<string, T>();
    const result: T[] = [];

    for (const item of this) {
      // primitive 타입은 빠른 경로
      if (item === null || typeof item !== "object") {
        const type = typeof item;

        // symbol, function은 Map key로 직접 사용 (identity 비교)
        if (type === "symbol" || type === "function") {
          if (!result.includes(item)) {
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
    return this.concat().sort((p, n) => {
      const pp = selector == null ? p : selector(p);
      const pn = selector == null ? n : selector(n);
      return compareForOrder(pp, pn, false);
    });
  },

  orderByDesc<T>(
    selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined,
  ): T[] {
    return this.concat().sort((p, n) => {
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
  ): TArrayDiffsResult<T, P>[] {
    const result: TArrayDiffsResult<T, P>[] = [];

    const uncheckedTarget = ([] as P[]).concat(target); // source 비교시, 수정으로 판단되거나 변경사항이 없는것으로 판단된 target 은 제외시킴

    for (const sourceItem of this) {
      //target 에 동일한 항목이 없을 때
      const sameTarget = uncheckedTarget.single((targetItem) =>
        ObjectUtils.equal(
          targetItem,
          sourceItem,
          options?.excludes !== undefined ? { excludes: options.excludes } : undefined,
        ),
      );

      if (sameTarget === undefined) {
        //키 설정시
        if (options?.keys !== undefined) {
          //target 에 동일한 항목은 아니지만, key 가 같은게 있는 경우: source => target 수정된 항목
          const sameKeyTargetItem = uncheckedTarget.single((targetItem) =>
            ObjectUtils.equal(targetItem, sourceItem, { includes: options.keys }),
          );
          if (sameKeyTargetItem !== undefined) {
            result.push({ source: sourceItem, target: sameKeyTargetItem });
            uncheckedTarget.remove(sameKeyTargetItem);
            continue;
          }
        }

        //기타: source 에서 삭제된 항목
        result.push({ source: sourceItem, target: undefined });
      } else {
        uncheckedTarget.remove(sameTarget);
      }
    }

    for (const uncheckedTargetItem of uncheckedTarget) {
      //target 에 추가된 항목
      result.push({ source: undefined, target: uncheckedTargetItem });
    }

    return result;
  },

  oneWayDiffs<T extends Record<string, any>, K extends keyof T>(
    orgItems: T[] | Map<T[K], T>,
    keyPropNameOrFn: K | ((item: T) => K),
    options?: {
      includeSame?: boolean;
      excludes?: string[];
      includes?: string[];
    },
  ): TArrayDiffs2Result<T>[] {
    const orgItemMap =
      orgItems instanceof Map
        ? orgItems
        : orgItems.toMap((orgItem) =>
            typeof keyPropNameOrFn === "function"
              ? keyPropNameOrFn(orgItem)
              : orgItem[keyPropNameOrFn],
          );
    const includeSame = options?.includeSame ?? false;

    const diffs: TArrayDiffs2Result<T>[] = [];
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
          throw new NeverEntryError();
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
        throw new Error("sum 은 number 에 대해서만 사용할 수 있습니다.");
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
        throw new Error("min 은 number/string 에 대해서만 사용할 수 있습니다.");
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
        throw new Error("max 은 number/string 에 대해서만 사용할 수 있습니다.");
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

const arrayMutableExtensions: IMutableArrayExt<any> & ThisType<any[]> = {
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
    const removeItems =
      typeof itemOrSelector === "function"
        ? this.filter((itemOrSelector as (item: T, index: number) => boolean).bind(this))
        : [itemOrSelector];

    for (const removeItem of removeItems) {
      while (this.includes(removeItem)) {
        this.splice(this.indexOf(removeItem), 1);
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

declare global {
  interface ReadonlyArray<T> extends IReadonlyArrayExt<T> {}
  interface Array<T> extends IReadonlyArrayExt<T>, IMutableArrayExt<T> {}
}

export type TArrayDiffsResult<T, P> =
  | { source: undefined; target: P } // INSERT
  | { source: T; target: undefined } // DELETE
  | { source: T; target: P }; // UPDATE

export type TArrayDiffs2Result<T> =
  | { type: "create"; item: T; orgItem: undefined }
  | { type: "update"; item: T; orgItem: T }
  | { type: "same"; item: T; orgItem: T };

export type ITreeArray<T> = T & { children: ITreeArray<T>[] };
