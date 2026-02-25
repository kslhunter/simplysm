import { DateTime } from "./types/date-time";
import { DateOnly } from "./types/date-only";
import { Time } from "./types/time";
import { Uuid } from "./types/uuid";

//#region Bytes Type

/**
 * Binary type used instead of Buffer
 */
export type Bytes = Uint8Array;

//#endregion

//#region Primitive Type

/**
 * Primitive type mapping
 * Shared with orm-common
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
 * Primitive type string key
 */
export type PrimitiveTypeStr = keyof PrimitiveTypeMap;

/**
 * Primitive type union
 */
export type PrimitiveType = PrimitiveTypeMap[PrimitiveTypeStr] | undefined;

//#endregion

//#region Utility Types

/**
 * Deep Partial type
 *
 * Recursively makes all properties of an object optional.
 * Primitive types (string, number, boolean, etc.) are kept as-is,
 * only object/array types have Partial applied recursively.
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
 * // All properties at every depth become optional
 * const partial: DeepPartial<User> = {
 *   profile: { address: {} }
 * };
 * ```
 */
export type DeepPartial<TObject> = Partial<{
  [K in keyof TObject]: TObject[K] extends PrimitiveType ? TObject[K] : DeepPartial<TObject[K]>;
}>;

/**
 * Constructor type
 *
 * Used to represent a class constructor as a type.
 * Primarily used in dependency injection, factory patterns, and instanceof checks.
 *
 * @example
 * function create<T>(ctor: Type<T>): T {
 *   return new ctor();
 * }
 *
 * class MyClass { name = "test"; }
 * const instance = create(MyClass); // MyClass instance
 */
export interface Type<TInstance> extends Function {
  new (...args: unknown[]): TInstance;
}

//#endregion
