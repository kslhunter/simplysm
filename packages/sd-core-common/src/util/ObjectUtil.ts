import {DateTime} from "../type/DateTime";
import {DateOnly} from "../type/DateOnly";
import {Time} from "../type/Time";
import {Uuid} from "../type/Uuid";
import {Type, TypeWrap} from "../commons";

export class ObjectUtil {
  public static clone<T>(source: T): T;
  public static clone<T>(source: T, options: { useRefTypes?: Type<any>[] }): T;
  public static clone<T, X extends keyof T>(source: T, options: { excludes: X[]; useRefTypes?: Type<any>[] }): Omit<T, X>;
  public static clone<T, X extends keyof T>(source: T[], options: { excludes: X[]; useRefTypes?: Type<any>[] }): Omit<T, X>[];
  public static clone(source: any, options?: { excludes?: any[]; useRefTypes?: any[] }): any {
    return ObjectUtil._clone(source, options);
  }

  private static _clone(source: any, options?: { excludes?: any[]; useRefTypes?: any[] }, prevClones?: { source: any; clone: any }[]): any {
    if (source == undefined) {
      return undefined;
    }
    if (source instanceof Array) {
      return source.map((item) => options ? ObjectUtil._clone(item, options) : ObjectUtil._clone(item));
    }
    if (source instanceof Date) {
      return new Date(source.getTime());
    }
    if (source instanceof DateTime) {
      return new DateTime(source.tick);
    }
    if (source instanceof DateOnly) {
      return new DateOnly(source.tick);
    }
    if (source instanceof Time) {
      return new Time(source.tick);
    }
    if (source instanceof Uuid) {
      return new Uuid(source.toString());
    }
    if (typeof source === "object") {
      const result = {};
      Object.setPrototypeOf(result, source["constructor"].prototype);
      const currPrevClones = prevClones ?? [];
      currPrevClones.push({source, clone: result});
      for (const key of Object.keys(source).filter((sourceKey) => !options?.excludes?.includes(sourceKey as any))) {
        if (source[key] == undefined) {
          result[key] = undefined;
        }
        else if (options?.useRefTypes?.includes(source[key].constructor)) {
          result[key] = source[key];
        }
        else {
          const matchedPrevClone = prevClones?.single((item) => item.source === source[key]);
          if (matchedPrevClone) {
            result[key] = matchedPrevClone.clone;
          }
          else {
            result[key] = ObjectUtil._clone(source[key], {useRefTypes: options?.useRefTypes}, currPrevClones);
          }
        }
      }

      return result;
    }

    return source;
  }

  public static merge<T, P>(source: T, target: P): T extends undefined ? P : P extends undefined ? T : (T & P) {
    if (source === undefined) {
      return ObjectUtil.clone(target) as any;
    }

    if (target === undefined) {
      return ObjectUtil.clone(source) as any;
    }

    if (typeof target !== "object") {
      return target as any;
    }

    if (target instanceof Date || target instanceof DateTime || target instanceof DateOnly || target instanceof Time || target instanceof Uuid) {
      return ObjectUtil.clone(target) as any;
    }

    if (typeof source !== typeof target) {
      throw new Error("병합하려고 하는 두 객체의 타입이 서로 다릅니다.");
    }

    const result = ObjectUtil.clone(source);
    for (const key of Object.keys(target)) {
      result[key] = ObjectUtil.merge(source[key], target[key]);
    }

    return result as any;
  }

