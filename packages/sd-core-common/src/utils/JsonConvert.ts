import { DateTime } from "../types/date-time/DateTime";
import { DateOnly } from "../types/date-time/DateOnly";
import { Time } from "../types/date-time/Time";
import { Uuid } from "../types/Uuid";
import { ObjectUtils } from "./ObjectUtils";
import { SdError } from "../errors/SdError";

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

      // [Luxon 호환] 새로 바뀐 DateTime 계열 지원
      if (currValue instanceof DateTime) {
        return { __type__: "DateTime", data: currValue.toString() };
      }
      if (currValue instanceof DateOnly) {
        return { __type__: "DateOnly", data: currValue.toString() };
      }
      if (currValue instanceof Time) {
        return { __type__: "Time", data: currValue.toString() };
      }

      // [기존 타입 지원]
      if (currValue instanceof Date) {
        return { __type__: "Date", data: currValue.toISOString() };
      }
      if (currValue instanceof Uuid) {
        return { __type__: "Uuid", data: currValue.toString() };
      }
      if (currValue instanceof Set) {
        return { __type__: "Set", data: Array.from(currValue) };
      }
      if (currValue instanceof Map) {
        return { __type__: "Map", data: Array.from(currValue.entries()) };
      }

      // [보안] 프로덕션 환경에서는 Error Stack 정보 숨김
      if (currValue instanceof Error) {
        const errData = {
          ...currValue,
          message: currValue.message,
          name: currValue.name,
        };
        if (process.env["NODE_ENV"] === "production") {
          delete errData.stack;
        }

        return { __type__: "Error", data: errData };
      }

      // Buffer 처리 (브라우저 호환성 고려하여 타입 체크)
      if (
        (typeof Buffer !== "undefined" && currValue instanceof Buffer) ||
        (currValue?.type === "Buffer" && Array.isArray(currValue.data))
      ) {
        if (options?.hideBuffer === true) {
          return { type: "Buffer", data: "__hidden__" };
        }
      }

      return currValue;
    };

    // [Hack] Date가 ISOString으로 자동 변환되는 것을 막기 위한 조치
    // (표준 JSON.stringify는 toJSON을 먼저 호출하므로, Date 변환을 가로채려면 이 방법이 최선)
    const prevDateToJson = Date.prototype.toJSON;
    // @ts-expect-error
    delete Date.prototype.toJSON;

    try {
      return JSON.stringify(replacer(undefined, obj), replacer, options?.space);
    } finally {
      // 반드시 원복
      Date.prototype.toJSON = prevDateToJson;
    }
  }

  static parse(json: string): any {
    try {
      return ObjectUtils.nullToUndefined(
        JSON.parse(json, (key, value) => {
          // __type__ 메타데이터가 있는 객체 복원
          if (value != null && typeof value === "object" && typeof value.__type__ === "string") {
            const { __type__, data } = value;

            switch (__type__) {
              case "DateTime":
                return DateTime.parse(data);
              case "DateOnly":
                return DateOnly.parse(data);
              case "Time":
                return Time.parse(data);
              case "Date":
                return new Date(Date.parse(data));
              case "Uuid":
                return new Uuid(data);
              case "Set":
                return new Set(data);
              case "Map":
                return new Map(data);
              case "Error":
                const error = new Error(data.message);
                Object.assign(error, data);
                return error;
            }
          }

          // Buffer 복원
          if (
            value != null &&
            typeof value === "object" &&
            value.type === "Buffer" &&
            Array.isArray(value.data)
          ) {
            if (typeof Buffer !== "undefined") {
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
