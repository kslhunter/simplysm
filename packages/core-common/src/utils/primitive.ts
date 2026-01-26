import { DateTime } from "../types/date-time";
import { DateOnly } from "../types/date-only";
import { Time } from "../types/time";
import { Uuid } from "../types/uuid";
import { ArgumentError } from "../errors/argument-error";
import type { PrimitiveTypeMap, PrimitiveTypeStr } from "../common.types";

/**
 * 값에서 PrimitiveTypeStr 추론
 *
 * 런타임에서 값의 타입을 검사하여 해당하는 PrimitiveTypeStr을 반환합니다.
 *
 * @param value 타입을 추론할 값
 * @returns 값에 해당하는 PrimitiveTypeStr
 * @throws ArgumentError 지원하지 않는 타입인 경우
 *
 * @example
 * getPrimitiveTypeStr("hello") // "string"
 * getPrimitiveTypeStr(123) // "number"
 * getPrimitiveTypeStr(new DateTime()) // "DateTime"
 * getPrimitiveTypeStr(new Uint8Array()) // "Bytes"
 */
export function getPrimitiveTypeStr(value: PrimitiveTypeMap[PrimitiveTypeStr]): PrimitiveTypeStr {
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (value instanceof DateTime) return "DateTime";
  if (value instanceof DateOnly) return "DateOnly";
  if (value instanceof Time) return "Time";
  if (value instanceof Uuid) return "Uuid";
  if (value instanceof Uint8Array) return "Bytes";
  throw new ArgumentError("알 수 없는 값 타입입니다.", { type: typeof value });
}
