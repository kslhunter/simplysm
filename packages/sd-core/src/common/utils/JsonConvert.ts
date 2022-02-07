import { DateTime } from "../types/DateTime";
import { DateOnly } from "../types/DateOnly";
import { Time } from "../types/Time";
import { Uuid } from "../types/Uuid";
import { ObjectUtil } from "./ObjectUtil";

export class JsonConvert {
  public static stringify(obj: any,
                          options?: {
                            space?: string | number;
                            replacer?: (key: string | undefined, value: any) => any;
                            hideBuffer?: boolean;
                          }): string {
    const replacer = (key: string | undefined, value: any): any => {
      const currValue = options?.replacer !== undefined ? options.replacer(key, value) : value;

      if (currValue instanceof Date) {
        return { __type__: "Date", data: currValue.toISOString() };
      }
      if (currValue instanceof DateTime) {
        return { __type__: "DateTime", data: currValue.toString() };
      }
      else if (currValue instanceof DateOnly) {
        return { __type__: "DateOnly", data: currValue.toString() };
      }
      else if (currValue instanceof Time) {
        return { __type__: "Time", data: currValue.toString() };
      }
      else if (currValue instanceof Uuid) {
        return { __type__: "Uuid", data: currValue.toString() };
      }
      else if (currValue instanceof Error) {
        return {
          __type__: "Error",
          data: {
            ...currValue,
            message: currValue.message,
            name: currValue.name,
            stack: currValue.stack
          }
        };
      }
      else if (currValue?.type === "Buffer" && options?.hideBuffer === true) {
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

  public static parse(json: string): any {
    return ObjectUtil.nullToUndefined(
      JSON.parse(json, (key, value) => {
        if (value != null) {
          if (typeof value === "object" && value.__type__ === "Date") {
            return new Date(Date.parse(value.data));
          }
          else if (typeof value === "object" && value.__type__ === "DateTime") {
            return DateTime.parse(value.data);
          }
          else if (typeof value === "object" && value.__type__ === "DateOnly") {
            return DateOnly.parse(value.data);
          }
          else if (typeof value === "object" && value.__type__ === "Time") {
            return Time.parse(value.data);
          }
          else if (typeof value === "object" && value.__type__ === "Uuid") {
            return new Uuid(value.data);
          }
          else if (typeof value === "object" && value.__type__ === "Error") {
            const error = new Error(value.data.message);
            Object.assign(error, value.data);
            return error;
          }
          else if (typeof value === "object" && value.type === "Buffer") {
            return Buffer.from(value.data);
          }
        }

        return value;
      })
    );
  }
}
