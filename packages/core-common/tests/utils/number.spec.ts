import { describe, it, expect } from "vitest";
import {
  numParseInt as parseInt,
  numParseRoundedInt as parseRoundedInt,
  numParseFloat as parseFloat,
  numFormat as format,
} from "@simplysm/core-common";

describe("number utils", () => {
  //#region numParseInt

  describe("numParseInt()", () => {
    it("Parses numeric string to integer", () => {
      expect(parseInt("123")).toBe(123);
    });

    it("Parses negative string", () => {
      expect(parseInt("-123")).toBe(-123);
    });

    it("Floating string returns only integer part", () => {
      expect(parseInt("123.45")).toBe(123);
    });

    it("Number type discards decimal places", () => {
      expect(parseInt(123.7)).toBe(123);
      expect(parseInt(123.3)).toBe(123);
    });

    it("Removes non-numeric characters then parses", () => {
      expect(parseInt("$1,234")).toBe(1234);
      expect(parseInt("abc123")).toBe(123);
    });

    it("Handles minus sign between characters", () => {
      expect(parseInt("abc-123def")).toBe(-123);
      expect(parseInt("abc-456def")).toBe(-456);
    });

    it("Empty string returns undefined", () => {
      expect(parseInt("")).toBe(undefined);
    });

    it("String with no digits returns undefined", () => {
      expect(parseInt("abc")).toBe(undefined);
    });

    it("Non-string type returns undefined", () => {
      expect(parseInt(null)).toBe(undefined);
      expect(parseInt(undefined)).toBe(undefined);
      expect(parseInt({})).toBe(undefined);
    });
  });

  //#endregion

  //#region numParseRoundedInt

  describe("numParseRoundedInt()", () => {
    it("Rounds floating string to integer", () => {
      expect(parseRoundedInt("123.5")).toBe(124);
      expect(parseRoundedInt("123.4")).toBe(123);
    });

    it("Integer string returned as-is", () => {
      expect(parseRoundedInt("123")).toBe(123);
    });

    it("Rounds number type", () => {
      expect(parseRoundedInt(123.7)).toBe(124);
    });

    it("Returns undefined if not parseable", () => {
      expect(parseRoundedInt("abc")).toBe(undefined);
    });
  });

  //#endregion

  //#region numParseFloat

  describe("numParseFloat()", () => {
    it("Parses floating string", () => {
      expect(parseFloat("123.45")).toBe(123.45);
    });

    it("Parses integer string as float", () => {
      expect(parseFloat("123")).toBe(123);
    });

    it("Parses negative floating string", () => {
      expect(parseFloat("-123.45")).toBe(-123.45);
    });

    it("Number type returned as-is", () => {
      expect(parseFloat(123.45)).toBe(123.45);
    });

    it("Removes non-numeric characters then parses", () => {
      expect(parseFloat("$1,234.56")).toBe(1234.56);
    });

    it("Empty string returns undefined", () => {
      expect(parseFloat("")).toBe(undefined);
    });

    it("String with no digits returns undefined", () => {
      expect(parseFloat("abc")).toBe(undefined);
    });

    it("Non-string type returns undefined", () => {
      expect(parseFloat(null)).toBe(undefined);
      expect(parseFloat(undefined)).toBe(undefined);
    });
  });

  //#endregion

  //#region numFormat

  describe("numFormat()", () => {
    it("Applies thousands separator", () => {
      expect(format(1234567)).toBe("1,234,567");
    });

    it("Applies thousands separator to float", () => {
      const result = format(1234567.89);
      expect(result).toContain("1,234,567");
    });

    it("Specifies maximum decimal places", () => {
      expect(format(123.456, { max: 2 })).toBe("123.46");
    });

    it("Specifies minimum decimal places", () => {
      expect(format(123, { min: 2 })).toBe("123.00");
    });

    it("Specifies both max and min decimal places", () => {
      expect(format(123.4, { max: 3, min: 2 })).toBe("123.40");
    });

    it("Undefined returns undefined", () => {
      expect(format(undefined)).toBe(undefined);
    });

    it("Formats zero", () => {
      expect(format(0)).toBe("0");
    });

    it("Formats negative number", () => {
      expect(format(-1234567)).toBe("-1,234,567");
    });
  });

  //#endregion
});
