import type { Type } from "../types/type/Type";
import { DateTime } from "../types/date-time/DateTime";
import { DateOnly } from "../types/date-time/DateOnly";
import { Time } from "../types/date-time/Time";
import { Uuid } from "../types/Uuid";
import { NeverEntryError } from "../errors/NeverEntryError";
import type { WrappedType } from "../types/wrap/WrappedType";
import type { TFlatType } from "../types/type/TFlatType";
import type { UnwrappedType } from "../types/wrap/UnwrappedType";

export class ObjectUtils {
  static clone<T>(
    source: T,
    options?: {
      excludes?: string[];
      useRefTypes?: any[];
      onlyOneDepth?: boolean;
    },
  ): T {
    return this._clone(source, options);
  }

  private static _clone(
    source: any,
    options?: {
      excludes?: any[];
      useRefTypes?: any[];
      onlyOneDepth?: boolean;
    },
    prevClones?: WeakMap<object, any>,
  ): any {
    // primitive는 그대로 반환
    if (typeof source !== "object") {
      return source;
    }

    // Immutable-like 타입들 (내부에 object 참조 없음)
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

    // 순환 참조 체크
    const currPrevClones = prevClones ?? new WeakMap<object, any>();
    if (currPrevClones.has(source)) {
      return currPrevClones.get(source);
    }

    if (source instanceof Buffer) {
      const result = Buffer.from(source);
      currPrevClones.set(source, result);
      return result;
    }

    if (source instanceof Array) {
      if (options?.onlyOneDepth) {
        return [...source];
      }

      const result: any[] = [];
      currPrevClones.set(source, result);
      for (const item of source) {
        result.push(this._clone(item, options, currPrevClones));
      }
      return result;
    }

    if (source instanceof Map) {
      const result = new Map();
      currPrevClones.set(source, result);
      for (const [key, value] of source) {
        result.set(
          this._clone(key, options, currPrevClones),
          this._clone(value, options, currPrevClones),
        );
      }
      return result;
    }

    // 기타 Object
    if (options?.onlyOneDepth) {
      return { ...source };
    }

    const result: Record<string, any> = {};
    Object.setPrototypeOf(result, source.constructor.prototype);
    currPrevClones.set(source, result);

    for (const key of Object.keys(source)) {
      if (options?.excludes?.includes(key)) {
        continue;
      }

      const value = source[key];
      if (value == null) {
        result[key] = undefined;
      } else if (options?.useRefTypes?.includes(value.constructor)) {
        result[key] = value;
      } else {
        result[key] = this._clone(
          source[key],
          { useRefTypes: options?.useRefTypes },
          currPrevClones,
        );
      }
    }

    return result;
  }

