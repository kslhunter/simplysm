import { describe, it, expect } from "vitest";
import { json, DateTime, DateOnly, Time, Uuid } from "@simplysm/core-common";

describe("JsonConvert", () => {
  //#region stringify

  describe("stringify()", () => {
    it("Serializes Date with __type__", () => {
      const date = new Date("2024-03-15T10:30:00.000Z");
      const str = json.stringify(date);
      const parsed = JSON.parse(str);

      expect(parsed.__type__).toBe("Date");
      expect(parsed.data).toBe("2024-03-15T10:30:00.000Z");
    });

    it("Serializes DateTime with __type__", () => {
      const dt = new DateTime(2024, 3, 15, 10, 30);
      const str = json.stringify(dt);
      const parsed = JSON.parse(str);

      expect(parsed.__type__).toBe("DateTime");
      expect(typeof parsed.data).toBe("string");
    });

    it("Serializes DateOnly with __type__", () => {
      const d = new DateOnly(2024, 3, 15);
      const str = json.stringify(d);
      const parsed = JSON.parse(str);

      expect(parsed.__type__).toBe("DateOnly");
    });

    it("Serializes Time with __type__", () => {
      const t = new Time(10, 30, 45);
      const str = json.stringify(t);
      const parsed = JSON.parse(str);

      expect(parsed.__type__).toBe("Time");
    });

    it("Serializes Uuid with __type__", () => {
      const uuid = new Uuid("12345678-9abc-def0-1234-56789abcdef0");
      const str = json.stringify(uuid);
      const parsed = JSON.parse(str);

      expect(parsed.__type__).toBe("Uuid");
      expect(parsed.data).toBe("12345678-9abc-def0-1234-56789abcdef0");
    });

    it("Serializes Set with __type__", () => {
      const set = new Set([1, 2, 3]);
      const str = json.stringify(set);
      const parsed = JSON.parse(str);

      expect(parsed.__type__).toBe("Set");
      expect(parsed.data).toEqual([1, 2, 3]);
    });

    it("Serializes Map with __type__", () => {
      const map = new Map([
        ["a", 1],
        ["b", 2],
      ]);
      const str = json.stringify(map);
      const parsed = JSON.parse(str);

      expect(parsed.__type__).toBe("Map");
      expect(parsed.data).toEqual([
        ["a", 1],
        ["b", 2],
      ]);
    });

    it("Serializes Error with __type__", () => {
      const error = new Error("test error");
      const str = json.stringify(error);
      const parsed = JSON.parse(str);

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

      const str = json.stringify(error);
      const parsed = JSON.parse(str);

      expect(parsed.__type__).toBe("Error");
      expect(parsed.data.message).toBe("test error");
      expect(parsed.data.code).toBe("ERR_CODE");
      expect(parsed.data.detail).toEqual({ key: "value" });
      expect(parsed.data.cause.__type__).toBe("Error");
      expect(parsed.data.cause.data.message).toBe("cause error");
    });

    it("Hides Uint8Array with redactBytes option", () => {
      const obj = { data: new TextEncoder().encode("hello") };
      const str = json.stringify(obj, { redactBytes: true });
      const parsed = JSON.parse(str);

      expect(parsed.data.data).toBe("__hidden__");
    });

    it("Transforms values with replacer option", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const str = json.stringify(obj, {
        replacer: (key, value) => {
          if (key === "b") return undefined;
          return value;
        },
      });
      const parsed = JSON.parse(str);

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
          const str = json.stringify(obj);
          const parsed = json.parse<typeof obj>(str);

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

      const str = json.stringify(obj);
      const parsed = json.parse<typeof obj>(str);

      expect(parsed.level1.level2.level3.date).toBeInstanceOf(Date);
      expect(parsed.level1.level2.level3.date.toISOString()).toBe("2024-06-15T12:00:00.000Z");
      expect(parsed.dates[0]).toBeInstanceOf(Date);
      expect(parsed.dates[1]).toBeInstanceOf(Date);
    });

    it("Does not modify Date.prototype.toJSON", () => {
      const originalToJSON = Date.prototype.toJSON;

      // Call stringify
      const date = new Date("2024-03-15T10:30:00.000Z");
      json.stringify({ date });

      // Verify toJSON not changed
      expect(Date.prototype.toJSON).toBe(originalToJSON);
    });

    it("Circular reference object throws TypeError", () => {
      const obj: Record<string, unknown> = { name: "test" };
      obj["self"] = obj; // circular reference

      expect(() => json.stringify(obj)).toThrow(TypeError);
      expect(() => json.stringify(obj)).toThrow("Converting circular structure to JSON");
    });

    it("Detects circular reference in array", () => {
      const arr: unknown[] = [1, 2];
      arr.push(arr); // array circular reference

      expect(() => json.stringify(arr)).toThrow("Converting circular structure to JSON");
    });

    it("Serializes custom object with toJSON method", () => {
      const obj = {
        amount: 100,
        toJSON() {
          return `$${this.amount}`;
        },
      };

      const str = json.stringify(obj);
      expect(str).toBe('"$100"');
    });

    it("Recursively processes toJSON if returning object", () => {
      const obj = {
        data: "test",
        toJSON() {
          return { converted: true, date: new Date("2024-01-01T00:00:00.000Z") };
        },
      };

      const str = json.stringify(obj);
      const parsed = JSON.parse(str);

      expect(parsed.converted).toBe(true);
      expect(parsed.date.__type__).toBe("Date");
    });
  });

  //#endregion

  //#region parse

  describe("parse()", () => {
    it("Converts null to undefined", () => {
      expect(json.parse("null")).toBe(undefined);
    });

    it("Restores Date", () => {
      const str = '{"__type__":"Date","data":"2024-03-15T10:30:00.000Z"}';
      const result = json.parse(str);

      expect(result).toBeInstanceOf(Date);
      expect((result as Date).toISOString()).toBe("2024-03-15T10:30:00.000Z");
    });

    it("Restores DateTime", () => {
      const dt = new DateTime(2024, 3, 15, 10, 30);
      const str = json.stringify(dt);
      const result = json.parse(str);

      expect(result).toBeInstanceOf(DateTime);
      expect((result as DateTime).year).toBe(2024);
      expect((result as DateTime).month).toBe(3);
      expect((result as DateTime).day).toBe(15);
    });

    it("Restores DateOnly", () => {
      const d = new DateOnly(2024, 3, 15);
      const str = json.stringify(d);
      const result = json.parse(str);

      expect(result).toBeInstanceOf(DateOnly);
      expect((result as DateOnly).year).toBe(2024);
    });

    it("Restores Time", () => {
      const t = new Time(10, 30, 45);
      const str = json.stringify(t);
      const result = json.parse(str);

      expect(result).toBeInstanceOf(Time);
      expect((result as Time).hour).toBe(10);
    });

    it("Restores Uuid", () => {
      const str = '{"__type__":"Uuid","data":"12345678-9abc-def0-1234-56789abcdef0"}';
      const result = json.parse(str);

      expect(result).toBeInstanceOf(Uuid);
      expect((result as Uuid).toString()).toBe("12345678-9abc-def0-1234-56789abcdef0");
    });

    it("Restores Set", () => {
      const str = '{"__type__":"Set","data":[1,2,3]}';
      const result = json.parse(str);

      expect(result).toBeInstanceOf(Set);
      expect(Array.from(result as Set<number>)).toEqual([1, 2, 3]);
    });

    it("Restores Map", () => {
      const str = '{"__type__":"Map","data":[["a",1],["b",2]]}';
      const result = json.parse(str);

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

      const str = json.stringify(error);
      const result = json.parse<typeof error>(str);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe("test error");
      expect(result.code).toBe("ERR_CODE");
      expect(result.detail).toEqual({ key: "value" });
      expect(result.cause).toBeInstanceOf(Error);
      expect(result.cause.message).toBe("cause error");
    });

    it("Restores Uint8Array", () => {
      const str = '{"__type__":"Uint8Array","data":"68656c6c6f"}';
      const result = json.parse(str);

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

      const str = json.stringify(original);
      const result = json.parse<typeof original>(str);

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
      const str = json.stringify(obj, { redactBytes: true });

      // "__hidden__" is data serialized with redactBytes option, so parse throws error
      expect(() => json.parse<typeof obj>(str)).toThrow(
        "Uint8Array serialized with redactBytes option cannot be restored via parse",
      );
    });

    it("Invalid JSON throws error", () => {
      expect(() => json.parse("invalid json")).toThrow("JSON parsing error");
    });

    it("In DEV mode, full JSON included in error message", () => {
      const longJson = "x".repeat(2000);

      try {
        json.parse(longJson);
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
        json.parse(shortJson);
        expect.fail("Error should be thrown");
      } catch (err) {
        const message = (err as Error).message;
        expect(message).toContain("invalid");
      }
    });
  });

  //#endregion
});
