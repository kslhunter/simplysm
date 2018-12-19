import {DateTime} from "../type/DateTime";
import {DateOnly} from "../type/DateOnly";
import {Time} from "../type/Time";
import {Uuid} from "../type/Uuid";

export class JsonConvert {
  public static stringify(obj: any, options?: IJsonConvertStringifyOption): string | undefined {
    function replacer(key: any, value: any): any {
      const currValue = (options && options.replacer)
        ? options.replacer(key, value)
        : value;

      if (currValue instanceof Date) {
        return {__type__: "Date", data: currValue.toISOString()};
      } else if (currValue instanceof DateTime) {
        return {__type__: "DateTime", data: currValue.toString()};
      } else if (currValue instanceof DateOnly) {
        return {__type__: "DateOnly", data: currValue.toString()};
      } else if (currValue instanceof Time) {
        return {__type__: "Time", data: currValue.toString()};
      } else if (currValue instanceof Uuid) {
        return {__type__: "Uuid", data: currValue.toString()};
      } else if (currValue instanceof Error) {
        const error = {};
        for (const currKey of Object.getOwnPropertyNames(currValue)) {
          error[currKey] = currValue[currKey];
        }

        return {__type__: "Error", data: error};
      } else if (currValue instanceof Buffer || (currValue && currValue.type === "Buffer")) {
        return {__type__: "Buffer", data: (options && options.hideBuffer) ? "__hidden__" : value["data"]};
      }

      return value;
    }

    function bufferReplacer(value: any): any {
      if (value instanceof Buffer || (value && value.type === "Buffer")) {
        return {__type__: "Buffer", data: (options && options.hideBuffer) ? "__hidden__" : value["data"]};
      } else if (!(value instanceof Array) && value instanceof Object && Object.keys(value).length > 0) {
        const result = {};
        for (const key of Object.keys(value)) {
          result[key] = bufferReplacer(value[key]);
        }
        return result;
      } else {
        return value;
      }
    }

    return JSON.stringify(bufferReplacer(obj), replacer, options && options.space);
  }

  public static parse(json: string | undefined): any {
    return json && JSON.parse(json, (key, value) => {
      if (value == undefined) {
        return undefined;
      } else if (typeof value === "object" && value.__type__ === "Date") {
        return new Date(Date.parse(value.data));
      } else if (typeof value === "object" && value.__type__ === "DateTime") {
        return DateTime.parse(value.data);
      } else if (typeof value === "object" && value.__type__ === "DateOnly") {
        return DateOnly.parse(value.data);
      } else if (typeof value === "object" && value.__type__ === "Time") {
        return Time.parse(value.data);
      } else if (typeof value === "object" && value.__type__ === "Uuid") {
        return new Uuid(value.data);
      } else if (typeof value === "object" && value.__type__ === "Error") {
        const error = new Error();
        Object.assign(error, value.data);
        return error;
      } else if (typeof value === "object" && value.__type__ === "Buffer") {
        return Buffer.from(value.data);
      }

      return value;
    });
  }
}

export interface IJsonConvertStringifyOption {
  space?: string | number;
  hideBuffer?: boolean;

  replacer?(key: any, value: any): any;
}