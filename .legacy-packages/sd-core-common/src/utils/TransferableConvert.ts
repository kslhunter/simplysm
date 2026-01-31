import type { Transferable } from "worker_threads";
import { DateTime } from "../types/date-time/DateTime";
import { DateOnly } from "../types/date-time/DateOnly";
import { Time } from "../types/date-time/Time";
import { Uuid } from "../types/Uuid";

export abstract class TransferableConvert {
  /**
   * 심플리즘 타입을 사용한 객체를, 일반객체로 변환.
   */
  static encode(obj: any): {
    result: any;
    transferList: Transferable[];
  } {
    const transferList: Transferable[] = [];
    const result = this._encode(obj, transferList);
    return { result, transferList };
  }

  private static _encode(obj: any, transferList: Transferable[]): any {
    if (obj == null) return obj;

    // 1. Buffer / Uint8Array
    if (obj instanceof Uint8Array || Buffer.isBuffer(obj)) {
      // buffer.buffer (ArrayBuffer)가 이미 리스트에 없으면 추가
      if (!transferList.includes(obj.buffer)) {
        transferList.push(obj.buffer);
      }
      return obj;
    }

    // 2. 특수 타입 변환 (JSON.stringify 없이 구조체로 변환)
    if (obj instanceof DateTime) return { __type__: "DateTime", data: obj.tick };
    if (obj instanceof DateOnly) return { __type__: "DateOnly", data: obj.tick };
    if (obj instanceof Time) return { __type__: "Time", data: obj.tick };
    if (obj instanceof Uuid) return { __type__: "Uuid", data: obj.toString() };
    if (obj instanceof Error) {
      return {
        __type__: "Error",
        data: {
          name: obj.name,
          message: obj.message,
          stack: obj.stack,

          ...("code" in obj ? { code: obj.code } : {}),
          ...("detail" in obj ? { detail: this._encode(obj.detail, transferList) } : {}),
          ...("cause" in obj ? { cause: this._encode(obj.cause, transferList) } : {}),
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
      return new Set(Array.from(obj).map((v) => this._encode(v, transferList)));
    }

    // 6. 일반 객체 재귀 순회
    if (typeof obj === "object") {
      const result: any = {};
      for (const key of Object.keys(obj)) {
        result[key] = this._encode(obj[key], transferList);
      }
      return result;
    }

    return obj;
  }

  /**
   * serialize 객체를, 심플리즘 타입사용 객체로 변환.
   */
  static decode(obj: any): any {
    if (obj == null) return obj;

    // 1. 특수 타입 복원
    if (typeof obj === "object" && "__type__" in obj && "data" in obj) {
      const data = obj.data;
      if (obj.__type__ === "DateTime") return new DateTime(data);
      if (obj.__type__ === "DateOnly") return new DateOnly(data);
      if (obj.__type__ === "Time") return new Time(data);
      if (obj.__type__ === "Uuid") return new Uuid(data);
      if (obj.__type__ === "Error") {
        const err = new Error(data.message);

        err.name = data.name;
        err.stack = data.stack;

        if ("code" in data) (err as any).code = data.code;
        if ("cause" in data) (err as any).cause = this.decode(data.cause);
        if ("detail" in data) (err as any).detail = this.decode(data.detail);
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
      const newMap = new Map();
      for (const [k, v] of obj) {
        newMap.set(this.decode(k), this.decode(v));
      }
      return newMap;
    }

    // 4. Set 재귀
    if (obj instanceof Set) {
      const newSet = new Set();
      for (const v of obj) {
        newSet.add(this.decode(v));
      }
      return newSet;
    }

    // 5. 객체 재귀
    if (typeof obj === "object") {
      for (const key of Object.keys(obj)) {
        obj[key] = this.decode(obj[key]);
      }
    }

    return obj;
  }
}
