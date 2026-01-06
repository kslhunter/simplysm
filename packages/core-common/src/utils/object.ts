import { DateTime } from "../types/DateTime.js";
import { DateOnly } from "../types/DateOnly.js";
import { Time } from "../types/Time.js";
import { Uuid } from "../types/Uuid.js";

/**
 * 객체 유틸리티 클래스
 */
export class ObjectUtils {
  //#region clone

  /**
   * 깊은 복사
   * - 순환 참조 지원
   * - 커스텀 타입(DateTime, DateOnly, Time, Uuid, Buffer) 복사 지원
   */
  static clone<T>(source: T): T {
    return this._clone(source) as T;
  }

  private static _clone(source: unknown, prevClones?: WeakMap<object, unknown>): unknown {
    // primitive는 그대로 반환
    if (typeof source !== "object" || source === null) {
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
    const currPrevClones = prevClones ?? new WeakMap<object, unknown>();
    if (currPrevClones.has(source)) {
      return currPrevClones.get(source);
    }

    if (Buffer.isBuffer(source)) {
      const result = Buffer.from(source);
      currPrevClones.set(source, result);
      return result;
    }

    if (source instanceof Array) {
      const result: unknown[] = [];
      currPrevClones.set(source, result);
      for (const item of source) {
        result.push(this._clone(item, currPrevClones));
      }
      return result;
    }

    if (source instanceof Map) {
      const result = new Map();
      currPrevClones.set(source, result);
      for (const [key, value] of source) {
        result.set(this._clone(key, currPrevClones), this._clone(value, currPrevClones));
      }
      return result;
    }

    if (source instanceof Set) {
      const result = new Set();
      currPrevClones.set(source, result);
      for (const item of source) {
        result.add(this._clone(item, currPrevClones));
      }
      return result;
    }

    // 기타 Object
    const result: Record<string, unknown> = {};
    Object.setPrototypeOf(result, Object.getPrototypeOf(source));
    currPrevClones.set(source, result);

    for (const key of Object.keys(source)) {
      const value = (source as Record<string, unknown>)[key];
      result[key] = value == null ? undefined : this._clone(value, currPrevClones);
    }

    return result;
  }

  //#endregion

  //#region equal

  /**
   * 깊은 비교
   */
  static equal(
    source: unknown,
    target: unknown,
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

    if (source instanceof Uuid && target instanceof Uuid) {
      return source.toString() === target.toString();
    }

    if (source instanceof Array && target instanceof Array) {
      return this._equalArray(source, target, options);
    }

    if (source instanceof Map && target instanceof Map) {
      return this._equalMap(source, target, options);
    }

    if (typeof source === "object" && typeof target === "object") {
      return this._equalObject(
        source as Record<string, unknown>,
        target as Record<string, unknown>,
        options,
      );
    }

    return false;
  }

  private static _equalArray(
    source: unknown[],
    target: unknown[],
    options?: {
      includes?: string[];
      excludes?: string[];
      ignoreArrayIndex?: boolean;
      onlyOneDepth?: boolean;
    },
  ): boolean {
    if (source.length !== target.length) {
      return false;
    }

    if (options?.ignoreArrayIndex) {
      if (options.onlyOneDepth) {
        return source.every((sourceItem) => target.some((targetItem) => targetItem === sourceItem));
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

  private static _equalMap(
    source: Map<unknown, unknown>,
    target: Map<unknown, unknown>,
    options?: {
      includes?: string[];
      excludes?: string[];
      ignoreArrayIndex?: boolean;
      onlyOneDepth?: boolean;
    },
  ): boolean {
    const sourceKeys = Array.from(source.keys()).filter(
      (key) =>
        typeof key === "string" &&
        (options?.includes === undefined || options.includes.includes(key)) &&
        !options?.excludes?.includes(key) &&
        source.get(key) != null,
    );
    const targetKeys = Array.from(target.keys()).filter(
      (key) =>
        typeof key === "string" &&
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

  private static _equalObject(
    source: Record<string, unknown>,
    target: Record<string, unknown>,
    options?: {
      includes?: string[];
      excludes?: string[];
      ignoreArrayIndex?: boolean;
      onlyOneDepth?: boolean;
    },
  ): boolean {
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

  //#endregion

  //#region merge

  /**
   * 깊은 병합 (source를 base로 target을 병합)
   */
  static merge<T, P>(
    source: T,
    target: P,
    opt?: {
      arrayProcess?: "replace" | "concat";
      useDelTargetNull?: boolean;
    },
  ): T & P {
    if (source == null) {
      return this.clone(target) as T & P;
    }

    if (target === undefined) {
      return this.clone(source) as T & P;
    }

    if (target === null) {
      return opt?.useDelTargetNull ? (undefined as T & P) : (this.clone(source) as T & P);
    }

    if (typeof target !== "object") {
      return target as T & P;
    }

    if (
      target instanceof Date ||
      target instanceof DateTime ||
      target instanceof DateOnly ||
      target instanceof Time ||
      target instanceof Uuid ||
      Buffer.isBuffer(target) ||
      (opt?.arrayProcess === "replace" && target instanceof Array)
    ) {
      return this.clone(target) as T & P;
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
      return result as T & P;
    }

    if (opt?.arrayProcess === "concat" && source instanceof Array && target instanceof Array) {
      let result = [...new Set([...source, ...target])];
      if (opt.useDelTargetNull) {
        result = result.filter((item) => item !== null);
      }
      return result as T & P;
    }

    const sourceRec = source as Record<string, unknown>;
    const targetRec = target as Record<string, unknown>;
    const resultRec = this.clone(sourceRec);
    for (const key of Object.keys(target)) {
      resultRec[key] = this.merge(sourceRec[key], targetRec[key], opt);
      if (resultRec[key] === undefined) {
        delete resultRec[key];
      }
    }

    return resultRec as T & P;
  }

  /**
   * 3-way 병합 (source, origin, target)
   * 충돌 여부와 결과를 반환
   */
  static merge3<
    S extends Record<string, unknown>,
    O extends Record<string, unknown>,
    T extends Record<string, unknown>,
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
    const result = this.clone(origin) as Record<string, unknown>;
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

  //#endregion

  //#region omit / pick

  /**
   * 객체에서 특정 키들을 제외
   */
  static omit<T extends Record<string, unknown>, K extends keyof T>(
    item: T,
    omitKeys: K[],
  ): Omit<T, K> {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(item)) {
      if (!omitKeys.includes(key as K)) {
        result[key] = item[key];
      }
    }
    return result as Omit<T, K>;
  }

  /**
   * 조건에 맞는 키들을 제외
   */
  static omitByFilter<T extends Record<string, unknown>>(
    item: T,
    omitKeyFn: (key: keyof T) => boolean,
  ): T {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(item)) {
      if (!omitKeyFn(key)) {
        result[key] = item[key];
      }
    }
    return result as T;
  }

  /**
   * 객체에서 특정 키들만 선택
   */
  static pick<T extends Record<string, unknown>, K extends keyof T>(
    item: T,
    keys: K[],
  ): Pick<T, K> {
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      result[key as string] = item[key];
    }
    return result as Pick<T, K>;
  }

  //#endregion

  //#region chain value

  private static _getChainSplits(chain: string): (string | number)[] {
    const split = chain
      .split(/[.[\]]/g)
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

  /**
   * 체인 경로로 값 가져오기
   * @example getChainValue(obj, "a.b[0].c")
   */
  static getChainValue(obj: unknown, chain: string, optional: true): unknown | undefined;
  static getChainValue(obj: unknown, chain: string): unknown;
  static getChainValue(obj: unknown, chain: string, optional?: true): unknown | undefined {
    const splits = this._getChainSplits(chain);
    let result: unknown = obj;
    for (const splitItem of splits) {
      if (optional && result === undefined) {
        result = undefined;
      } else {
        result = (result as Record<string | number, unknown>)[splitItem];
      }
    }
    return result;
  }

  /**
   * depth만큼 같은 키로 내려가기
   * @example getChainValueByDepth({ parent: { parent: { name: 'a' } } }, 'parent', 2) => { name: 'a' }
   */
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
    let result: unknown = obj;
    for (let i = 0; i < depth; i++) {
      if (optional && result == null) {
        result = undefined;
      } else {
        result = (result as Record<string, unknown>)[key as string];
      }
    }
    return result as T[K] | undefined;
  }

  /**
   * 체인 경로로 값 설정
   * @example setChainValue(obj, "a.b[0].c", value)
   */
  static setChainValue(obj: unknown, chain: string, value: unknown): void {
    const splits = this._getChainSplits(chain);
    if (splits.length === 0) {
      throw new Error("체인이 비어있습니다.");
    }

    let curr: Record<string | number, unknown> = obj as Record<string | number, unknown>;
    for (const splitItem of splits.slice(0, -1)) {
      curr[splitItem] = curr[splitItem] ?? {};
      curr = curr[splitItem] as Record<string | number, unknown>;
    }

    const last = splits[splits.length - 1];
    curr[last] = value;
  }

  /**
   * 체인 경로의 값 삭제
   * @example deleteChainValue(obj, "a.b[0].c")
   */
  static deleteChainValue(obj: unknown, chain: string): void {
    const splits = this._getChainSplits(chain);
    if (splits.length === 0) {
      throw new Error("체인이 비어있습니다.");
    }

    let curr: Record<string | number, unknown> = obj as Record<string | number, unknown>;
    for (const splitItem of splits.slice(0, -1)) {
      curr = curr[splitItem] as Record<string | number, unknown>;
    }

    const last = splits[splits.length - 1];
    delete curr[last];
  }

  //#endregion

  //#region clear / transform

  /**
   * 객체에서 undefined 값을 가진 키 삭제
   */
  static clearUndefined<T extends Record<string, any>>(obj: T): T {
    for (const key of Object.keys(obj)) {
      if (obj[key] === undefined) {
        delete obj[key];
      }
    }

    return obj;
  }

  /**
   * 객체의 모든 키 삭제
   */
  static clear<T extends Record<string, unknown>>(obj: T): Record<string, never> {
    for (const key of Object.keys(obj)) {
      delete obj[key];
    }
    return obj as Record<string, never>;
  }

  /**
   * null을 undefined로 변환 (재귀적)
   */
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
      const objRec = obj as Record<string, unknown>;
      for (const key of Object.keys(obj)) {
        objRec[key] = this.nullToUndefined(objRec[key]);
      }

      return obj;
    }

    return obj;
  }

  /**
   * flat된 객체를 nested 객체로 변환
   * @example unflattenObject({ "a.b.c": 1 }) => { a: { b: { c: 1 } } }
   */
  static unflattenObject(flatObj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const key in flatObj) {
      const parts = key.split(".");
      let current: Record<string, unknown> = result;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (i === parts.length - 1) {
          current[part] = flatObj[key];
        } else {
          if (!(part in current)) {
            current[part] = {};
          }
          current = current[part] as Record<string, unknown>;
        }
      }
    }

    return result;
  }

  //#endregion
}

//#region 타입 유틸리티

/**
 * undefined를 가진 프로퍼티를 optional로 변환
 * @example { a: string; b: string | undefined } → { a: string; b?: string | undefined }
 */
export type TUndefToOptional<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]?: T[K];
} & { [K in keyof T as undefined extends T[K] ? never : K]: T[K] };

/**
 * optional 프로퍼티를 required + undefined 유니온으로 변환
 * @example { a: string; b?: string } → { a: string; b: string | undefined }
 */
export type TOptionalToUndef<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? T[K] | undefined : T[K];
};

//#endregion
