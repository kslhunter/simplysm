/**
 * Transferable 변환 유틸리티
 * Worker 간 데이터 전송을 위한 직렬화/역직렬화
 */
import type { Transferable } from "worker_threads";
import { DateTime } from "../types/DateTime.js";
import { DateOnly } from "../types/DateOnly.js";
import { Time } from "../types/Time.js";
import { Uuid } from "../types/Uuid.js";

export abstract class TransferableConvert {
  //#region encode
  /**
   * 심플리즘 타입을 사용한 객체를 일반 객체로 변환
   * Worker에 전송할 수 있는 형태로 직렬화
   */
  static encode(obj: unknown): {
    result: unknown;
    transferList: Transferable[];
  } {
    const transferList: Transferable[] = [];
    const result = this._encode(obj, transferList);
    return { result, transferList };
  }

  private static _encode(obj: unknown, transferList: Transferable[]): unknown {
    if (obj == null) return obj;

    // 1. Buffer / Uint8Array
    if (obj instanceof Uint8Array || Buffer.isBuffer(obj)) {
      // buffer.buffer (ArrayBuffer)가 이미 리스트에 없으면 추가
      if (!transferList.includes(obj.buffer as ArrayBuffer)) {
        transferList.push(obj.buffer as ArrayBuffer);
      }
      return obj;
    }

    // 2. 특수 타입 변환 (JSON.stringify 없이 구조체로 변환)
    if (obj instanceof DateTime)
      return { __type__: "DateTime", data: obj.tick };
    if (obj instanceof DateOnly)
      return { __type__: "DateOnly", data: obj.tick };
    if (obj instanceof Time) return { __type__: "Time", data: obj.tick };
    if (obj instanceof Uuid) return { __type__: "Uuid", data: obj.toString() };
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
            ? { detail: this._encode(errObj.detail, transferList) }
            : {}),
          ...(errObj.cause !== undefined
            ? { cause: this._encode(errObj.cause, transferList) }
            : {}),
        },
      };
    }

    // 3. 배열 재귀 순회
    if (Array.isArray(obj)) {
      return obj.map((item) => this._encode(item, transferList));
    }

    // 4. Map 재귀 순회
    if (obj instanceof Map) {
      return new Map(
        Array.from(obj.entries()).map(([k, v]) => [
          this._encode(k, transferList),
          this._encode(v, transferList),
        ]),
      );
    }

    // 5. Set 재귀 순회
    if (obj instanceof Set) {
      return new Set(
        Array.from(obj).map((v) => this._encode(v, transferList)),
      );
    }

    // 6. 일반 객체 재귀 순회
    if (typeof obj === "object") {
      const result: Record<string, unknown> = {};
      const record = obj as Record<string, unknown>;
      for (const key of Object.keys(record)) {
        result[key] = this._encode(record[key], transferList);
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
  static decode(obj: unknown): unknown {
    if (obj == null) return obj;

    // 1. 특수 타입 복원
    if (typeof obj === "object" && "__type__" in obj && "data" in obj) {
      const typed = obj as { __type__: string; data: unknown };
      const data = typed.data;

      if (typed.__type__ === "DateTime" && typeof data === "number")
        return new DateTime(data);
      if (typed.__type__ === "DateOnly" && typeof data === "number")
        return new DateOnly(data);
      if (typed.__type__ === "Time" && typeof data === "number")
        return new Time(data);
      if (typed.__type__ === "Uuid" && typeof data === "string")
        return new Uuid(data);
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
          (err as Error).cause = this.decode(errorData.cause);
        if (errorData.detail !== undefined)
          err.detail = this.decode(errorData.detail);
        return err;
      }
    }

    // 2. 배열 재귀
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        obj[i] = this.decode(obj[i]);
      }
      return obj;
    }

    // 3. Map 재귀
    if (obj instanceof Map) {
      const newMap = new Map<unknown, unknown>();
      for (const [k, v] of obj) {
        newMap.set(this.decode(k), this.decode(v));
      }
      return newMap;
    }

    // 4. Set 재귀
    if (obj instanceof Set) {
      const newSet = new Set<unknown>();
      for (const v of obj) {
        newSet.add(this.decode(v));
      }
      return newSet;
    }

    // 5. 객체 재귀
    if (typeof obj === "object") {
      const record = obj as Record<string, unknown>;
      for (const key of Object.keys(record)) {
        record[key] = this.decode(record[key]);
      }
    }

    return obj;
  }
  //#endregion
}
