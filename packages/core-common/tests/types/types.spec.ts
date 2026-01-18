import { describe, it, expect } from "vitest";
import { getPrimitiveTypeStr, DateTime, DateOnly, Time, Uuid } from "@simplysm/core-common";

describe("types.ts", () => {
  //#region getPrimitiveTypeStr

  describe("getPrimitiveTypeStr()", () => {
    it("string 타입을 반환한다", () => {
      expect(getPrimitiveTypeStr("hello")).toBe("string");
    });

    it("number 타입을 반환한다", () => {
      expect(getPrimitiveTypeStr(123)).toBe("number");
      expect(getPrimitiveTypeStr(123.45)).toBe("number");
    });

    it("boolean 타입을 반환한다", () => {
      expect(getPrimitiveTypeStr(true)).toBe("boolean");
      expect(getPrimitiveTypeStr(false)).toBe("boolean");
    });

    it("DateTime 타입을 반환한다", () => {
      const dt = new DateTime(2025, 1, 6);
      expect(getPrimitiveTypeStr(dt)).toBe("DateTime");
    });

    it("DateOnly 타입을 반환한다", () => {
      const dateOnly = new DateOnly(2025, 1, 6);
      expect(getPrimitiveTypeStr(dateOnly)).toBe("DateOnly");
    });

    it("Time 타입을 반환한다", () => {
      const time = new Time(15, 30, 45);
      expect(getPrimitiveTypeStr(time)).toBe("Time");
    });

    it("Uuid 타입을 반환한다", () => {
      const uuid = Uuid.new();
      expect(getPrimitiveTypeStr(uuid)).toBe("Uuid");
    });

    it("Bytes 타입을 반환한다", () => {
      const bytes = new Uint8Array([1, 2, 3]);
      expect(getPrimitiveTypeStr(bytes)).toBe("Bytes");
    });

    it("지원하지 않는 타입이면 에러를 던진다", () => {
      expect(() => getPrimitiveTypeStr({} as never)).toThrow("알 수 없는 값 타입");
      expect(() => getPrimitiveTypeStr([] as never)).toThrow("알 수 없는 값 타입");
      expect(() => getPrimitiveTypeStr(null as never)).toThrow("알 수 없는 값 타입");
    });
  });

  //#endregion
});
