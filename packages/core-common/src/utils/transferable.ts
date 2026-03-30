import { DateTime } from "../types/date-time";
import { DateOnly } from "../types/date-only";
import { Time } from "../types/time";
import { Uuid } from "../types/uuid";

/**
 * Worker 간 전송 가능한 객체 타입
 *
 * 이 코드에서는 ArrayBuffer만 사용됨.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects
 */
type Transferable = ArrayBuffer;

/**
 * Transferable 변환 유틸리티 함수
 *
 * Worker 간 데이터 전송을 위한 직렬화/역직렬화 수행.
 * structuredClone이 지원하지 않는 커스텀 타입을 처리.
 *
 * 지원 타입:
 * - Date, DateTime, DateOnly, Time, Uuid, RegExp
 * - Error (cause, code, detail 포함)
 * - Uint8Array (다른 TypedArray는 지원하지 않으며 일반 객체로 처리)
 * - Array, Map, Set, 일반 객체
 *
 * @note 순환 참조 시 transferableEncode에서 TypeError 발생 (경로 정보 포함)
 * @note 같은 객체가 여러 곳에서 참조되면 캐싱된 인코딩 결과를 재사용
 *
 * @example
 * // Worker로 데이터 전송
 * const { result, transferList } = transferableEncode(data);
 * worker.postMessage(result, transferList);
 *
 * // Worker에서 데이터 수신
 * const decoded = decode(event.data);
 */

//#region encode

/**
 * Simplysm 타입을 사용하는 객체를 일반 객체로 변환
 * Worker로 전송 가능한 형태로 직렬화
 *
 * @throws TypeError 순환 참조가 감지된 경우
 */
export function encode(obj: unknown): {
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

  // 객체 타입 처리: 순환 참조 감지 + 캐시
  if (typeof obj === "object") {
    // 순환 참조 감지 (현재 재귀 스택에 있는 객체)
    if (ancestors.has(obj)) {
      const currentPath = path.length > 0 ? path.join(".") : "root";
      throw new TypeError(`순환 참조 감지됨: ${currentPath}`);
    }

    // 이미 인코딩된 객체이면 캐싱된 결과 재사용
    const cached = cache.get(obj);
    if (cached !== undefined) return cached;

    // 재귀 스택에 추가
    ancestors.add(obj);
  }

  let result: unknown;

  try {
    // 1. Uint8Array
    if (obj instanceof Uint8Array) {
      // SharedArrayBuffer는 이미 공유 메모리이므로 transferList에 추가하지 않음
      // zero-copy 전송을 위해 ArrayBuffer만 transferList에 추가
      const isSharedArrayBuffer =
        typeof SharedArrayBuffer !== "undefined" && obj.buffer instanceof SharedArrayBuffer;
      const buffer = obj.buffer as ArrayBuffer;
      if (!isSharedArrayBuffer && !transferList.includes(buffer)) {
        transferList.push(buffer);
      }
      result = obj;
    }
    // 2. 특수 타입 변환 (JSON.stringify 없이 태그된 객체로 변환)
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
    // 3. Array 재귀
    else if (Array.isArray(obj)) {
      result = obj.map((item, idx) =>
        encodeImpl(item, transferList, [...path, idx], ancestors, cache),
      );
    }
    // 4. Map 재귀
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
    // 5. Set 재귀
    else if (obj instanceof Set) {
      let idx = 0;
      result = new Set(
        Array.from(obj).map((v) =>
          encodeImpl(v, transferList, [...path, `Set[${idx++}]`], ancestors, cache),
        ),
      );
    }
    // 6. 일반 객체 재귀
    else if (typeof obj === "object") {
      const res: Record<string, unknown> = {};
      const record = obj as Record<string, unknown>;
      for (const key of Object.keys(record)) {
        res[key] = encodeImpl(record[key], transferList, [...path, key], ancestors, cache);
      }
      result = res;
    }
    // 7. 원시 타입
    else {
      return obj;
    }

    // 캐시에 저장 (성공 시에만)
    if (typeof obj === "object") {
      cache.set(obj, result);
    }

    return result;
  } finally {
    // 재귀 스택에서 제거 (예외 발생 시에도 반드시 실행)
    if (typeof obj === "object") {
      ancestors.delete(obj);
    }
  }
}

//#endregion

//#region decode

/**
 * 직렬화된 객체를 Simplysm 타입을 사용하는 객체로 변환
 * Worker에서 수신한 데이터 역직렬화
 */
export function decode(obj: unknown): unknown {
  if (obj == null) return obj;

  // 1. 태그된 객체에서 특수 타입 복원
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
      if (errorData.cause !== undefined) (err as Error).cause = decode(errorData.cause);
      if (errorData.detail !== undefined) err.detail = decode(errorData.detail);
      return err;
    }
  }

  // 2. Array 재귀
  if (Array.isArray(obj)) {
    return obj.map((item) => decode(item));
  }

  // 3. Map 재귀
  if (obj instanceof Map) {
    const newMap = new Map<unknown, unknown>();
    for (const [k, v] of obj) {
      newMap.set(decode(k), decode(v));
    }
    return newMap;
  }

  // 4. Set 재귀
  if (obj instanceof Set) {
    const newSet = new Set<unknown>();
    for (const v of obj) {
      newSet.add(decode(v));
    }
    return newSet;
  }

  // 5. 객체 재귀
  if (typeof obj === "object") {
    const record = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(record)) {
      result[key] = decode(record[key]);
    }
    return result;
  }

  return obj;
}

//#endregion