  public static equal(source: any, target: any, options?: { keys?: string[]; excludes?: string[]; ignoreArrayIndex?: boolean }): boolean {
    if (source === target) {
      return true;
    }

    if (source instanceof Date && target instanceof Date) {
      return source.getTime() === target.getTime();
    }

    if (
      (source instanceof Time && target instanceof DateTime) ||
      (source instanceof Time && target instanceof DateOnly) ||
      (source instanceof Time && target instanceof Time)
    ) {
      return source.tick === target.tick;
    }

    if (source instanceof Array && target instanceof Array) {
      if (source.length !== target.length) {
        return false;
      }

      if (options?.ignoreArrayIndex) {
        return source.every((sourceItem) =>
          target.some((targetItem) =>
            ObjectUtil.equal(targetItem, sourceItem, options)
          )
        );
      }
      else {
        for (let i = 0; i < source.length; i++) {
          if (!ObjectUtil.equal(source[i], target[i], options)) {
            return false;
          }
        }
      }

      return true;
    }

    if (typeof source === "object" && typeof target === "object") {
      const sourceKeys = Object.keys(source)
        .filter((key) => (!options?.keys || options?.keys.includes(key)) && (!options?.excludes?.includes(key)) && source[key] !== undefined);
      const targetKeys = Object.keys(target)
        .filter((key) => (!options?.keys || options?.keys.includes(key)) && (!options?.excludes?.includes(key)) && target[key] !== undefined);

      if (sourceKeys.length !== targetKeys.length) {
        return false;
      }

      for (const key of sourceKeys) {
        if (!ObjectUtil.equal(source[key], target[key], {ignoreArrayIndex: options?.ignoreArrayIndex})) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  public static validate<T>(value: T, def: TValidateDef<T>): IValidateResult<T> | undefined {
    let currDef: IValidateDef<T> & { type?: Type<TypeWrap<T>>[] };
    if (def instanceof Array) { //Type<T>[]
      currDef = {
        type: def
      };
    }
    else if (typeof def === "function") { //Type<T>
      currDef = {
        type: [def]
      };
    }
    else { //IValidateDef<T>
      currDef = {
        ...def,
        type: def.type ? def.type instanceof Array ? def.type : [def.type] : undefined
      };
    }

    const invalidateDef: IValidateDef<T> & { type?: Type<TypeWrap<T>>[] } = {};
    if (currDef.notnull && value === undefined) {
      invalidateDef.notnull = currDef.notnull;
    }

    if (!currDef.notnull && value === undefined) {
      return undefined;
    }

    if (
      currDef.type &&
      !currDef.type.some(
        (type) =>
          type === (value as any)?.constructor
      )
    ) {
      invalidateDef.type = currDef.type;
    }

    if (currDef.validator && !currDef.validator(value as any)) {
      invalidateDef.validator = currDef.validator;
    }

    if (currDef.includes && !currDef.includes.includes(value)) {
      invalidateDef.includes = currDef.includes;
    }

    if (Object.keys(invalidateDef).length > 0) {
      return {value, invalidateDef};
    }

    return undefined;
  }

  public static validateObject<T>(obj: T, def: TValidateObjectDef<T>): TValidateObjectResult<T> {
    const result: TValidateObjectResult<T> = {};
    for (const defKey of Object.keys(def)) {
      const validateResult = ObjectUtil.validate(obj[defKey], def[defKey]);
      if (validateResult) {
        result[defKey] = validateResult;
      }
    }

    return result;
  }

  public static validateArray<T>(arr: T[], def: ((item: T) => TValidateObjectDef<T>) | TValidateObjectDef<T>): IValidateArrayResult<T>[] {
    const result: IValidateArrayResult<T>[] = [];
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      const validateObjectResult = ObjectUtil.validateObject(item, typeof def === "function" ? def(item) : def);
      if (Object.keys(validateObjectResult).length > 0) {
        result.push({
          index: i,
          item,
          result: validateObjectResult
        });
      }
    }

    return result;
  }

  public static getChainValueByDepth<T, K extends keyof T>(obj: T, key: K, depth: number, optional: true): T[K] | undefined;
  public static getChainValueByDepth<T, K extends keyof T>(obj: T, key: K, depth: number): T[K];
  public static getChainValueByDepth<T, K extends keyof T>(obj: T, key: K, depth: number, optional?: true): T[K] | undefined {
    let result: any = obj;
    for (let i = 0; i < depth; i++) {
      if (optional) {
        result = result ? result[key] : undefined;
      }
      else {
        result = result[key];
      }
    }
    return result;
  }

  public static getChainValue(obj: any, chain: string, optional: true): any | undefined;
  public static getChainValue(obj: any, chain: string): any;
  public static getChainValue(obj: any, chain: string, optional?: true): any | undefined {
    const split = chain.split(".");
    let result = obj;
    for (const splitItem of split) {
      if (optional && result === undefined) {
        result = undefined;
      }
      else {
        result = result[splitItem];
      }
    }
    return result;
  }

  public static setChainValue(obj: any, chain: string, value: any): void {
    const split = chain.split(".");
    let curr = obj;
    for (const splitItem of split.slice(0, -1)) {
      curr = curr[splitItem];
    }
    curr[split.last()!] = value;
  }

  public static deleteChainValue(obj: any, chain: string): void {
    const split = chain.split(".");
    let curr = obj;
    for (const splitItem of split.slice(0, -1)) {
      curr = curr[splitItem];
    }
    delete curr[split.last()!];
  }

  public static clearUndefined<T extends any>(obj: T): T {
    if (obj === undefined) {
      return obj;
    }

    for (const key of Object.keys(obj)) {
      if (obj[key] === undefined) {
        delete obj[key];
      }
    }

    return obj;
  }
}

export type TValidateDef<T> = Type<TypeWrap<T>> | Type<TypeWrap<T>>[] | IValidateDef<T>;

export interface IValidateDef<T> {
  type?: Type<TypeWrap<T>> | Type<TypeWrap<T>>[];
  notnull?: boolean;
  includes?: T[];
  validator?: (value: T) => boolean;
}

export interface IValidateResult<T> {
  value: T;
  invalidateDef: IValidateDef<T> & { type?: Type<TypeWrap<T>>[] };
}

type TValidateObjectDef<T> = { [K in keyof T]?: TValidateDef<T[K]> };
type TValidateObjectResult<T> = { [K in keyof T]?: IValidateResult<T[K]> };

interface IValidateArrayResult<T> {
  index: number;
  item: T;
  result: TValidateObjectResult<T>;
}
