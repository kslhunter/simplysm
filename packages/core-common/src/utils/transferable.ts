import { DateTime } from "../types/date-time";
import { DateOnly } from "../types/date-only";
import { Time } from "../types/time";
import { Uuid } from "../types/uuid";

/**
 * Object types that can be transferred between Workers
 *
 * Only ArrayBuffer is used in this code.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects
 */
type Transferable = ArrayBuffer;

/**
 * Transferable conversion utility functions
 *
 * Performs serialization/deserialization for data transfer between Workers.
 * Handles custom types that structuredClone does not support.
 *
 * Supported types:
 * - Date, DateTime, DateOnly, Time, Uuid, RegExp
 * - Error (including cause, code, detail)
 * - Uint8Array (other TypedArrays not supported, handled as plain objects)
 * - Array, Map, Set, plain objects
 *
 * @note Circular references cause TypeError in transferableEncode (includes path info)
 * @note If the same object is referenced from multiple places, the cached encoding result is reused
 *
 * @example
 * // Send data to Worker
 * const { result, transferList } = transferableEncode(data);
 * worker.postMessage(result, transferList);
 *
 * // Receive data from Worker
 * const decoded = transferableDecode(event.data);
 */

//#region encode

/**
 * Convert objects using Simplysm types to plain objects
 * Serializes in a form that can be sent to a Worker
 *
 * @throws TypeError if circular reference is detected
 */
export function transferableEncode(obj: unknown): {
  result: unknown;
  transferList: Transferable[];
} {
  const transferList: Transferable[] = [];
  const ancestors = new Set<object>();
  const cache = new Map<object, unknown>();
  const result = encodeImpl(obj, transferList, [], ancestors, cache);
  return { result, transferList };
}

function encodeImpl(
  obj: unknown,
  transferList: Transferable[],
  path: (string | number)[],
  ancestors: Set<object>,
  cache: Map<object, unknown>,
): unknown {
  if (obj == null) return obj;

  // 객체 타입 처리: 순환 감지 + 캐시
  if (typeof obj === "object") {
    // Circular reference detection (object in current recursion stack)
    if (ancestors.has(obj)) {
      const currentPath = path.length > 0 ? path.join(".") : "root";
      throw new TypeError(`Circular reference detected: ${currentPath}`);
    }

    // If object was already encoded, reuse cached result
    const cached = cache.get(obj);
    if (cached !== undefined) return cached;

    // Add to recursion stack
    ancestors.add(obj);
  }

  let result: unknown;

  try {
    // 1. Uint8Array
    if (obj instanceof Uint8Array) {
      // SharedArrayBuffer is already shared memory, so don't add to transferList
      // Add only ArrayBuffer to transferList for zero-copy transfer
      const isSharedArrayBuffer =
        typeof SharedArrayBuffer !== "undefined" && obj.buffer instanceof SharedArrayBuffer;
      const buffer = obj.buffer as ArrayBuffer;
      if (!isSharedArrayBuffer && !transferList.includes(buffer)) {
        transferList.push(buffer);
      }
      result = obj;
    }
    // 2. Special type conversion (convert to tagged object without JSON.stringify)
    else if (obj instanceof Date) {
      result = { __type__: "Date", data: obj.getTime() };
    } else if (obj instanceof DateTime) {
      result = { __type__: "DateTime", data: obj.tick };
    } else if (obj instanceof DateOnly) {
      result = { __type__: "DateOnly", data: obj.tick };
    } else if (obj instanceof Time) {
      result = { __type__: "Time", data: obj.tick };
    } else if (obj instanceof Uuid) {
      result = { __type__: "Uuid", data: obj.toString() };
    } else if (obj instanceof RegExp) {
      result = { __type__: "RegExp", data: { source: obj.source, flags: obj.flags } };
    } else if (obj instanceof Error) {
      const errObj = obj as Error & {
        code?: unknown;
        detail?: unknown;
      };
      result = {
        __type__: "Error",
        data: {
          name: errObj.name,
          message: errObj.message,
          stack: errObj.stack,
          ...(errObj.code !== undefined ? { code: errObj.code } : {}),
          ...(errObj.detail !== undefined
            ? {
                detail: encodeImpl(
                  errObj.detail,
                  transferList,
                  [...path, "detail"],
                  ancestors,
                  cache,
                ),
              }
            : {}),
          ...(errObj.cause !== undefined
            ? {
                cause: encodeImpl(errObj.cause, transferList, [...path, "cause"], ancestors, cache),
              }
            : {}),
        },
      };
    }
    // 3. Array recursion
    else if (Array.isArray(obj)) {
      result = obj.map((item, idx) =>
        encodeImpl(item, transferList, [...path, idx], ancestors, cache),
      );
    }
    // 4. Map recursion
    else if (obj instanceof Map) {
      let idx = 0;
      result = new Map(
        Array.from(obj.entries()).map(([k, v]) => {
          const keyPath = [...path, `Map[${idx}].key`];
          const valuePath = [...path, `Map[${idx}].value`];
          idx++;
          return [
            encodeImpl(k, transferList, keyPath, ancestors, cache),
            encodeImpl(v, transferList, valuePath, ancestors, cache),
          ];
        }),
      );
    }
    // 5. Set recursion
    else if (obj instanceof Set) {
      let idx = 0;
      result = new Set(
        Array.from(obj).map((v) =>
          encodeImpl(v, transferList, [...path, `Set[${idx++}]`], ancestors, cache),
        ),
      );
    }
    // 6. Plain object recursion
    else if (typeof obj === "object") {
      const res: Record<string, unknown> = {};
      const record = obj as Record<string, unknown>;
      for (const key of Object.keys(record)) {
        res[key] = encodeImpl(record[key], transferList, [...path, key], ancestors, cache);
      }
      result = res;
    }
    // 7. Primitive types
    else {
      return obj;
    }

    // Save to cache (only on success)
    if (typeof obj === "object") {
      cache.set(obj, result);
    }

    return result;
  } finally {
    // Remove from recursion stack (must execute even on exception)
    if (typeof obj === "object") {
      ancestors.delete(obj);
    }
  }
}

