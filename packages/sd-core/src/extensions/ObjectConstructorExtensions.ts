import {DateOnly} from "../types/DateOnly";
import {Time} from "../types/Time";

declare global {
  interface ObjectConstructor {
    equal<T>(source: T, taget: T): boolean;

    clone<T>(source: T, opts?: IObjectCloneOptions): T;
  }
}

Object.equal = function (source: any, target: any): boolean {
  if (source instanceof Date || source instanceof DateOnly) {
    if (!(target instanceof Date || target instanceof DateOnly)) {
      return false;
    }

    return source.getTime() === target.getTime();
  }
  else if (source instanceof Time) {
    if (!(target instanceof Time)) {
      return false;

    }
    return source.getTotalMilliSeconds() === target.getTotalMilliSeconds();
  }
  else if (source instanceof Array) {
    if (!(target instanceof Array)) {
      return false;
    }

    return source.differenceWith(target).length < 1;
  }
  else if (source instanceof Object) {
    if (!(target instanceof Object)) {
      return false;
    }

    if (Object.keys(source).length !== Object.keys(target).length) {
      return false;
    }

    for (const key of Object.keys(source)) {
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

Object.clone = function (source: any, opts?: IObjectCloneOptions): any {
  if (source instanceof Array) {
    const result = [];
    for (const sourceItem of source) {
      result.push(Object.clone(sourceItem, opts));
    }
    return result;
  }
  else if (source instanceof Date) {
    return new Date(source);
  }
  else if (source instanceof Object) {
    const result = {};
    Object.setPrototypeOf(result, source.constructor.prototype);
    for (const key of Object.keys(source).filter((sourceKey) => opts ? !opts.excludes.includes(sourceKey) : true)) {
      result[key] = Object.clone(source[key], opts);
    }
    return result;
  }
  else {
    return source;
  }
};

export interface IObjectCloneOptions {
  excludes: string[];
}