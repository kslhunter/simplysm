import { describe, it, expect } from "vitest";
import {
  transferableEncode as transferEncode,
  transferableDecode as transferDecode,
  DateTime,
  DateOnly,
  Time,
  Uuid,
} from "@simplysm/core-common";

describe("TransferableConvert", () => {
  //#region encode - 특수 타입

  describe("encode() - 특수 타입", () => {
    it("DateTime을 인코딩한다", () => {
      const dt = new DateTime(2025, 1, 6, 15, 30, 45, 123);
      const { result } = transferEncode(dt);

      expect(result).toEqual({
        __type__: "DateTime",
        data: dt.tick,
      });
    });

    it("DateOnly를 인코딩한다", () => {
      const d = new DateOnly(2025, 1, 6);
      const { result } = transferEncode(d);

      expect(result).toEqual({
        __type__: "DateOnly",
        data: d.tick,
      });
    });

    it("Time을 인코딩한다", () => {
      const t = new Time(15, 30, 45, 123);
      const { result } = transferEncode(t);

      expect(result).toEqual({
        __type__: "Time",
        data: t.tick,
      });
    });

    it("Uuid를 인코딩한다", () => {
      const uuid = Uuid.new();
      const { result } = transferEncode(uuid);

      expect(result).toEqual({
        __type__: "Uuid",
        data: uuid.toString(),
      });
    });

    it("Error를 인코딩한다", () => {
      const err = new Error("test error");
      err.stack = "test stack";
      const { result } = transferEncode(err);

      expect(result).toEqual({
        __type__: "Error",
        data: {
          name: "Error",
          message: "test error",
          stack: "test stack",
        },
      });
    });

    it("Error의 cause를 재귀적으로 인코딩한다", () => {
      const cause = new Error("cause error");
      const err = new Error("main error", { cause });
      const { result } = transferEncode(err);

      const typedResult = result as {
        __type__: string;
        data: {
          name: string;
          message: string;
          cause?: {
            __type__: string;
            data: {
              name: string;
              message: string;
            };
          };
        };
      };

      expect(typedResult.data.cause).toEqual({
        __type__: "Error",
        data: {
          name: "Error",
          message: "cause error",
          stack: cause.stack,
        },
      });
    });

    it("Error의 code 속성을 인코딩한다", () => {
      const err = new Error("test error") as Error & { code: string };
      err.code = "ERR_CUSTOM";
      const { result } = transferEncode(err);

      const typedResult = result as {
        __type__: string;
        data: {
          name: string;
          message: string;
          code?: string;
        };
      };

      expect(typedResult.data.code).toBe("ERR_CUSTOM");
    });

    it("Error의 detail 속성을 인코딩한다", () => {
      const err = new Error("test error") as Error & { detail: unknown };
      err.detail = { userId: 123, action: "delete" };
      const { result } = transferEncode(err);

      const typedResult = result as {
        __type__: string;
        data: {
          name: string;
          message: string;
          detail?: unknown;
        };
      };

      expect(typedResult.data.detail).toEqual({ userId: 123, action: "delete" });
    });

    it("Error의 detail에 포함된 특수 타입도 인코딩한다", () => {
      const err = new Error("test error") as Error & { detail: unknown };
      const dt = new DateTime(2025, 1, 6);
      err.detail = { timestamp: dt };
      const { result } = transferEncode(err);

      const typedResult = result as {
        __type__: string;
        data: {
          name: string;
          message: string;
          detail?: { timestamp: { __type__: string; data: number } };
        };
      };

      expect(typedResult.data.detail?.timestamp).toEqual({
        __type__: "DateTime",
        data: dt.tick,
      });
    });

    it("Uint8Array를 인코딩하고 transferList에 추가한다", () => {
      const bytes = new TextEncoder().encode("hello");
      const { result, transferList } = transferEncode(bytes);

      expect(result).toBe(bytes);
      expect(transferList).toContain(bytes.buffer);
    });

    it("Date를 인코딩한다", () => {
      const date = new Date(2025, 0, 6, 15, 30, 45, 123);
      const { result } = transferEncode(date);

      expect(result).toEqual({
        __type__: "Date",
        data: date.getTime(),
      });
    });

    it("RegExp를 인코딩한다", () => {
      const regex = /test\d+/gi;
      const { result } = transferEncode(regex);

      expect(result).toEqual({
        __type__: "RegExp",
        data: { source: "test\\d+", flags: "gi" },
      });
    });
  });

  //#endregion

  //#region encode - 컬렉션

  describe("encode() - 컬렉션", () => {
    it("배열을 재귀적으로 인코딩한다", () => {
      const arr = [new DateTime(2025, 1, 6), Uuid.new(), "string", 123] as const;
      const { result } = transferEncode(arr);

      expect(Array.isArray(result)).toBe(true);
      const resultArr = result as unknown[];
      expect(resultArr).toHaveLength(4);
      expect(resultArr[0]).toMatchObject({ __type__: "DateTime" });
      expect(resultArr[1]).toMatchObject({ __type__: "Uuid" });
      expect(resultArr[2]).toBe("string");
      expect(resultArr[3]).toBe(123);
    });

    it("Map을 재귀적으로 인코딩한다", () => {
      const map = new Map<string, DateTime | Uuid>([
        ["key1", new DateTime(2025, 1, 6)],
        ["key2", Uuid.new()],
      ]);
      const { result } = transferEncode(map);

      expect(result instanceof Map).toBe(true);
      const resultMap = result as Map<string, unknown>;
      expect(resultMap.size).toBe(2);
      expect(resultMap.get("key1")).toMatchObject({ __type__: "DateTime" });
      expect(resultMap.get("key2")).toMatchObject({ __type__: "Uuid" });
    });

    it("Set을 재귀적으로 인코딩한다", () => {
      const set = new Set([new DateTime(2025, 1, 6), Uuid.new()]);
      const { result } = transferEncode(set);

      expect(result instanceof Set).toBe(true);
      const resultSet = result as Set<unknown>;
      expect(resultSet.size).toBe(2);
      const arr = Array.from(resultSet);
      expect(arr[0]).toMatchObject({ __type__: "DateTime" });
      expect(arr[1]).toMatchObject({ __type__: "Uuid" });
    });

    it("중첩된 객체를 재귀적으로 인코딩한다", () => {
      const obj = {
        dt: new DateTime(2025, 1, 6),
        nested: {
          uuid: Uuid.new(),
          arr: [new DateOnly(2025, 1, 6)],
        },
      };
      const { result } = transferEncode(obj);

      const typedResult = result as {
        dt: { __type__: string };
        nested: {
          uuid: { __type__: string };
          arr: { __type__: string }[];
        };
      };

      expect(typedResult.dt).toMatchObject({ __type__: "DateTime" });
      expect(typedResult.nested.uuid).toMatchObject({ __type__: "Uuid" });
      expect(typedResult.nested.arr[0]).toMatchObject({ __type__: "DateOnly" });
    });
  });

  //#endregion

  //#region encode - 순환 참조 감지

  describe("encode() - 순환 참조 감지", () => {
    it("자기 참조 객체를 인코딩하면 TypeError를 던진다", () => {
      const obj: Record<string, unknown> = { a: 1 };
      obj["self"] = obj;

      expect(() => transferEncode(obj)).toThrow(TypeError);
      expect(() => transferEncode(obj)).toThrow("순환 참조가 감지되었습니다");
    });

    it("중첩된 순환 참조를 감지한다", () => {
      const a: Record<string, unknown> = { name: "a" };
      const b: Record<string, unknown> = { name: "b", ref: a };
      a["ref"] = b;

      expect(() => transferEncode(a)).toThrow("순환 참조가 감지되었습니다");
    });

    it("배열 내 순환 참조를 감지한다", () => {
      const arr: unknown[] = [1, 2, 3];
      arr.push(arr);

      expect(() => transferEncode(arr)).toThrow("순환 참조가 감지되었습니다");
    });

    it("Map 내 순환 참조를 감지한다", () => {
      const map = new Map<string, unknown>();
      map.set("self", map);

      expect(() => transferEncode(map)).toThrow("순환 참조가 감지되었습니다");
    });

    it("Set 내 순환 참조를 감지한다", () => {
      const set = new Set<unknown>();
      set.add(set);

      expect(() => transferEncode(set)).toThrow("순환 참조가 감지되었습니다");
    });
  });

  //#endregion

  //#region encode - DAG (공유 객체)

  describe("encode() - DAG (공유 객체)", () => {
    it("동일 객체를 여러 곳에서 참조해도 에러 없이 인코딩된다", () => {
      const shared = { name: "shared" };
      const data = { a: shared, b: shared };
      const { result } = transferEncode(data);
      const decoded = result as Record<string, Record<string, string>>;
      expect(decoded["a"]["name"]).toBe("shared");
      expect(decoded["b"]["name"]).toBe("shared");
    });

    it("동일 배열을 여러 곳에서 참조해도 에러 없이 인코딩된다", () => {
      const sharedArr = [1, 2, 3];
      const data = { x: sharedArr, y: sharedArr };
      const { result } = transferEncode(data);
      const decoded = result as Record<string, number[]>;
      expect(decoded["x"]).toEqual([1, 2, 3]);
      expect(decoded["y"]).toEqual([1, 2, 3]);
    });

    it("순환 참조는 여전히 TypeError를 던진다", () => {
      const a: Record<string, unknown> = {};
      const b: Record<string, unknown> = { a };
      a["b"] = b;
      expect(() => transferEncode(a)).toThrow(TypeError);
    });
  });

  //#endregion

  //#region decode - 특수 타입

  describe("decode() - 특수 타입", () => {
    it("DateTime을 디코딩한다", () => {
      const tick = new DateTime(2025, 1, 6, 15, 30, 45, 123).tick;
      const encoded = { __type__: "DateTime", data: tick };
      const decoded = transferDecode(encoded);

      expect(decoded instanceof DateTime).toBe(true);
      const dt = decoded as DateTime;
      expect(dt.year).toBe(2025);
      expect(dt.month).toBe(1);
      expect(dt.day).toBe(6);
      expect(dt.hour).toBe(15);
      expect(dt.minute).toBe(30);
      expect(dt.second).toBe(45);
      expect(dt.millisecond).toBe(123);
    });

    it("DateOnly를 디코딩한다", () => {
      const tick = new DateOnly(2025, 1, 6).tick;
      const encoded = { __type__: "DateOnly", data: tick };
      const decoded = transferDecode(encoded);

      expect(decoded instanceof DateOnly).toBe(true);
      const d = decoded as DateOnly;
      expect(d.year).toBe(2025);
      expect(d.month).toBe(1);
      expect(d.day).toBe(6);
    });

    it("Time을 디코딩한다", () => {
      const tick = new Time(15, 30, 45, 123).tick;
      const encoded = { __type__: "Time", data: tick };
      const decoded = transferDecode(encoded);

      expect(decoded instanceof Time).toBe(true);
      const t = decoded as Time;
      expect(t.hour).toBe(15);
      expect(t.minute).toBe(30);
      expect(t.second).toBe(45);
      expect(t.millisecond).toBe(123);
    });

    it("Uuid를 디코딩한다", () => {
      const uuid = Uuid.new();
      const encoded = { __type__: "Uuid", data: uuid.toString() };
      const decoded = transferDecode(encoded);

      expect(decoded instanceof Uuid).toBe(true);
      expect((decoded as Uuid).toString()).toBe(uuid.toString());
    });

    it("Error를 디코딩한다", () => {
      const encoded = {
        __type__: "Error",
        data: {
          name: "CustomError",
          message: "test error",
          stack: "test stack",
        },
      };
      const decoded = transferDecode(encoded);

      expect(decoded instanceof Error).toBe(true);
      const err = decoded as Error;
      expect(err.name).toBe("CustomError");
      expect(err.message).toBe("test error");
      expect(err.stack).toBe("test stack");
    });

    it("Error의 cause를 재귀적으로 디코딩한다", () => {
      const encoded = {
        __type__: "Error",
        data: {
          name: "Error",
          message: "main error",
          cause: {
            __type__: "Error",
            data: {
              name: "Error",
              message: "cause error",
            },
          },
        },
      };
      const decoded = transferDecode(encoded);

      expect(decoded instanceof Error).toBe(true);
      const err = decoded as Error;
      expect(err.message).toBe("main error");
      expect(err.cause instanceof Error).toBe(true);
      expect((err.cause as Error).message).toBe("cause error");
    });

    it("Error의 code 속성을 디코딩한다", () => {
      const encoded = {
        __type__: "Error",
        data: {
          name: "Error",
          message: "test error",
          code: "ERR_CUSTOM",
        },
      };
      const decoded = transferDecode(encoded);

      expect(decoded instanceof Error).toBe(true);
      const err = decoded as Error & { code?: string };
      expect(err.code).toBe("ERR_CUSTOM");
    });

    it("Error의 detail 속성을 디코딩한다", () => {
      const encoded = {
        __type__: "Error",
        data: {
          name: "Error",
          message: "test error",
          detail: { userId: 123, action: "delete" },
        },
      };
      const decoded = transferDecode(encoded);

      expect(decoded instanceof Error).toBe(true);
      const err = decoded as Error & { detail?: unknown };
      expect(err.detail).toEqual({ userId: 123, action: "delete" });
    });

    it("Error의 detail에 포함된 특수 타입도 디코딩한다", () => {
      const tick = new DateTime(2025, 1, 6).tick;
      const encoded = {
        __type__: "Error",
        data: {
          name: "Error",
          message: "test error",
          detail: { timestamp: { __type__: "DateTime", data: tick } },
        },
      };
      const decoded = transferDecode(encoded);

      expect(decoded instanceof Error).toBe(true);
      const err = decoded as Error & { detail?: { timestamp: DateTime } };
      expect(err.detail?.timestamp instanceof DateTime).toBe(true);
      expect(err.detail?.timestamp.tick).toBe(tick);
    });

    it("Date를 디코딩한다", () => {
      const tick = new Date(2025, 0, 6, 15, 30, 45, 123).getTime();
      const encoded = { __type__: "Date", data: tick };
      const decoded = transferDecode(encoded);

      expect(decoded instanceof Date).toBe(true);
      const date = decoded as Date;
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(6);
      expect(date.getHours()).toBe(15);
      expect(date.getMinutes()).toBe(30);
      expect(date.getSeconds()).toBe(45);
      expect(date.getMilliseconds()).toBe(123);
    });

    it("RegExp를 디코딩한다", () => {
      const encoded = {
        __type__: "RegExp",
        data: { source: "test\\d+", flags: "gi" },
      };
      const decoded = transferDecode(encoded);

      expect(decoded instanceof RegExp).toBe(true);
      const regex = decoded as RegExp;
      expect(regex.source).toBe("test\\d+");
      expect(regex.flags).toBe("gi");
      // g 플래그가 있는 정규식은 lastIndex가 stateful이므로 리셋 후 테스트
      expect(regex.test("test123")).toBe(true);
      regex.lastIndex = 0;
      expect(regex.test("TEST456")).toBe(true);
    });
  });

  //#endregion

  //#region decode - 컬렉션

  describe("decode() - 컬렉션", () => {
    it("배열을 재귀적으로 디코딩한다", () => {
      const tick = new DateTime(2025, 1, 6).tick;
      const uuidStr = Uuid.new().toString();
      const encoded = [
        { __type__: "DateTime", data: tick },
        { __type__: "Uuid", data: uuidStr },
        "string",
        123,
      ];
      const decoded = transferDecode(encoded);

      expect(Array.isArray(decoded)).toBe(true);
      const arr = decoded as unknown[];
      expect(arr[0] instanceof DateTime).toBe(true);
      expect(arr[1] instanceof Uuid).toBe(true);
      expect(arr[2]).toBe("string");
      expect(arr[3]).toBe(123);
    });

    it("Map을 재귀적으로 디코딩한다", () => {
      const tick = new DateTime(2025, 1, 6).tick;
      const encoded = new Map<string, unknown>([
        ["key1", { __type__: "DateTime", data: tick }],
        ["key2", "value"],
      ]);
      const decoded = transferDecode(encoded);

      expect(decoded instanceof Map).toBe(true);
      const map = decoded as Map<string, unknown>;
      expect(map.get("key1") instanceof DateTime).toBe(true);
      expect(map.get("key2")).toBe("value");
    });

    it("Set을 재귀적으로 디코딩한다", () => {
      const tick = new DateTime(2025, 1, 6).tick;
      const encoded = new Set([{ __type__: "DateTime", data: tick }, "string"]);
      const decoded = transferDecode(encoded);

      expect(decoded instanceof Set).toBe(true);
      const set = decoded as Set<unknown>;
      const arr = Array.from(set);
      expect(arr[0] instanceof DateTime).toBe(true);
      expect(arr[1]).toBe("string");
    });

    it("중첩된 객체를 재귀적으로 디코딩한다", () => {
      const dtTick = new DateTime(2025, 1, 6).tick;
      const uuidStr = Uuid.new().toString();
      const dTick = new DateOnly(2025, 1, 6).tick;
      const encoded = {
        dt: { __type__: "DateTime", data: dtTick },
        nested: {
          uuid: { __type__: "Uuid", data: uuidStr },
          arr: [{ __type__: "DateOnly", data: dTick }],
        },
      };
      const decoded = transferDecode(encoded);

      const obj = decoded as {
        dt: DateTime;
        nested: {
          uuid: Uuid;
          arr: DateOnly[];
        };
      };

      expect(obj.dt instanceof DateTime).toBe(true);
      expect(obj.nested.uuid instanceof Uuid).toBe(true);
      expect(obj.nested.arr[0] instanceof DateOnly).toBe(true);
    });
  });

  //#endregion

  //#region decode 원본 보존

  describe("decode() - 원본 보존", () => {
    it("원본 배열이 변경되지 않는다", () => {
      const tick = new DateTime(2025, 1, 6).tick;
      const original = [{ __type__: "DateTime", data: tick }, "string", 123];
      const originalCopy = JSON.stringify(original);

      transferDecode(original);

      // 원본이 변경되지 않았는지 확인
      expect(JSON.stringify(original)).toBe(originalCopy);
      expect(original[0]).toEqual({ __type__: "DateTime", data: tick });
      expect(original[1]).toBe("string");
      expect(original[2]).toBe(123);
    });

    it("원본 객체가 변경되지 않는다", () => {
      const tick = new DateTime(2025, 1, 6).tick;
      const original = {
        dt: { __type__: "DateTime", data: tick },
        value: 123,
      };
      const originalCopy = JSON.stringify(original);

      transferDecode(original);

      // 원본이 변경되지 않았는지 확인
      expect(JSON.stringify(original)).toBe(originalCopy);
      expect(original.dt).toEqual({ __type__: "DateTime", data: tick });
      expect(original.value).toBe(123);
    });

    it("중첩 배열/객체도 원본이 보존된다", () => {
      const tick = new DateTime(2025, 1, 6).tick;
      const original = {
        nested: {
          arr: [{ __type__: "DateTime", data: tick }],
        },
      };
      const originalCopy = JSON.stringify(original);

      transferDecode(original);

      expect(JSON.stringify(original)).toBe(originalCopy);
    });

    it("decode 결과는 새 인스턴스다 (원본과 다름)", () => {
      const tick = new DateTime(2025, 1, 6).tick;
      const original = [{ __type__: "DateTime", data: tick }];

      const decoded = transferDecode(original);

      // 결과는 새 배열
      expect(decoded).not.toBe(original);
      // 배열 내용은 변환됨
      expect(Array.isArray(decoded)).toBe(true);
      expect((decoded as unknown[])[0] instanceof DateTime).toBe(true);
    });
  });

  //#endregion

  //#region 왕복 변환 (round-trip)

  describe("왕복 변환 (encode → decode)", () => {
    it("Date를 왕복 변환한다", () => {
      const original = new Date(2025, 0, 6, 15, 30, 45, 123);
      const { result } = transferEncode(original);
      const decoded = transferDecode(result) as Date;

      expect(decoded.getTime()).toBe(original.getTime());
    });

    it("DateTime을 왕복 변환한다", () => {
      const original = new DateTime(2025, 1, 6, 15, 30, 45, 123);
      const { result } = transferEncode(original);
      const decoded = transferDecode(result) as DateTime;

      expect(decoded.tick).toBe(original.tick);
    });

    it("복잡한 객체를 왕복 변환한다", () => {
      const original = {
        dt: new DateTime(2025, 1, 6),
        d: new DateOnly(2025, 1, 6),
        t: new Time(15, 30, 45),
        uuid: Uuid.new(),
        arr: [new DateTime(2024, 12, 31)],
        map: new Map([["key", new DateOnly(2025, 1, 1)]]),
        set: new Set([new Time(12, 0, 0)]),
      };

      const { result } = transferEncode(original);
      const decoded = transferDecode(result) as typeof original;

      expect(decoded.dt instanceof DateTime).toBe(true);
      expect(decoded.d instanceof DateOnly).toBe(true);
      expect(decoded.t instanceof Time).toBe(true);
      expect(decoded.uuid instanceof Uuid).toBe(true);
      expect(decoded.arr[0] instanceof DateTime).toBe(true);
      expect(decoded.map.get("key") instanceof DateOnly).toBe(true);
      expect(Array.from(decoded.set)[0] instanceof Time).toBe(true);
    });

    it("RegExp를 왕복 변환한다", () => {
      const original = /test\d+/gi;
      const { result } = transferEncode(original);
      const decoded = transferDecode(result) as RegExp;

      expect(decoded instanceof RegExp).toBe(true);
      expect(decoded.source).toBe(original.source);
      expect(decoded.flags).toBe(original.flags);
    });
  });

  //#endregion
});
