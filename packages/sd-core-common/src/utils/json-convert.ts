import { DateTime } from "../types/date-time";
import { DateOnly } from "../types/date-only";
import { Time } from "../types/time";
import { Uuid } from "../types/uuid";
import { ObjectUtils } from "./object.utils";
import { SdError } from "../errors/sd-error";

export class JsonConvert {
  static stringify(
    obj: any,
    options?: {
      space?: string | number;
      replacer?: (key: string | undefined, value: any) => any;
      hideBuffer?: boolean;
    },
  ): string {
    const replacer = (key: string | undefined, value: any): any => {
      const currValue = options?.replacer !== undefined ? options.replacer(key, value) : value;
      if (currValue instanceof Date) {
        return { __type__: "Date", data: currValue.toISOString() };
      }
      if (currValue instanceof DateTime) {
        return { __type__: "DateTime", data: currValue.toString() };
      } else if (currValue instanceof DateOnly) {
        return { __type__: "DateOnly", data: currValue.toString() };
      } else if (currValue instanceof Time) {
        return { __type__: "Time", data: currValue.toString() };
      } else if (currValue instanceof Uuid) {
        return { __type__: "Uuid", data: currValue.toString() };
      } else if (currValue instanceof Set) {
        return { __type__: "Set", data: Array.from(currValue) };
      } else if (currValue instanceof Map) {
        return { __type__: "Map", data: Array.from(currValue.entries()) };
      } else if (currValue instanceof Error) {
        return {
          __type__: "Error",
          data: {
            ...currValue,
            message: currValue.message,
            name: currValue.name,
            stack: currValue.stack,
          },
        };
      } else if (currValue?.type === "Buffer" && options?.hideBuffer === true) {
        return { type: "Buffer", data: "__hidden__" };
      }
      return currValue;
    };

    const prevDateToJson = Date.prototype.toJSON;
    delete (Date.prototype as any).toJSON;

    const result1 = JSON.stringify(replacer(undefined, obj), replacer, options?.space);
    Date.prototype.toJSON = prevDateToJson;

    return result1;
  }

  static parse(json: string): any {
    try {
      return ObjectUtils.nullToUndefined(
        JSON.parse(json, (key, value) => {
          if (value != null) {
            if (typeof value === "object" && value.__type__ === "Date") {
              return new Date(Date.parse(value.data));
            } else if (typeof value === "object" && value.__type__ === "DateTime") {
              return DateTime.parse(value.data);
            } else if (typeof value === "object" && value.__type__ === "DateOnly") {
              return DateOnly.parse(value.data);
            } else if (typeof value === "object" && value.__type__ === "Time") {
              return Time.parse(value.data);
            } else if (typeof value === "object" && value.__type__ === "Uuid") {
              return new Uuid(value.data);
            } else if (typeof value === "object" && value.__type__ === "Set") {
              return new Set(value.data);
            } else if (typeof value === "object" && value.__type__ === "Map") {
              return new Map(value.data);
            } else if (typeof value === "object" && value.__type__ === "Error") {
              const error = new Error(value.data.message);
              Object.assign(error, value.data);
              return error;
            } else if (typeof value === "object" && value.type === "Buffer") {
              return Buffer.from(value.data);
            }
          }

          return value;
        }),
      );
    } catch (err) {
      throw new SdError(err, "JSON 파싱 에러: \n" + json);
    }
  }
}
