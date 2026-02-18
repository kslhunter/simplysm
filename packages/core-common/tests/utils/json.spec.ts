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
    it("primitive 값을 직렬화한다", () => {
      expect(stringify(42)).toBe("42");
      expect(stringify("hello")).toBe('"hello"');
      expect(stringify(true)).toBe("true");
      expect(stringify(null)).toBe("null");
    });

    it("Date를 __type__으로 직렬화한다", () => {
      const date = new Date("2024-03-15T10:30:00.000Z");
      const json = stringify(date);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("Date");
      expect(parsed.data).toBe("2024-03-15T10:30:00.000Z");
    });

    it("DateTime을 __type__으로 직렬화한다", () => {
      const dt = new DateTime(2024, 3, 15, 10, 30);
      const json = stringify(dt);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("DateTime");
      expect(typeof parsed.data).toBe("string");
    });

    it("DateOnly를 __type__으로 직렬화한다", () => {
      const d = new DateOnly(2024, 3, 15);
      const json = stringify(d);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("DateOnly");
    });

    it("Time을 __type__으로 직렬화한다", () => {
      const t = new Time(10, 30, 45);
      const json = stringify(t);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("Time");
    });

    it("Uuid를 __type__으로 직렬화한다", () => {
      const uuid = new Uuid("12345678-9abc-def0-1234-56789abcdef0");
      const json = stringify(uuid);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("Uuid");
      expect(parsed.data).toBe("12345678-9abc-def0-1234-56789abcdef0");
    });

    it("Set을 __type__으로 직렬화한다", () => {
      const set = new Set([1, 2, 3]);
      const json = stringify(set);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("Set");
      expect(parsed.data).toEqual([1, 2, 3]);
    });

    it("Map을 __type__으로 직렬화한다", () => {
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

    it("Error를 __type__으로 직렬화한다", () => {
      const error = new Error("test error");
      const json = stringify(error);
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

      const json = stringify(error);
      const parsed = JSON.parse(json);

      expect(parsed.__type__).toBe("Error");
      expect(parsed.data.message).toBe("test error");
      expect(parsed.data.code).toBe("ERR_CODE");
      expect(parsed.data.detail).toEqual({ key: "value" });
      expect(parsed.data.cause.__type__).toBe("Error");
      expect(parsed.data.cause.data.message).toBe("원인 에러");
    });

    it("redactBytes 옵션으로 Uint8Array를 숨긴다", () => {
      const obj = { data: new TextEncoder().encode("hello") };
      const json = stringify(obj, { redactBytes: true });
      const parsed = JSON.parse(json);

      expect(parsed.data.data).toBe("__hidden__");
    });

    it("space 옵션으로 들여쓰기한다", () => {
      const obj = { a: 1 };
      const json = stringify(obj, { space: 2 });

      expect(json).toBe('{\n  "a": 1\n}');
    });

    it("replacer 옵션으로 값을 변환한다", () => {
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

    it("동시 호출 시 경쟁 조건이 발생하지 않는다", async () => {
      // 여러 Date 객체를 포함한 복잡한 객체들을 동시에 직렬화
      const createTestObject = (id: number) => ({
        id,
        date: new Date(`2024-0${(id % 9) + 1}-15T10:30:00.000Z`),
        nested: {
          innerDate: new Date(`2024-0${(id % 9) + 1}-20T15:45:00.000Z`),
        },
        array: [new Date(`2024-0${(id % 9) + 1}-25T08:00:00.000Z`)],
      });

      // 100개의 동시 호출
      const promises = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve().then(() => {
          const obj = createTestObject(i);
          const json = stringify(obj);
          const parsed = parse<typeof obj>(json);

          // 모든 Date가 올바르게 복원되었는지 확인
          expect(parsed.date).toBeInstanceOf(Date);
          expect(parsed.nested.innerDate).toBeInstanceOf(Date);
          expect(parsed.array[0]).toBeInstanceOf(Date);

          return { id: i, success: true };
        }),
      );

      const results = await Promise.all(promises);

      // 모든 호출이 성공했는지 확인
      expect(results.every((r) => r.success)).toBe(true);
    });

    it("중첩된 Date 객체를 올바르게 직렬화한다", () => {
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

    it("Date.prototype.toJSON을 수정하지 않는다", () => {
      const originalToJSON = Date.prototype.toJSON;

      // stringify 호출
      const date = new Date("2024-03-15T10:30:00.000Z");
      stringify({ date });

      // toJSON이 변경되지 않았는지 확인
      expect(Date.prototype.toJSON).toBe(originalToJSON);
    });

    it("순환 참조 객체는 TypeError를 던진다", () => {
      const obj: Record<string, unknown> = { name: "test" };
      obj["self"] = obj; // 순환 참조

      expect(() => stringify(obj)).toThrow(TypeError);
      expect(() => stringify(obj)).toThrow("Converting circular structure to JSON");
    });

    it("배열 내 순환 참조도 감지한다", () => {
      const arr: unknown[] = [1, 2];
      arr.push(arr); // 배열 순환 참조

      expect(() => stringify(arr)).toThrow("Converting circular structure to JSON");
    });

    it("toJSON 메서드를 가진 커스텀 객체를 직렬화한다", () => {
      const obj = {
        amount: 100,
        toJSON() {
          return `$${this.amount}`;
        },
      };

      const json = stringify(obj);
      expect(json).toBe('"$100"');
    });

    it("toJSON이 객체를 반환하면 재귀적으로 처리한다", () => {
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

    it("getter 속성을 직렬화한다", () => {
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

    it("빈 객체와 배열을 직렬화한다", () => {
      expect(stringify({})).toBe("{}");
      expect(stringify([])).toBe("[]");
      expect(stringify({ arr: [], obj: {} })).toBe('{"arr":[],"obj":{}}');
    });

    it("undefined 값을 가진 속성은 제외된다", () => {
      const obj = { a: 1, b: undefined, c: 3 };
      const json = stringify(obj);
      const parsed = JSON.parse(json);

      expect(parsed.a).toBe(1);
      expect("b" in parsed).toBe(false);
      expect(parsed.c).toBe(3);
    });

    it("성능이 합리적인 시간 내에 완료된다", () => {
      // 복잡한 테스트 객체 생성
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

      // jsonStringify 성능 측정
      const startCustom = performance.now();
      for (let i = 0; i < iterations; i++) {
        stringify(testObj);
      }
      const customTime = performance.now() - startCustom;

      // 1000회 직렬화가 100ms 이내에 완료되어야 함
      // (커스텀 타입 처리, 순환 참조 감지 등 추가 기능 포함)
      expect(customTime).toBeLessThan(100);
    });
  });

  //#endregion

  //#region parse

  describe("parse()", () => {
    it("primitive 값을 역직렬화한다", () => {
      expect(parse("42")).toBe(42);
      expect(parse('"hello"')).toBe("hello");
      expect(parse("true")).toBe(true);
    });

    it("null을 undefined로 변환한다", () => {
      expect(parse("null")).toBe(undefined);
    });

    it("Date를 복원한다", () => {
      const json = '{"__type__":"Date","data":"2024-03-15T10:30:00.000Z"}';
      const result = parse(json);

      expect(result).toBeInstanceOf(Date);
      expect((result as Date).toISOString()).toBe("2024-03-15T10:30:00.000Z");
    });

    it("DateTime을 복원한다", () => {
      const dt = new DateTime(2024, 3, 15, 10, 30);
      const json = stringify(dt);
      const result = parse(json);

      expect(result).toBeInstanceOf(DateTime);
      expect((result as DateTime).year).toBe(2024);
      expect((result as DateTime).month).toBe(3);
      expect((result as DateTime).day).toBe(15);
    });

    it("DateOnly를 복원한다", () => {
      const d = new DateOnly(2024, 3, 15);
      const json = stringify(d);
      const result = parse(json);

      expect(result).toBeInstanceOf(DateOnly);
      expect((result as DateOnly).year).toBe(2024);
    });

    it("Time을 복원한다", () => {
      const t = new Time(10, 30, 45);
      const json = stringify(t);
      const result = parse(json);

      expect(result).toBeInstanceOf(Time);
      expect((result as Time).hour).toBe(10);
    });

    it("Uuid를 복원한다", () => {
      const json = '{"__type__":"Uuid","data":"12345678-9abc-def0-1234-56789abcdef0"}';
      const result = parse(json);

      expect(result).toBeInstanceOf(Uuid);
      expect((result as Uuid).toString()).toBe("12345678-9abc-def0-1234-56789abcdef0");
    });

    it("Set을 복원한다", () => {
      const json = '{"__type__":"Set","data":[1,2,3]}';
      const result = parse(json);

      expect(result).toBeInstanceOf(Set);
      expect(Array.from(result as Set<number>)).toEqual([1, 2, 3]);
    });

    it("Map을 복원한다", () => {
      const json = '{"__type__":"Map","data":[["a",1],["b",2]]}';
      const result = parse(json);

      expect(result).toBeInstanceOf(Map);
      expect((result as Map<string, number>).get("a")).toBe(1);
    });

    it("Error를 복원한다 (확장 속성 포함)", () => {
      const cause = new Error("원인 에러");
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
      expect(result.cause.message).toBe("원인 에러");
    });

    it("Uint8Array를 복원한다", () => {
      const json = '{"__type__":"Uint8Array","data":"68656c6c6f"}';
      const result = parse(json);

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

    it("redactBytes로 직렬화된 데이터는 parse 시 에러가 발생한다", () => {
      const obj = { data: new TextEncoder().encode("hello") };
      const json = stringify(obj, { redactBytes: true });

      // "__hidden__"은 redactBytes 옵션으로 직렬화된 데이터이므로 parse 시 에러 발생
      expect(() => parse<typeof obj>(json)).toThrow(
        "redactBytes 옵션으로 직렬화된 Uint8Array는 parse로 복원할 수 없습니다",
      );
    });

    it("잘못된 JSON은 에러를 던진다", () => {
      expect(() => parse("invalid json")).toThrow("JSON 파싱 에러");
    });

    it("DEV 모드에서는 전체 JSON이 에러 메시지에 포함된다", () => {
      const longJson = "x".repeat(2000);

      try {
        parse(longJson);
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
        parse(shortJson);
        expect.fail("에러가 발생해야 합니다");
      } catch (err) {
        const message = (err as Error).message;
        expect(message).toContain("invalid");
      }
    });
  });

  //#endregion
});
