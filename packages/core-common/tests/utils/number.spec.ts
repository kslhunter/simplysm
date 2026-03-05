import { describe, it, expect } from "vitest";
import { num } from "@simplysm/core-common";

describe("number utils", () => {
  //#region parseInt

  describe("parseInt()", () => {
    it("Parses negative string", () => {
      expect(num.parseInt("-123")).toBe(-123);
    });

    it("Floating string returns only integer part", () => {
      expect(num.parseInt("123.45")).toBe(123);
    });

    it("Number type discards decimal places", () => {
      expect(num.parseInt(123.7)).toBe(123);
      expect(num.parseInt(123.3)).toBe(123);
    });

    it("Removes non-numeric characters then parses", () => {
      expect(num.parseInt("$1,234")).toBe(1234);
      expect(num.parseInt("abc123")).toBe(123);
    });

    it("Handles minus sign between characters", () => {
      expect(num.parseInt("abc-123def")).toBe(-123);
      expect(num.parseInt("abc-456def")).toBe(-456);
    });

    it("Empty string returns undefined", () => {
      expect(num.parseInt("")).toBe(undefined);
    });

    it("String with no digits returns undefined", () => {
      expect(num.parseInt("abc")).toBe(undefined);
    });

    it("Non-string type returns undefined", () => {
      expect(num.parseInt(null)).toBe(undefined);
      expect(num.parseInt(undefined)).toBe(undefined);
      expect(num.parseInt({})).toBe(undefined);
    });
  });

  //#endregion

  //#region parseRoundedInt

  describe("parseRoundedInt()", () => {
    it("Rounds floating string to integer", () => {
      expect(num.parseRoundedInt("123.5")).toBe(124);
      expect(num.parseRoundedInt("123.4")).toBe(123);
    });

    it("Rounds number type", () => {
      expect(num.parseRoundedInt(123.7)).toBe(124);
    });

    it("Returns undefined if not parseable", () => {
      expect(num.parseRoundedInt("abc")).toBe(undefined);
    });
  });

  //#endregion

  //#region parseFloat

  describe("parseFloat()", () => {
    it("Parses negative floating string", () => {
      expect(num.parseFloat("-123.45")).toBe(-123.45);
    });

    it("Number type returned as-is", () => {
      expect(num.parseFloat(123.45)).toBe(123.45);
    });

    it("Removes non-numeric characters then parses", () => {
      expect(num.parseFloat("$1,234.56")).toBe(1234.56);
    });

    it("Empty string returns undefined", () => {
      expect(num.parseFloat("")).toBe(undefined);
    });

    it("String with no digits returns undefined", () => {
      expect(num.parseFloat("abc")).toBe(undefined);
    });

    it("Non-string type returns undefined", () => {
      expect(num.parseFloat(null)).toBe(undefined);
      expect(num.parseFloat(undefined)).toBe(undefined);
    });
  });

  //#endregion

  //#region format

  describe("format()", () => {
    it("Applies thousands separator", () => {
      expect(num.format(1234567)).toBe("1,234,567");
    });

    it("Applies thousands separator to float", () => {
      const result = num.format(1234567.89);
      expect(result).toContain("1,234,567");
    });

    it("Specifies maximum decimal places", () => {
      expect(num.format(123.456, { max: 2 })).toBe("123.46");
    });

    it("Specifies minimum decimal places", () => {
      expect(num.format(123, { min: 2 })).toBe("123.00");
    });

    it("Specifies both max and min decimal places", () => {
      expect(num.format(123.4, { max: 3, min: 2 })).toBe("123.40");
    });

    it("Undefined returns undefined", () => {
      expect(num.format(undefined)).toBe(undefined);
    });

    it("Formats zero", () => {
      expect(num.format(0)).toBe("0");
    });

    it("Formats negative number", () => {
      expect(num.format(-1234567)).toBe("-1,234,567");
    });
  });

  //#endregion
});
