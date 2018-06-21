import {Uuid} from "../types/Uuid";
import {Time} from "../types/Time";
import {DateOnly} from "../types/DateOnly";
import {DateTime} from "../types/DateTime";

export class JsonConvert {
  public static stringify(obj: any, options?: IJsonConvertStringifyOption): string {
    function replacer(key: any, value: any): any {
      const currValue = (options && options.replacer)
        ? options.replacer(key, value)
        : value;

      if (currValue instanceof Date) {
        return {type: "Date", data: currValue.toISOString()};
      }
      else if (currValue instanceof DateTime) {
        return {type: "DateTime", data: currValue.toString()};
      }
      else if (currValue instanceof DateOnly) {
        return {type: "DateOnly", data: currValue.toString()};
      }
      else if (currValue instanceof Time) {
        return {type: "Time", data: currValue.toString()};
      }
      else if (currValue instanceof Uuid) {
        return {type: "Uuid", data: currValue.toString()};
      }
      else if (currValue instanceof Error) {
        const error = {};
        for (const currKey of Object.getOwnPropertyNames(currValue)) {
          error[currKey] = currValue[currKey];
        }

        return {type: "Error", data: error};
      }

      return value;
    }

    function bufferReplacer(value: any): any {
      if (value instanceof Buffer) {
        return {type: "Buffer", data: value["data"]};
      }
      else if (!(value instanceof Array) && value instanceof Object && Object.keys(value).length > 0) {
        const result = {};
        for (const key of Object.keys(value)) {
          result[key] = bufferReplacer(value[key]);
        }
        return result;
      }
      else {
        return value;
      }
    }

    return JSON.stringify(bufferReplacer(obj), replacer, options && options.space);
  }

  public static parse(json: string): any {
    return JSON.parse(json, (key, value) => {
      if (value == undefined) {
        return undefined;
      }
      else if (typeof value === "object" && value.type === "Date") {
        return new Date(Date.parse(value.data));
      }
      else if (typeof value === "object" && value.type === "DateTime") {
        return DateTime.parse(value.data);
      }
      else if (typeof value === "object" && value.type === "DateOnly") {
        return DateOnly.parse(value.data);
      }
      else if (typeof value === "object" && value.type === "Time") {
        return Time.parse(value.data);
      }
      else if (typeof value === "object" && value.type === "Uuid") {
        return new Uuid(value.data);
      }
      else if (typeof value === "object" && value.type === "Error") {
        const error = new Error();
        Object.assign(error, value.data);
        return error;
      }
      else if (typeof value === "object" && value.type === "Buffer") {
        return Buffer.from(value.data);
      }

      return value;
    });
  }
}

export interface IJsonConvertStringifyOption {
  space?: string | number;

  replacer?(key: any, value: any): any;
}