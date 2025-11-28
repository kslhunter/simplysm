import { cloneDeepWith, get, isEqualWith, omit, pick, pickBy, set, unset } from "lodash-es";
import { Type } from "../types/type/Type";
import { DateTime } from "../types/date-time/DateTime";
import { DateOnly } from "../types/date-time/DateOnly";
import { Time } from "../types/date-time/Time";
import { Uuid } from "../types/Uuid";
import { WrappedType } from "../types/wrap/WrappedType";
import { TFlatType } from "../types/type/TFlatType";
import { UnwrappedType } from "../types/wrap/UnwrappedType";

export class ObjectUtils {
  // [엔진 교체: 하이브리드] 옵션 없을 때만 Lodash 사용 (성능 UP)
  static clone<T>(
    source: T,
    options?: {
      excludes?: string[];
      useRefTypes?: any[];
      onlyOneDepth?: boolean;
    },
  ): T {
    // 옵션이 있는 복잡한 케이스 -> 기존 로직(Legacy) 사용
    if (options && (options.excludes || options.useRefTypes || options.onlyOneDepth)) {
      return this.#cloneLegacy(source, options);
    }

    // 일반적인 케이스 -> Lodash 사용 (빠르고 안정적)
    return cloneDeepWith(source, (value) => {
      if (value instanceof DateTime) return new DateTime(value.tick);
      if (value instanceof DateOnly) return new DateOnly(value.tick);
      if (value instanceof Time) return new Time(value.tick);
      if (value instanceof Uuid) return new Uuid(value.toString());
      if (value instanceof Buffer) return Buffer.from(value);

      // Map, Set 깊은 복사
      if (value instanceof Map) {
        return new Map(
          Array.from(value.entries()).map(([k, v]) => [ObjectUtils.clone(k), ObjectUtils.clone(v)]),
        );
      }
      if (value instanceof Set) {
        return new Set(Array.from(value).map((v) => ObjectUtils.clone(v)));
      }

      return undefined;
    });
  }

