/**
 * JSON 변환 유틸리티
 * 커스텀 타입(DateTime, DateOnly, Time, Uuid 등)을 지원하는 JSON 직렬화/역직렬화
 */
import { DateTime } from "../types/DateTime";
import { DateOnly } from "../types/DateOnly";
import { Time } from "../types/Time";
import { Uuid } from "../types/Uuid";
import { ObjectUtils } from "./object";
import { SdError } from "../errors/SdError";

interface TypedObject {
  __type__: string;
  data: unknown;
}

export class JsonConvert {
  //#region stringify
  /**
   * 객체를 JSON 문자열로 직렬화
   * DateTime, DateOnly, Time, Uuid, Set, Map, Error, Buffer 등 커스텀 타입 지원
   */
  static stringify(
    obj: unknown,
    options?: {
      space?: string | number;
      replacer?: (key: string | undefined, value: unknown) => unknown;
      hideBuffer?: boolean;
    },
  ): string {
    const replacer = (key: string | undefined, value: unknown): unknown => {
      const currValue =
        options?.replacer !== undefined ? options.replacer(key, value) : value;

      if (currValue instanceof Date) {
        return { __type__: "Date", data: currValue.toISOString() };
      }
      if (currValue instanceof DateTime) {
        return { __type__: "DateTime", data: currValue.toString() };
      }
      if (currValue instanceof DateOnly) {
        return { __type__: "DateOnly", data: currValue.toString() };
      }
      if (currValue instanceof Time) {
        return { __type__: "Time", data: currValue.toString() };
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
      if (currValue instanceof Error) {
        return {
          __type__: "Error",
          data: {
            name: currValue.name,
            message: currValue.message,
            stack: currValue.stack,
            ...("code" in currValue ? { code: currValue.code } : {}),
            ...("detail" in currValue ? { detail: currValue.detail } : {}),
            ...("cause" in currValue ? { cause: currValue.cause } : {}),
          },
        };
      }
      if (
        typeof currValue === "object" &&
        currValue !== null &&
        "type" in currValue &&
        (currValue as { type: unknown }).type === "Buffer" &&
        options?.hideBuffer === true
      ) {
        return { type: "Buffer", data: "__hidden__" };
      }
      return currValue;
    };

    // Date.prototype.toJSON 임시 제거
    // 이유: JSON.stringify의 replacer에서 value를 받을 때 toJSON이 먼저 호출되어
    //       Date가 string으로 변환됨. 이를 방지하여 Date 객체를 그대로 받기 위함.
    const prevDateToJson = Date.prototype.toJSON;
    delete (Date.prototype as { toJSON?: typeof Date.prototype.toJSON }).toJSON;

    try {
      return JSON.stringify(
        replacer(undefined, obj),
        replacer as (key: string, value: unknown) => unknown,
        options?.space,
      );
    } finally {
      Date.prototype.toJSON = prevDateToJson;
    }
  }
  //#endregion

  //#region parse
  /**
   * JSON 문자열을 객체로 역직렬화
   * DateTime, DateOnly, Time, Uuid, Set, Map, Error, Buffer 등 커스텀 타입 복원
   */
  static parse<T = unknown>(json: string): T {
    try {
      return ObjectUtils.nullToUndefined(
        JSON.parse(json, (_key, value: unknown) => {
          if (value != null && typeof value === "object") {
            // __type__ 기반 타입 복원
            if ("__type__" in value && "data" in value) {
              const typed = value as TypedObject;
              if (typed.__type__ === "Date" && typeof typed.data === "string") {
                return new Date(Date.parse(typed.data));
              }
              if (
                typed.__type__ === "DateTime" &&
                typeof typed.data === "string"
              ) {
                return DateTime.parse(typed.data);
              }
              if (
                typed.__type__ === "DateOnly" &&
                typeof typed.data === "string"
              ) {
                return DateOnly.parse(typed.data);
              }
              if (typed.__type__ === "Time" && typeof typed.data === "string") {
                return Time.parse(typed.data);
              }
              if (typed.__type__ === "Uuid" && typeof typed.data === "string") {
                return new Uuid(typed.data);
              }
              if (typed.__type__ === "Set" && Array.isArray(typed.data)) {
                return new Set(typed.data);
              }
              if (typed.__type__ === "Map" && Array.isArray(typed.data)) {
                return new Map(typed.data as [unknown, unknown][]);
              }
              if (
                typed.__type__ === "Error" &&
                typeof typed.data === "object"
              ) {
                const errorData = typed.data as Record<string, unknown>;
                const error = new Error(errorData["message"] as string);
                Object.assign(error, errorData);
                return error;
              }
            }

            // Buffer 복원
            if ("type" in value && "data" in value) {
              const buf = value as { type: string; data: unknown };
              if (buf.type === "Buffer" && Array.isArray(buf.data)) {
                return Buffer.from(buf.data as number[]);
              }
            }
          }

          return value;
        }),
      ) as T;
    } catch (err) {
      throw new SdError(err, "JSON 파싱 에러: \n" + json);
    }
  }
  //#endregion
}