//#endregion

//#region decode

/**
 * Convert serialized objects to objects using Simplysm types
 * Deserialize data received from a Worker
 */
export function transferableDecode(obj: unknown): unknown {
  if (obj == null) return obj;

  // 1. Restore special types
  if (typeof obj === "object" && "__type__" in obj && "data" in obj) {
    const typed = obj as { __type__: string; data: unknown };
    const data = typed.data;

    if (typed.__type__ === "Date" && typeof data === "number") return new Date(data);
    if (typed.__type__ === "DateTime" && typeof data === "number") return new DateTime(data);
    if (typed.__type__ === "DateOnly" && typeof data === "number") return new DateOnly(data);
    if (typed.__type__ === "Time" && typeof data === "number") return new Time(data);
    if (typed.__type__ === "Uuid" && typeof data === "string") return new Uuid(data);
    if (typed.__type__ === "RegExp" && typeof data === "object" && data !== null) {
      const regexData = data as { source: string; flags: string };
      return new RegExp(regexData.source, regexData.flags);
    }
    if (typed.__type__ === "Error" && typeof data === "object" && data !== null) {
      const errorData = data as {
        name: string;
        message: string;
        stack?: string;
        code?: unknown;
        cause?: unknown;
        detail?: unknown;
      };
      const err = new Error(errorData.message) as Error & {
        code?: unknown;
        detail?: unknown;
      };

      err.name = errorData.name;
      err.stack = errorData.stack;

      if (errorData.code !== undefined) err.code = errorData.code;
      if (errorData.cause !== undefined) (err as Error).cause = transferableDecode(errorData.cause);
      if (errorData.detail !== undefined) err.detail = transferableDecode(errorData.detail);
      return err;
    }
  }

  // 2. Array recursion (create new array)
  if (Array.isArray(obj)) {
    return obj.map((item) => transferableDecode(item));
  }

  // 3. Map recursion
  if (obj instanceof Map) {
    const newMap = new Map<unknown, unknown>();
    for (const [k, v] of obj) {
      newMap.set(transferableDecode(k), transferableDecode(v));
    }
    return newMap;
  }

  // 4. Set recursion
  if (obj instanceof Set) {
    const newSet = new Set<unknown>();
    for (const v of obj) {
      newSet.add(transferableDecode(v));
    }
    return newSet;
  }

  // 5. Object recursion (create new object)
  if (typeof obj === "object") {
    const record = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(record)) {
      result[key] = transferableDecode(record[key]);
    }
    return result;
  }

  return obj;
}

//#endregion
