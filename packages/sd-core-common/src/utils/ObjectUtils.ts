import { DateTime } from "../types/DateTime";
import { DateOnly } from "../types/DateOnly";
import { Time } from "../types/Time";
import { Uuid } from "../types/Uuid";
import { StripTypeWrap, Type, TypeWrap } from "../commons";
import { NeverEntryError } from "../errors/NeverEntryError";
import * as os from "os";

export class ObjectUtils {
  public static clone<T>(source: T): T;
  public static clone<T>(source: T, options: { useRefTypes?: Type<any>[] }): T;
  public static clone<T, X extends keyof T>(source: T, options: { excludes: X[]; useRefTypes?: Type<any>[] }): Omit<T, X>;
  public static clone<T, X extends keyof T>(source: T[], options: { excludes: X[]; useRefTypes?: Type<any>[] }): Omit<T, X>[];
  public static clone(source: any, options?: { excludes?: any[]; useRefTypes?: any[] }): any {
    return ObjectUtils._clone(source, options);
  }

  private static _clone(source: any, options?: { excludes?: any[]; useRefTypes?: any[] }, prevClones?: { source: any; clone: any }[]): any {
    if (source == null) {
      return undefined;
    }
    if (source instanceof Array) {
      return source.map(item => ObjectUtils._clone(item, options));
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
    if (source instanceof Buffer) {
      return Buffer.from(source.buffer);
    }
    if (typeof source === "object") {
      const result: { [key: string]: any } = {};
      Object.setPrototypeOf(result, source.constructor.prototype);
      const currPrevClones = prevClones ?? [];
      currPrevClones.push({ source, clone: result });
      for (const key of Object.keys(source).filter(sourceKey => options?.excludes?.includes(sourceKey) !== true)) {
        if (source[key] === undefined) {
          result[key] = undefined;
        }
        else if (options?.useRefTypes?.includes(source[key].constructor) === true) {
          result[key] = source[key];
        }
        else {
          const matchedPrevClone = prevClones?.single(item => item.source === source[key]);
          if (matchedPrevClone !== undefined) {
            result[key] = matchedPrevClone.clone;
          }
          else {
            result[key] = ObjectUtils._clone(source[key], { useRefTypes: options?.useRefTypes }, currPrevClones);
          }
        }
      }

      return result;
    }

    return source;
  }

  public static merge<T, P>(source: T, target: P): T extends undefined ? P : P extends undefined ? T : (T & P) {
    if (source === undefined) {
      return ObjectUtils.clone(target) as any;
    }

    if (target === undefined) {
      return ObjectUtils.clone(source) as any;
    }

    if (typeof target !== "object") {
      return target as any;
    }

    if (target instanceof Date || target instanceof DateTime || target instanceof DateOnly || target instanceof Time || target instanceof Uuid || target instanceof Buffer) {
      return ObjectUtils.clone(target) as any;
    }

    if (typeof source !== typeof target) {
      throw new Error("병합하려고 하는 두 객체의 타입이 서로 다릅니다.");
    }

    const result = ObjectUtils.clone(source);
    for (const key of Object.keys(target)) {
      result[key] = ObjectUtils.merge(source[key], target[key]);
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
        return source.every(sourceItem => (
          target.some(targetItem => (
            ObjectUtils.equal(targetItem, sourceItem, options)
          ))
        ));
      }
      else {
        for (let i = 0; i < source.length; i++) {
          if (!ObjectUtils.equal(source[i], target[i], options)) {
            return false;
          }
        }
      }

      return true;
    }

    if (typeof source === "object" && typeof target === "object") {
      const sourceKeys = Object.keys(source)
        .filter(key => (options?.keys === undefined || options.keys.includes(key)) && (!options?.excludes?.includes(key)) && source[key] !== undefined);
      const targetKeys = Object.keys(target)
        .filter(key => (options?.keys === undefined || options.keys.includes(key)) && (!options?.excludes?.includes(key)) && target[key] !== undefined);

      if (sourceKeys.length !== targetKeys.length) {
        return false;
      }

      for (const key of sourceKeys) {
        if (!ObjectUtils.equal(source[key], target[key], { ignoreArrayIndex: options?.ignoreArrayIndex })) {
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
        type: def.type !== undefined ? def.type instanceof Array ? def.type : [def.type] : undefined
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
      currDef.type !== undefined &&
      !currDef.type.some(type => type === (value as any)?.constructor)
    ) {
      invalidateDef.type = currDef.type;
    }

    let message: string | undefined;
    if (currDef.validator !== undefined) {
      const validatorResult = currDef.validator(value as any);

      if (validatorResult !== true) {
        invalidateDef.validator = currDef.validator;
        if (typeof validatorResult === "string") {
          message = validatorResult;
        }
      }
    }

    if (currDef.includes !== undefined && !currDef.includes.includes(value)) {
      invalidateDef.includes = currDef.includes;
    }

    if (Object.keys(invalidateDef).length > 0) {
      return { value, invalidateDef, message };
    }

    return undefined;
  }

  public static validateObject<T>(obj: T, def: TValidateObjectDef<T>): TValidateObjectResult<T> {
    const result: TValidateObjectResult<T> = {};
    for (const defKey of Object.keys(def)) {
      const validateResult = ObjectUtils.validate(obj[defKey], def[defKey]);
      if (validateResult !== undefined) {
        result[defKey] = validateResult;
      }
    }

    return result;
  }

  public static validateArray<T>(arr: T[], def: ((item: T) => TValidateObjectDef<T>) | TValidateObjectDef<T>): IValidateArrayResult<T>[] {
    const result: IValidateArrayResult<T>[] = [];
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      const validateObjectResult = ObjectUtils.validateObject(item, typeof def === "function" ? def(item) : def);
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

  public static validateArrayWithThrow<T>(displayName: string, arr: T[], def: ((item: T) => TValidateObjectDefWithName<T>) | TValidateObjectDefWithName<T>): void {
    const validateResults = ObjectUtils.validateArray(arr, def);
    if (validateResults.length > 0) {
      const errorMessages = [];
      for (const validateResult of validateResults) {
        const realDef = typeof def === "function" ? def(validateResult.item) : def;

        const invalidateKeys = Object.keys(validateResult.result);
        for (const invalidateKey of invalidateKeys) {
          const itemDisplayName = realDef[invalidateKey].displayName;

          errorMessages.push(`- ${validateResult.index + 1}번째 항목의 '${itemDisplayName}'`);
        }
      }
      throw new Error(`${displayName}중 잘못된 내용이 있습니다.` + os.EOL + errorMessages.join(os.EOL));
    }
  }

  public static getChainValueByDepth<T, K extends keyof T>(obj: T, key: K, depth: number, optional: true): T[K] | undefined;
  public static getChainValueByDepth<T, K extends keyof T>(obj: T, key: K, depth: number): T[K];
  public static getChainValueByDepth<T, K extends keyof T>(obj: T, key: K, depth: number, optional?: true): T[K] | undefined {
    let result: any = obj;
    for (let i = 0; i < depth; i++) {
      if (optional) {
        result = result?.[key];
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

    const last = split.last();
    if (last === undefined) {
      throw new NeverEntryError();
    }

    curr[last] = value;
  }

  public static deleteChainValue(obj: any, chain: string): void {
    const split = chain.split(".");
    let curr = obj;
    for (const splitItem of split.slice(0, -1)) {
      curr = curr[splitItem];
    }

    const last = split.last();
    if (last === undefined) {
      throw new NeverEntryError();
    }

    delete curr[last];
  }

  public static clearUndefined<T extends object>(obj: T): T {
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
  validator?: (value: StripTypeWrap<NonNullable<T>>) => boolean | string;
}

export interface IValidateResult<T> {
  value: T;
  invalidateDef: IValidateDef<T> & { type?: Type<TypeWrap<T>>[] };
  message?: string;
}

type TValidateObjectDef<T> = { [K in keyof T]?: TValidateDef<T[K]> };
type TValidateObjectResult<T> = { [K in keyof T]?: IValidateResult<T[K]> };

export interface IValidateDefWithName<T> extends IValidateDef<T> {
  displayName: string;
}

type TValidateObjectDefWithName<T> = { [K in keyof T]?: IValidateDefWithName<T[K]> };

interface IValidateArrayResult<T> {
  index: number;
  item: T;
  result: TValidateObjectResult<T>;
}