  static merge<T, P>(
    source: T,
    target: P,
    opt?: {
      arrayProcess?: "replace" | "concat";
      useDelTargetNull?: boolean;
    },
  ): T & P {
    if (source == null) {
      return this.clone(target) as any;
    }

    if (target === undefined) {
      return this.clone(source) as any;
    }

    if (target === null) {
      return opt?.useDelTargetNull ? (undefined as any) : (this.clone(source) as any);
    }

    if (typeof target !== "object") {
      return target as any;
    }

    if (
      target instanceof Date ||
      target instanceof DateTime ||
      target instanceof DateOnly ||
      target instanceof Time ||
      target instanceof Uuid ||
      target instanceof Buffer ||
      (opt?.arrayProcess === "replace" && target instanceof Array)
    ) {
      return this.clone(target) as any;
    }

    if (typeof source !== typeof target) {
      throw new Error("병합하려고 하는 두 객체의 타입이 서로 다릅니다.");
    }

    if (source instanceof Map && target instanceof Map) {
      const result = this.clone(source);
      for (const key of target.keys()) {
        if (result.has(key)) {
          result.set(key, this.merge(result.get(key), target.get(key), opt));
        } else {
          result.set(key, target.get(key));
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

    const sourceRec = source as Record<string, any>;
    const targetRec = target as Record<string, any>;
    const resultRec = this.clone(sourceRec);
    for (const key of Object.keys(target)) {
      resultRec[key] = this.merge(sourceRec[key], targetRec[key], opt);
      if (resultRec[key] === undefined) {
        delete resultRec[key];
      }
    }

    return resultRec as any;
  }

  static merge3<
    S extends Record<string, TFlatType>,
    O extends Record<string, TFlatType>,
    T extends Record<string, TFlatType>,
  >(
    source: S,
    origin: O,
    target: T,
    optionsObj?: Record<
      string,
      {
        keys?: string[];
        excludes?: string[];
        ignoreArrayIndex?: boolean;
      }
    >,
  ): {
    conflict: boolean;
    result: O & S & T;
  } {
    let conflict = false;
    const result = this.clone(origin) as Record<string, TFlatType>;
    for (const key of Object.keys(source).concat(Object.keys(target)).concat(Object.keys(origin))) {
      if (this.equal(source[key], result[key], optionsObj?.[key])) {
        result[key] = this.clone(target[key]);
      } else if (this.equal(target[key], result[key], optionsObj?.[key])) {
        result[key] = this.clone(source[key]);
      } else if (this.equal(source[key], target[key], optionsObj?.[key])) {
        result[key] = this.clone(source[key]);
      } else {
        conflict = true;
      }
    }

    return {
      conflict,
      result: result as O & S & T,
    };
  }

  static omit<T extends Record<string, any>, K extends keyof T>(
    item: T,
    omitKeys: K[],
  ): Omit<T, K> {
    const result: any = {};
    for (const key of Object.keys(item) as K[]) {
      if (!omitKeys.includes(key)) {
        result[key] = item[key];
      }
    }
    return result;
  }

  static omitByFilter<T extends Record<string, any>>(
    item: T,
    omitKeyFn: (key: keyof T) => boolean,
  ): T {
    const result: any = {};
    for (const key of Object.keys(item)) {
      if (!omitKeyFn(key)) {
        result[key] = item[key];
      }
    }
    return result;
  }

  static pick<T extends Record<string, any>, K extends keyof T>(item: T, keys: K[]): Pick<T, K> {
    const result: any = {};
    for (const key of keys) {
      result[key] = item[key];
    }
    return result;
  }

  static pickByType<T extends Record<string, any>, A extends TFlatType>(
    item: T,
    type: Type<A>,
  ): { [K in keyof T]: WrappedType<T[K]> extends WrappedType<A> ? T[K] : never } {
    const result: any = {};
    for (const key of Object.keys(result)) {
      const typeCast = type as Type<TFlatType>;
      if (typeCast === String && typeof item[key] === "string") {
        result[key] = item[key];
      } else if (typeCast === Number && typeof item[key] === "number") {
        result[key] = item[key];
      } else if (typeCast === Boolean && typeof item[key] === "boolean") {
        result[key] = item[key];
      } else if (typeCast === DateOnly && item[key] instanceof DateOnly) {
        result[key] = item[key];
      } else if (typeCast === DateTime && item[key] instanceof DateTime) {
        result[key] = item[key];
      } else if (typeCast === Time && item[key] instanceof Time) {
        result[key] = item[key];
      } else if (typeCast === Uuid && item[key] instanceof Uuid) {
        result[key] = item[key];
      } else if (typeCast === Buffer && item[key] instanceof Buffer) {
        result[key] = item[key];
      }
    }
    return result;
  }

  static equal(
    source: any,
    target: any,
    options?: {
      includes?: string[];
      excludes?: string[];
      ignoreArrayIndex?: boolean;
      onlyOneDepth?: boolean;
    },
  ): boolean {
    if (source === target) return true;
    if (source == null || target == null) return false;
    if (typeof source !== typeof target) return false;

    if (source instanceof Date && target instanceof Date) {
      return source.getTime() === target.getTime();
    }

    if (
      (source instanceof DateTime && target instanceof DateTime) ||
      (source instanceof DateOnly && target instanceof DateOnly) ||
      (source instanceof Time && target instanceof Time)
    ) {
      return source.tick === target.tick;
    }

    if (source instanceof Array && target instanceof Array) {
      if (source.length !== target.length) {
        return false;
      }

      if (options?.ignoreArrayIndex) {
        if (options.onlyOneDepth) {
          return source.every((sourceItem) =>
            target.some((targetItem) => targetItem === sourceItem),
          );
        } else {
          return source.every((sourceItem) =>
            target.some((targetItem) => this.equal(targetItem, sourceItem, options)),
          );
        }
      } else {
        if (options?.onlyOneDepth) {
          for (let i = 0; i < source.length; i++) {
            if (source[i] !== target[i]) {
              return false;
            }
          }
        } else {
          for (let i = 0; i < source.length; i++) {
            if (!this.equal(source[i], target[i], options)) {
              return false;
            }
          }
        }
      }

      return true;
    }

    if (source instanceof Map && target instanceof Map) {
      const sourceKeys = Array.from(source.keys()).filter(
        (key) =>
          (options?.includes === undefined || options.includes.includes(key)) &&
          !options?.excludes?.includes(key) &&
          source.get(key) != null,
      );
      const targetKeys = Array.from(target.keys()).filter(
        (key) =>
          (options?.includes === undefined || options.includes.includes(key)) &&
          !options?.excludes?.includes(key) &&
          target.get(key) != null,
      );

      if (sourceKeys.length !== targetKeys.length) {
        return false;
      }

      for (const key of sourceKeys) {
        if (options?.onlyOneDepth) {
          if (source.get(key) !== target.get(key)) {
            return false;
          }
        } else {
          if (
            !this.equal(source.get(key), target.get(key), {
              ignoreArrayIndex: options?.ignoreArrayIndex,
            })
          ) {
            return false;
          }
        }
      }

      return true;
    }

    if (typeof source === "object" && typeof target === "object") {
      const sourceKeys = Object.keys(source).filter(
        (key) =>
          (options?.includes === undefined || options.includes.includes(key)) &&
          !options?.excludes?.includes(key) &&
          source[key] !== undefined,
      );
      const targetKeys = Object.keys(target).filter(
        (key) =>
          (options?.includes === undefined || options.includes.includes(key)) &&
          !options?.excludes?.includes(key) &&
          target[key] !== undefined,
      );

      if (sourceKeys.length !== targetKeys.length) {
        return false;
      }

      for (const key of sourceKeys) {
        if (options?.onlyOneDepth) {
          if (source[key] !== target[key]) {
            return false;
          }
        } else {
          if (
            !this.equal(source[key], target[key], {
              ignoreArrayIndex: options?.ignoreArrayIndex,
            })
          ) {
            return false;
          }
        }
      }

      return true;
    }

    return false;
  }

  static validate<T>(value: T, def: TValidateDef<T>): IValidateResult<T> | undefined {
    let currDef: IValidateDef<T> & {
      type?: Type<WrappedType<T>>[];
    };
    if (def instanceof Array) {
      //Type<T>[]
      currDef = {
        type: def,
      };
    } else if (typeof def === "function") {
      //Type<T>
      currDef = {
        type: [def],
      };
    } else {
      //IValidateDef<T>
      currDef = {
        ...def,
        type:
          def.type !== undefined ? (def.type instanceof Array ? def.type : [def.type]) : undefined,
      };
    }

    const invalidateDef: IValidateDef<T> & {
      type?: Type<WrappedType<T>>[];
    } = {};
    if (currDef.notnull && value === undefined) {
      invalidateDef.notnull = currDef.notnull;
    }

    if (!currDef.notnull && value === undefined) {
      return undefined;
    }

    if (
      currDef.type !== undefined &&
      !currDef.type.some((type) => type === (value as any)?.constructor)
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
      return {
        value,
        invalidateDef,
        message,
      };
    }

    return undefined;
  }

  static validateObject<T extends Record<string, any>>(
    obj: T,
    def: TValidateObjectDef<T>,
  ): TValidateObjectResult<T> {
    const result: TValidateObjectResult<any> = {};
    for (const defKey of Object.keys(def)) {
      const validateResult = this.validate(this.getChainValue(obj, defKey), def[defKey]!);
      if (validateResult !== undefined) {
        result[defKey] = validateResult;
      }
    }

    return result;
  }

  static validateObjectWithThrow<T extends Record<string, any>>(
    displayName: string,
    obj: T,
    def: TValidateObjectDefWithName<T>,
  ): void {
    const validateResult = this.validateObject(obj, def);
    if (Object.keys(validateResult).length > 0) {
      const errMessages: string[] = [];
      const invalidateKeys = Object.keys(validateResult);
      for (const invalidateKey of invalidateKeys) {
        const itemDisplayName: string = def[invalidateKey]!.displayName;
        let errMessage = `- '${itemDisplayName}'`;

        if ((def[invalidateKey] as IValidateDefWithName<any>).displayValue) {
          const itemValue: any = validateResult[invalidateKey]!.value;
          if (
            typeof itemValue === "string" ||
            typeof itemValue === "number" ||
            typeof itemValue === "boolean" ||
            typeof itemValue === "undefined" ||
            itemValue instanceof DateTime ||
            itemValue instanceof DateOnly
          ) {
            errMessage += `: ${itemValue?.toString() ?? "undefined"}`;
          }
        }

        errMessages.push(errMessage);
      }
      throw new Error(`${displayName}중 잘못된 내용이 있습니다.\n` + errMessages.join("\n"));
    }
  }

  static validateArray<T extends Record<string, any>>(
    arr: T[],
    def: ((item: T) => TValidateObjectDef<T>) | TValidateObjectDef<T>,
  ): IValidateArrayResult<T>[] {
    const result: IValidateArrayResult<T>[] = [];
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      const validateObjectResult = this.validateObject(
        item,
        typeof def === "function" ? def(item) : def,
      );
      if (Object.keys(validateObjectResult).length > 0) {
        result.push({
          index: i,
          item,
          result: validateObjectResult,
        });
      }
    }

    return result;
  }

  static validateArrayWithThrow<T extends Record<string, any>>(
    displayName: string,
    arr: T[],
    def: ((item: T) => TValidateObjectDefWithName<T>) | TValidateObjectDefWithName<T>,
  ): void {
    const validateResults = this.validateArray(arr, def);
    if (validateResults.length > 0) {
      const errMessages: string[] = [];
      for (const validateResult of validateResults) {
        const realDef = typeof def === "function" ? def(validateResult.item) : def;

        const invalidateKeys = Object.keys(validateResult.result);
        for (const invalidateKey of invalidateKeys) {
          const itemDisplayName: string = realDef[invalidateKey]!.displayName;
          let errMessage = `- ${validateResult.index + 1}번째 항목의 '${itemDisplayName}'`;

          if ((realDef[invalidateKey] as IValidateDefWithName<any>).displayValue) {
            const itemValue: any = validateResult.result[invalidateKey]!.value;
            if (
              typeof itemValue === "string" ||
              typeof itemValue === "number" ||
              typeof itemValue === "boolean" ||
              typeof itemValue === "undefined" ||
              itemValue instanceof DateTime ||
              itemValue instanceof DateOnly
            ) {
              errMessage += `: ${itemValue?.toString() ?? "undefined"}`;
            }
          }

          errMessages.push(errMessage);
        }
      }
      throw new Error(`${displayName}중 잘못된 내용이 있습니다.\n` + errMessages.join("\n"));
    }
  }

  static getChainValueByDepth<T, K extends keyof T>(
    obj: T,
    key: K,
    depth: number,
    optional: true,
  ): T[K] | undefined;
  static getChainValueByDepth<T, K extends keyof T>(obj: T, key: K, depth: number): T[K];
  static getChainValueByDepth<T, K extends keyof T>(
    obj: T,
    key: K,
    depth: number,
    optional?: true,
  ): T[K] | undefined {
    let result: any = obj;
    for (let i = 0; i < depth; i++) {
      if (optional) {
        result = result?.[key];
      } else {
        result = result[key];
      }
    }
    return result;
  }

  private static _getChainSplits(chain: string): (string | number)[] {
    const split = chain
      .split(/[.\[\]]/g)
      .map((item) => item.replace(/[?!'"]/g, ""))
      .filter((item) => Boolean(item));
    const result: (string | number)[] = [];
    for (const splitItem of split) {
      if (/^[0-9]*$/.test(splitItem)) {
        result.push(Number.parseInt(splitItem));
      } else {
        result.push(splitItem);
      }
    }

    return result;
  }

  static getChainValue(obj: any, chain: string, optional: true): any | undefined;
  static getChainValue(obj: any, chain: string): any;
  static getChainValue(obj: any, chain: string, optional?: true): any | undefined {
    const splits = this._getChainSplits(chain);
    let result = obj;
    for (const splitItem of splits) {
      if (optional && result === undefined) {
        result = undefined;
      } else {
        result = result[splitItem];
      }
    }
    return result;
  }

  static setChainValue(obj: any, chain: string, value: any): void {
    const splits = this._getChainSplits(chain);
    let curr = obj;
    for (const splitItem of splits.slice(0, -1)) {
      curr[splitItem] = curr[splitItem] ?? {};
      curr = curr[splitItem];
    }

    const last = splits.last();
    if (last === undefined) {
      throw new NeverEntryError();
    }

    curr[last] = value;
  }

  static deleteChainValue(obj: any, chain: string): void {
    const splits = this._getChainSplits(chain);
    let curr = obj;
    for (const splitItem of splits.slice(0, -1)) {
      curr = curr[splitItem];
    }

    const last = splits.last();
    if (last === undefined) {
      throw new NeverEntryError();
    }

    delete curr[last];
  }

  static clearUndefined<T extends Record<string, any>>(obj: T): T {
    for (const key of Object.keys(obj)) {
      if (obj[key] === undefined) {
        delete obj[key];
      }
    }

    return obj;
  }

  static clear<T extends Record<string, any>>(obj: T): {} {
    for (const key of Object.keys(obj)) {
      delete obj[key];
    }
    return obj;
  }

  static nullToUndefined<T>(obj: T): T | undefined {
    if (obj == null) {
      return undefined;
    }

    if (
      obj instanceof Date ||
      obj instanceof DateTime ||
      obj instanceof DateOnly ||
      obj instanceof Time
    ) {
      return obj;
    }

    if (obj instanceof Array) {
      for (let i = 0; i < obj.length; i++) {
        obj[i] = this.nullToUndefined(obj[i]);
      }
      return obj;
    }

    if (typeof obj === "object") {
      const objRec = obj as Record<string, any>;
      for (const key of Object.keys(obj)) {
        objRec[key] = this.nullToUndefined(objRec[key]);
      }

      return obj;
    }

    return obj;
  }

  static optToUndef<T>(obj: TUndefToOptional<T>): T {
    return obj as T;
  }

  static unflattenObject(flatObj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const key in flatObj) {
      const parts = key.split(".");
      let current = result;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (i === parts.length - 1) {
          current[part] = flatObj[key];
        } else {
          if (!(part in current)) {
            current[part] = {};
          }
          current = current[part];
        }
      }
    }

    return result;
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
  invalidateDef: IValidateDef<T> & {
    type?: Type<WrappedType<T>>[];
  };
  message?: string;
}

type TValidateObjectDef<T> = { [K in keyof T]?: TValidateDef<T[K]> };
type TValidateObjectResult<T> = { [K in keyof T]?: IValidateResult<T[K]> };

export interface IValidateDefWithName<T> extends IValidateDef<T> {
  displayName: string;
}

export type TValidateObjectDefWithName<T> = { [K in keyof T]?: IValidateDefWithName<T[K]> };

interface IValidateArrayResult<T> {
  index: number;
  item: T;
  result: TValidateObjectResult<T>;
}

export type TUndefToOptional<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]?: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};

export type TOptionalToUndef<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? Exclude<T[K], undefined> | undefined : T[K];
};
