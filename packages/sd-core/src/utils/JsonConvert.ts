import { DateOnly } from "../types/DateOnly";
import { Time } from "../types/Time";
import { Uuid } from "../types/Uuid";
import { Safe } from "./Safe";
import { Exception } from "..";

export interface JsonConvertStringifyOption {
  space?: string | number;
  hideBuffer?: boolean;

  replacer?(key: any, value: any): any;
}

export class JsonConvert {
  public static stringify(obj: any, option?: JsonConvertStringifyOption): string /* | undefined*/ {
    if (obj === undefined) {
      return "undefined";
    }

    function replacer(key: any, value: any): any {
      if (option && option.replacer) {
        value = option.replacer(key, value);
      }

      if (value instanceof Uuid) {
        return value.toString();
      }
      if (value instanceof Time) {
        return value.toFormatString("d.HH:mm:ss.fff");
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (value instanceof DateOnly) {
        return value.toFormatString("yyyy-MM-dd");
      }
      if (value instanceof Error) {
        const error = {};
        for (const valueKey of Object.getOwnPropertyNames(value)) {
          error[valueKey] = value[valueKey];
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
    }
    catch (e) {
      console.error(obj);
      throw e;
    }
  }

  public static parse(str: string | undefined): any {
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
        return new Buffer(value.data);
      }
      return value;
    });
  }
}
