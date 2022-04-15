import { TFlatType, Type } from "../types/Type";
import { DateTime } from "../types/DateTime";
import { DateOnly } from "../types/DateOnly";
import { Time } from "../types/Time";
import { Uuid } from "../types/Uuid";
import os from "os";
import { WrappedType } from "../types/WrappedType";
import { NeverEntryError } from "../errors/NeverEntryError";
import { UnwrappedType } from "../types/UnwrappedType";

export class ObjectUtil {
  public static clone<T>(source: T): T;
  public static clone<T>(source: T, options: { useRefTypes?: Type<any>[] }): T;
  public static clone<T, X extends keyof T>(source: T, options: { excludes: X[]; useRefTypes?: Type<any>[] }): Omit<T, X>;
  public static clone<T, X extends keyof T>(source: T[], options: { excludes: X[]; useRefTypes?: Type<any>[] }): Omit<T, X>[];
  public static clone(source: any, options?: { excludes?: any[]; useRefTypes?: any[] }): any {
    return ObjectUtil._clone(source, options);
  }

  private static _clone(source: any, options?: { excludes?: any[]; useRefTypes?: any[] }, prevClones?: { source: any; clone: any }[]): any {
    if (source == null) {
      return source;
    }
    if (source instanceof Array) {
      return source.map((item) => ObjectUtil._clone(item, options));
    }
    if (source instanceof Map) {
      return Array.from(source.keys()).toMap((key) => ObjectUtil._clone(key, options), (key) => ObjectUtil._clone(source.get(key), options));
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
      const result: Record<string, any> = {};
      Object.setPrototypeOf(result, source.constructor.prototype);
      const currPrevClones = prevClones ?? [];
      currPrevClones.push({ source, clone: result });
      for (const key of Object.keys(source).filter((sourceKey) => options?.excludes?.includes(sourceKey) !== true)) {
        if (source[key] === undefined) {
          result[key] = undefined;
        }
        else if (options?.useRefTypes?.includes(source[key].constructor) === true) {
          result[key] = source[key];
        }
        else {
          const matchedPrevClone = prevClones?.single((item) => item.source === source[key]);
          if (matchedPrevClone !== undefined) {
            result[key] = matchedPrevClone.clone;
          }
          else {
            result[key] = ObjectUtil._clone(source[key], { useRefTypes: options?.useRefTypes }, currPrevClones);
          }
        }
      }

      return result;
    }

    return source;
  }

  public static merge<T, P>(source: T, target: P, opt?: { arrayProcess?: "replace" | "concat"; useDelTargetNull?: boolean }): (T & P) {
    if (source === undefined) {
      return ObjectUtil.clone(target) as any;
    }

    if (target === undefined) {
      return ObjectUtil.clone(source) as any;
    }

    if (target === null) {
      return opt?.useDelTargetNull ? undefined : ObjectUtil.clone(source) as any;
    }

    if (typeof target !== "object") {
      return target as any;
    }

    if (
      target instanceof Date
      || target instanceof DateTime
      || target instanceof DateOnly
      || target instanceof Time
      || target instanceof Uuid
      || target instanceof Buffer
      || (
        opt?.arrayProcess === "replace"
        && target instanceof Array
      )
    ) {
      return ObjectUtil.clone(target) as any;
    }

    if (typeof source !== typeof target) {
      throw new Error("병합하려고 하는 두 객체의 타입이 서로 다릅니다.");
    }

    if (source instanceof Map && target instanceof Map) {
      const result = ObjectUtil.clone(source);
      for (const key of target.keys()) {
        if (result.has(key)) {
          result.set(key, ObjectUtil.merge(result.get(key)!, target.get(key)!, opt));
        }
        else {
          result.set(key, target.get(key)!);
        }
      }
      return result as any;
    }

    if (opt?.arrayProcess === "concat" && source instanceof Array && target instanceof Array) {
      let result = source.concat(target).distinct();
      if (opt.useDelTargetNull) {
        result = result.filter((item) => item !== null);
      }
      return result as any;
    }

    const result = ObjectUtil.clone(source);
    for (const key of Object.keys(target)) {
      result[key] = ObjectUtil.merge(source[key], target[key], opt);
      if (result[key] === undefined) {
        delete result[key];
      }
    }

    return result as any;
  }

  public static merge3<S extends Record<string, TFlatType>, O extends Record<string, TFlatType>, T extends Record<string, TFlatType>>(
    source: S,
    origin: O,
    target: T,
    optionsObj?: Record<string, { keys?: string[]; excludes?: string[]; ignoreArrayIndex?: boolean }>
  ): { conflict: boolean; result: O & S & T } {
    let conflict = false;
    const result = ObjectUtil.clone(origin) as Record<string, TFlatType>;
    for (const key of Object.keys(source).concat(Object.keys(target)).concat(Object.keys(origin))) {
      if (ObjectUtil.equal(source[key], result[key], optionsObj?.[key])) {
        result[key] = ObjectUtil.clone(target[key]);
      }
      else if (ObjectUtil.equal(target[key], result[key], optionsObj?.[key])) {
        result[key] = ObjectUtil.clone(source[key]);
      }
      else if (ObjectUtil.equal(source[key], target[key], optionsObj?.[key])) {
        result[key] = ObjectUtil.clone(source[key]);
      }
      else {
        conflict = true;
      }
    }

    return { conflict, result: result as (O & S & T) };
  }

