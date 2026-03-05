import { describe, it, expect } from "vitest";
import { primitive, DateTime, DateOnly, Time, Uuid } from "@simplysm/core-common";

describe("primitive utils", () => {
  describe("typeStr()", () => {
    it("Returns string", () => {
      expect(primitive.typeStr("hello")).toBe("string");
    });

    it("Returns number", () => {
      expect(primitive.typeStr(42)).toBe("number");
    });

    it("Returns boolean", () => {
      expect(primitive.typeStr(true)).toBe("boolean");
      expect(primitive.typeStr(false)).toBe("boolean");
    });

    it("Returns DateTime", () => {
      expect(primitive.typeStr(new DateTime())).toBe("DateTime");
    });

    it("Returns DateOnly", () => {
      expect(primitive.typeStr(new DateOnly())).toBe("DateOnly");
    });

    it("Returns Time", () => {
      expect(primitive.typeStr(new Time())).toBe("Time");
    });

    it("Returns Uuid", () => {
      expect(primitive.typeStr(Uuid.generate())).toBe("Uuid");
    });

    it("Uint8Array returns Bytes", () => {
      expect(primitive.typeStr(new Uint8Array([1, 2]))).toBe("Bytes");
    });

    it("Unsupported type throws error", () => {
      expect(() => primitive.typeStr({} as never)).toThrow();
    });
  });
});
