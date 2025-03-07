import "./map.extensions";
import { Type } from "../types/type";
import { WrappedType } from "../types/wrap.types";
import { NeverEntryError } from "../errors/never-entry.error";
import { ObjectUtils } from "../utils/object.utils";
import { DateOnly } from "../types/date-only";
import { DateTime } from "../types/date-time";
import { Time } from "../types/time";

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

    toMap<K, V>(keySelector: (item: T, index: number) => K, valueSelector: (item: T, index: number) => V): Map<K, V>;

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

    toMapValues<K, V>(keySelector: (item: T, index: number) => K, valueSelector: (items: T[]) => V): Map<K, V>;

    toObject(keySelector: (item: T, index: number) => string): Record<string, T>;

    toObject<V>(
      keySelector: (item: T, index: number) => string,
      valueSelector: (item: T, index: number) => V,
    ): Record<string, V>;

    toTree<K extends keyof T, P extends keyof T>(keyProp: K, parentKey: P): ITreeArray<T>[];

    distinct(matchAddress?: boolean): T[];

    distinctThis(matchAddress?: boolean): T[];

    orderBy(selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined): T[];

    orderByThis(selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined): T[];

    orderByDesc(selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined): T[];

    orderByDescThis(selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined): T[];

    diffs<P>(target: P[], options?: { keys?: string[]; excludes?: string[] }): TArrayDiffsResult<T, P>[];

    oneWayDiffs<K extends keyof T>(
      orgItems: T[] | Map<T[K], T>,
      key: K,
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

    toMap<K, V>(keySelector: (item: T, index: number) => K, valueSelector: (item: T, index: number) => V): Map<K, V>;

    toMapAsync<K>(keySelector: (item: T, index: number) => Promise<K>): Promise<Map<K, T>>;

    toMapAsync<K, V>(
      keySelector: (item: T, index: number) => Promise<K> | K,
      valueSelector: (item: T, index: number) => Promise<V> | V,
    ): Promise<Map<K, V>>;

    toArrayMap<K, V>(
      keySelector: (item: T, index: number) => K,
      valueSelector: (item: T, index: number) => V,
    ): Map<K, V[]>;

    toMapValues<K, V>(keySelector: (item: T, index: number) => K, valueSelector: (items: T[]) => V): Map<K, V>;

    toObject(keySelector: (item: T, index: number) => string): Record<string, T>;

    toObject<V>(
      keySelector: (item: T, index: number) => string,
      valueSelector: (item: T, index: number) => V,
    ): Record<string, V>;

    toTree<K extends keyof T, P extends keyof T>(keyProp: K, parentKey: P): ITreeArray<T>[];

    distinct(matchAddress?: boolean): T[];

    orderBy(selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined): T[];

    orderByDesc(selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined): T[];

    diffs<P>(target: P[], options?: { keys?: string[]; excludes?: string[] }): TArrayDiffsResult<T, P>[];

    oneWayDiffs<K extends keyof T>(
      orgItems: T[] | Map<T[K], T>,
      key: K,
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
  prototype.single = function <T>(this: T[], predicate?: (item: T, index: number) => boolean): T | undefined {
    const arr = predicate !== undefined ? this.filter(predicate) : this;
    if (arr.length > 1) {
      throw new Error(`복수의 결과물이 있습니다. (${arr.length}개)`);
    }
    return arr[0];
  };

  prototype.first = function <T>(this: T[], predicate?: (item: T, index: number) => boolean): T | undefined {
    return predicate !== undefined ? this.find(predicate) : this[0];
  };

  prototype.filterAsync = async function <T>(
    this: T[],
    predicate: (item: T, index: number) => Promise<boolean>,
  ): Promise<T[]> {
    const arr: T[] = [];
    for (let i = 0; i < this.length; i++) {
      if (await predicate(this[i], i)) {
        arr.push(this[i]);
      }
    }
    return arr;
  };

  prototype.last = function <T>(this: T[], predicate?: (item: T, index: number) => boolean): T | undefined {
    if (predicate !== undefined) {
      for (let i = this.length - 1; i >= 0; i--) {
        if (predicate(this[i], i)) {
          return this[i];
        }
      }

      return undefined;
    }
    else {
      return this[this.length - 1];
    }
  };

  prototype.filterExists = function <T>(this: T[]): NonNullable<T>[] {
    return this.filter((item) => item != null)/* as NonNullable<T>[]*/;
  };

  prototype.ofType = function <T, N extends T>(this: T[], type: Type<WrappedType<N>>): N[] {
    return this.filter((item) => item instanceof type || (item as any)?.constructor === type) as N[];
  };

  prototype.mapAsync = async function <T, R>(
    this: T[],
    selector: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    const result: R[] = [];
    for (let i = 0; i < this.length; i++) {
      result.push(await selector(this[i], i));
    }
    return result;
  };

  prototype.mapMany = function <T, R>(this: T[], selector?: (item: T, index: number) => R[]): T | R[] {
    const arr: any[] = selector ? this.map(selector) : this;
    return arr.length > 0 ? arr.reduce((p, n) => (p ?? []).concat(n ?? [])) : arr;
  };

  prototype.mapManyAsync = async function <T, R>(
    this: T[],
    selector?: (item: T, index: number) => Promise<R[]>,
  ): Promise<T | R[]> {
    const arr = selector !== undefined ? await this.mapAsync(selector) : this;
    return arr.mapMany();
  };

  prototype.parallelAsync = async function <T, R>(this: T[], fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
    return await Promise.all(this.map(async (item, index) => await fn(item, index)));
  };

  prototype.groupBy = function <T, K, V>(
    this: T[],
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

      const existsRecord = result.single((item) => ObjectUtils.equal(item.key, keyObj));
      if (existsRecord !== undefined) {
        existsRecord.values.push(valueObj);
      }
      else {
        result.push({ key: keyObj, values: [valueObj] });
      }
    }

    return result;
  };

  prototype.toMap = function <T, K, V>(
    this: T[],
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
  };

  prototype.toMapAsync = async function <T, K, V>(
    this: T[],
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
  };

  prototype.toArrayMap = function <T, K, V>(
    this: T[],
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
  };

  prototype.toSetMap = function <T, K, V>(
    this: T[],
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
  };

  prototype.toMapValues = function <T, K, V>(
    this: T[],
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
      const valueObj = valueSelector !== undefined ? valueSelector(item, i) : item;

      if (result[key] !== undefined) {
        throw new Error(`키가 중복되었습니다. (중복된키: ${key})`);
      }
      result[key] = valueObj;
    }

    return result;
  };

  prototype.toTree = function <T, K extends keyof T, P extends keyof T>(
    this: T[],
    key: K,
    parentKey: P,
  ): ITreeArray<T>[] {
    const fn = (items: T[]): ITreeArray<T>[] => {
      return items.map((item) => ({
        ...ObjectUtils.clone(item),
        // @ts-expect-error
        children: fn(this.filter((item1) => item1[parentKey] === item[key])),
      }));
    };

    const rootItems = this.filter((item1) => item1[parentKey] == null);
    return fn(rootItems);
  };

  prototype.distinct = function <T>(this: T[], matchAddress?: boolean): T[] {
    const result: T[] = [];
    for (const item of this) {
      if (!result.some((item1) => (matchAddress === true ? item1 === item : ObjectUtils.equal(item1, item)))) {
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
    return this.concat().sort((p, n) => {
      const pn = selector !== undefined ? selector(n) : n;
      const pp = selector !== undefined ? selector(p) : p;

      const cpn =
        pn instanceof DateOnly ? pn.tick : pn instanceof DateTime ? pn.tick : pn instanceof Time ? pn.tick : pn;
      const cpp =
        pp instanceof DateOnly ? pp.tick : pp instanceof DateTime ? pp.tick : pp instanceof Time ? pp.tick : pp;

      if (cpn === cpp) {
        return 0;
      }
      else if (typeof cpn === "string" && typeof cpp === "string") {
        return cpp.localeCompare(cpn);
      }
      else if (typeof cpn === "number" && typeof cpp === "number") {
        return cpn > cpp ? -1 : cpn < cpp ? 1 : 0;
      }
      else if (typeof cpn === "boolean" && typeof cpp === "boolean") {
        return cpn === cpp ? 0 : cpn ? -1 : 1;
      }
      else if (typeof cpp === "undefined") {
        return -1;
      }
      else if (typeof cpn === "undefined") {
        return 1;
      }
      else {
        throw new Error("orderBy를 사용할 수 없는 타입입니다.");
      }
    });
  };

  prototype.orderByThis = function <T>(
    this: T[],
    selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined,
  ): T[] {
    return this.sort((p, n) => {
      const pn = selector !== undefined ? selector(n) : n;
      const pp = selector !== undefined ? selector(p) : p;

      const cpn =
        pn instanceof DateOnly ? pn.tick : pn instanceof DateTime ? pn.tick : pn instanceof Time ? pn.tick : pn;
      const cpp =
        pp instanceof DateOnly ? pp.tick : pp instanceof DateTime ? pp.tick : pp instanceof Time ? pp.tick : pp;

      if (cpn === cpp) {
        return 0;
      }
      else if (typeof cpn === "string" && typeof cpp === "string") {
        return cpp.localeCompare(cpn);
      }
      else if (typeof cpn === "number" && typeof cpp === "number") {
        return cpn > cpp ? -1 : cpn < cpp ? 1 : 0;
      }
      else if (typeof cpn === "boolean" && typeof cpp === "boolean") {
        return cpn === cpp ? 0 : cpn ? -1 : 1;
      }
      else if (typeof cpp === "undefined") {
        return -1;
      }
      else if (typeof cpn === "undefined") {
        return 1;
      }
      else {
        throw new Error("orderBy를 사용할 수 없는 타입입니다.");
      }
    });
  };

  prototype.orderByDesc = function <T>(
    this: T[],
    selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined,
  ): T[] {
    return this.concat().sort((p, n) => {
      const pn = selector !== undefined ? selector(n) : n;
      const pp = selector !== undefined ? selector(p) : p;

      const cpn =
        pn instanceof DateOnly ? pn.tick : pn instanceof DateTime ? pn.tick : pn instanceof Time ? pn.tick : pn;
      const cpp =
        pp instanceof DateOnly ? pp.tick : pp instanceof DateTime ? pp.tick : pp instanceof Time ? pp.tick : pp;

      if (cpn === cpp) {
        return 0;
      }
      else if (typeof cpn === "string" && typeof cpp === "string") {
        return cpn.localeCompare(cpp);
      }
      else if (typeof cpn === "number" && typeof cpp === "number") {
        return cpn < cpp ? -1 : cpn > cpp ? 1 : 0;
      }
      else if (typeof cpn === "boolean" && typeof cpp === "boolean") {
        return cpn === cpp ? 0 : cpn ? 1 : -1;
      }
      else if (typeof cpp === "undefined") {
        return 1;
      }
      else if (typeof cpn === "undefined") {
        return -1;
      }
      else {
        throw new Error("orderBy를 사용할 수 없는 타입입니다.");
      }
    });
  };

  prototype.orderByDescThis = function <T>(
    this: T[],
    selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined,
  ): T[] {
    return this.sort((p, n) => {
      const pn = selector !== undefined ? selector(n) : n;
      const pp = selector !== undefined ? selector(p) : p;

      const cpn =
        pn instanceof DateOnly ? pn.tick : pn instanceof DateTime ? pn.tick : pn instanceof Time ? pn.tick : pn;
      const cpp =
        pp instanceof DateOnly ? pp.tick : pp instanceof DateTime ? pp.tick : pp instanceof Time ? pp.tick : pp;

      if (cpn === cpp) {
        return 0;
      }
      else if (typeof cpn === "string" && typeof cpp === "string") {
        return cpn.localeCompare(cpp);
      }
      else if (typeof cpn === "number" && typeof cpp === "number") {
        return cpn < cpp ? -1 : cpn > cpp ? 1 : 0;
      }
      else if (typeof cpn === "boolean" && typeof cpp === "boolean") {
        return cpn === cpp ? 0 : cpn ? 1 : -1;
      }
      else if (typeof cpp === "undefined") {
        return 1;
      }
      else if (typeof cpn === "undefined") {
        return -1;
      }
      else {
        throw new Error("orderBy를 사용할 수 없는 타입입니다.");
      }
    });
  };

  prototype.diffs = function <T, P>(
    this: T[],
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
      }
      else {
        uncheckedTarget.remove(sameTarget);
      }
    }

    for (const uncheckedTargetItem of uncheckedTarget) {
      //target 에 추가된 항목
      result.push({ source: undefined, target: uncheckedTargetItem });
    }

    return result;
  };

  prototype.oneWayDiffs = function <T extends Record<string, any>, K extends keyof T>(
    this: T[],
    orgItems: T[] | Map<T[K], T>,
    key: K,
    options?: {
      includeSame?: boolean;
      excludes?: string[];
      includes?: string[];
    },
  ): TArrayDiffs2Result<T>[] {
    const orgItemMap = orgItems instanceof Map ? orgItems : orgItems.toMap((orgItem) => orgItem[key]);
    const includeSame = options?.includeSame ?? false;

    const diffs: TArrayDiffs2Result<T>[] = [];
    for (const item of this) {
      if (item[key] === undefined) {
        diffs.push({ type: "create", item, orgItem: undefined });
        continue;
      }

      const orgItem = orgItemMap.get(item[key]);
      if (!orgItem) {
        diffs.push({ type: "create", item, orgItem: undefined });
        continue;
      }

      if (ObjectUtils.equal(orgItem, item, { excludes: options?.excludes, includes: options?.includes })) {
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
  };

  prototype.sum = function <T>(this: T[], selector?: (item: T, index: number) => number): number {
    let result = 0;
    for (let i = 0; i < this.length; i++) {
      const item = selector !== undefined ? selector(this[i], i) : this[i];
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
  };

  prototype.max = function <T>(
    this: T[],
    selector?: (item: T, index: number) => string | number,
  ): string | number | undefined {
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
  };

  prototype.shuffle = function <T>(this: T[]): any[] {
    if (this.length <= 1) {
      return ObjectUtils.clone(this);
    }

    let result = this;
    while (true) {
      result = result.orderBy(() => Math.random());
      if (!ObjectUtils.equal(result, this)) {
        break;
      }
    }
    return result;
  };

  prototype.insert = function <T>(this: T[], index: number, ...items: T[]): T[] {
    this.splice(index, 0, ...items);
    return this;
  };

  prototype.remove = function <T>(this: T[], itemOrSelector: T | ((item: T, index: number) => boolean)): T[] {
    const removeItems =
      typeof itemOrSelector === "function" ? this.filter((itemOrSelector as (item: T, index: number) => boolean).bind(this)) : [itemOrSelector];

    for (const removeItem of removeItems) {
      while (this.includes(removeItem)) {
        this.splice(this.indexOf(removeItem), 1);
      }
    }

    return this;
  };

  prototype.toggle = function <T>(this: T[], item: T): T[] {
    if (this.includes(item)) {
      this.remove(item);
    }
    else {
      this.push(item);
    }
    return this;
  };

  prototype.clear = function <T>(this: T[]): T[] {
    return this.remove(() => true);
  };
})(Array.prototype);

export type TArrayDiffsResult<T, P> =
  | { source: undefined; target: P } // INSERT
  | { source: T; target: undefined } // DELETE
  | { source: T; target: P }; // UPDATE

export type TArrayDiffs2Result<T> =
  | { type: "create"; item: T; orgItem: undefined }
  | { type: "update"; item: T; orgItem: T }
  | { type: "same"; item: T; orgItem: T };

export type ITreeArray<T> = T & { children: ITreeArray<T>[] };