  // [기존 로직 유지] 옵션 처리를 위해 보존
  static #cloneLegacy(
    source: any,
    options?: {
      excludes?: any[];
      useRefTypes?: any[];
      onlyOneDepth?: boolean;
    },
    prevClones?: {
      source: any;
      clone: any;
    }[],
  ): any {
    if (source == null) return source;
    if (source instanceof Buffer) return Buffer.from(source);
    if (source instanceof Array) {
      if (options?.onlyOneDepth) return [...source];
      return source.map((item) => this.#cloneLegacy(item, options));
    }
    if (source instanceof Map) {
      return Array.from(source.keys()).toMap(
        (key) => this.#cloneLegacy(key, options),
        (key) => this.#cloneLegacy(source.get(key), options),
      );
    }
    if (source instanceof Date) return new Date(source.getTime());
    if (source instanceof DateTime) return new DateTime(source.tick);
    if (source instanceof DateOnly) return new DateOnly(source.tick);
    if (source instanceof Time) return new Time(source.tick);
    if (source instanceof Uuid) return new Uuid(source.toString());

    if (typeof source === "object") {
      if (options?.onlyOneDepth) return { ...source };

      const result: Record<string, any> = {};
      Object.setPrototypeOf(result, source.constructor.prototype);
      const currPrevClones = prevClones ?? [];
      currPrevClones.push({ source, clone: result });

      for (const key of Object.keys(source).filter(
        (sourceKey) => options?.excludes?.includes(sourceKey) !== true,
      )) {
        if (source[key] === undefined) {
          result[key] = undefined;
        } else if (options?.useRefTypes?.includes(source[key].constructor) === true) {
          result[key] = source[key];
        } else {
          const matchedPrevClone = prevClones?.single((item) => item.source === source[key]);
          if (matchedPrevClone !== undefined) {
            result[key] = matchedPrevClone.clone;
          } else {
            result[key] = this.#cloneLegacy(
              source[key],
              { useRefTypes: options?.useRefTypes },
              currPrevClones,
            );
          }
        }
      }
      return result;
    }
    return source;
  }

  // [롤백] Lodash merge는 null을 덮어씌우므로, 기존 로직(null 무시/삭제)을 반드시 유지해야 함
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

    const result = this.clone(source);
    for (const key of Object.keys(target)) {
      result[key] = this.merge(source[key], target[key], opt);
      if (result[key] === undefined) {
        delete result[key];
      }
    }

    return result as any;
  }

  // [유지] 기존 로직 유지
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

  // [엔진 교체] Lodash 위임
  static omit<T extends Record<string, any>, K extends keyof T>(
    item: T,
    omitKeys: K[],
  ): Omit<T, K> {
    return omit(item, omitKeys) as any;
  }

  // [엔진 교체] Lodash 위임
  static omitByFilter<T extends Record<string, any>>(
    item: T,
    omitKeyFn: (key: keyof T) => boolean,
  ): T {
    return pickBy(item, (_value, key) => !omitKeyFn(key as keyof T)) as T;
  }

  // [엔진 교체] Lodash 위임
  static pick<T extends Record<string, any>, K extends keyof T>(item: T, keys: K[]): Pick<T, K> {
    return pick(item, keys);
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

  // [엔진 교체: 하이브리드] 옵션 없을 때만 Lodash 사용
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
    // 옵션 있으면 레거시 로직
    if (
      options &&
      (options.includes || options.excludes || options.ignoreArrayIndex || options.onlyOneDepth)
    ) {
      return this.#equalLegacy(source, target, options);
    }

    // 일반 케이스 Lodash
    return isEqualWith(source, target, (val1, val2) => {
      if (val1 instanceof DateTime && val2 instanceof DateTime) return val1.tick === val2.tick;
      if (val1 instanceof DateOnly && val2 instanceof DateOnly) return val1.tick === val2.tick;
      if (val1 instanceof Time && val2 instanceof Time) return val1.tick === val2.tick;
      if (val1 instanceof Uuid && val2 instanceof Uuid) return val1.toString() === val2.toString();
      return undefined;
    });
  }

  // [기존 로직 유지]
  static #equalLegacy(
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
    if (source instanceof Date && target instanceof Date)
      return source.getTime() === target.getTime();
    if (
      (source instanceof DateTime && target instanceof DateTime) ||
      (source instanceof DateOnly && target instanceof DateOnly) ||
      (source instanceof Time && target instanceof Time)
    ) {
      return source.tick === target.tick;
    }

    if (source instanceof Array && target instanceof Array) {
      if (source.length !== target.length) return false;

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
            if (source[i] !== target[i]) return false;
          }
        } else {
          for (let i = 0; i < source.length; i++) {
            if (!this.equal(source[i], target[i], options)) return false;
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
          source[key] !== undefined,
      );
      const targetKeys = Array.from(target.keys()).filter(
        (key) =>
          (options?.includes === undefined || options.includes.includes(key)) &&
          !options?.excludes?.includes(key) &&
          target[key] !== undefined,
      );

      if (sourceKeys.length !== targetKeys.length) return false;

      for (const key of sourceKeys) {
        if (options?.onlyOneDepth) {
          if (source.get(key) !== target.get(key)) return false;
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

      if (sourceKeys.length !== targetKeys.length) return false;

      for (const key of sourceKeys) {
        if (options?.onlyOneDepth) {
          if (source[key] !== target[key]) return false;
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

  // [유지]
  static validate<T>(value: T, def: TValidateDef<T>): IValidateResult<T> | undefined {
    let currDef: IValidateDef<T> & {
      type?: Type<WrappedType<T>>[];
    };
    if (def instanceof Array) {
      currDef = { type: def };
    } else if (typeof def === "function") {
      currDef = { type: [def] };
    } else {
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

  static validateObject<T>(obj: T, def: TValidateObjectDef<T>): TValidateObjectResult<T> {
    const result: TValidateObjectResult<T> = {};
    for (const defKey of Object.keys(def)) {
      const validateResult = this.validate(this.getChainValue(obj, defKey), def[defKey]);
      if (validateResult !== undefined) {
        result[defKey] = validateResult;
      }
    }
    return result;
  }

  static validateObjectWithThrow<T>(
    displayName: string,
    obj: T,
    def: TValidateObjectDefWithName<T>,
  ): void {
    const validateResult = this.validateObject(obj, def);
    if (Object.keys(validateResult).length > 0) {
      const errMessages: string[] = [];
      const invalidateKeys = Object.keys(validateResult);
      for (const invalidateKey of invalidateKeys) {
        const itemDisplayName: string = def[invalidateKey].displayName;
        let errMessage = `- '${itemDisplayName}'`;

        if ((def[invalidateKey] as IValidateDefWithName<any>).displayValue) {
          const itemValue = validateResult[invalidateKey].value;
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

  static validateArray<T>(
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

  static validateArrayWithThrow<T>(
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
          const itemDisplayName: string = realDef[invalidateKey].displayName;
          let errMessage = `- ${validateResult.index + 1}번째 항목의 '${itemDisplayName}'`;

          if ((realDef[invalidateKey] as IValidateDefWithName<any>).displayValue) {
            const itemValue = validateResult.result[invalidateKey].value;
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

  // [유지] 커스텀 경로 파싱 로직 (!, ?, quote 제거 등)은 Lodash가 지원하지 않으므로 유지해야 함
  static #getChainSplits(chain: string): (string | number)[] {
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

  // [엔진 교체] 파싱은 기존 방식대로, 탐색은 Lodash 사용 (안정성+편의성)
  static getChainValue(obj: any, chain: string): any {
    // 기존 로직으로 경로 배열 생성 후 Lodash에게 전달
    return get(obj, this.#getChainSplits(chain));
  }

  // [엔진 교체] Lodash set
  static setChainValue(obj: any, chain: string, value: any): void {
    set(obj, this.#getChainSplits(chain), value);
  }

  // [엔진 교체] Lodash unset
  static deleteChainValue(obj: any, chain: string): void {
    unset(obj, this.#getChainSplits(chain));
  }

  static clearUndefined<T>(obj: T): T {
    if (obj == null) {
      return obj;
    }

    for (const key of Object.keys(obj)) {
      if (obj[key] === undefined) {
        delete obj[key];
      }
    }

    return obj;
  }

  static clear<T extends {}>(obj: T): {} {
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
      for (const key of Object.keys(obj)) {
        obj[key] = this.nullToUndefined(obj[key]);
      }

      return obj;
    }

    return obj;
  }

  static optToUndef<T>(obj: TUndefToOptional<T>): T {
    return obj as T;
  }

  // [엔진 교체] Lodash set 활용
  static unflattenObject(flatObj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key in flatObj) {
      // 키가 'a.b.c' 형태일 때 Lodash set이 알아서 객체 생성
      set(result, key, flatObj[key]);
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
