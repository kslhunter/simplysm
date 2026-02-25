import { DateTime } from "../types/date-time";
import { DateOnly } from "../types/date-only";
import { Time } from "../types/time";
import { Uuid } from "../types/uuid";
import { ArgumentError } from "../errors/argument-error";
import type { PrimitiveTypeMap, PrimitiveTypeStr } from "../common.types";

/**
 * Infer PrimitiveTypeStr from a value
 *
 * Checks the type of a value at runtime and returns the corresponding PrimitiveTypeStr.
 *
 * @param value The value to infer the type from
 * @returns The PrimitiveTypeStr corresponding to the value
 * @throws ArgumentError If the type is not supported
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
  throw new ArgumentError("Unknown value type.", { type: typeof value });
}
