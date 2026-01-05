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

    it("hideBuffer 옵션으로 Buffer를 숨긴다", () => {
      const obj = { data: Buffer.from("hello") };
      const json = JsonConvert.stringify(obj, { hideBuffer: true });
      const parsed = JSON.parse(json);

      expect(parsed.data.data).toBe("__hidden__");
    });

    it("space 옵션으로 들여쓰기한다", () => {
      const obj = { a: 1 };
      const json = JsonConvert.stringify(obj, { space: 2 });

      expect(json).toBe('{\n  "a": 1\n}');
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

    it("Buffer를 복원한다", () => {
      const json = '{"type":"Buffer","data":[104,101,108,108,111]}';
      const result = JsonConvert.parse(json);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect((result as Buffer).toString()).toBe("hello");
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
        buffer: Buffer.from("hello"),
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
      expect(Buffer.isBuffer(result.buffer)).toBe(true);
    });

    it("잘못된 JSON은 에러를 던진다", () => {
      expect(() => JsonConvert.parse("invalid json")).toThrow("JSON 파싱 에러");
    });
  });

  //#endregion
});
