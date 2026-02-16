import { DateTime } from "./types/date-time";
import { DateOnly } from "./types/date-only";
import { Time } from "./types/time";
import { Uuid } from "./types/uuid";

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

//#endregion

//#region 유틸리티 타입

/**
 * 깊은 Partial 타입
 *
 * 객체의 모든 속성을 재귀적으로 선택적(optional)으로 만듭니다.
 * Primitive 타입(string, number, boolean 등)은 그대로 유지하고,
 * 객체/배열 타입만 재귀적으로 Partial을 적용합니다.
 *
 * @example
 * ```typescript
 * interface User {
 *   name: string;
 *   profile: {
 *     age: number;
 *     address: { city: string };
 *   };
 * }
 *
 * // 모든 깊이의 속성이 선택적이 됨
 * const partial: DeepPartial<User> = {
 *   profile: { address: {} }
 * };
 * ```
 */
export type DeepPartial<TObject> = Partial<{
  [K in keyof TObject]: TObject[K] extends PrimitiveType ? TObject[K] : DeepPartial<TObject[K]>;
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
export interface Type<TInstance> extends Function {
  new (...args: unknown[]): TInstance;
}

//#endregion
