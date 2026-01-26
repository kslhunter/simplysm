/**
 * JSON 변환 유틸리티
 * 커스텀 타입(DateTime, DateOnly, Time, Uuid 등)을 지원하는 JSON 직렬화/역직렬화
 */
import { DateTime } from "../types/date-time";
import { DateOnly } from "../types/date-only";
import { Time } from "../types/time";
import { Uuid } from "../types/uuid";
import { objNullToUndefined } from "./obj";
import { SdError } from "../errors/sd-error";
import { bytesToHex, bytesFromHex } from "./bytes";

interface TypedObject {
  __type__: string;
  data: unknown;
}

//#region stringify

/**
 * 객체를 JSON 문자열로 직렬화
 * DateTime, DateOnly, Time, Uuid, Set, Map, Error, Uint8Array 등 커스텀 타입 지원
 *
 * @param obj 직렬화할 객체
 * @param options 직렬화 옵션
 * @param options.space JSON 들여쓰기 (숫자: 공백 수, 문자열: 들여쓰기 문자열)
 * @param options.replacer 커스텀 replacer 함수. 기본 타입 변환 전에 호출됨
 * @param options.hideBytes true 시 Uint8Array 내용을 "__hidden__"으로 대체 (로깅용). 이 옵션으로 직렬화한 결과는 jsonParse()로 원본 Uint8Array를 복원할 수 없음
 */
export function jsonStringify(
  obj: unknown,
  options?: {
    space?: string | number;
    replacer?: (key: string | undefined, value: unknown) => unknown;
    hideBytes?: boolean;
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
    if (currValue instanceof Uint8Array) {
      if (options?.hideBytes === true) {
        return { __type__: "Uint8Array", data: "__hidden__" };
      }
      return { __type__: "Uint8Array", data: bytesToHex(currValue) };
    }
    return currValue;
  };

  // Date.prototype.toJSON 임시 제거
  // 이유: JSON.stringify의 replacer에서 value를 받을 때 toJSON이 먼저 호출되어
  //       Date가 string으로 변환됨. 이를 방지하여 Date 객체를 그대로 받기 위함.
  // 주의: 전역 프로토타입을 임시 수정하므로, 동시성 환경(Worker 등)에서
  //          동시에 호출되면 경쟁 조건이 발생할 수 있음. 단일 스레드 환경에서만 안전.
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
 * DateTime, DateOnly, Time, Uuid, Set, Map, Error, Uint8Array 등 커스텀 타입 복원
 *
 * @remarks
 * `__type__`과 `data` 키를 가진 객체는 타입 복원에 사용됩니다.
 * 사용자 데이터에 `{ __type__: "Date" | "DateTime" | "DateOnly" | "Time" | "Uuid" | "Set" | "Map" | "Error" | "Uint8Array", data: ... }`
 * 형태가 있으면 의도치 않게 타입 변환될 수 있으니 주의하세요.
 *
 * @security 개발 모드(`__DEV__`)에서만 에러 메시지에 JSON 문자열 전체가 포함됩니다.
 * 프로덕션 모드에서는 JSON 길이만 포함됩니다.
 */
export function jsonParse<T = unknown>(json: string): T {
  try {
    return objNullToUndefined(
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
            if (
              typed.__type__ === "Uint8Array" &&
              typeof typed.data === "string"
            ) {
              if (typed.data === "__hidden__") {
                throw new SdError(
                  "hideBytes 옵션으로 직렬화된 Uint8Array는 parse로 복원할 수 없습니다",
                );
              }
              return bytesFromHex(typed.data);
            }
          }
        }

        return value;
      }),
    ) as T;
  } catch (err) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      throw new SdError(err, "JSON 파싱 에러: \n" + json);
    }
    throw new SdError(err, `JSON 파싱 에러 (length: ${json.length})`);
  }
}

//#endregion
