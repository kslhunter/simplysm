import "./Map.ext";
import { Type } from "../types/type/Type";
import { WrappedType } from "../types/wrap/WrappedType";
import { ObjectUtils } from "../utils/ObjectUtils";
import { DateOnly } from "../types/date-time/DateOnly";
import { DateTime } from "../types/date-time/DateTime";
import { Time } from "../types/date-time/Time";

declare global {
  interface Array<T> {
    /**
     * 필터에 맞는 하나의 값 찾기 (여러값이 있을 경우 오류 발생)
     * @param predicate 필터
     */
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

    distinctThis(matchAddress?: boolean): T[];

    orderBy(selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined): T[];

    orderByThis(
      selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined,
    ): T[];

    orderByDesc(
      selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined,
    ): T[];

    orderByDescThis(
      selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined,
    ): T[];

    diffs<P>(
      target: P[],
      options?: { keys?: string[]; excludes?: string[] },
    ): TArrayDiffsResult<T, P>[];

    oneWayDiffs<K extends keyof T>(
      orgItems: T[] | Map<T[K], T>,
      keyPropNameOrFn: K | ((item: T) => T[K]),
      options?: {
        includeSame?: boolean;
        excludes?: string[];
        includes?: string[];
      },
    ): TArrayDiffs2Result<T>[];

    merge<P>(target: P[], options?: { keys?: string[]; excludes?: string[] }): (T | P | (T & P))[];

    sum(selector?: (item: T, index: number) => number): number;

    min(): T | undefined;

    min<P extends number | string>(selector?: (item: T, index: number) => P): P | undefined;

    max(): T | undefined;

    max<P extends number | string>(selector?: (item: T, index: number) => P): P | undefined;

    shuffle(): T[];

    insert(index: number, ...items: T[]): this;

    remove(item: T): this;

    remove(selector: (item: T, index: number) => boolean): this;

    toggle(item: T): this;

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

    toArrayMap<K, V>(
      keySelector: (item: T, index: number) => K,
      valueSelector: (item: T, index: number) => V,
    ): Map<K, V[]>;

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
      keyPropNameOrFn: K | ((item: T) => T[K]),
      options?: {
        includeSame?: boolean;
        excludes?: string[];
        includes?: string[];
      },
    ): TArrayDiffs2Result<T>[];

    merge<P>(target: P[], options?: { keys?: string[]; excludes?: string[] }): (T | P | (T & P))[];

    sum(selector?: (item: T, index: number) => number): number;

    min(): T | undefined;

    min<P extends number | string>(selector?: (item: T, index: number) => P): P | undefined;

    max(): T | undefined;

    max<P extends number | string>(selector?: (item: T, index: number) => P): P | undefined;
  }
}

