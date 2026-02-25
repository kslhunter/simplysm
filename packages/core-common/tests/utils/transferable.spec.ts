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
  //#region encode - Special types

  describe("encode() - Special types", () => {
    it("Encodes DateTime", () => {
      const dt = new DateTime(2025, 1, 6, 15, 30, 45, 123);
      const { result } = transferEncode(dt);

      expect(result).toEqual({
        __type__: "DateTime",
        data: dt.tick,
      });
    });

    it("Encodes DateOnly", () => {
      const d = new DateOnly(2025, 1, 6);
      const { result } = transferEncode(d);

      expect(result).toEqual({
        __type__: "DateOnly",
        data: d.tick,
      });
    });

    it("Encodes Time", () => {
      const t = new Time(15, 30, 45, 123);
      const { result } = transferEncode(t);

      expect(result).toEqual({
        __type__: "Time",
        data: t.tick,
      });
    });

    it("Encodes Uuid", () => {
      const uuid = Uuid.new();
      const { result } = transferEncode(uuid);

      expect(result).toEqual({
        __type__: "Uuid",
        data: uuid.toString(),
      });
    });

    it("Encodes Error", () => {
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

    it("Recursively encodes Error cause", () => {
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

    it("Encodes Error code property", () => {
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

    it("Encodes Error detail property", () => {
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

    it("Encodes special types in Error detail", () => {
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

    it("Encodes Uint8Array and adds to transferList", () => {
      const bytes = new TextEncoder().encode("hello");
      const { result, transferList } = transferEncode(bytes);

      expect(result).toBe(bytes);
      expect(transferList).toContain(bytes.buffer);
    });

    it("Encodes Date", () => {
      const date = new Date(2025, 0, 6, 15, 30, 45, 123);
      const { result } = transferEncode(date);

      expect(result).toEqual({
        __type__: "Date",
        data: date.getTime(),
      });
    });

    it("Encodes RegExp", () => {
      const regex = /test\d+/gi;
      const { result } = transferEncode(regex);

      expect(result).toEqual({
        __type__: "RegExp",
        data: { source: "test\\d+", flags: "gi" },
      });
    });
  });

  //#endregion

  //#region encode - Collections

  describe("encode() - Collections", () => {
    it("Recursively encodes array", () => {
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

    it("Recursively encodes Map", () => {
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

    it("Recursively encodes Set", () => {
      const set = new Set([new DateTime(2025, 1, 6), Uuid.new()]);
      const { result } = transferEncode(set);

      expect(result instanceof Set).toBe(true);
      const resultSet = result as Set<unknown>;
      expect(resultSet.size).toBe(2);
      const arr = Array.from(resultSet);
      expect(arr[0]).toMatchObject({ __type__: "DateTime" });
      expect(arr[1]).toMatchObject({ __type__: "Uuid" });
    });

    it("Recursively encodes nested object", () => {
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

  //#region encode - Circular reference detection

  describe("encode() - Circular reference detection", () => {
    it("Throws TypeError when encoding self-referencing object", () => {
      const obj: Record<string, unknown> = { a: 1 };
      obj["self"] = obj;

      expect(() => transferEncode(obj)).toThrow(TypeError);
      expect(() => transferEncode(obj)).toThrow("Circular reference detected");
    });

    it("Detects nested circular references", () => {
      const a: Record<string, unknown> = { name: "a" };
      const b: Record<string, unknown> = { name: "b", ref: a };
      a["ref"] = b;

      expect(() => transferEncode(a)).toThrow("Circular reference detected");
    });

    it("Detects circular references in array", () => {
      const arr: unknown[] = [1, 2, 3];
      arr.push(arr);

      expect(() => transferEncode(arr)).toThrow("Circular reference detected");
    });

    it("Detects circular references in Map", () => {
      const map = new Map<string, unknown>();
      map.set("self", map);

      expect(() => transferEncode(map)).toThrow("Circular reference detected");
    });

    it("Detects circular references in Set", () => {
      const set = new Set<unknown>();
      set.add(set);

      expect(() => transferEncode(set)).toThrow("Circular reference detected");
    });
  });

  //#endregion

  //#region encode - DAG (Shared objects)

  describe("encode() - DAG (Shared objects)", () => {
    it("Encodes without error when same object is referenced from multiple places", () => {
      const shared = { name: "shared" };
      const data = { a: shared, b: shared };
      const { result } = transferEncode(data);
      const decoded = result as Record<string, Record<string, string>>;
      expect(decoded["a"]["name"]).toBe("shared");
      expect(decoded["b"]["name"]).toBe("shared");
    });

    it("Encodes without error when same array is referenced from multiple places", () => {
      const sharedArr = [1, 2, 3];
      const data = { x: sharedArr, y: sharedArr };
      const { result } = transferEncode(data);
      const decoded = result as Record<string, number[]>;
      expect(decoded["x"]).toEqual([1, 2, 3]);
      expect(decoded["y"]).toEqual([1, 2, 3]);
    });

    it("Still throws TypeError for circular references", () => {
      const a: Record<string, unknown> = {};
      const b: Record<string, unknown> = { a };
      a["b"] = b;
      expect(() => transferEncode(a)).toThrow(TypeError);
    });
  });

  //#endregion

  //#region decode - Special types

  describe("decode() - Special types", () => {
    it("Decodes DateTime", () => {
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

    it("Decodes DateOnly", () => {
      const tick = new DateOnly(2025, 1, 6).tick;
      const encoded = { __type__: "DateOnly", data: tick };
      const decoded = transferDecode(encoded);

      expect(decoded instanceof DateOnly).toBe(true);
      const d = decoded as DateOnly;
      expect(d.year).toBe(2025);
      expect(d.month).toBe(1);
      expect(d.day).toBe(6);
    });

    it("Decodes Time", () => {
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

    it("Decodes Uuid", () => {
      const uuid = Uuid.new();
      const encoded = { __type__: "Uuid", data: uuid.toString() };
      const decoded = transferDecode(encoded);

      expect(decoded instanceof Uuid).toBe(true);
      expect((decoded as Uuid).toString()).toBe(uuid.toString());
    });

    it("Decodes Error", () => {
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

    it("Recursively decodes Error cause", () => {
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

    it("Decodes Error code property", () => {
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

    it("Decodes Error detail property", () => {
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

    it("Decodes special types in Error detail", () => {
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

    it("Decodes Date", () => {
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

    it("Decodes RegExp", () => {
      const encoded = {
        __type__: "RegExp",
        data: { source: "test\\d+", flags: "gi" },
      };
      const decoded = transferDecode(encoded);

      expect(decoded instanceof RegExp).toBe(true);
      const regex = decoded as RegExp;
      expect(regex.source).toBe("test\\d+");
      expect(regex.flags).toBe("gi");
      // RegExp with g flag is stateful, so reset lastIndex before testing
      expect(regex.test("test123")).toBe(true);
      regex.lastIndex = 0;
      expect(regex.test("TEST456")).toBe(true);
    });
  });

  //#endregion

  //#region decode - Collections

  describe("decode() - Collections", () => {
    it("Recursively decodes array", () => {
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

    it("Recursively decodes Map", () => {
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

    it("Recursively decodes Set", () => {
      const tick = new DateTime(2025, 1, 6).tick;
      const encoded = new Set([{ __type__: "DateTime", data: tick }, "string"]);
      const decoded = transferDecode(encoded);

      expect(decoded instanceof Set).toBe(true);
      const set = decoded as Set<unknown>;
      const arr = Array.from(set);
      expect(arr[0] instanceof DateTime).toBe(true);
      expect(arr[1]).toBe("string");
    });

    it("Recursively decodes nested object", () => {
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

  //#region decode - Preserve original

  describe("decode() - Preserve original", () => {
    it("Original array is not modified", () => {
      const tick = new DateTime(2025, 1, 6).tick;
      const original = [{ __type__: "DateTime", data: tick }, "string", 123];
      const originalCopy = JSON.stringify(original);

      transferDecode(original);

      // Verify original is not modified
      expect(JSON.stringify(original)).toBe(originalCopy);
      expect(original[0]).toEqual({ __type__: "DateTime", data: tick });
      expect(original[1]).toBe("string");
      expect(original[2]).toBe(123);
    });

    it("Original object is not modified", () => {
      const tick = new DateTime(2025, 1, 6).tick;
      const original = {
        dt: { __type__: "DateTime", data: tick },
        value: 123,
      };
      const originalCopy = JSON.stringify(original);

      transferDecode(original);

      // Verify original is not modified
      expect(JSON.stringify(original)).toBe(originalCopy);
      expect(original.dt).toEqual({ __type__: "DateTime", data: tick });
      expect(original.value).toBe(123);
    });

    it("Original is preserved for nested arrays/objects", () => {
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

    it("Decode result is a new instance (different from original)", () => {
      const tick = new DateTime(2025, 1, 6).tick;
      const original = [{ __type__: "DateTime", data: tick }];

      const decoded = transferDecode(original);

      // Result is a new array
      expect(decoded).not.toBe(original);
      // Array contents are converted
      expect(Array.isArray(decoded)).toBe(true);
      expect((decoded as unknown[])[0] instanceof DateTime).toBe(true);
    });
  });

  //#endregion

  //#region Round-trip conversion (encode → decode)

  describe("Round-trip conversion (encode → decode)", () => {
    it("Round-trips Date", () => {
      const original = new Date(2025, 0, 6, 15, 30, 45, 123);
      const { result } = transferEncode(original);
      const decoded = transferDecode(result) as Date;

      expect(decoded.getTime()).toBe(original.getTime());
    });

    it("Round-trips DateTime", () => {
      const original = new DateTime(2025, 1, 6, 15, 30, 45, 123);
      const { result } = transferEncode(original);
      const decoded = transferDecode(result) as DateTime;

      expect(decoded.tick).toBe(original.tick);
    });

    it("Round-trips complex object", () => {
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

    it("Round-trips RegExp", () => {
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
