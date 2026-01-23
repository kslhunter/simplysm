import { DateTime } from "./types/date-time";
import { DateOnly } from "./types/date-only";
import { Time } from "./types/time";
import { Uuid } from "./types/uuid";
import { ArgumentError } from "./errors/argument-error";

//#region Bytes 타입

/**
 * Buffer 대신 사용하는 바이너리 타입
 */
export type Bytes = Uint8Array;

//#endregion

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
  Bytes: Bytes;
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
 *
 * 클래스 생성자를 타입으로 표현할 때 사용합니다.
 * 주로 의존성 주입, 팩토리 패턴, instanceof 체크 등에서 활용됩니다.
 *
 * @example
 * function create<T>(ctor: Type<T>): T {
 *   return new ctor();
 * }
 *
 * class MyClass { name = "test"; }
 * const instance = create(MyClass); // MyClass 인스턴스
 */
export interface Type<T> extends Function {
  new (...args: unknown[]): T;
}

//#endregion
