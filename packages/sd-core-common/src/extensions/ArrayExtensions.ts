import {Type, TypeWrap} from "../commons";
import {ObjectUtils} from "../utils/ObjectUtils";
import {NeverEntryError} from "../errors/NeverEntryError";

declare global {
  // tslint:disable-next-line:interface-name
  interface Array<T> {
    single(predicate?: (item: T, index: number) => boolean): T | undefined;

    last(predicate?: (item: T, index: number) => boolean): T | undefined;

    filterExists(): NonNullable<T>[];

    ofType<N extends T>(type: Type<TypeWrap<N>>): N[];

    mapMany<R>(selector: (item: T, index: number) => R[]): R[];

    mapMany(): T;

    mapAsync<R>(selector: (item: T, index: number) => Promise<R>): Promise<R[]>;

    mapManyAsync<R>(selector: (item: T, index: number) => Promise<R[]>): Promise<R[]>;

    parallelAsync<R>(fn: (item: T, index: number) => Promise<R>): Promise<R[]>;

    groupBy<K>(keySelector: (item: T, index: number) => K): { key: K; values: T[] }[];

    groupBy<K, V>(keySelector: (item: T, index: number) => K, valueSelector: (item: T, index: number) => V): { key: K; values: V[] }[];

    toMap<K>(keySelector: (item: T, index: number) => K): Map<K, T>;

    toMap<K, V>(keySelector: (item: T, index: number) => K, valueSelector: (item: T, index: number) => V): Map<K, V>;

    toObject(keySelector: (item: T, index: number) => string): { [key: string]: T };

    toObject<V>(keySelector: (item: T, index: number) => string, valueSelector: (item: T, index: number) => V): { [key: string]: V };

    distinct(matchAddress?: boolean): T[];

    orderBy(selector?: (item: T) => string | number): T[];

    orderByDesc(selector?: (item: T) => string | number): T[];

    diffs<P>(target: P[], options?: { keys?: string[]; excludes?: string[] }): TArrayDiffsResult<T, P>[];

    merge<P>(target: P[], options?: { keys?: string[]; excludes?: string[] }): (T | (T & P))[];

    sum(selector?: (item: T, index: number) => number): number;

    min(selector?: (item: T, index: number) => number): number | undefined;

    max(selector?: (item: T, index: number) => number): number | undefined;

    shuffle(): T[];

    insert(index: number, item: T): this;

    remove(item: T): this;

    remove(selector: (item: T, index: number) => boolean): this;

    clear(): this;
  }
}

Array.prototype.single = function <T>(this: T[], predicate?: (item: T, index: number) => boolean): T | undefined {
  const arr = predicate !== undefined ? this.filter(predicate) : this;
  if (arr.length > 1) {
    throw new Error("복수의 결과물이 있습니다.");
  }
  return arr[0];
};

