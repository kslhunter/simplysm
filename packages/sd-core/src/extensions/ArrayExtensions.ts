import {Type} from "../types/Type";
import {JsonConvert} from "../utils/JsonConvert";

declare global {
  interface Array<T> { // tslint:disable-line:interface-name
    groupBy<K extends keyof T>(keyPredicate: K[]): { key: Pick<T, K>; values: T[] }[];

    groupBy<K>(keyPredicate: (item: T, index: number) => K): { key: K; values: T[] }[];

    groupBy<K, V>(keyPredicate: (item: T, index: number) => K, valuePredicate: (item: T, index: number) => V): { key: K; values: V[] }[];

    toMap<K>(keyPredicate: (item: T, index: number) => K): Map<K, T>;

    toMap<K, V>(keyPredicate: (item: T, index: number) => K, valuePredicate: (item: T, index: number) => V): Map<K, V>;

    mapMany<R>(predicate: (item: T, index: number) => R[]): R[];

    single(predicate?: (item: T, index: number) => boolean): T | undefined;

    last(predicate?: (item: T, index: number) => boolean): T | undefined;

    sum(): T | undefined;

    sum<P extends NonNullable<any>>(predicate: (item: T) => P): P | undefined;

    max(): T | undefined;

    max<P extends NonNullable<any>>(predicate: (item: T) => P): P | undefined;

    min(): T | undefined;

    min<P extends NonNullable<any>>(predicate?: (item: T) => P): P | undefined;

    distinct(predicate?: (item: T, index: number) => boolean): T[];

    orderBy(predicate?: (item: T) => any, desc?: boolean): T[];

    pushRange(items: T[]): void;

    insert(index: number, item: T): void;

    remove(item: T): void;

    remove(predicate: (item: T, index: number) => boolean): void; // tslint:disable-line:unified-signatures

    removeRange(items: T[]): void;

    removeRange(predicate: (item: T, index: number) => boolean): void; // tslint:disable-line:unified-signatures

    mapAsync<R>(predicate: (item: T, index: number) => Promise<R>): Promise<R[]>;

    differenceWith<K extends keyof T>(target: T[], keyProps?: K[]): { source?: T; target?: T }[];

    filterExists(): NonNullable<T>[];

    ofType<N>(type: Type<N>): N[];

    merge<K extends keyof T>(target: Partial<T>[], keyProps?: K[], includeUndefined?: boolean): void;
  }
}

Array.prototype.groupBy = function (keyPredicate: string[] | ((item: any, index: number) => any), valuePredicate?: (item: any, index: number) => any): { key: any; values: any[] }[] {
  const result: { key: any; values: any[] }[] = [];

  for (let i = 0; i < this.length; i++) {
    let key: any;
    if (keyPredicate instanceof Array) {
      key = {};
      for (const keyPropName of keyPredicate) {
        key[keyPropName] = this[i][keyPropName];
      }
    }
    else {
      key = keyPredicate(this[i], i);
    }

    const value = valuePredicate ? valuePredicate(this[i], i) : this[i];

    const existsRecord = result.single(item => Object.equal(item.key, key));

    if (existsRecord) {
      existsRecord.values.push(value);
    }
    else {
      result.push({key, values: [value]});
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

Array.prototype.single = function (predicate?: (item: any, index: number) => boolean): any {
  let result: any;

  for (let i = 0; i < this.length; i++) {
    const item = this[i];

    if (predicate ? predicate(item, i) : true) {
      if (result !== undefined) {
        throw new Error(`복수의 결과물이 있습니다.${JsonConvert.stringify(result)}\n${JsonConvert.stringify(item)}`);
      }
      result = item;
    }
  }

  return result;
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

Array.prototype.sum = function (predicate?: (item: any) => any): any {
  let result;
  for (let item of this) {
    item = predicate ? predicate(item) : item;
    if (result) {
      result += item;
    }
    else {
      result = item;
    }
  }

  return result;
};

Array.prototype.max = function (predicate?: (item: any) => any): any {
  let result;
  for (let item of this) {
    item = predicate ? predicate(item) : item;
    if (!result || result < item) {
      result = item;
    }
  }

  return result;
};

Array.prototype.min = function (predicate?: (item: any) => any): any {
  let result;
  for (let item of this) {
    item = predicate ? predicate(item) : item;
    if (!result || result > item) {
      result = item;
    }
  }

  return result;
};

Array.prototype.distinct = function (predicate?: (item: any, index: number) => boolean): any[] {
  const result: any[] = [];
  for (let i = 0; i < this.length; i++) {
    const item = predicate ? predicate(this[i], i) : this[i];
    if (result.every(item1 => !Object.equal(item1, item))) {
      result.push(item);
    }
  }

  return result;
};

Array.prototype.orderBy = function (predicate?: any, desc?: boolean): any[] {
  return this.concat().sort((p: any, n: any) => {
    const pn = (predicate && typeof predicate === "function")
      ? predicate(n)
      : (predicate && typeof predicate === "string")
        ? n[predicate]
        : n;

    const pp = (predicate && typeof predicate === "function")
      ? predicate(p)
      : (predicate && typeof predicate === "string")
        ? p[predicate]
        : p;

    if (desc) {
      return pn < pp ? -1 : pn > pp ? 1 : 0;
    }
    else {
      return pn > pp ? -1 : pn < pp ? 1 : 0;
    }
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

Array.prototype.remove = function (predicate: ((item: any, index: number) => boolean) | any): void {
  const item = typeof predicate === "function" ? this.single(predicate) : predicate;
  if (!item) {
    return;
  }

  const index = this.indexOf(item);
  if (index > -1) {
    this.splice(index, 1);
  }
};

Array.prototype.removeRange = function (predicate: any[] | ((item: any, index: number) => boolean)): void {
  const itemList = typeof predicate === "function" ? this.filter(predicate) : predicate;

  for (const item of itemList) {
    this.remove(item);
  }
};

Array.prototype.mapAsync = async function (predicate: (item: any, index: number) => Promise<any>): Promise<any[]> {
  const result: any[] = [];
  for (let i = 0; i < this.length; i++) {
    result.push(await predicate(this[i], i));
  }

  return result;
};

Array.prototype.differenceWith = function (target: any[], keyProps?: string[]): { source?: any; target?: any }[] {
  if (target.length < 1) {
    return this.map(item => ({source: item}));
  }

  const result = [];

  const currTarget = ([] as any[]).concat(target);
  for (const item of this) {
    const existsTargetItem = currTarget.find(targetItem => {
      if (keyProps) {
        return keyProps.every(keyProp => targetItem[keyProp] === item[keyProp]);
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
      if (keyProps && !Object.equal(item, existsTargetItem)) {
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

Array.prototype.filterExists = function (): any[] {
  return this.filter(item => item);
};

Array.prototype.ofType = function <N>(type: Type<N>): N[] {
  return this.filter(item => item instanceof type);
};

Array.prototype.merge = function (target: any[], keyProps?: string[], includeUndefined?: boolean): void {
  if (!keyProps) {
    this.forEach((item, i) => {
      if (includeUndefined) {
        for (const key of Object.keys(item)) {
          delete item[key];
        }
      }

      Object.assign(item, target[i]);
    });
    if (target.length > this.length) {
      this.pushRange(target.splice(this.length));
    }
  }
  else {
    for (const targetItem of target) {
      const item = this.single(sourceItem => keyProps.every(keyProp => sourceItem[keyProp] === targetItem[keyProp]));
      if (item) {
        if (includeUndefined) {
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
