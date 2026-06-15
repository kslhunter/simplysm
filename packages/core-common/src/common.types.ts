import { DateTime } from "./types/date-time";
import { DateOnly } from "./types/date-only";
import { Time } from "./types/time";
import { Uuid } from "./types/uuid";

//#region Bytes Type

/**
 * Buffer 대신 사용하는 바이너리 타입
 */
export type Bytes = Uint8Array;

//#endregion

//#region Primitive Type

/**
 * 원시 타입 매핑
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
 * 원시 타입 문자열 key
 */
export type PrimitiveTypeStr = keyof PrimitiveTypeMap;

/**
 * 원시 타입 union
 */
export type PrimitiveType = PrimitiveTypeMap[PrimitiveTypeStr] | undefined;

//#endregion

//#region Utility Types

/**
 * Deep Partial 타입
 *
 * 객체의 모든 속성을 재귀적으로 optional로 만든다.
 * 원시 타입(string, number, boolean 등)은 그대로 유지하고,
 * object/array 타입에만 재귀적으로 Partial을 적용한다.
 */
export type DeepPartial<TObject> = Partial<{
  [K in keyof TObject]: TObject[K] extends PrimitiveType ? TObject[K] : DeepPartial<TObject[K]>;
}>;

/**
 * 생성자 타입
 *
 * 클래스 생성자를 타입으로 표현할 때 사용한다.
 * 주로 의존성 주입, 팩토리 패턴, instanceof 체크에 활용된다.
 */
export interface Type<TInstance> extends Function {
  new (...args: unknown[]): TInstance;
}

//#endregion