Array.prototype.last = function <T>(this: T[], predicate?: (item: T, index: number) => boolean): T | undefined {
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

Array.prototype.filterExists = function <T>(this: T[]): NonNullable<T>[] {
  return this.filter(item => item !== undefined) as NonNullable<T>[];
};

Array.prototype.ofType = function <T, N extends T>(this: T[], type: Type<TypeWrap<N>>): N[] {
  return this.filter(item => item instanceof type || (item as any)?.constructor === type) as N[];
};

Array.prototype.mapMany = function <T, R>(this: T[], selector?: (item: T, index: number) => R[]): R[] {
  const arr: any[] = selector !== undefined ? this.map(selector) : this;
  return arr.length > 0 ? arr.reduce((p: any, n: any) => p.concat(n)) : arr;
};

Array.prototype.mapAsync = async function <T, R>(this: T[], selector: (item: T, index: number) => Promise<R>): Promise<R[]> {
  return await Promise.all(this.map(selector));
};

Array.prototype.mapManyAsync = async function <T, R>(this: T[], selector?: (item: T, index: number) => Promise<R[]>): Promise<R[]> {
  const arr: any[] = selector !== undefined ? await this.mapAsync(selector) : this;
  return arr.mapMany();
};

Array.prototype.parallelAsync = async function <T, R>(this: T[], fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  return await Promise.all(this.map(async (item, index) => await fn(item, index)));
};

Array.prototype.groupBy = function <T, K, V>(this: T[], keySelector: (item: T, index: number) => K, valueSelector?: (item: T, index: number) => V): { key: K; values: (V | T)[] }[] {
  const result: { key: K; values: (V | T)[] }[] = [];

  for (let i = 0; i < this.length; i++) {
    const keyObj = keySelector(this[i], i);
    const valueObj = valueSelector !== undefined ? valueSelector(this[i], i) : this[i];

    const existsRecord = result.single(item => ObjectUtils.equal(item.key, keyObj));
    if (existsRecord !== undefined) {
      existsRecord.values.push(valueObj);
    }
    else {
      result.push({key: keyObj, values: [valueObj]});
    }
  }

  return result;
};

Array.prototype.toMap = function <T, K, V>(this: T[], keySelector: (item: T, index: number) => K, valueSelector?: (item: T, index: number) => V): Map<K, V | T> {
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

Array.prototype.toObject = function <T, V>(this: T[], keySelector: (item: T, index: number) => string, valueSelector?: (item: T, index: number) => V): { [key: string]: V | T | undefined } {
  const result: { [key: string]: V | T | undefined } = {};

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

Array.prototype.distinct = function <T>(this: T[], matchAddress?: boolean): T[] {
  const result: T[] = [];
  for (const item of this) {
    if (!result.some(item1 => (matchAddress === true ? item1 === item : ObjectUtils.equal(item1, item)))) {
      result.push(item);
    }
  }

  return result;
};

Array.prototype.orderBy = function <T>(this: T[], selector?: (item: T) => string | number): T[] {
  return this.concat().sort((p: any, n: any) => {
    const pn = selector !== undefined ? selector(n) : n;
    const pp = selector !== undefined ? selector(p) : p;

    if (typeof pn === "string" && typeof pp === "string") {
      return pp.localeCompare(pn);
    }
    else if (typeof pn === "number" && typeof pp === "number") {
      return (pn > pp ? -1 : pn < pp ? 1 : 0);
    }
    else {
      throw new Error("orderBy 는 string 이나 number 에 대해서만 사용할 수 있습니다.");
    }
  });
};

Array.prototype.orderByDesc = function <T>(this: T[], selector?: (item: T) => string | number): T[] {
  return this.concat().sort((p: any, n: any) => {
    const pn = selector !== undefined ? selector(n) : n;
    const pp = selector !== undefined ? selector(p) : p;

    if (typeof pn === "string" && typeof pp === "string") {
      return pn.localeCompare(pp);
    }
    else if (typeof pn === "number" && typeof pp === "number") {
      return (pn < pp ? -1 : pn > pp ? 1 : 0);
    }
    else {
      throw new Error("orderBy 는 string 이나 number 에 대해서만 사용할 수 있습니다.");
    }
  });
};

Array.prototype.diffs = function <T, P>(this: T[], target: P[], options?: { keys?: string[]; excludes?: string[] }): TArrayDiffsResult<T, P>[] {
  const result: TArrayDiffsResult<T, P>[] = [];

  const uncheckedTarget = ([] as P[]).concat(target); // source 비교시, 수정으로 판단되거나 변경사항이 없는것으로 판단된 target 은 제외시킴

  for (const sourceItem of this) {
    //target 에 동일한 항목이 없을 때
    const sameTarget = uncheckedTarget.single(targetItem => (
      ObjectUtils.equal(targetItem, sourceItem, options?.excludes !== undefined ? {excludes: options.excludes} : undefined)
    ));

    if (sameTarget === undefined) {
      //키 설정시
      if (options?.keys !== undefined) {
        //target 에 동일한 항목은 아니지만, key 가 같은게 있는 경우: source => target 수정된 항목
        const sameKeyTargetItem = uncheckedTarget.single(targetItem => ObjectUtils.equal(targetItem, sourceItem, {keys: options.keys}));
        if (sameKeyTargetItem !== undefined) {
          result.push({source: sourceItem, target: sameKeyTargetItem});
          uncheckedTarget.remove(sameKeyTargetItem);
          continue;
        }
      }

      //기타: source 에서 삭제된 항목
      result.push({source: sourceItem});
    }
    else {
      uncheckedTarget.remove(sameTarget);
    }
  }

  for (const uncheckedTargetItem of uncheckedTarget) {
    //target 에 추가된 항목
    result.push({target: uncheckedTargetItem});
  }

  return result;
};

Array.prototype.merge = function <T, P>(this: T[], target: P[], options?: { keys?: string[]; excludes?: string[] }): (T | P | (T & P))[] {
  const diffs = this.diffs(target, options);

  const result: (T | P | (T & P))[] = ObjectUtils.clone(this);
  for (const diff of diffs) {
    // 변경시
    if (diff.source !== undefined && diff.target !== undefined) {
      const resultSourceItem = result.single(item => ObjectUtils.equal(item, diff.source));
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

Array.prototype.sum = function <T>(this: T[], selector?: (item: T, index: number) => number): number {
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

Array.prototype.min = function <T>(this: T[], selector?: (item: T, index: number) => number): number | undefined {
  let result: number | undefined;
  for (let i = 0; i < this.length; i++) {
    const item = selector !== undefined ? selector(this[i], i) : this[i];
    if (typeof item !== "number") {
      throw new Error("sum 은 number 에 대해서만 사용할 수 있습니다.");
    }
    if (result === undefined || result > item) {
      result = item;
    }
  }

  return result;
};

Array.prototype.max = function <T>(this: T[], selector?: (item: T, index: number) => number): number | undefined {
  let result: number | undefined;
  for (let i = 0; i < this.length; i++) {
    const item = selector !== undefined ? selector(this[i], i) : this[i];
    if (typeof item !== "number") {
      throw new Error("sum 은 number 에 대해서만 사용할 수 있습니다.");
    }
    if (result === undefined || result < item) {
      result = item;
    }
  }

  return result;
};

Array.prototype.shuffle = function <T>(this: T[]): any[] {
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

Array.prototype.insert = function <T>(this: T[], index: number, item: T): T[] {
  this.splice(index, 0, item);
  return this;
};

Array.prototype.remove = function <T>(this: T[], itemOrSelector: T | ((item: T, index: number) => boolean)): T[] {
  const removeItems = typeof itemOrSelector === "function" ? this.filter(itemOrSelector.bind(this)) : [itemOrSelector];

  for (const removeItem of removeItems) {
    while (this.includes(removeItem)) {
      this.splice(this.indexOf(removeItem), 1);
    }
  }

  return this;
};

Array.prototype.clear = function <T>(this: T[]): T[] {
  return this.remove(() => true);
};

export type TArrayDiffsResult<T, P> =
  { source?: T; target: P } | // INSERT
  { source: T; target?: P } | // DELETE
  { source: T; target: P }; // UPDATE