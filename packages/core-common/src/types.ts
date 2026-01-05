import { DateTime } from "./types/DateTime.js";
import { DateOnly } from "./types/DateOnly.js";
import { Time } from "./types/Time.js";
import { Uuid } from "./types/Uuid.js";

//#region Primitive 타입

/**
 * Primitive 타입 매핑
 * orm-common과 공유
 */
export type PrimitiveTypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  DateTime: DateTime;
  DateOnly: DateOnly;
  Time: Time;
  Uuid: Uuid;
  Buffer: Buffer;
};

/**
 * Primitive 타입 문자열 키
 */
export type PrimitiveTypeStr = keyof PrimitiveTypeMap;

/**
 * Primitive 타입 유니온
 */
export type PrimitiveType = PrimitiveTypeMap[PrimitiveTypeStr] | undefined;

/**
 * 값에서 PrimitiveTypeStr 추론
 */
export function getPrimitiveTypeStr(value: PrimitiveType): PrimitiveTypeStr {
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (value instanceof DateTime) return "DateTime";
  if (value instanceof DateOnly) return "DateOnly";
  if (value instanceof Time) return "Time";
  if (value instanceof Uuid) return "Uuid";
  if (Buffer.isBuffer(value)) return "Buffer";
  throw new Error(`알 수 없는 값 타입: ${typeof value}`);
}

//#endregion

//#region 유틸리티 타입

/**
 * 깊은 Partial 타입
 */
export type DeepPartial<T> = Partial<{
  [K in keyof T]: T[K] extends PrimitiveType ? T[K] : DeepPartial<T[K]>;
}>;

/**
 * 생성자 타입
 */
export interface Type<T> extends Function {
  new (...args: unknown[]): T;
}

//#endregion
