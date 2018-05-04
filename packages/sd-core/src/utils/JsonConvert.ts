import {Exception} from "../exceptions/Exception";
import {DateOnly} from "../types/DateOnly";
import {Time} from "../types/Time";
import {Uuid} from "../types/Uuid";
import {Logger} from "../utils/Logger";
import {Safe} from "./Safe";

export interface IJsonConvertStringifyOption {
  space?: string | number;
  hideBuffer?: boolean;

  replacer?(key: any, value: any): any;
}

// tslint:disable-next-line:variable-name
export const JsonConvert = {
  stringify(obj: any, option?: IJsonConvertStringifyOption): string {
    if (obj === undefined) {
      return "undefined";
    }

    function replacer(key: any, value: any): any {
      const currValue = option && option.replacer
        ? option.replacer(key, value)
        : value;

      if (currValue instanceof Uuid) {
        return currValue.toString();
      }
      if (currValue instanceof Time) {
        return currValue.toFormatString("d.HH:mm:ss.fff");
      }
      if (currValue instanceof Date) {
        return currValue.toISOString();
      }
      if (currValue instanceof DateOnly) {
        return currValue.toFormatString("yyyy-MM-dd");
      }
      if (currValue instanceof Error) {
        const error = {};
        for (const currKey of Object.getOwnPropertyNames(currValue)) {
          error[currKey] = currValue[currKey];
        }

        return error;
      }
      if (option && option.hideBuffer && value && typeof value === "object" && value.type === "Buffer") {
        return "__buffer__";
      }

      return value;
    }

    const replacedObj = replacer(undefined, obj);
    try {
      return JSON.stringify(replacedObj, replacer, Safe.obj(option).space);
    } catch (e) {
      new Logger("@simplism/core", "JsonConvert.stringify").error(obj);
      throw e;
    }
  },

  parse(str: string | undefined): any {
    if (str === undefined || str === "undefined") {
      return;
    }

    return JSON.parse(str, (key, value) => {
      if (value === undefined || value === null) {
        return undefined;
      }
      if (typeof value === "string" && /^.{8}-.{4}-4.{3}-.{4}-.{12}$/.test(value)) {
        return new Uuid(value);
      }
      if (typeof value === "string" && /^\d\.[0-2]\d:[0-5]\d:[0-5]\d.\d{3}$/.test(value)) {
        return Time.parse(value);
      }
      if (typeof value === "string" && /^\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)$/.test(value)) {
        return new Date(Date.parse(value));
      }
      if (typeof value === "string" && /^\d{4}-[01]\d-[0-3]\d$/.test(value)) {
        return DateOnly.parse(value);
      }
      if (typeof value === "object" && Object.keys(value).includes("stack") && Object.keys(value).includes("message")) {
        return new Exception(value.message, value);
      }
      if (typeof value === "object" && value.type === "Buffer") {
        return Buffer.from(value.data);
      }

      return value;
    });
  }
};
