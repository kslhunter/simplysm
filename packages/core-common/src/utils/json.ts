/**
 * JSON 변환 유틸리티
 * 커스텀 타입(DateTime, DateOnly, Time, Uuid 등)을 지원하는 JSON 직렬화/역직렬화
 */
import { DateTime } from "../types/date-time";
import { DateOnly } from "../types/date-only";
import { Time } from "../types/time";
import { Uuid } from "../types/uuid";
import { ObjectUtils } from "./object";
import { SdError } from "../errors/sd-error";
import { BytesUtils } from "./bytes-utils";

interface TypedObject {
  __type__: string;
  data: unknown;
}

export class JsonConvert {
  //#region stringify
  /**
   * 객체를 JSON 문자열로 직렬화
   * DateTime, DateOnly, Time, Uuid, Set, Map, Error, Uint8Array 등 커스텀 타입 지원
   *
   * @param obj 직렬화할 객체
   * @param options 직렬화 옵션
   * @param options.space JSON 들여쓰기 (숫자: 공백 수, 문자열: 들여쓰기 문자열)
   * @param options.replacer 커스텀 replacer 함수. 기본 타입 변환 전에 호출됨
   * @param options.hideBytes true 시 Uint8Array 내용을 "__hidden__"으로 대체 (로깅용). 이 옵션으로 직렬화한 결과는 parse()로 원본 Uint8Array를 복원할 수 없음
   *
   * @warning **Worker 환경 사용 금지**
   * 내부적으로 `Date.prototype.toJSON`을 임시 제거합니다.
   * Worker 또는 멀티스레드 환경에서 동시 호출 시 경쟁 조건이 발생하여
   * Date 직렬화가 올바르게 동작하지 않을 수 있습니다.
   * 반드시 단일 스레드(메인 스레드) 환경에서만 사용하세요.
   */
  static stringify(
    obj: unknown,
    options?: {
      space?: string | number;
      replacer?: (key: string | undefined, value: unknown) => unknown;
      hideBytes?: boolean;
    },
  ): string {
    // Worker 환경 감지 - 프로토타입 수정으로 인한 경쟁 조건 방지
    // 브라우저 Web Worker 감지
    const globalScope = globalThis as { WorkerGlobalScope?: unknown; window?: unknown };
    if (globalScope.WorkerGlobalScope !== undefined && globalScope.window === undefined) {
      throw new SdError("JsonConvert.stringify는 Worker 환경에서 사용할 수 없습니다.");
    }
    // Node.js worker_threads 감지 (worker_threads 모듈이 로드된 경우에만 threadId 존재)
    const processObj = globalThis as { process?: { threadId?: number } };
    if (processObj.process?.threadId !== undefined && processObj.process.threadId !== 0) {
      throw new SdError("JsonConvert.stringify는 Worker 환경에서 사용할 수 없습니다.");
    }

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
        return { __type__: "Uint8Array", data: BytesUtils.toHex(currValue) };
      }
      return currValue;
    };

    // Date.prototype.toJSON 임시 제거
    // 이유: JSON.stringify의 replacer에서 value를 받을 때 toJSON이 먼저 호출되어
    //       Date가 string으로 변환됨. 이를 방지하여 Date 객체를 그대로 받기 위함.
    // ⚠️ 주의: 전역 프로토타입을 임시 수정하므로, 동시성 환경(Worker 등)에서
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
   * @security 파싱 실패 시 에러 메시지에 JSON 문자열의 일부(최대 1000자)가 포함됩니다.
   * 토큰, 비밀번호 등 민감한 데이터가 포함된 JSON을 파싱할 경우,
   * 에러 로그를 통해 해당 데이터가 노출될 수 있으니 주의하세요.
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
              if (
                typed.__type__ === "Uint8Array" &&
                typeof typed.data === "string"
              ) {
                return BytesUtils.fromHex(typed.data);
              }
            }
          }

          return value;
        }),
      ) as T;
    } catch (err) {
      const maxLen = 1000;
      const truncatedJson =
        json.length > maxLen
          ? json.slice(0, maxLen) + `... (truncated, original length: ${json.length})`
          : json;
      throw new SdError(err, "JSON 파싱 에러: \n" + truncatedJson);
    }
  }
  //#endregion
}
