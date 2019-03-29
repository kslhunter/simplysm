import "./ArrayExtensions";
import {DateOnly} from "../types/DateOnly";
import {Uuid} from "../types/Uuid";
import {Type} from "../types/Type";
import {DateTime} from "../types/DateTime";
import {Time} from "../types/Time";
import {IValidateDef, IValidateResult, ValidateDef} from "./commons";

declare global {
  // tslint:disable-next-line:interface-name
  interface ObjectConstructor {
    clone<T extends { [key: string]: any }>(source: T, options?: { excludeProps?: (keyof T)[] }): T;

    merge<T extends { [key: string]: any } | undefined, O extends { [key: string]: any } | undefined>(source: T, obj: O): T & O;

    equal<T extends { [key: string]: any }>(source: T, taget: T, options?: { excludeProps?: (keyof T)[] }): boolean;

    validate(value: any, def: ValidateDef): IValidateResult | undefined;

    validates(source: any, defs: ((item: any) => { [key: string]: IValidateDef }), throwNotUse?: boolean): IValidateResult[];

    validates(source: any, defs: { [key: string]: ValidateDef }, throwNotUse?: boolean): IValidateResult[];

    validatesArray<T, K extends keyof T>(arr: T[], displayName: string, def: ((item: T) => { [P in K]: IValidateDef })): void;

    validatesArray<T, K extends keyof T>(arr: T[], displayName: string, def: { [P in K]: IValidateDef }): void;

    getFromChain<T, K extends keyof T>(item: T, key: K, depth: number): NonNullable<T[K]>;
  }
}

Object.clone = function (source: any, options?: { excludeProps?: string[] }): any {
  if (source instanceof Array) {
    const result = [];
    for (const sourceItem of source) {
      result.push(Object.clone(sourceItem));
    }

    return result;
  }
  else if (source instanceof Date) {
    return new Date(source.getTime());
  }
  else if (source instanceof DateTime) {
    return new DateTime(source.tick);
  }
  else if (source instanceof DateOnly) {
    return new DateOnly(source.tick);
  }
  else if (source instanceof Time) {
    return new Time(source.tick);
  }
  else if (source instanceof Uuid) {
    return new Uuid(source.toString());
  }
  else if (typeof source === "object") {
    const result = {};
    Object.setPrototypeOf(result, source.constructor.prototype);
    for (const key of Object.keys(source).filter(sourceKey => !options || !options.excludeProps || !options.excludeProps.includes(sourceKey))) {
      result[key] = Object.clone(source[key]);
    }

    return result;
  }
  else {
    return source;
  }
};

Object.merge = function (source: any, obj: any): any {
  const sourceClone = Object.clone(source);

  if (source === undefined) {
    return obj;
  }

  if (obj === undefined) {
    return sourceClone;
  }

  if (typeof source !== typeof obj) {
    throw new Error("머지하려고 하는 타입이 서로 다릅니다.");
  }

  if (typeof source !== "object") {
    return obj;
  }

  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "object") {
      sourceClone[key] = Object.merge(source[key], obj[key]);
    }
    else {
      sourceClone[key] = obj[key];
    }
  }

  return sourceClone;
};

Object.equal = function (source: any, target: any, options?: { excludeProps?: string[] }): boolean {
  if (source instanceof Date) {
    if (!(target instanceof Date)) {
      return false;
    }

    return source.getTime() === target.getTime();
  }
  else if (source instanceof Time || source instanceof DateOnly || source instanceof DateTime) {
    if (!(target instanceof Time || target instanceof DateOnly || target instanceof DateTime)) {
      return false;
    }

    return source.tick === target.tick;
  }
  else if (source instanceof Uuid) {
    if (!(target instanceof Uuid)) {
      return false;
    }

    return source.toString() === target.toString();
  }
  else if (source instanceof Array) {
    if (!(target instanceof Array)) {
      return false;
    }

    return source.diffs(target).length < 1;
  }
  else if (source instanceof Object) {
    if (!(target instanceof Object)) {
      return false;
    }

    const sourceKeys = Object.keys(source)
      .filter(sourceKey => (!options || !options.excludeProps || !options.excludeProps.includes(sourceKey)) && source[sourceKey] !== undefined);
    const targetKeys = Object.keys(target)
      .filter(targetKey => (!options || !options.excludeProps || !options.excludeProps.includes(targetKey)) && target[targetKey] !== undefined);

    if (sourceKeys.length !== targetKeys.length) {
      return false;
    }

    for (const key of sourceKeys) {
      if (!Object.equal(source[key], target[key])) {
        return false;
      }
    }

    return true;
  }
  else {
    return source === target;
  }
};

Object.validate = function (value: any, def: ValidateDef): IValidateResult | undefined {
  let config;
  if (def instanceof Array) {
    config = {type: def};
  }
  else if (typeof def === "function") {
    config = {type: [def]};
  }
  else if ((def as any).type && !((def as any).type instanceof Array)) {
    config = {
      ...(def as any),
      type: [(def as any).type]
    };
  }
  else {
    config = def;
  }

  if (value == undefined) {
    if (config.notnull) {
      return {value, notnull: config.notnull};
    }
    return undefined;
  }

  if (config.type) {
    if (!config.type.some((type: any) => type === value.constructor)) {
      return {value, type: config.type.map((item: Type<any>) => item.name)};
    }
  }

  if (config.validator) {
    if (!config.validator(value)) {
      return {value, validator: config.validator};
    }
  }

  if (config.includes) {
    if (!config.includes.includes(value)) {
      return {value, includes: config.includes};
    }
  }
};

Object.validates = function (source: any, defs: { [propertyKey: string]: ValidateDef } | ((item: any) => { [propertyKey: string]: ValidateDef }), throwNotUse?: boolean): IValidateResult[] {
  const result: IValidateResult[] = [];
  const defsObj = typeof defs === "function" ? defs(source) : defs;
  for (const propertyKey of Object.keys(defsObj)) {
    const validateResult = this.validate(source[propertyKey], defsObj[propertyKey]);
    if (validateResult) {
      result.push({
        propertyKey,
        ...validateResult
      });
    }
  }

  if (result.length > 0 && !throwNotUse) {
    const propertyDisplayNames = result.map(item1 => defsObj[item1.propertyKey!]["displayName"]);
    throw new Error(`입력값이 잘못되었습니다.\n - '${propertyDisplayNames.join("', '")}'`);
  }

  return result;
};

Object.validatesArray = function (arr: any[], displayName: string, def: { [propertyKey: string]: ValidateDef } | ((item: any) => { [propertyKey: string]: ValidateDef })): void {
  const errorMessages = [];
  for (const item of arr) {
    const defObj = typeof def === "function" ? def(item) : def;
    const result = Object.validates(item, defObj, true);
    if (result.length > 0) {
      const propertyDisplayNames = result.map(item1 => defObj[item1.propertyKey!]["displayName"]);
      errorMessages.push(`- '${displayName}'의 ${arr.indexOf(item) + 1}번째 항목중 '${propertyDisplayNames.join("', '")}'`);
    }
  }
  if (errorMessages.length > 0) {
    throw new Error("입력값이 잘못되었습니다.\n" + errorMessages.join("\n"));
  }
};

Object.getFromChain = function (item: any, key: any, depth: number): any {
  let result = Object.clone(item);
  for (let i = 0; i < depth; i++) {
    result = result[key];
  }
  return result;
};