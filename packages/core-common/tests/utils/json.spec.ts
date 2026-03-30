import { describe, it, expect } from "vitest";
import { json, DateTime, DateOnly, Time, Uuid } from "@simplysm/core-common";

describe("JsonConvert", () => {
  //#region stringify

  describe("stringify()", () => {
    it("Date를 __type__으로 직렬화", () => {
      const date = new Date("2024-03-15T10:30:00.000Z");
      const str = json.stringify(date);
      const parsed = JSON.parse(str);

      expect(parsed.__type__).toBe("Date");
      expect(parsed.data).toBe("2024-03-15T10:30:00.000Z");
    });

    it("DateTime을 __type__으로 직렬화", () => {
      const dt = new DateTime(2024, 3, 15, 10, 30);
      const str = json.stringify(dt);
      const parsed = JSON.parse(str);

      expect(parsed.__type__).toBe("DateTime");
      expect(typeof parsed.data).toBe("string");
    });

    it("DateOnly를 __type__으로 직렬화", () => {
      const d = new DateOnly(2024, 3, 15);
      const str = json.stringify(d);
      const parsed = JSON.parse(str);

      expect(parsed.__type__).toBe("DateOnly");
    });

    it("Time을 __type__으로 직렬화", () => {
      const t = new Time(10, 30, 45);
      const str = json.stringify(t);
      const parsed = JSON.parse(str);

      expect(parsed.__type__).toBe("Time");
    });

    it("Uuid를 __type__으로 직렬화", () => {
      const uuid = new Uuid("12345678-9abc-def0-1234-56789abcdef0");
      const str = json.stringify(uuid);
      const parsed = JSON.parse(str);

      expect(parsed.__type__).toBe("Uuid");
      expect(parsed.data).toBe("12345678-9abc-def0-1234-56789abcdef0");
    });

    it("Set을 __type__으로 직렬화", () => {
      const set = new Set([1, 2, 3]);
      const str = json.stringify(set);
      const parsed = JSON.parse(str);

      expect(parsed.__type__).toBe("Set");
      expect(parsed.data).toEqual([1, 2, 3]);
    });

    it("Map을 __type__으로 직렬화", () => {
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

    it("Error를 __type__으로 직렬화", () => {
      const error = new Error("test error");
      const str = json.stringify(error);
      const parsed = JSON.parse(str);

      expect(parsed.__type__).toBe("Error");
      expect(parsed.data.message).toBe("test error");
      expect(parsed.data.name).toBe("Error");
    });

    it("Error 확장 속성(code, detail, cause) 직렬화", () => {
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

    it("redactBytes 옵션으로 Uint8Array 숨기기", () => {
      const obj = { data: new TextEncoder().encode("hello") };
      const str = json.stringify(obj, { redactBytes: true });
      const parsed = JSON.parse(str);

      expect(parsed.data.data).toBe("__hidden__");
    });

    it("replacer 옵션으로 값 변환", () => {
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

    it("동시 호출 시 경합 조건 없음", async () => {
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

    it("중첩된 Date 객체를 올바르게 직렬화", () => {
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

    it("Date.prototype.toJSON을 수정하지 않음", () => {
      const originalToJSON = Date.prototype.toJSON;

      // Call stringify
      const date = new Date("2024-03-15T10:30:00.000Z");
      json.stringify({ date });

      // Verify toJSON not changed
      expect(Date.prototype.toJSON).toBe(originalToJSON);
    });

    it("순환 참조 객체는 TypeError 발생", () => {
      const obj: Record<string, unknown> = { name: "test" };
      obj["self"] = obj; // circular reference

      expect(() => json.stringify(obj)).toThrow(TypeError);
      expect(() => json.stringify(obj)).toThrow("Converting circular structure to JSON");
    });

    it("배열에서 순환 참조 감지", () => {
      const arr: unknown[] = [1, 2];
      arr.push(arr); // array circular reference

      expect(() => json.stringify(arr)).toThrow("Converting circular structure to JSON");
    });

    it("toJSON 메서드가 있는 커스텀 객체 직렬화", () => {
      const obj = {
        amount: 100,
        toJSON() {
          return `$${this.amount}`;
        },
      };

      const str = json.stringify(obj);
      expect(str).toBe('"$100"');
    });

    it("toJSON이 객체를 반환하면 재귀적으로 처리", () => {
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
    it("null을 undefined로 변환", () => {
      expect(json.parse("null")).toBe(undefined);
    });

    it("Date 복원", () => {
      const str = '{"__type__":"Date","data":"2024-03-15T10:30:00.000Z"}';
      const result = json.parse(str);

      expect(result).toBeInstanceOf(Date);
      expect((result as Date).toISOString()).toBe("2024-03-15T10:30:00.000Z");
    });

    it("DateTime 복원", () => {
      const dt = new DateTime(2024, 3, 15, 10, 30);
      const str = json.stringify(dt);
      const result = json.parse(str);

      expect(result).toBeInstanceOf(DateTime);
      expect((result as DateTime).year).toBe(2024);
      expect((result as DateTime).month).toBe(3);
      expect((result as DateTime).day).toBe(15);
    });

    it("DateOnly 복원", () => {
      const d = new DateOnly(2024, 3, 15);
      const str = json.stringify(d);
      const result = json.parse(str);

      expect(result).toBeInstanceOf(DateOnly);
      expect((result as DateOnly).year).toBe(2024);
    });

    it("Time 복원", () => {
      const t = new Time(10, 30, 45);
      const str = json.stringify(t);
      const result = json.parse(str);

      expect(result).toBeInstanceOf(Time);
      expect((result as Time).hour).toBe(10);
    });

    it("Uuid 복원", () => {
      const str = '{"__type__":"Uuid","data":"12345678-9abc-def0-1234-56789abcdef0"}';
      const result = json.parse(str);

      expect(result).toBeInstanceOf(Uuid);
      expect((result as Uuid).toString()).toBe("12345678-9abc-def0-1234-56789abcdef0");
    });

    it("Set 복원", () => {
      const str = '{"__type__":"Set","data":[1,2,3]}';
      const result = json.parse(str);

      expect(result).toBeInstanceOf(Set);
      expect(Array.from(result as Set<number>)).toEqual([1, 2, 3]);
    });

    it("Map 복원", () => {
      const str = '{"__type__":"Map","data":[["a",1],["b",2]]}';
      const result = json.parse(str);

      expect(result).toBeInstanceOf(Map);
      expect((result as Map<string, number>).get("a")).toBe(1);
    });

    it("Error 복원 (확장 속성 포함)", () => {
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

    it("Uint8Array 복원", () => {
      const str = '{"__type__":"Uint8Array","data":"68656c6c6f"}';
      const result = json.parse(str);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(result as Uint8Array)).toBe("hello");
    });

    it("stringify/parse 왕복 변환", () => {
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

    it("redactBytes로 직렬화된 데이터는 parse 시 오류 발생", () => {
      const obj = { data: new TextEncoder().encode("hello") };
      const str = json.stringify(obj, { redactBytes: true });

      // "__hidden__" is data serialized with redactBytes option, so parse throws error
      expect(() => json.parse<typeof obj>(str)).toThrow("redactBytes");
    });

    it("잘못된 JSON은 오류 발생", () => {
      expect(() => json.parse("invalid json")).toThrow("JSON 파싱");
    });

    it("DEV 모드에서 오류 메시지에 전체 JSON 포함", () => {
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

    it("오류 메시지에 JSON 내용 포함", () => {
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