((prototype) => {
  prototype.single = function <T>(
    this: T[],
    predicate?: (item: T, index: number) => boolean,
  ): T | undefined {
    const arr = predicate != null ? this.filter(predicate) : this;
    if (arr.length > 1) {
      throw new Error(`복수의 결과물이 있습니다. (${arr.length}개)`);
    }
    return arr[0];
  };

  prototype.first = function <T>(
    this: T[],
    predicate?: (item: T, index: number) => boolean,
  ): T | undefined {
    return predicate != null ? this.find(predicate) : this[0];
  };

  prototype.filterAsync = async function <T>(
    this: T[],
    predicate: (item: T, index: number) => Promise<boolean>,
  ): Promise<T[]> {
    const results = await Promise.all(this.map((item, index) => predicate(item, index)));
    return this.filter((_, index) => results[index]);
  };

  prototype.last = function <T>(
    this: T[],
    predicate?: (item: T, index: number) => boolean,
  ): T | undefined {
    if (predicate != null) {
      for (let i = this.length - 1; i >= 0; i--) {
        if (predicate(this[i], i)) {
          return this[i];
        }
      }
      return undefined;
    } else {
      return this[this.length - 1];
    }
  };

  prototype.filterExists = function <T>(this: T[]): NonNullable<T>[] {
    return this.filter((item) => item != null);
  };

  prototype.ofType = function <T, N extends T>(this: T[], type: Type<WrappedType<N>>): N[] {
    return this.filter(
      (item) => item instanceof type || (item as any)?.constructor === type,
    ) as N[];
  };

  prototype.mapAsync = async function <T, R>(
    this: T[],
    selector: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    return await Promise.all(this.map((item, index) => selector(item, index)));
  };

  prototype.mapMany = function <T, R>(
    this: T[],
    selector?: (item: T, index: number) => R[],
  ): T | R[] {
    return selector ? this.flatMap(selector) : (this.flat() as T);
  };

  prototype.mapManyAsync = async function <T, R>(
    this: T[],
    selector?: (item: T, index: number) => Promise<R[]>,
  ): Promise<T | R[]> {
    const arr = selector != null ? await this.mapAsync(selector) : this;
    return arr.flat() as T;
  };

  prototype.parallelAsync = async function <T, R>(
    this: T[],
    fn: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    return await Promise.all(this.map(async (item, index) => await fn(item, index)));
  };

  prototype.groupBy = function <T, K, V>(
    this: T[],
    keySelector: (item: T, index: number) => K,
    valueSelector?: (item: T, index: number) => V,
  ): { key: K; values: (V | T)[] }[] {
    const map = new Map<any, { key: K; values: (V | T)[] }>();

    for (let i = 0; i < this.length; i++) {
      const item = this[i];
      const key = keySelector(item, i);
      const value = valueSelector ? valueSelector(item, i) : item;

      let entry = map.get(key);
      if (!entry) {
        for (const [mapKey, mapEntry] of map) {
          if (ObjectUtils.equal(mapKey, key)) {
            entry = mapEntry;
            break;
          }
        }
      }

      if (!entry) {
        entry = { key, values: [] };
        map.set(key, entry);
      }

      entry.values.push(value);
    }

    return Array.from(map.values());
  };

  prototype.toMap = function <T, K, V>(
    this: T[],
    keySelector: (item: T, index: number) => K,
    valueSelector?: (item: T, index: number) => V,
  ): Map<K, V | T> {
    const result = new Map<K, V | T>();

    for (let i = 0; i < this.length; i++) {
      const item = this[i];
      const key = keySelector(item, i);
      const value = valueSelector ? valueSelector(item, i) : item;

      if (result.has(key)) {
        throw new Error(`키가 중복되었습니다. (중복된키: ${JSON.stringify(key)})`);
      }
      result.set(key, value);
    }

    return result;
  };

  prototype.toMapAsync = async function <T, K, V>(
    this: T[],
    keySelector: (item: T, index: number) => Promise<K> | K,
    valueSelector?: (item: T, index: number) => Promise<V> | V,
  ): Promise<Map<K, V | T>> {
    const result = new Map<K, V | T>();

    for (let i = 0; i < this.length; i++) {
      const item = this[i];
      const key = await keySelector(item, i);
      const value = valueSelector ? await valueSelector(item, i) : item;

      if (result.has(key)) {
        throw new Error(`키가 중복되었습니다. (중복된키: ${JSON.stringify(key)})`);
      }
      result.set(key, value);
    }

    return result;
  };

  prototype.toArrayMap = function <T, K, V>(
    this: T[],
    keySelector: (item: T, index: number) => K,
    valueSelector?: (item: T, index: number) => V,
  ): Map<K, (V | T)[]> {
    const result = new Map<K, (V | T)[]>();

    for (let i = 0; i < this.length; i++) {
      const item = this[i];
      const key = keySelector(item, i);
      const value = valueSelector ? valueSelector(item, i) : item;

      const arr = result.getOrCreate(key, []);
      arr.push(value);
    }

    return result;
  };

  prototype.toSetMap = function <T, K, V>(
    this: T[],
    keySelector: (item: T, index: number) => K,
    valueSelector?: (item: T, index: number) => V,
  ): Map<K, Set<V | T>> {
    const result = new Map<K, Set<V | T>>();

    for (let i = 0; i < this.length; i++) {
      const item = this[i];
      const key = keySelector(item, i);
      const value = valueSelector ? valueSelector(item, i) : item;

      const set = result.getOrCreate(key, new Set<V | T>());
      set.add(value);
    }

    return result;
  };

  prototype.toMapValues = function <T, K, V>(
    this: T[],
    keySelector: (item: T, index: number) => K,
    valueSelector: (items: T[]) => V,
  ): Map<K, V | T> {
    const itemsMap = this.toArrayMap(keySelector);
    const result = new Map<K, V | T>();
    for (const [key, items] of itemsMap) {
      result.set(key, valueSelector(items));
    }

    return result;
  };

  prototype.toObject = function <T, V>(
    this: T[],
    keySelector: (item: T, index: number) => string,
    valueSelector?: (item: T, index: number) => V,
  ): Record<string, V | T | undefined> {
    const result: Record<string, V | T | undefined> = {};

    for (let i = 0; i < this.length; i++) {
      const item = this[i];

      const key = keySelector(item, i);
      const value = valueSelector ? valueSelector(item, i) : item;

      if (result[key] != null) {
        throw new Error(`키가 중복되었습니다. (중복된키: ${key})`);
      }
      result[key] = value;
    }

    return result;
  };

  prototype.toTree = function <T, K extends keyof T, P extends keyof T>(
    this: T[],
    key: K,
    parentKey: P,
  ): ITreeArray<T>[] {
    const group = this.groupBy((item) => item[parentKey]);
    const groupMap = new Map(group.map((g) => [g.key, g.values]));

    const fn = (items: T[]): ITreeArray<T>[] => {
      return items.map((item) => {
        const children = groupMap.get(item[key] as any) || [];
        return {
          ...ObjectUtils.clone(item),
          children: fn(children),
        } as ITreeArray<T>;
      });
    };

    const rootItems = this.filter((item) => item[parentKey] == null);
    return fn(rootItems);
  };

  prototype.distinct = function <T>(this: T[], matchAddress?: boolean): T[] {
    if (matchAddress) {
      return Array.from(new Set(this));
    }

    const result: T[] = [];
    for (const item of this) {
      const found = result.some((item1) => ObjectUtils.equal(item1, item));
      if (!found) {
        result.push(item);
      }
    }

    return result;
  };

  prototype.distinctThis = function <T>(this: T[], matchAddress?: boolean): T[] {
    const distinctArray = this.distinct(matchAddress);
    this.clear().push(...distinctArray);

    return this;
  };

  prototype.orderBy = function <T>(
    this: T[],
    selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined,
  ): T[] {
    return this.slice().sort((p, n) => compare(p, n, selector));
  };

  prototype.orderByThis = function <T>(
    this: T[],
    selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined,
  ): T[] {
    return this.sort((p, n) => compare(p, n, selector));
  };

  prototype.orderByDesc = function <T>(
    this: T[],
    selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined,
  ): T[] {
    return this.slice().sort((p, n) => compare(n, p, selector));
  };

  prototype.orderByDescThis = function <T>(
    this: T[],
    selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined,
  ): T[] {
    return this.sort((p, n) => compare(n, p, selector));
  };

  prototype.diffs = function <T, P>(
    this: T[],
    target: P[],
    options?: { keys?: string[]; excludes?: string[] },
  ): TArrayDiffsResult<T, P>[] {
    // 1. 키가 지정된 경우 (Map 활용 최적화, 키 값 타입 강제)
    if (options?.keys && options.keys.length > 0) {
      const targetMap = new Map<string, P>();
      const targetRemains = new Set<P>(target);

      const getMapKey = (item: any): string => {
        const keyValues = options.keys!.map((k) => {
          const val = item[k];
          // [강제] 키 값은 무조건 string 또는 number 여야 함
          if (typeof val !== "string" && typeof val !== "number") {
            throw new Error(
              `diffs의 key로 설정된 '${k}'의 값은 반드시 string 또는 number여야 합니다. (값: ${val})`,
            );
          }
          return val;
        });
        return keyValues.join("||__SD_SEP__||");
      };

      for (const tItem of target) {
        const keyStr = getMapKey(tItem);
        targetMap.set(keyStr, tItem);
      }

      const result: TArrayDiffsResult<T, P>[] = [];
      for (const sItem of this) {
        const keyStr = getMapKey(sItem);
        const tItem = targetMap.get(keyStr);

        if (tItem != null) {
          if (ObjectUtils.equal(sItem, tItem, { excludes: options.excludes })) {
            // 변경 없음
          } else {
            result.push({ source: sItem, target: tItem });
          }
          targetRemains.delete(tItem);
        } else {
          result.push({ source: sItem, target: undefined });
        }
      }

      for (const tItem of targetRemains) {
        result.push({ source: undefined, target: tItem });
      }
      return result;
    }

    // 2. 키가 없는 경우 -> 기존 O(N^2) 로직
    const result: TArrayDiffsResult<T, P>[] = [];
    const uncheckedTarget = [...target];

    for (const sourceItem of this) {
      const sameTargetIndex = uncheckedTarget.findIndex((targetItem) =>
        ObjectUtils.equal(
          targetItem,
          sourceItem,
          options?.excludes ? { excludes: options.excludes } : undefined,
        ),
      );

      if (sameTargetIndex === -1) {
        result.push({ source: sourceItem, target: undefined });
      } else {
        uncheckedTarget.splice(sameTargetIndex, 1);
      }
    }

    for (const uncheckedTargetItem of uncheckedTarget) {
      result.push({ source: undefined, target: uncheckedTargetItem });
    }

    return result;
  };

  prototype.oneWayDiffs = function <T extends Record<string, any>, K extends keyof T>(
    this: T[],
    orgItems: T[] | Map<T[K], T>,
    keyPropNameOrFn: K | ((item: T) => T[K]),
    options?: {
      includeSame?: boolean;
      excludes?: string[];
      includes?: string[];
    },
  ): TArrayDiffs2Result<T>[] {
    // "구"항목의 Map화
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
      // "신"의 키값 가져오기
      const keyValue =
        typeof keyPropNameOrFn === "function" ? keyPropNameOrFn(item) : item[keyPropNameOrFn];

      // 키값이 없으면 create
      if (keyValue == null) {
        diffs.push({ type: "create", item, orgItem: undefined });
        continue;
      }

      // "구"가 없으면 create
      const orgItem = orgItemMap.get(keyValue);
      if (!orgItem) {
        diffs.push({ type: "create", item, orgItem: undefined });
        continue;
      }

      // 신/구가 서로 같으면 same
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

      // update
      diffs.push({ type: "update", item, orgItem });
    }
    return diffs;
  };

  prototype.merge = function <T, P>(
    this: T[],
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
      if (diff.source != null && diff.target != null) {
        // UPDATE: ObjectUtils.equal로 찾아서 교체
        const index = result.findIndex((item) => ObjectUtils.equal(item, diff.source));
        if (index !== -1) {
          result[index] = ObjectUtils.merge(diff.source, diff.target);
        }
      } else if (diff.source == null && diff.target != null) {
        // INSERT
        result.push(diff.target);
      }
    }

    return result;
  };

  prototype.sum = function <T>(this: T[], selector?: (item: T, index: number) => number): number {
    let result = 0;
    for (let i = 0; i < this.length; i++) {
      const item = selector != null ? selector(this[i], i) : this[i];
      if (typeof item !== "number") {
        throw new Error("sum 은 number 에 대해서만 사용할 수 있습니다.");
      }
      result += item;
    }

    return result;
  };

  prototype.min = function <T>(
    this: T[],
    selector?: (item: T, index: number) => string | number,
  ): string | number | undefined {
    let result: string | number | undefined = undefined;
    for (let i = 0; i < this.length; i++) {
      const item = selector != null ? selector(this[i], i) : this[i];
      if (typeof item !== "number" && typeof item !== "string") {
        throw new Error("min 은 number/string 에 대해서만 사용할 수 있습니다.");
      }
      if (result == null || result > item) {
        result = item;
      }
    }

    return result;
  };

  prototype.max = function <T>(
    this: T[],
    selector?: (item: T, index: number) => string | number,
  ): string | number | undefined {
    let result: string | number | undefined = undefined;
    for (let i = 0; i < this.length; i++) {
      const item = selector != null ? selector(this[i], i) : this[i];
      if (typeof item !== "number" && typeof item !== "string") {
        throw new Error("max 은 number/string 에 대해서만 사용할 수 있습니다.");
      }
      if (result == null || result < item) {
        result = item;
      }
    }

    return result;
  };

  prototype.shuffle = function <T>(this: T[]): any[] {
    if (this.length <= 1) {
      return ObjectUtils.clone(this);
    }
    // Fisher-Yates 알고리즘으로 개선
    const result = this.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  prototype.insert = function <T>(this: T[], index: number, ...items: T[]): T[] {
    this.splice(index, 0, ...items);
    return this;
  };

  prototype.remove = function <T>(
    this: T[],
    itemOrSelector: T | ((item: T, index: number) => boolean),
  ): T[] {
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
  };

  prototype.toggle = function <T>(this: T[], item: T): T[] {
    const index = this.indexOf(item);
    if (index !== -1) {
      this.splice(index, 1);
    } else {
      this.push(item);
    }
    return this;
  };

  prototype.clear = function <T>(this: T[]): T[] {
    this.length = 0;
    return this;
  };
})(Array.prototype);


function compare(a: any, b: any, selector?: (item: any) => any) {
  const pn = selector ? selector(a) : a;
  const pp = selector ? selector(b) : b;

  const cpn = pn instanceof DateOnly || pn instanceof DateTime || pn instanceof Time ? pn.tick : pn;
  const cpp = pp instanceof DateOnly || pp instanceof DateTime || pp instanceof Time ? pp.tick : pp;

  if (cpn === cpp) return 0;
  if (typeof cpn === "string" && typeof cpp === "string") return cpn.localeCompare(cpp);
  if (typeof cpn === "number" && typeof cpp === "number") return cpn < cpp ? -1 : 1;
  if (typeof cpn === "boolean" && typeof cpp === "boolean") return cpn === cpp ? 0 : cpn ? -1 : 1;

  if (cpn == null) return 1;
  if (cpp == null) return -1;

  throw new Error(`orderBy를 사용할 수 없는 타입입니다. (${typeof cpp}, ${typeof cpn})`);
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