  public static pick<T extends Record<string, any>, K extends keyof T>(item: T, keys: K[]): Pick<T, K> {
    const result: any = {};
    for (const key of keys) {
      result[key] = item[key];
    }
    return result;
  }

  public static pickByType<T extends Record<string, any>, A extends TFlatType>(item: T, type: Type<A>): { [K in keyof T]: WrappedType<T[K]> extends WrappedType<A> ? T[K] : never } {
    const result: any = {};
    for (const key of Object.keys(result)) {
      const typeCast = type as Type<TFlatType>;
      if (typeCast === String && typeof item[key] === "string") {
        result[key] = item[key];
      }
      else if (typeCast === Number && typeof item[key] === "number") {
        result[key] = item[key];
      }
      else if (typeCast === Boolean && typeof item[key] === "boolean") {
        result[key] = item[key];
      }
      else if (typeCast === DateOnly && item[key] instanceof DateOnly) {
        result[key] = item[key];
      }
      else if (typeCast === DateTime && item[key] instanceof DateTime) {
        result[key] = item[key];
      }
      else if (typeCast === Time && item[key] instanceof Time) {
        result[key] = item[key];
      }
      else if (typeCast === Uuid && item[key] instanceof Uuid) {
        result[key] = item[key];
      }
      else if (typeCast === Buffer && item[key] instanceof Buffer) {
        result[key] = item[key];
      }
    }
    return result;
  }

