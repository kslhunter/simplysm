/**
 * JSON 변환 유틸리티
 * 커스텀 타입(DateTime, DateOnly, Time, Uuid 등)을 지원하는 JSON 직렬화/역직렬화
 */
import { DateTime } from "../types/date-time";
import { DateOnly } from "../types/date-only";
import { Time } from "../types/time";
import { Uuid } from "../types/uuid";
import { nullToUndefined } from "./obj";
import { SdError } from "../errors/sd-error";
import { toHex, fromHex } from "./bytes";
import { env, parseBoolEnv } from "../env";

interface TypedObject {
  __type__: string;
  data: unknown;
}

//#region stringify

/**
 * 객체를 JSON 문자열로 직렬화
 * DateTime, DateOnly, Time, Uuid, Set, Map, Error, Uint8Array 등 커스텀 타입 지원.
 *
 * @param obj 직렬화할 객체
 * @param options 직렬화 옵션
 * @param options.space JSON 들여쓰기 (숫자: 공백 수, 문자열: 들여쓰기 문자열)
 * @param options.replacer 커스텀 replacer 함수. 기본 타입 변환 전에 호출됨
 * @param options.redactBytes true이면 Uint8Array 내용을 "__hidden__"으로 대체 (로깅용). 이 옵션으로 직렬화된 결과는 jsonParse()로 원래 Uint8Array를 복원할 수 없음
 *
 * @remarks
 * - 순환 참조가 있는 객체는 TypeError를 발생시킴
 * - 객체에 toJSON 메서드가 있으면 호출하여 결과를 사용 (Date, DateTime 같은 커스텀 타입 제외)
 * - 전역 프로토타입을 수정하지 않으므로 Worker 환경에서 안전
 */
export function stringify(
  obj: unknown,
  options?: {
    space?: string | number;
    replacer?: (key: string | undefined, value: unknown) => unknown;
    redactBytes?: boolean;
  },
): string {
  // 순환 참조 감지용 WeakSet
  const seen = new WeakSet<object>();

  /**
   * 객체를 재귀적으로 순회하며 특수 타입을 __type__ 형식으로 변환
   *
   * JSON.stringify의 replacer는 toJSON 호출 후의 값을 받으므로,
   * Date 같은 타입은 사전에 변환해야 올바르게 처리됨.
   * 전역 프로토타입을 수정하지 않으므로 Worker 환경에서 안전.
   *
   * @param key 현재 값의 key (루트는 undefined)
   * @param value 변환할 값
   */
  const convertSpecialTypes = (key: string | undefined, value: unknown): unknown => {
    // 커스텀 replacer 적용
    const currValue = options?.replacer != null ? options.replacer(key, value) : value;

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
      return { __type__: "Uint8Array", data: toHex(currValue) };
    }

    // Array 처리
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
    if (currValue != null && typeof currValue === "object") {
      // 순환 참조 감지
      if (seen.has(currValue)) {
        throw new TypeError("Converting circular structure to JSON");
      }
      seen.add(currValue);

      // toJSON 메서드가 있으면 호출 (Date, DateTime 같은 커스텀 타입은 위에서 이미 처리됨)
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
        if (converted != null) {
          result[k] = converted;
        }
      }
      seen.delete(currValue);
      return result;
    }

    return currValue;
  };

  // 전체 객체를 먼저 변환한 후 JSON.stringify 호출
  // Date.prototype.toJSON을 수정하지 않으므로 동시성 환경에서 안전
  const converted = convertSpecialTypes(undefined, obj);
  return JSON.stringify(converted, null, options?.space);
}

//#endregion

//#region parse

/**
 * JSON 문자열을 객체로 역직렬화
 * DateTime, DateOnly, Time, Uuid, Set, Map, Error, Uint8Array 등 커스텀 타입 복원.
 *
 * @remarks
 * `__type__`과 `data` key를 가진 객체가 타입 복원에 사용됨.
 * 사용자 데이터에 `{ __type__: "Date" | "DateTime" | "DateOnly" | "Time" | "Uuid" | "Set" | "Map" | "Error" | "Uint8Array", data: ... }`
 * 형식의 객체가 포함되어 있으면 의도치 않게 타입으로 변환될 수 있으므로 주의.
 * 모든 JSON null 값은 undefined로 변환됨.
 * 이는 simplysm 프레임워크의 null-free 규칙을 위한 의도적인 동작.
 *
 * @security 개발 모드(`__DEV__`)에서는 에러 메시지에 전체 JSON 문자열이 포함됨.
 * 운영 모드에서는 JSON 길이만 포함됨.
 */
export function parse<TResult = unknown>(json: string): TResult {
  try {
    return nullToUndefined(
      JSON.parse(json, (_key, value: unknown) => {
        if (value != null && typeof value === "object") {
          // __type__ 마커 기반 타입 복원
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
              return fromHex(typed.data);
            }
          }
        }

        return value;
      }),
    ) as TResult;
  } catch (err) {
    if (parseBoolEnv(env("DEV"))) {
      throw new SdError(err, "JSON 파싱 오류: \n" + json);
    }
    throw new SdError(err, `JSON 파싱 오류 (길이: ${json.length})`);
  }
}

//#endregion
