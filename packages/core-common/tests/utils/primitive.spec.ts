import { describe, it, expect } from "vitest";
import { getPrimitiveTypeStr, DateTime, DateOnly, Time, Uuid } from "@simplysm/core-common";

describe("primitive utils", () => {
  describe("getPrimitiveTypeStr()", () => {
    it("Returns string", () => {
      expect(getPrimitiveTypeStr("hello")).toBe("string");
    });

    it("Returns number", () => {
      expect(getPrimitiveTypeStr(42)).toBe("number");
    });

    it("Returns boolean", () => {
      expect(getPrimitiveTypeStr(true)).toBe("boolean");
      expect(getPrimitiveTypeStr(false)).toBe("boolean");
    });

    it("Returns DateTime", () => {
      expect(getPrimitiveTypeStr(new DateTime())).toBe("DateTime");
    });

    it("Returns DateOnly", () => {
      expect(getPrimitiveTypeStr(new DateOnly())).toBe("DateOnly");
    });

    it("Returns Time", () => {
      expect(getPrimitiveTypeStr(new Time())).toBe("Time");
    });

    it("Returns Uuid", () => {
      expect(getPrimitiveTypeStr(Uuid.new())).toBe("Uuid");
    });

    it("Uint8Array returns Bytes", () => {
      expect(getPrimitiveTypeStr(new Uint8Array([1, 2]))).toBe("Bytes");
    });

    it("Unsupported type throws error", () => {
      expect(() => getPrimitiveTypeStr({} as never)).toThrow();
    });
  });
});
