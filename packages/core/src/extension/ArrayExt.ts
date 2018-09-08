import {Type} from "../type/Type";
import {JsonConvert} from "../util/JsonConvert";

declare global {
  // tslint:disable-next-line:interface-name
  interface Array<T> {
    groupBy<KK extends Extract<keyof T, string>, K extends { [P in KK]: T[P] }>(keys: KK[]): { key: K; values: T[] }[];

    groupBy<KK extends Extract<keyof T, string>, K extends { [P in KK]: T[P] }, V>(keys: KK[], valueSelector: (item: T, index: number) => V): { key: K; values: V[] }[];

    groupBy<KK extends Extract<keyof T, string>, K extends { [P in KK]: T[P] }, VK extends Extract<keyof T, string>, V extends { [P in VK]: T[P] }>(keys: KK[], valueKeys: VK[]): { key: K; values: V[] }[];

    groupBy<K>(keySelector: (item: T, index: number) => K): { key: K; values: T[] }[];

    groupBy<K, V>(keySelector: (item: T, index: number) => K, valueSelector: (item: T, index: number) => V): { key: K; values: V[] }[];

    groupBy<K, VK extends Extract<keyof T, string>, V extends { [P in VK]: T[P] }>(keySelector: (item: T, index: number) => K, valueKeys: VK[]): { key: K; values: V[] }[];

    toMap<K>(keySelector: (item: T, index: number) => K): Map<K, T>;

    toMap<K, V>(keySelector: (item: T, index: number) => K, valueSelector: (item: T, index: number) => V): Map<K, V>;

    mapMany<R>(selector?: (item: T, index: number) => R[]): R[];

    single(predicate?: (item: T, index: number) => boolean): T | undefined;

    last(predicate?: (item: T, index: number) => boolean): T | undefined;

    sum(): T | undefined;

    sum<P extends NonNullable<any>>(selector: (item: T) => P): P | undefined;

    max(): T | undefined;

    max<P extends NonNullable<any>>(selector: (item: T) => P): P | undefined;

    min(): T | undefined;

    min<P extends NonNullable<any>>(selector: (item: T) => P): P | undefined;

    distinct(): T[];

    orderBy(selector?: (item: T) => any, desc?: boolean): T[];

    pushRange(items: T[]): void;

    insert(index: number, item: T): void;

    remove(item: T): void;

    remove(items: T[]): void;

    remove(predicate: (item: T, index: number) => boolean): void;

    filterExists(): NonNullable<T>[];

    ofType<N>(type: Type<N>): N[];

    diffs<K extends Extract<keyof T, string>>(target: T[], options?: { keyProps?: K[] }): { source?: T; target?: T }[];

    merge<K extends Extract<keyof T, string>>(target: Partial<T>[], options?: { keyProps?: K[]; replacement?: boolean }): void;
  }
}

Array.prototype.groupBy = function (keySelectorOrKeys: ((item: any, index: number) => any) | string[], valueSelectorOrValueKeys?: ((item: any, index: number) => any) | string[]): { key: any; values: any[] }[] {
  const result: { key: any; values: any[] }[] = [];

  for (let i = 0; i < this.length; i++) {
    let keyObj: any;
    if (typeof keySelectorOrKeys === "function") {
      keyObj = keySelectorOrKeys(this[i], i);
    }
    else {
      keyObj = {};
      for (const key of keySelectorOrKeys) {
        keyObj[key] = this[i][key];
      }
    }

    let valueObj: any;
    if (typeof valueSelectorOrValueKeys === "function") {
      valueObj = valueSelectorOrValueKeys(this[i], i);
    }
    else if (valueSelectorOrValueKeys instanceof Array) {
      valueObj = {};
      for (const valueKey of valueSelectorOrValueKeys) {
        valueObj[valueKey] = this[i][valueKey];
      }
    }
    else {
      valueObj = this[i];
    }

    const existsRecord = result.single(item => Object.equal(item.key, keyObj));

    if (existsRecord) {
      existsRecord.values.push(valueObj);
    }
    else {
      result.push({key: keyObj, values: [valueObj]});
    }
  }

  return result;
};

Array.prototype.toMap = function (keySelector: (item: any, index: number) => any, valueSelector?: (item: any, index: number) => any): Map<any, any> {
  const result = new Map<string, any>();

  for (let i = 0; i < this.length; i++) {
    const item = this[i];

    const key = keySelector(item, i);
    const value = valueSelector ? valueSelector(item, i) : item;

    if (result.has(key)) {
      throw new Error(`키가 중복되었습니다. (중복된키: ${JsonConvert.stringify(key)})`);
    }
    result.set(key, value);
  }

  return result;
};

