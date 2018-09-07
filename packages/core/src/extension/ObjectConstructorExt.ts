import "./ArrayExt";
import {DateOnly} from "../type/DateOnly";
import {Uuid} from "../type/Uuid";
import {Type} from "../type/Type";
import {DateTime} from "../type/DateTime";
import {Time} from "../type/Time";

declare global {
  // tslint:disable-next-line:interface-name
  interface ObjectConstructor {
    clone<T extends { [key: string]: any }>(source: T, options?: { excludeProps?: (keyof T)[] }): T;

    equal<T extends { [key: string]: any }>(source: T, taget: T, options?: { excludeProps?: (keyof T)[] }): boolean;

    validate(value: any, def: ValidateDef): IValidateResult | undefined;

    validates(source: any, defs: { [key: string]: ValidateDef }): IValidateResult[];

    validatesArray<T, K extends keyof T>(arr: T[], displayName: string, def: ((item: T) => { [P in K]: IArrayValidateDef }) | { [P in K]: IArrayValidateDef }): void;
  }
}

export interface IArrayValidateDef {
  displayName: string;
  type?: Type<any> | Type<any>[];
  notnull?: boolean;

  validator?(value: any): boolean;
}

export interface IValidateDef {
  type?: Type<any> | Type<any>[];
  notnull?: boolean;

  validator?(value: any): boolean;
}

export type ValidateDef = Type<any> | Type<any>[] | IValidateDef;

export interface IValidateResult {
  value: any;
  propertyKey?: string;
  type?: Type<any> | Type<any>[];
  notnull?: boolean;

  validator?(value: any): boolean;
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

    const sourceKeys = Object.keys(source).filter(sourceKey => !options || !options.excludeProps || !options.excludeProps.includes(sourceKey));
    const targetKeys = Object.keys(target).filter(targetKey => !options || !options.excludeProps || !options.excludeProps.includes(targetKey));

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
};

Object.validates = function (source: any, defs: { [propertyKey: string]: ValidateDef }): IValidateResult[] {
  const result: IValidateResult[] = [];
  for (const propertyKey of Object.keys(defs)) {
    const validateResult = this.validate(source[propertyKey], defs[propertyKey]);
    if (validateResult) {
      result.push({
        propertyKey,
        ...validateResult
      });
    }
  }

  return result;
};

Object.validatesArray = function (arr: any[], displayName: string, def: { [propertyKey: string]: ValidateDef } | ((item: any) => { [propertyKey: string]: IArrayValidateDef })): void {
  const errorMessages = [];
  for (const item of arr) {
    const result = Object.validates(item, typeof def === "function" ? def(item) : def);
    if (result.length > 0) {
      const propertyDisplayNames = result.map(item1 => def[item1.propertyKey!]["displayName"]);
      errorMessages.push(`- '${displayName}'의 ${arr.indexOf(item) + 1}번째 항목중 '${propertyDisplayNames.join("', '")}'`);
    }
  }
  if (errorMessages.length > 0) {
    throw new Error("입력값이 잘못되었습니다.\r\n" + errorMessages.join("\r\n"));
  }
};