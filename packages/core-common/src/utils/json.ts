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
import { env } from "../env";

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
 * @param options.redactBytes true 시 Uint8Array 내용을 "__hidden__"으로 대체 (로깅용). 이 옵션으로 직렬화한 결과는 jsonParse()로 원본 Uint8Array를 복원할 수 없음
 *
 * @remarks
 * - 순환 참조가 있는 객체는 TypeError를 던짐
 * - 객체의 toJSON 메서드가 있으면 호출하여 결과를 사용함 (Date, DateTime 등 커스텀 타입 제외)
 * - 전역 프로토타입을 수정하지 않아 Worker 환경에서도 안전함
 */
export function jsonStringify(
  obj: unknown,
  options?: {
    space?: string | number;
    replacer?: (key: string | undefined, value: unknown) => unknown;
    redactBytes?: boolean;
  },
): string {
  // 순환 참조 감지를 위한 WeakSet
  const seen = new WeakSet<object>();

  /**
   * 재귀적으로 객체를 순회하며 특수 타입을 __type__ 형식으로 변환
   *
   * JSON.stringify의 replacer는 toJSON 호출 후의 값을 받으므로,
   * Date 등의 타입을 올바르게 처리하려면 미리 변환해야 함.
   * 이 방식은 전역 프로토타입을 수정하지 않아 Worker 환경에서도 안전함.
   *
   * @param key 현재 값의 키 (루트는 undefined)
   * @param value 변환할 값
   */
  const convertSpecialTypes = (key: string | undefined, value: unknown): unknown => {
    // 커스텀 replacer 적용
    const currValue = options?.replacer !== undefined ? options.replacer(key, value) : value;

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
      return {
        __type__: "Set",
        data: Array.from(currValue).map((item, i) => convertSpecialTypes(String(i), item)),
      };
    }
    if (currValue instanceof Map) {
      return {
        __type__: "Map",
        data: Array.from(currValue.entries()).map(([k, v], i) => [
          convertSpecialTypes(String(i), k),
          convertSpecialTypes(String(i), v),
        ]),
      };
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
          ...("cause" in currValue ? { cause: convertSpecialTypes("cause", currValue.cause) } : {}),
        },
      };
    }
    if (currValue instanceof Uint8Array) {
      if (options?.redactBytes === true) {
        return { __type__: "Uint8Array", data: "__hidden__" };
      }
      return { __type__: "Uint8Array", data: bytesToHex(currValue) };
    }

    // 배열 처리
    if (Array.isArray(currValue)) {
      // 순환 참조 감지
      if (seen.has(currValue)) {
        throw new TypeError("Converting circular structure to JSON");
      }
      seen.add(currValue);
      const result = currValue.map((item, i) => convertSpecialTypes(String(i), item));
      seen.delete(currValue);
      return result;
    }

    // 일반 객체 처리
    if (currValue !== null && typeof currValue === "object") {
      // 순환 참조 감지
      if (seen.has(currValue)) {
        throw new TypeError("Converting circular structure to JSON");
      }
      seen.add(currValue);

      // toJSON 메서드가 있으면 호출 (Date, DateTime 등 커스텀 타입은 이미 위에서 처리됨)
      if (
        "toJSON" in currValue &&
        typeof (currValue as { toJSON: unknown }).toJSON === "function"
      ) {
        const toJsonResult = (currValue as { toJSON: (key?: string) => unknown }).toJSON(key);
        seen.delete(currValue);
        return convertSpecialTypes(key, toJsonResult);
      }

      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(currValue)) {
        const converted = convertSpecialTypes(k, v);
        // undefined는 JSON에서 제외됨
        if (converted !== undefined) {
          result[k] = converted;
        }
      }
      seen.delete(currValue);
      return result;
    }

    return currValue;
  };

  // 전체 객체를 미리 변환 후 JSON.stringify 호출
  // 이 방식은 Date.prototype.toJSON을 수정하지 않아 동시성 환경에서 안전함
  const converted = convertSpecialTypes(undefined, obj);
  return JSON.stringify(converted, null, options?.space);
}

//#endregion

//#region parse

/**
 * JSON 문자열을 객체로 역직렬화
 * DateTime, DateOnly, Time, Uuid, Set, Map, Error, Uint8Array 등 커스텀 타입 복원
 *
 * @remarks
 * `__type__`과 `data` 키를 가진 객체는 타입 복원에 사용된다.
 * 사용자 데이터에 `{ __type__: "Date" | "DateTime" | "DateOnly" | "Time" | "Uuid" | "Set" | "Map" | "Error" | "Uint8Array", data: ... }`
 * 형태가 있으면 의도치 않게 타입 변환될 수 있으므로 주의한다.
 *
 * @security 개발 모드(`__DEV__`)에서만 에러 메시지에 JSON 문자열 전체가 포함된다.
 * 프로덕션 모드에서는 JSON 길이만 포함된다.
 */
export function jsonParse<TResult = unknown>(json: string): TResult {
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
            if (typed.__type__ === "DateTime" && typeof typed.data === "string") {
              return DateTime.parse(typed.data);
            }
            if (typed.__type__ === "DateOnly" && typeof typed.data === "string") {
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
            if (typed.__type__ === "Error" && typeof typed.data === "object") {
              const errorData = typed.data as Record<string, unknown>;
              const error = new Error(errorData["message"] as string);
              Object.assign(error, errorData);
              return error;
            }
            if (typed.__type__ === "Uint8Array" && typeof typed.data === "string") {
              if (typed.data === "__hidden__") {
                throw new SdError(
                  "redactBytes 옵션으로 직렬화된 Uint8Array는 parse로 복원할 수 없습니다",
                );
              }
              return bytesFromHex(typed.data);
            }
          }
        }

        return value;
      }),
    ) as TResult;
  } catch (err) {
    if (env.DEV) {
      throw new SdError(err, "JSON 파싱 에러: \n" + json);
    }
    throw new SdError(err, `JSON 파싱 에러 (length: ${json.length})`);
  }
}

//#endregion
