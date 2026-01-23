import { describe, it, expect } from "vitest";
import { JsonConvert, DateTime, DateOnly, Time, Uuid } from "@simplysm/core-common";

describe("JsonConvert", () => {
  //#region stringify

  describe("stringify()", () => {
    it("primitive 값을 직렬화한다", () => {
      expect(JsonConvert.stringify(42)).toBe("42");
      expect(JsonConvert.stringify("hello")).toBe('"hello"');
      expect(JsonConvert.stringify(true)).toBe("true");
      expect(JsonConvert.stringify(null)).toBe("null");
    });

    it("Date를 __type__으로 직렬화한다", () => {
      const date = new Date("2024-03-15T10:30:00.000Z");
      const json = JsonConvert.stringify(date);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("Date");
      expect(parsed.data).toBe("2024-03-15T10:30:00.000Z");
    });

    it("DateTime을 __type__으로 직렬화한다", () => {
      const dt = new DateTime(2024, 3, 15, 10, 30);
      const json = JsonConvert.stringify(dt);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("DateTime");
      expect(typeof parsed.data).toBe("string");
    });

    it("DateOnly를 __type__으로 직렬화한다", () => {
      const d = new DateOnly(2024, 3, 15);
      const json = JsonConvert.stringify(d);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("DateOnly");
    });

    it("Time을 __type__으로 직렬화한다", () => {
      const t = new Time(10, 30, 45);
      const json = JsonConvert.stringify(t);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("Time");
    });

    it("Uuid를 __type__으로 직렬화한다", () => {
      const uuid = new Uuid("12345678-9abc-def0-1234-56789abcdef0");
      const json = JsonConvert.stringify(uuid);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("Uuid");
      expect(parsed.data).toBe("12345678-9abc-def0-1234-56789abcdef0");
    });

    it("Set을 __type__으로 직렬화한다", () => {
      const set = new Set([1, 2, 3]);
      const json = JsonConvert.stringify(set);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("Set");
      expect(parsed.data).toEqual([1, 2, 3]);
    });

    it("Map을 __type__으로 직렬화한다", () => {
      const map = new Map([
        ["a", 1],
        ["b", 2],
      ]);
      const json = JsonConvert.stringify(map);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("Map");
      expect(parsed.data).toEqual([
        ["a", 1],
        ["b", 2],
      ]);
    });

    it("Error를 __type__으로 직렬화한다", () => {
      const error = new Error("test error");
      const json = JsonConvert.stringify(error);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("Error");
      expect(parsed.data.message).toBe("test error");
      expect(parsed.data.name).toBe("Error");
    });

    it("Error의 확장 속성(code, detail, cause)을 직렬화한다", () => {
      const cause = new Error("원인 에러");
      const error = new Error("test error") as Error & { code: string; detail: object };
      error.code = "ERR_CODE";
      error.detail = { key: "value" };
      (error as Error & { cause: Error }).cause = cause;

      const json = JsonConvert.stringify(error);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("Error");
      expect(parsed.data.message).toBe("test error");
      expect(parsed.data.code).toBe("ERR_CODE");
      expect(parsed.data.detail).toEqual({ key: "value" });
      expect(parsed.data.cause.__type__).toBe("Error");
      expect(parsed.data.cause.data.message).toBe("원인 에러");
    });

    it("hideBytes 옵션으로 Uint8Array를 숨긴다", () => {
      const obj = { data: new TextEncoder().encode("hello") };
      const json = JsonConvert.stringify(obj, { hideBytes: true });
      const parsed = JSON.parse(json);

      expect(parsed.data.data).toBe("__hidden__");
    });

    it("space 옵션으로 들여쓰기한다", () => {
      const obj = { a: 1 };
      const json = JsonConvert.stringify(obj, { space: 2 });

      expect(json).toBe('{\n  "a": 1\n}');
    });

    it("replacer 옵션으로 값을 변환한다", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const json = JsonConvert.stringify(obj, {
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
  });

  //#endregion

  //#region parse

  describe("parse()", () => {
    it("primitive 값을 역직렬화한다", () => {
      expect(JsonConvert.parse("42")).toBe(42);
      expect(JsonConvert.parse('"hello"')).toBe("hello");
      expect(JsonConvert.parse("true")).toBe(true);
    });

    it("null을 undefined로 변환한다", () => {
      expect(JsonConvert.parse("null")).toBe(undefined);
    });

    it("Date를 복원한다", () => {
      const json = '{"__type__":"Date","data":"2024-03-15T10:30:00.000Z"}';
      const result = JsonConvert.parse(json);

      expect(result).toBeInstanceOf(Date);
      expect((result as Date).toISOString()).toBe("2024-03-15T10:30:00.000Z");
    });

    it("DateTime을 복원한다", () => {
      const dt = new DateTime(2024, 3, 15, 10, 30);
      const json = JsonConvert.stringify(dt);
      const result = JsonConvert.parse(json);

      expect(result).toBeInstanceOf(DateTime);
      expect((result as DateTime).year).toBe(2024);
      expect((result as DateTime).month).toBe(3);
      expect((result as DateTime).day).toBe(15);
    });

    it("DateOnly를 복원한다", () => {
      const d = new DateOnly(2024, 3, 15);
      const json = JsonConvert.stringify(d);
      const result = JsonConvert.parse(json);

      expect(result).toBeInstanceOf(DateOnly);
      expect((result as DateOnly).year).toBe(2024);
    });

    it("Time을 복원한다", () => {
      const t = new Time(10, 30, 45);
      const json = JsonConvert.stringify(t);
      const result = JsonConvert.parse(json);

      expect(result).toBeInstanceOf(Time);
      expect((result as Time).hour).toBe(10);
    });

    it("Uuid를 복원한다", () => {
      const json = '{"__type__":"Uuid","data":"12345678-9abc-def0-1234-56789abcdef0"}';
      const result = JsonConvert.parse(json);

      expect(result).toBeInstanceOf(Uuid);
      expect((result as Uuid).toString()).toBe("12345678-9abc-def0-1234-56789abcdef0");
    });

    it("Set을 복원한다", () => {
      const json = '{"__type__":"Set","data":[1,2,3]}';
      const result = JsonConvert.parse(json);

      expect(result).toBeInstanceOf(Set);
      expect(Array.from(result as Set<number>)).toEqual([1, 2, 3]);
    });

    it("Map을 복원한다", () => {
      const json = '{"__type__":"Map","data":[["a",1],["b",2]]}';
      const result = JsonConvert.parse(json);

      expect(result).toBeInstanceOf(Map);
      expect((result as Map<string, number>).get("a")).toBe(1);
    });

    it("Error를 복원한다 (확장 속성 포함)", () => {
      const cause = new Error("원인 에러");
      const error = new Error("test error") as Error & { code: string; detail: object; cause: Error };
      error.code = "ERR_CODE";
      error.detail = { key: "value" };
      error.cause = cause;

      const json = JsonConvert.stringify(error);
      const result = JsonConvert.parse<typeof error>(json);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe("test error");
      expect(result.code).toBe("ERR_CODE");
      expect(result.detail).toEqual({ key: "value" });
      expect(result.cause).toBeInstanceOf(Error);
      expect(result.cause.message).toBe("원인 에러");
    });

    it("Uint8Array를 복원한다", () => {
      const json = '{"__type__":"Uint8Array","data":"68656c6c6f"}';
      const result = JsonConvert.parse(json);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(result as Uint8Array)).toBe("hello");
    });

    it("stringify/parse 라운드트립", () => {
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

      const json = JsonConvert.stringify(original);
      const result = JsonConvert.parse<typeof original>(json);

      expect(result.date).toBeInstanceOf(Date);
      expect(result.dateTime).toBeInstanceOf(DateTime);
      expect(result.dateOnly).toBeInstanceOf(DateOnly);
      expect(result.time).toBeInstanceOf(Time);
      expect(result.uuid).toBeInstanceOf(Uuid);
      expect(result.set).toBeInstanceOf(Set);
      expect(result.map).toBeInstanceOf(Map);
      expect(result.bytes).toBeInstanceOf(Uint8Array);
    });

    it("hideBytes로 직렬화된 데이터는 parse 시 에러가 발생한다", () => {
      const obj = { data: new TextEncoder().encode("hello") };
      const json = JsonConvert.stringify(obj, { hideBytes: true });

      // "__hidden__"은 hideBytes 옵션으로 직렬화된 데이터이므로 parse 시 에러 발생
      expect(() => JsonConvert.parse<typeof obj>(json)).toThrow(
        "hideBytes 옵션으로 직렬화된 Uint8Array는 parse로 복원할 수 없습니다",
      );
    });

    it("잘못된 JSON은 에러를 던진다", () => {
      expect(() => JsonConvert.parse("invalid json")).toThrow("JSON 파싱 에러");
    });

    it("DEV 모드에서는 전체 JSON이 에러 메시지에 포함된다", () => {
      const longJson = "x".repeat(2000);

      try {
        JsonConvert.parse(longJson);
        expect.fail("에러가 발생해야 합니다");
      } catch (err) {
        const message = (err as Error).message;
        // DEV 모드에서는 전체 JSON이 포함됨
        expect(message).toContain(longJson);
      }
    });

    it("에러 메시지에 JSON 내용이 포함된다", () => {
      const shortJson = "invalid";

      try {
        JsonConvert.parse(shortJson);
        expect.fail("에러가 발생해야 합니다");
      } catch (err) {
        const message = (err as Error).message;
        expect(message).toContain("invalid");
      }
    });
  });

  //#endregion
});
