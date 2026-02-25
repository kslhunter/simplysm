import { describe, it, expect } from "vitest";
import {
  jsonStringify as stringify,
  jsonParse as parse,
  DateTime,
  DateOnly,
  Time,
  Uuid,
} from "@simplysm/core-common";

describe("JsonConvert", () => {
  //#region stringify

  describe("stringify()", () => {
    it("Serializes primitive values", () => {
      expect(stringify(42)).toBe("42");
      expect(stringify("hello")).toBe('"hello"');
      expect(stringify(true)).toBe("true");
      expect(stringify(null)).toBe("null");
    });

    it("Serializes Date with __type__", () => {
      const date = new Date("2024-03-15T10:30:00.000Z");
      const json = stringify(date);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("Date");
      expect(parsed.data).toBe("2024-03-15T10:30:00.000Z");
    });

    it("Serializes DateTime with __type__", () => {
      const dt = new DateTime(2024, 3, 15, 10, 30);
      const json = stringify(dt);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("DateTime");
      expect(typeof parsed.data).toBe("string");
    });

    it("Serializes DateOnly with __type__", () => {
      const d = new DateOnly(2024, 3, 15);
      const json = stringify(d);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("DateOnly");
    });

    it("Serializes Time with __type__", () => {
      const t = new Time(10, 30, 45);
      const json = stringify(t);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("Time");
    });

    it("Serializes Uuid with __type__", () => {
      const uuid = new Uuid("12345678-9abc-def0-1234-56789abcdef0");
      const json = stringify(uuid);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("Uuid");
      expect(parsed.data).toBe("12345678-9abc-def0-1234-56789abcdef0");
    });

    it("Serializes Set with __type__", () => {
      const set = new Set([1, 2, 3]);
      const json = stringify(set);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("Set");
      expect(parsed.data).toEqual([1, 2, 3]);
    });

    it("Serializes Map with __type__", () => {
      const map = new Map([
        ["a", 1],
        ["b", 2],
      ]);
      const json = stringify(map);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("Map");
      expect(parsed.data).toEqual([
        ["a", 1],
        ["b", 2],
      ]);
    });

    it("Serializes Error with __type__", () => {
      const error = new Error("test error");
      const json = stringify(error);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("Error");
      expect(parsed.data.message).toBe("test error");
      expect(parsed.data.name).toBe("Error");
    });

    it("Serializes Error extended properties (code, detail, cause)", () => {
      const cause = new Error("cause error");
      const error = new Error("test error") as Error & { code: string; detail: object };
      error.code = "ERR_CODE";
      error.detail = { key: "value" };
      (error as Error & { cause: Error }).cause = cause;

      const json = stringify(error);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("Error");
      expect(parsed.data.message).toBe("test error");
      expect(parsed.data.code).toBe("ERR_CODE");
      expect(parsed.data.detail).toEqual({ key: "value" });
      expect(parsed.data.cause.__type__).toBe("Error");
      expect(parsed.data.cause.data.message).toBe("cause error");
    });

    it("Hides Uint8Array with redactBytes option", () => {
      const obj = { data: new TextEncoder().encode("hello") };
      const json = stringify(obj, { redactBytes: true });
      const parsed = JSON.parse(json);

      expect(parsed.data.data).toBe("__hidden__");
    });

    it("Indents with space option", () => {
      const obj = { a: 1 };
      const json = stringify(obj, { space: 2 });

      expect(json).toBe('{\n  "a": 1\n}');
    });

    it("Transforms values with replacer option", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const json = stringify(obj, {
        replacer: (key, value) => {
          if (key === "b") return undefined;
          return value;
        },
      });
      const parsed = JSON.parse(json);

      expect(parsed.a).toBe(1);
      expect(parsed.b).toBeUndefined();
      expect(parsed.c).toBe(3);
    });

    it("No race condition on concurrent calls", async () => {
      // Serialize complex objects with Date simultaneously
      const createTestObject = (id: number) => ({
        id,
        date: new Date(`2024-0${(id % 9) + 1}-15T10:30:00.000Z`),
        nested: {
          innerDate: new Date(`2024-0${(id % 9) + 1}-20T15:45:00.000Z`),
        },
        array: [new Date(`2024-0${(id % 9) + 1}-25T08:00:00.000Z`)],
      });

      // 100 concurrent calls
      const promises = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve().then(() => {
          const obj = createTestObject(i);
          const json = stringify(obj);
          const parsed = parse<typeof obj>(json);

          // Verify all Dates restored correctly
          expect(parsed.date).toBeInstanceOf(Date);
          expect(parsed.nested.innerDate).toBeInstanceOf(Date);
          expect(parsed.array[0]).toBeInstanceOf(Date);

          return { id: i, success: true };
        }),
      );

      const results = await Promise.all(promises);

      // Verify all calls succeeded
      expect(results.every((r) => r.success)).toBe(true);
    });

    it("Correctly serializes nested Date objects", () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              date: new Date("2024-06-15T12:00:00.000Z"),
            },
          },
        },
        dates: [new Date("2024-01-01T00:00:00.000Z"), new Date("2024-12-31T23:59:59.000Z")],
      };

      const json = stringify(obj);
      const parsed = parse<typeof obj>(json);

      expect(parsed.level1.level2.level3.date).toBeInstanceOf(Date);
      expect(parsed.level1.level2.level3.date.toISOString()).toBe("2024-06-15T12:00:00.000Z");
      expect(parsed.dates[0]).toBeInstanceOf(Date);
      expect(parsed.dates[1]).toBeInstanceOf(Date);
    });

    it("Does not modify Date.prototype.toJSON", () => {
      const originalToJSON = Date.prototype.toJSON;

      // Call stringify
      const date = new Date("2024-03-15T10:30:00.000Z");
      stringify({ date });

      // Verify toJSON not changed
      expect(Date.prototype.toJSON).toBe(originalToJSON);
    });

    it("Circular reference object throws TypeError", () => {
      const obj: Record<string, unknown> = { name: "test" };
      obj["self"] = obj; // circular reference

      expect(() => stringify(obj)).toThrow(TypeError);
      expect(() => stringify(obj)).toThrow("Converting circular structure to JSON");
    });

    it("Detects circular reference in array", () => {
      const arr: unknown[] = [1, 2];
      arr.push(arr); // array circular reference

      expect(() => stringify(arr)).toThrow("Converting circular structure to JSON");
    });

    it("Serializes custom object with toJSON method", () => {
      const obj = {
        amount: 100,
        toJSON() {
          return `$${this.amount}`;
        },
      };

      const json = stringify(obj);
      expect(json).toBe('"$100"');
    });

    it("Recursively processes toJSON if returning object", () => {
      const obj = {
        data: "test",
        toJSON() {
          return { converted: true, date: new Date("2024-01-01T00:00:00.000Z") };
        },
      };

      const json = stringify(obj);
      const parsed = JSON.parse(json);

      expect(parsed.converted).toBe(true);
      expect(parsed.date.__type__).toBe("Date");
    });

    it("Serializes getter properties", () => {
      const obj = {
        _value: 10,
        get computed() {
          return this._value * 2;
        },
      };

      const json = stringify(obj);
      const parsed = JSON.parse(json);

      expect(parsed._value).toBe(10);
      expect(parsed.computed).toBe(20);
    });

    it("Serializes empty objects and arrays", () => {
      expect(stringify({})).toBe("{}");
      expect(stringify([])).toBe("[]");
      expect(stringify({ arr: [], obj: {} })).toBe('{"arr":[],"obj":{}}');
    });

    it("Excludes properties with undefined value", () => {
      const obj = { a: 1, b: undefined, c: 3 };
      const json = stringify(obj);
      const parsed = JSON.parse(json);

      expect(parsed.a).toBe(1);
      expect("b" in parsed).toBe(false);
      expect(parsed.c).toBe(3);
    });

    it("Performance completes in reasonable time", () => {
      // Create complex test object
      const createTestObject = () => ({
        id: 1,
        name: "test",
        date: new Date(),
        nested: {
          array: [1, 2, 3, new Date(), { deep: true }],
          map: new Map([["a", 1]]),
          set: new Set([1, 2, 3]),
        },
      });

      const iterations = 1000;
      const testObj = createTestObject();

      // Measure jsonStringify performance
      const startCustom = performance.now();
      for (let i = 0; i < iterations; i++) {
        stringify(testObj);
      }
      const customTime = performance.now() - startCustom;

      // 1000 serializations should complete within 100ms
      // (includes custom type handling, circular reference detection, etc)
      expect(customTime).toBeLessThan(100);
    });
  });

  //#endregion

  //#region parse

  describe("parse()", () => {
    it("Deserializes primitive values", () => {
      expect(parse("42")).toBe(42);
      expect(parse('"hello"')).toBe("hello");
      expect(parse("true")).toBe(true);
    });

    it("Converts null to undefined", () => {
      expect(parse("null")).toBe(undefined);
    });

    it("Restores Date", () => {
      const json = '{"__type__":"Date","data":"2024-03-15T10:30:00.000Z"}';
      const result = parse(json);

      expect(result).toBeInstanceOf(Date);
      expect((result as Date).toISOString()).toBe("2024-03-15T10:30:00.000Z");
    });

    it("Restores DateTime", () => {
      const dt = new DateTime(2024, 3, 15, 10, 30);
      const json = stringify(dt);
      const result = parse(json);

      expect(result).toBeInstanceOf(DateTime);
      expect((result as DateTime).year).toBe(2024);
      expect((result as DateTime).month).toBe(3);
      expect((result as DateTime).day).toBe(15);
    });

    it("Restores DateOnly", () => {
      const d = new DateOnly(2024, 3, 15);
      const json = stringify(d);
      const result = parse(json);

      expect(result).toBeInstanceOf(DateOnly);
      expect((result as DateOnly).year).toBe(2024);
    });

    it("Restores Time", () => {
      const t = new Time(10, 30, 45);
      const json = stringify(t);
      const result = parse(json);

      expect(result).toBeInstanceOf(Time);
      expect((result as Time).hour).toBe(10);
    });

    it("Restores Uuid", () => {
      const json = '{"__type__":"Uuid","data":"12345678-9abc-def0-1234-56789abcdef0"}';
      const result = parse(json);

      expect(result).toBeInstanceOf(Uuid);
      expect((result as Uuid).toString()).toBe("12345678-9abc-def0-1234-56789abcdef0");
    });

    it("Restores Set", () => {
      const json = '{"__type__":"Set","data":[1,2,3]}';
      const result = parse(json);

      expect(result).toBeInstanceOf(Set);
      expect(Array.from(result as Set<number>)).toEqual([1, 2, 3]);
    });

    it("Restores Map", () => {
      const json = '{"__type__":"Map","data":[["a",1],["b",2]]}';
      const result = parse(json);

      expect(result).toBeInstanceOf(Map);
      expect((result as Map<string, number>).get("a")).toBe(1);
    });

    it("Restores Error (with extended properties)", () => {
      const cause = new Error("cause error");
      const error = new Error("test error") as Error & {
        code: string;
        detail: object;
        cause: Error;
      };
      error.code = "ERR_CODE";
      error.detail = { key: "value" };
      error.cause = cause;

      const json = stringify(error);
      const result = parse<typeof error>(json);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe("test error");
      expect(result.code).toBe("ERR_CODE");
      expect(result.detail).toEqual({ key: "value" });
      expect(result.cause).toBeInstanceOf(Error);
      expect(result.cause.message).toBe("cause error");
    });

    it("Restores Uint8Array", () => {
      const json = '{"__type__":"Uint8Array","data":"68656c6c6f"}';
      const result = parse(json);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(result as Uint8Array)).toBe("hello");
    });

    it("stringify/parse round-trip", () => {
      const original = {
        date: new Date("2024-03-15T10:30:00.000Z"),
        dateTime: new DateTime(2024, 3, 15),
        dateOnly: new DateOnly(2024, 3, 15),
        time: new Time(10, 30),
        uuid: new Uuid("12345678-9abc-def0-1234-56789abcdef0"),
        set: new Set([1, 2, 3]),
        map: new Map([["a", 1]]),
        bytes: new TextEncoder().encode("hello"),
      };

      const json = stringify(original);
      const result = parse<typeof original>(json);

      expect(result.date).toBeInstanceOf(Date);
      expect(result.dateTime).toBeInstanceOf(DateTime);
      expect(result.dateOnly).toBeInstanceOf(DateOnly);
      expect(result.time).toBeInstanceOf(Time);
      expect(result.uuid).toBeInstanceOf(Uuid);
      expect(result.set).toBeInstanceOf(Set);
      expect(result.map).toBeInstanceOf(Map);
      expect(result.bytes).toBeInstanceOf(Uint8Array);
    });

    it("Data serialized with redactBytes throws error on parse", () => {
      const obj = { data: new TextEncoder().encode("hello") };
      const json = stringify(obj, { redactBytes: true });

      // "__hidden__" is data serialized with redactBytes option, so parse throws error
      expect(() => parse<typeof obj>(json)).toThrow(
        "Uint8Array serialized with redactBytes option cannot be restored via parse",
      );
    });

    it("Invalid JSON throws error", () => {
      expect(() => parse("invalid json")).toThrow("JSON parsing error");
    });

    it("In DEV mode, full JSON included in error message", () => {
      const longJson = "x".repeat(2000);

      try {
        parse(longJson);
        expect.fail("Error should be thrown");
      } catch (err) {
        const message = (err as Error).message;
        // In DEV mode, full JSON included
        expect(message).toContain(longJson);
      }
    });

    it("Error message includes JSON content", () => {
      const shortJson = "invalid";

      try {
        parse(shortJson);
        expect.fail("Error should be thrown");
      } catch (err) {
        const message = (err as Error).message;
        expect(message).toContain("invalid");
      }
    });
  });

  //#endregion
});