Array.prototype.mapMany = function (selector?: (item: any, index: number) => any[]): any[] {
  if (this.length < 1) {
    return [];
  }

  return (selector ? this.map(selector) : this).reduce((p: any, n: any) => p.concat(n));
};

Array.prototype.single = function (predicate?: (item: any, index: number) => boolean): any {
  const filtered = predicate ? this.filter(predicate.bind(this)) : this;
  if (filtered.length > 1) {
    throw new Error("복수의 결과물이 있습니다.");
  }
  return filtered[0];
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

Array.prototype.sum = function (selector?: (item: any) => any): any {
  let result;
  for (let item of this) {
    item = selector ? selector(item) : item;
    if (result) {
      result += item;
    }
    else {
      result = item;
    }
  }

  return result;
};

Array.prototype.max = function (selector?: (item: any) => any): any {
  let result;
  for (let item of this) {
    item = selector ? selector(item) : item;
    if (!result || result < item) {
      result = item;
    }
  }

  return result;
};

Array.prototype.min = function (selector?: (item: any) => any): any {
  let result;
  for (let item of this) {
    item = selector ? selector(item) : item;
    if (!result || result > item) {
      result = item;
    }
  }

  return result;
};

Array.prototype.distinct = function (): any[] {
  const result: any[] = [];
  for (const item of this) {
    if (result.every(item1 => !Object.equal(item1, item))) {
      result.push(item);
    }
  }

  return result;
};

Array.prototype.orderBy = function (selector?: (item: any) => any, desc?: boolean): any[] {
  return this.concat().sort((p: any, n: any) => {
    const pn = selector ? selector(n) : n;
    const pp = selector ? selector(p) : p;

    return desc
      ? pn < pp ? -1 : pn > pp ? 1 : 0
      : pn > pp ? -1 : pn < pp ? 1 : 0;
  });
};

Array.prototype.pushRange = function (items: any[]): void {
  for (const item of items) {
    this.push(item);
  }
};

Array.prototype.insert = function (index: number, item: any): void {
  this.splice(index, 0, item);
};

Array.prototype.remove = function (arg: any): void {
  const items = typeof arg === "function" ? this.filter(arg)
    : arg instanceof Array ? arg
      : [arg];

  for (const item of items) {
    while (this.indexOf(item) >= 0) {
      this.splice(this.indexOf(item), 1);
    }
  }
};

Array.prototype.filterExists = function (): any[] {
  return this.filter(item => item !== undefined);
};

Array.prototype.ofType = function <N>(type: Type<N>): N[] {
  return this.filter(item => item instanceof type);
};

Array.prototype.diffs = function (target: any[], options?: { keyProps?: string[] }): { source?: any; target?: any }[] {
  if (target.length < 1) {
    return this.map(item => ({source: item}));
  }

  const result = [];

  const currTarget = ([] as any[]).concat(target);
  for (const item of this) {
    const existsTargetItem = currTarget.find(targetItem => {
      if (options && options.keyProps) {
        return options.keyProps.every(keyProp => targetItem[keyProp] === item[keyProp]);
      }
      else {
        return Object.equal(targetItem, item);
      }
    });

    // 추가됨
    if (!existsTargetItem) {
      result.push({source: item});
    }
    else {
      // 수정됨
      if (options && options.keyProps && !Object.equal(item, existsTargetItem)) {
        result.push({source: item, target: existsTargetItem});
      }
      currTarget.remove(existsTargetItem);
    }
  }

  for (const remainedTargetItem of currTarget) {
    // 삭제됨
    result.push({target: remainedTargetItem});
  }

  return result;
};

Array.prototype.merge = function (target: any[], options?: { keyProps?: string[]; replacement?: boolean }): void {
  if (!options || !options.keyProps) {
    this.forEach((item, i) => {
      if (options && options.replacement) {
        for (const key of Object.keys(item)) {
          delete item[key];
        }
      }

      Object.assign(item, target[i]);
    });
    if (target.length > this.length) {
      for (const targetItem of target.splice(this.length)) {
        this.push(targetItem);
      }
    }
  }
  else {
    for (const targetItem of target) {
      const item = this.single(sourceItem => options.keyProps!.every(keyProp => sourceItem[keyProp] === targetItem[keyProp]));
      if (item) {
        if (options && options.replacement) {
          for (const key of Object.keys(item)) {
            delete item[key];
          }
        }

        Object.assign(item, targetItem);
      }
      else {
        this.push(targetItem);
      }
    }
  }
};
