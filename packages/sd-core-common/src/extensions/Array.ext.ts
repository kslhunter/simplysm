import "./Map.ext";
import { Type } from "../types/type/Type";
import { WrappedType } from "../types/wrap/WrappedType";
import { ObjectUtils } from "../utils/ObjectUtils";
import { DateOnly } from "../types/date-time/DateOnly";
import { DateTime } from "../types/date-time/DateTime";
import { Time } from "../types/date-time/Time";

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
    groupBy<K>(keySelector: (item: T, index: number) => K): { key: K; values: T[] }[];
    groupBy<K, V>(
      keySelector: (item: T, index: number) => K,
      valueSelector: (item: T, index: number) => V,
    ): { key: K; values: V[] }[];
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
      keyPropNameOrFn: K | ((item: T) => K),
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
    ): { key: K; values: V[] }[];
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
      keyPropNameOrFn: K | ((item: T) => K),
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

  // 1차: Map을 통해 참조(Reference)나 Primitive Key를 O(1)로 찾음 (대부분 여기서 걸림)
  // 2차: Map에 없지만 Key가 객체인 경우, ObjectUtils.equal로 전체 Key를 순회하며 찾음 (정합성 보장)
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

      // Map에서 못 찾았는데 Key가 객체라면?, ObjectUtils.equal로 확실하게 찾는다.
      if (!entry && typeof key === "object" && key !== null) {
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

      if (Object.prototype.hasOwnProperty.call(result, key)) {
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

  // [엔진 교체] 정합성 보장 (ObjectUtils.equal 필수 사용)
  prototype.distinct = function <T>(this: T[], matchAddress?: boolean): T[] {
    if (matchAddress) {
      return Array.from(new Set(this));
    }

    const result: T[] = [];
    for (const item of this) {
      // [보완] JSON.stringify는 키 순서 문제로 인해 사용하지 않음.
      // 느리더라도 ObjectUtils.equal을 사용하여 "값 동등성"을 확실히 보장함.
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

  // [엔진 교체: 하이브리드 최적화]
  prototype.diffs = function <T, P>(
    this: T[],
    target: P[],
    options?: { keys?: string[]; excludes?: string[] },
  ): TArrayDiffsResult<T, P>[] {
    // 1. 키가 지정된 경우 -> Map 활용 최적화 시도
    if (options?.keys && options.keys.length > 0) {
      const targetMap = new Map<string, P>();
      const targetRemains = new Set<P>(target);

      // 키 생성 함수: Primitive 값들을 조합하여 Map Key로 사용
      const getMapKey = (item: any): string | undefined => {
        const keyValues = options.keys!.map((k) => item[k]);
        // 만약 키 값 중에 객체가 섞여 있다면 Map 최적화를 포기해야 함 (안전성 우선)
        if (keyValues.some((v) => typeof v === "object" && v !== null)) return undefined;
        return keyValues.join("||__SD_SEP__||"); // 구분자를 넣어 충돌 방지
      };

      // Target 인덱싱
      let canOptimize = true;
      for (const tItem of target) {
        const keyStr = getMapKey(tItem);
        if (keyStr == null) {
          canOptimize = false;
          break;
        }
        targetMap.set(keyStr, tItem);
      }

      // 최적화 가능한 경우 (키가 모두 Primitive일 때 - 대부분의 DB ID 케이스)
      if (canOptimize) {
        const result: TArrayDiffsResult<T, P>[] = [];
        for (const sItem of this) {
          const keyStr = getMapKey(sItem);
          // 소스 키가 생성 안되면(객체 키 등) 로직 오류이므로 undefined 처리
          const tItem = keyStr != null ? targetMap.get(keyStr) : undefined;

          if (tItem != null) {
            // [중요] 키가 같아도 내용은 다를 수 있으므로 ObjectUtils.equal로 최종 변경 확인
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
    }

    // 2. 키가 없거나 키가 복잡한 객체인 경우 -> 기존 O(N^2) 로직 유지 (안전성 보장)
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

      let orgItem = orgItemMap.get(keyValue);

      // [보완] Map에 없지만 키가 객체라면 ObjectUtils로 재검색
      if (!orgItem && typeof keyValue === "object") {
        for (const [mapKey, mapEntry] of orgItemMap) {
          if (ObjectUtils.equal(mapKey, keyValue)) {
            orgItem = mapEntry;
            break;
          }
        }
      }

      if (!orgItem) {
        diffs.push({ type: "create", item, orgItem: undefined });
        continue;
      }

      // [중요] 내용 비교는 반드시 ObjectUtils.equal 사용
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
  };

  prototype.merge = function <T, P>(
    this: T[],
    target: P[],
    options?: {
      keys?: string[];
      excludes?: string[];
    },
  ): (T | P | (T & P))[] {
    // diffs 결과에 의존하므로 로직은 유지하되, 내부적으로 개선된 diffs를 사용하여 성능 향상
    const diffs = this.diffs(target, options);

    // 원본 배열 복사본 (불변성 유지를 위해 새로 생성)
    const result: (T | P | (T & P))[] = ObjectUtils.clone(this);

    for (const diff of diffs) {
      if (diff.source != null && diff.target != null) {
        // UPDATE: ObjectUtils.equal로 찾아서 교체
        const index = result.findIndex((item) => ObjectUtils.equal(item, diff.source));
        if (index !== -1) {
          result[index] = ObjectUtils.merge(diff.source, diff.target);
        }
      } else if (diff.source == null && diff.target != null) {
        // INSERT
        result.push(diff.target);
      } else if (diff.source != null && diff.target == null) {
        // DELETE
        const index = result.findIndex((item) => ObjectUtils.equal(item, diff.source));
        if (index !== -1) {
          result.splice(index, 1);
        }
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
    if (typeof itemOrSelector === "function") {
      const selector = itemOrSelector as (item: T, index: number) => boolean;
      for (let i = this.length - 1; i >= 0; i--) {
        if (selector(this[i], i)) {
          this.splice(i, 1);
        }
      }
    } else {
      let index = this.indexOf(itemOrSelector);
      while (index !== -1) {
        this.splice(index, 1);
        index = this.indexOf(itemOrSelector);
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
  | { source: undefined; target: P }
  | { source: T; target: undefined }
  | { source: T; target: P };

export type TArrayDiffs2Result<T> =
  | { type: "create"; item: T; orgItem: undefined }
  | { type: "update"; item: T; orgItem: T }
  | { type: "same"; item: T; orgItem: T };

export type ITreeArray<T> = T & { children: ITreeArray<T>[] };
