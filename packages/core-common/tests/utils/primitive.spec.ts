import { describe, it, expect } from "vitest";
import { getPrimitiveTypeStr, DateTime, DateOnly, Time, Uuid } from "@simplysm/core-common";

describe("primitive utils", () => {
  describe("getPrimitiveTypeStr()", () => {
    it("string을 반환한다", () => {
      expect(getPrimitiveTypeStr("hello")).toBe("string");
    });

    it("number를 반환한다", () => {
      expect(getPrimitiveTypeStr(42)).toBe("number");
    });

    it("boolean을 반환한다", () => {
      expect(getPrimitiveTypeStr(true)).toBe("boolean");
      expect(getPrimitiveTypeStr(false)).toBe("boolean");
    });

    it("DateTime을 반환한다", () => {
      expect(getPrimitiveTypeStr(new DateTime())).toBe("DateTime");
    });

    it("DateOnly를 반환한다", () => {
      expect(getPrimitiveTypeStr(new DateOnly())).toBe("DateOnly");
    });

    it("Time을 반환한다", () => {
      expect(getPrimitiveTypeStr(new Time())).toBe("Time");
    });

    it("Uuid를 반환한다", () => {
      expect(getPrimitiveTypeStr(Uuid.new())).toBe("Uuid");
    });

    it("Uint8Array는 Bytes를 반환한다", () => {
      expect(getPrimitiveTypeStr(new Uint8Array([1, 2]))).toBe("Bytes");
    });

    it("지원하지 않는 타입은 에러를 던진다", () => {
      expect(() => getPrimitiveTypeStr({} as never)).toThrow();
    });
  });
});