  public static equal(source: any, target: any, options?: { keys?: string[]; excludes?: string[]; ignoreArrayIndex?: boolean }): boolean {
    if (source === target) {
      return true;
    }

    if (source instanceof Date && target instanceof Date) {
      return source.getTime() === target.getTime();
    }

    if (
      (source instanceof Time && target instanceof DateTime)
      || (source instanceof Time && target instanceof DateOnly)
      || (source instanceof Time && target instanceof Time)
    ) {
      return source.tick === target.tick;
    }

    if (source instanceof Array && target instanceof Array) {
      if (source.length !== target.length) {
        return false;
      }

      if (options?.ignoreArrayIndex) {
        return source.every((sourceItem) => (
          target.some((targetItem) => (
            ObjectUtil.equal(targetItem, sourceItem, options)
          ))
        ));
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

    if (source instanceof Map && target instanceof Map) {
      const sourceKeys = Array.from(source.keys())
        .filter((key) => (options?.keys === undefined || options.keys.includes(key)) && (!options?.excludes?.includes(key)) && source[key] !== undefined);
      const targetKeys = Array.from(target.keys())
        .filter((key) => (options?.keys === undefined || options.keys.includes(key)) && (!options?.excludes?.includes(key)) && target[key] !== undefined);

      if (sourceKeys.length !== targetKeys.length) {
        return false;
      }

      for (const key of sourceKeys) {
        if (!ObjectUtil.equal(source.get(key), target.get(key), { ignoreArrayIndex: options?.ignoreArrayIndex })) {
          return false;
        }
      }

      return true;
    }

    if (typeof source === "object" && typeof target === "object") {
      const sourceKeys = Object.keys(source)
        .filter((key) => (options?.keys === undefined || options.keys.includes(key)) && (!options?.excludes?.includes(key)) && source[key] !== undefined);
      const targetKeys = Object.keys(target)
        .filter((key) => (options?.keys === undefined || options.keys.includes(key)) && (!options?.excludes?.includes(key)) && target[key] !== undefined);

      if (sourceKeys.length !== targetKeys.length) {
        return false;
      }

      for (const key of sourceKeys) {
        if (!ObjectUtil.equal(source[key], target[key], { ignoreArrayIndex: options?.ignoreArrayIndex })) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  public static validate<T>(value: T, def: TValidateDef<T>): IValidateResult<T> | undefined {
    let currDef: IValidateDef<T> & { type?: Type<WrappedType<T>>[] };
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

    const invalidateDef: IValidateDef<T> & { type?: Type<WrappedType<T>>[] } = {};
    if (currDef.notnull && value === undefined) {
      invalidateDef.notnull = currDef.notnull;
    }

    if (!currDef.notnull && value === undefined) {
      return undefined;
    }

    if (
      currDef.type !== undefined
      && !currDef.type.some((type) => type === (value as any)?.constructor)
    ) {
      invalidateDef.type = currDef.type;
    }

    if (Number.isNaN(value)) {
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
      const validateResult = ObjectUtil.validate(obj[defKey], def[defKey]);
      if (validateResult !== undefined) {
        result[defKey] = validateResult;
      }
    }

    return result;
  }

  public static validateObjectWithThrow<T>(displayName: string, obj: T, def: TValidateObjectDefWithName<T>): void {
    const validateResult = ObjectUtil.validateObject(obj, def);
    if (Object.keys(validateResult).length > 0) {
      const errMessages: string[] = [];
      const invalidateKeys = Object.keys(validateResult);
      for (const invalidateKey of invalidateKeys) {
        const itemDisplayName: string = def[invalidateKey].displayName;
        let errMessage = `- '${itemDisplayName}'`;

        if ((def[invalidateKey] as IValidateDefWithName<any>).displayValue) {
          const itemValue = validateResult[invalidateKey].value;
          if (
            typeof itemValue === "string"
            || typeof itemValue === "number"
            || typeof itemValue === "boolean"
            || typeof itemValue === "undefined"
            || itemValue instanceof DateTime
            || itemValue instanceof DateOnly
          ) {
            errMessage += `: ${itemValue?.toString() ?? "undefined"}`;
          }
        }

        errMessages.push(errMessage);
      }
      throw new Error(`${displayName}중 잘못된 내용이 있습니다.` + os.EOL + errMessages.join(os.EOL));
    }
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

  public static validateArrayWithThrow<T>(displayName: string, arr: T[], def: ((item: T) => TValidateObjectDefWithName<T>) | TValidateObjectDefWithName<T>): void {
    const validateResults = ObjectUtil.validateArray(arr, def);
    if (validateResults.length > 0) {
      const errMessages: string[] = [];
      for (const validateResult of validateResults) {
        const realDef = typeof def === "function" ? def(validateResult.item) : def;

        const invalidateKeys = Object.keys(validateResult.result);
        for (const invalidateKey of invalidateKeys) {
          const itemDisplayName: string = realDef[invalidateKey].displayName;
          let errMessage = `- ${validateResult.index + 1}번째 항목의 '${itemDisplayName}'`;

          if ((realDef[invalidateKey] as IValidateDefWithName<any>).displayValue) {
            const itemValue = validateResult.result[invalidateKey].value;
            if (
              typeof itemValue === "string"
              || typeof itemValue === "number"
              || typeof itemValue === "boolean"
              || typeof itemValue === "undefined"
              || itemValue instanceof DateTime
              || itemValue instanceof DateOnly
            ) {
              errMessage += `: ${itemValue?.toString() ?? "undefined"}`;
            }
          }

          errMessages.push(errMessage);
        }
      }
      throw new Error(`${displayName}중 잘못된 내용이 있습니다.` + os.EOL + errMessages.join(os.EOL));
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

  public static clearUndefined<T>(obj: T): T {
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

  public static clear<T>(obj: T): {} {
    for (const key of Object.keys(obj)) {
      delete obj[key];
    }
    return obj;
  }

  public static nullToUndefined<T>(obj: T): T | undefined {
    if (obj == null) {
      return undefined;
    }

    if (
      obj instanceof Date
      || obj instanceof DateTime
      || obj instanceof DateOnly
      || obj instanceof Time
    ) {
      return obj;
    }

    if (obj instanceof Array) {
      for (let i = 0; i < obj.length; i++) {
        obj[i] = ObjectUtil.nullToUndefined(obj[i]);
      }
      return obj;
    }

    if (typeof obj === "object") {
      for (const key of Object.keys(obj)) {
        if (obj[key] == null) {
          obj[key] = undefined;
        }
      }

      return obj;
    }

    return obj;
  }
}

export type TValidateDef<T> = Type<WrappedType<T>> | Type<WrappedType<T>>[] | IValidateDef<T>;

export interface IValidateDef<T> {
  type?: Type<WrappedType<T>> | Type<WrappedType<T>>[];
  notnull?: boolean;
  includes?: T[];
  displayValue?: boolean;
  validator?: (value: UnwrappedType<NonNullable<T>>) => boolean | string;
}

export interface IValidateResult<T> {
  value: T;
  invalidateDef: IValidateDef<T> & { type?: Type<WrappedType<T>>[] };
  message?: string;
}

type TValidateObjectDef<T> = Partial<Record<keyof T, TValidateDef<any>>>;
type TValidateObjectResult<T> = Partial<Record<keyof T, IValidateResult<any>>>;

export interface IValidateDefWithName<T> extends IValidateDef<T> {
  displayName: string;
}

type TValidateObjectDefWithName<T> = Partial<Record<keyof T, IValidateDefWithName<any>>>;

interface IValidateArrayResult<T> {
  index: number;
  item: T;
  result: TValidateObjectResult<T>;
}
