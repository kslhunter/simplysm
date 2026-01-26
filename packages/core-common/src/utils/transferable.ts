import { DateTime } from "../types/date-time";
import { DateOnly } from "../types/date-only";
import { Time } from "../types/time";
import { Uuid } from "../types/uuid";

/**
 * Worker 간 전송 가능한 객체 타입
 *
 * 이 코드에서는 ArrayBuffer만 사용됩니다.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects
 */
type Transferable = ArrayBuffer;

/**
 * Transferable 변환 유틸리티 함수
 *
 * Worker 간 데이터 전송을 위한 직렬화/역직렬화를 수행합니다.
 * structuredClone이 지원하지 않는 커스텀 타입들을 처리합니다.
 *
 * 지원 타입:
 * - Date, DateTime, DateOnly, Time, Uuid, RegExp
 * - Error (cause, code, detail 포함)
 * - Uint8Array (다른 TypedArray는 미지원, 일반 객체로 처리됨)
 * - Array, Map, Set, 일반 객체
 *
 * @note 순환 참조가 있으면 transferableEncode 시 TypeError 발생 (경로 정보 포함)
 * @note 동일 객체가 여러 곳에서 참조되면 순환 참조로 처리되어 TypeError 발생
 *
 * @example
 * // Worker로 데이터 전송
 * const { result, transferList } = transferableEncode(data);
 * worker.postMessage(result, transferList);
 *
 * // Worker에서 데이터 수신
 * const decoded = transferableDecode(event.data);
 */

//#region encode

/**
 * 심플리즘 타입을 사용한 객체를 일반 객체로 변환
 * Worker에 전송할 수 있는 형태로 직렬화
 *
 * @throws 순환 참조 감지 시 TypeError
 */
export function transferableEncode(obj: unknown): {
  result: unknown;
  transferList: Transferable[];
} {
  const transferList: Transferable[] = [];
  const seen = new Map<object, string>();
  const result = encodeImpl(obj, transferList, [], seen);
  return { result, transferList };
}

function encodeImpl(
  obj: unknown,
  transferList: Transferable[],
  path: (string | number)[],
  seen: Map<object, string>,
): unknown {
  if (obj == null) return obj;

  // 순환 참조 감지 (객체 타입만)
  if (typeof obj === "object") {
    const currentPath = path.length > 0 ? path.join(".") : "root";
    const existingPath = seen.get(obj);
    if (existingPath !== undefined) {
      throw new TypeError(`순환 참조가 감지되었습니다: ${currentPath} → ${existingPath}`);
    }
    seen.set(obj, currentPath);
  }

  // 1. Uint8Array
  if (obj instanceof Uint8Array) {
    // SharedArrayBuffer는 이미 공유 메모리이므로 transferList에 추가하지 않음
    // ArrayBuffer만 transferList에 추가
    const isSharedArrayBuffer =
      typeof SharedArrayBuffer !== "undefined" &&
      obj.buffer instanceof SharedArrayBuffer;
    const buffer = obj.buffer as ArrayBuffer;
    if (!isSharedArrayBuffer && !transferList.includes(buffer)) {
      transferList.push(buffer);
    }
    return obj;
  }

  // 2. 특수 타입 변환 (JSON.stringify 없이 구조체로 변환)
  if (obj instanceof Date) return { __type__: "Date", data: obj.getTime() };
  if (obj instanceof DateTime)
    return { __type__: "DateTime", data: obj.tick };
  if (obj instanceof DateOnly)
    return { __type__: "DateOnly", data: obj.tick };
  if (obj instanceof Time) return { __type__: "Time", data: obj.tick };
  if (obj instanceof Uuid) return { __type__: "Uuid", data: obj.toString() };
  if (obj instanceof RegExp) return { __type__: "RegExp", data: { source: obj.source, flags: obj.flags } };
  if (obj instanceof Error) {
    const errObj = obj as Error & {
      code?: unknown;
      detail?: unknown;
    };
    return {
      __type__: "Error",
      data: {
        name: errObj.name,
        message: errObj.message,
        stack: errObj.stack,
        ...(errObj.code !== undefined ? { code: errObj.code } : {}),
        ...(errObj.detail !== undefined
          ? { detail: encodeImpl(errObj.detail, transferList, [...path, "detail"], seen) }
          : {}),
        ...(errObj.cause !== undefined
          ? { cause: encodeImpl(errObj.cause, transferList, [...path, "cause"], seen) }
          : {}),
      },
    };
  }

  // 3. 배열 재귀 순회
  if (Array.isArray(obj)) {
    return obj.map((item, idx) => encodeImpl(item, transferList, [...path, idx], seen));
  }

  // 4. Map 재귀 순회
  if (obj instanceof Map) {
    let idx = 0;
    return new Map(
      Array.from(obj.entries()).map(([k, v]) => {
        const keyPath = [...path, `Map[${idx}].key`];
        const valuePath = [...path, `Map[${idx}].value`];
        idx++;
        return [
          encodeImpl(k, transferList, keyPath, seen),
          encodeImpl(v, transferList, valuePath, seen),
        ];
      }),
    );
  }

  // 5. Set 재귀 순회
  if (obj instanceof Set) {
    let idx = 0;
    return new Set(
      Array.from(obj).map((v) => encodeImpl(v, transferList, [...path, `Set[${idx++}]`], seen)),
    );
  }

  // 6. 일반 객체 재귀 순회
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    const record = obj as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      result[key] = encodeImpl(record[key], transferList, [...path, key], seen);
    }
    return result;
  }

  return obj;
}

//#endregion

//#region decode

/**
 * serialize 객체를 심플리즘 타입 사용 객체로 변환
 * Worker로부터 받은 데이터를 역직렬화
 */
export function transferableDecode(obj: unknown): unknown {
  if (obj == null) return obj;

  // 1. 특수 타입 복원
  if (typeof obj === "object" && "__type__" in obj && "data" in obj) {
    const typed = obj as { __type__: string; data: unknown };
    const data = typed.data;

    if (typed.__type__ === "Date" && typeof data === "number")
      return new Date(data);
    if (typed.__type__ === "DateTime" && typeof data === "number")
      return new DateTime(data);
    if (typed.__type__ === "DateOnly" && typeof data === "number")
      return new DateOnly(data);
    if (typed.__type__ === "Time" && typeof data === "number")
      return new Time(data);
    if (typed.__type__ === "Uuid" && typeof data === "string")
      return new Uuid(data);
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
      if (errorData.cause !== undefined)
        (err as Error).cause = transferableDecode(errorData.cause);
      if (errorData.detail !== undefined)
        err.detail = transferableDecode(errorData.detail);
      return err;
    }
  }

  // 2. 배열 재귀 (새 배열 생성)
  if (Array.isArray(obj)) {
    return obj.map((item) => transferableDecode(item));
  }

  // 3. Map 재귀
  if (obj instanceof Map) {
    const newMap = new Map<unknown, unknown>();
    for (const [k, v] of obj) {
      newMap.set(transferableDecode(k), transferableDecode(v));
    }
    return newMap;
  }

  // 4. Set 재귀
  if (obj instanceof Set) {
    const newSet = new Set<unknown>();
    for (const v of obj) {
      newSet.add(transferableDecode(v));
    }
    return newSet;
  }

  // 5. 객체 재귀 (새 객체 생성)
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
