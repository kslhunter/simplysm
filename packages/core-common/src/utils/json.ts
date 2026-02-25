/**
 * JSON conversion utility
 * JSON serialization/deserialization supporting custom types (DateTime, DateOnly, Time, Uuid, etc.)
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
 * Serialize object to JSON string
 * Supports custom types like DateTime, DateOnly, Time, Uuid, Set, Map, Error, Uint8Array, etc.
 *
 * @param obj Object to serialize
 * @param options Serialization options
 * @param options.space JSON indentation (number: number of spaces, string: indentation string)
 * @param options.replacer Custom replacer function. Called before default type conversion
 * @param options.redactBytes If true, replace Uint8Array contents with "__hidden__" (for logging). Results serialized with this option cannot restore original Uint8Array via jsonParse()
 *
 * @remarks
 * - Objects with circular references throw TypeError
 * - If object has toJSON method, it is called and the result is used (except for custom types like Date, DateTime)
 * - Safe in Worker environments as global prototypes are not modified
 */
export function jsonStringify(
  obj: unknown,
  options?: {
    space?: string | number;
    replacer?: (key: string | undefined, value: unknown) => unknown;
    redactBytes?: boolean;
  },
): string {
  // WeakSet for circular reference detection
  const seen = new WeakSet<object>();

  /**
   * Recursively traverse object and convert special types to __type__ format
   *
   * JSON.stringify's replacer receives values after toJSON call,
   * so types like Date must be converted beforehand for proper handling.
   * This approach is safe in Worker environments as global prototypes are not modified.
   *
   * @param key Key of current value (root is undefined)
   * @param value Value to convert
   */
  const convertSpecialTypes = (key: string | undefined, value: unknown): unknown => {
    // Apply custom replacer
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

    // Array processing
    if (Array.isArray(currValue)) {
      // Detect circular reference
      if (seen.has(currValue)) {
        throw new TypeError("Converting circular structure to JSON");
      }
      seen.add(currValue);
      const result = currValue.map((item, i) => convertSpecialTypes(String(i), item));
      seen.delete(currValue);
      return result;
    }

    // Generic object processing
    if (currValue !== null && typeof currValue === "object") {
      // Detect circular reference
      if (seen.has(currValue)) {
        throw new TypeError("Converting circular structure to JSON");
      }
      seen.add(currValue);

      // Call toJSON method if present (custom types like Date, DateTime already handled above)
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
        // undefined is excluded from JSON
        if (converted !== undefined) {
          result[k] = converted;
        }
      }
      seen.delete(currValue);
      return result;
    }

    return currValue;
  };

  // Convert entire object first, then call JSON.stringify
  // This approach is safe in concurrent environments as Date.prototype.toJSON is not modified
  const converted = convertSpecialTypes(undefined, obj);
  return JSON.stringify(converted, null, options?.space);
}

//#endregion

//#region parse

/**
 * Deserialize JSON string to object
 * Restore custom types like DateTime, DateOnly, Time, Uuid, Set, Map, Error, Uint8Array, etc.
 *
 * @remarks
 * Objects with `__type__` and `data` keys are used for type restoration.
 * Be careful if user data contains objects with `{ __type__: "Date" | "DateTime" | "DateOnly" | "Time" | "Uuid" | "Set" | "Map" | "Error" | "Uint8Array", data: ... }`
 * format as they may be unintentionally converted to types.
 *
 * @security In development mode (`__DEV__`), the error message includes the entire JSON string.
 * In production mode, only JSON length is included.
 */
export function jsonParse<TResult = unknown>(json: string): TResult {
  try {
    return objNullToUndefined(
      JSON.parse(json, (_key, value: unknown) => {
        if (value != null && typeof value === "object") {
          // Type restoration based on __type__
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
                  "Uint8Array serialized with redactBytes option cannot be restored via parse",
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
      throw new SdError(err, "JSON parsing error: \n" + json);
    }
    throw new SdError(err, `JSON parsing error (length: ${json.length})`);
  }
}

//#endregion
