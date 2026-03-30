import { describe, it, expect } from "vitest";
import { primitive, DateTime, DateOnly, Time, Uuid } from "@simplysm/core-common";

describe("primitive utils", () => {
  describe("typeStr()", () => {
    it("string 반환", () => {
      expect(primitive.typeStr("hello")).toBe("string");
    });

    it("number 반환", () => {
      expect(primitive.typeStr(42)).toBe("number");
    });

    it("boolean 반환", () => {
      expect(primitive.typeStr(true)).toBe("boolean");
      expect(primitive.typeStr(false)).toBe("boolean");
    });

    it("DateTime 반환", () => {
      expect(primitive.typeStr(new DateTime())).toBe("DateTime");
    });

    it("DateOnly 반환", () => {
      expect(primitive.typeStr(new DateOnly())).toBe("DateOnly");
    });

    it("Time 반환", () => {
      expect(primitive.typeStr(new Time())).toBe("Time");
    });

    it("Uuid 반환", () => {
      expect(primitive.typeStr(Uuid.generate())).toBe("Uuid");
    });

    it("Uint8Array는 Bytes 반환", () => {
      expect(primitive.typeStr(new Uint8Array([1, 2]))).toBe("Bytes");
    });

    it("지원하지 않는 타입은 오류 발생", () => {
      expect(() => primitive.typeStr({} as never)).toThrow();
    });
  });
});
