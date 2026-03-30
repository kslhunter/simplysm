import { describe, it, expect } from "vitest";
import { num } from "@simplysm/core-common";

describe("number utils", () => {
  //#region parseInt

  describe("parseInt()", () => {
    it("음수 문자열 파싱", () => {
      expect(num.parseInt("-123")).toBe(-123);
    });

    it("소수 문자열은 정수 부분만 반환", () => {
      expect(num.parseInt("123.45")).toBe(123);
    });

    it("숫자 타입은 소수점 이하 버림", () => {
      expect(num.parseInt(123.7)).toBe(123);
      expect(num.parseInt(123.3)).toBe(123);
    });

    it("비숫자 문자 제거 후 파싱", () => {
      expect(num.parseInt("$1,234")).toBe(1234);
      expect(num.parseInt("abc123")).toBe(123);
    });

    it("문자 사이 마이너스 기호 처리", () => {
      expect(num.parseInt("abc-123def")).toBe(-123);
      expect(num.parseInt("abc-456def")).toBe(-456);
    });

    it("빈 문자열은 undefined 반환", () => {
      expect(num.parseInt("")).toBe(undefined);
    });

    it("숫자 없는 문자열은 undefined 반환", () => {
      expect(num.parseInt("abc")).toBe(undefined);
    });

    it("비문자열 타입은 undefined 반환", () => {
      expect(num.parseInt(null)).toBe(undefined);
      expect(num.parseInt(undefined)).toBe(undefined);
      expect(num.parseInt({})).toBe(undefined);
    });
  });

  //#endregion

  //#region parseRoundedInt

  describe("parseRoundedInt()", () => {
    it("소수 문자열을 정수로 반올림", () => {
      expect(num.parseRoundedInt("123.5")).toBe(124);
      expect(num.parseRoundedInt("123.4")).toBe(123);
    });

    it("숫자 타입 반올림", () => {
      expect(num.parseRoundedInt(123.7)).toBe(124);
    });

    it("파싱 불가능 시 undefined 반환", () => {
      expect(num.parseRoundedInt("abc")).toBe(undefined);
    });
  });

  //#endregion

  //#region parseFloat

  describe("parseFloat()", () => {
    it("음수 소수 문자열 파싱", () => {
      expect(num.parseFloat("-123.45")).toBe(-123.45);
    });

    it("숫자 타입은 그대로 반환", () => {
      expect(num.parseFloat(123.45)).toBe(123.45);
    });

    it("비숫자 문자 제거 후 파싱", () => {
      expect(num.parseFloat("$1,234.56")).toBe(1234.56);
    });

    it("빈 문자열은 undefined 반환", () => {
      expect(num.parseFloat("")).toBe(undefined);
    });

    it("숫자 없는 문자열은 undefined 반환", () => {
      expect(num.parseFloat("abc")).toBe(undefined);
    });

    it("비문자열 타입은 undefined 반환", () => {
      expect(num.parseFloat(null)).toBe(undefined);
      expect(num.parseFloat(undefined)).toBe(undefined);
    });
  });

  //#endregion

  //#region format

  describe("format()", () => {
    it("천 단위 구분자 적용", () => {
      expect(num.format(1234567)).toBe("1,234,567");
    });

    it("소수에 천 단위 구분자 적용", () => {
      const result = num.format(1234567.89);
      expect(result).toContain("1,234,567");
    });

    it("최대 소수 자릿수 지정", () => {
      expect(num.format(123.456, { max: 2 })).toBe("123.46");
    });

    it("최소 소수 자릿수 지정", () => {
      expect(num.format(123, { min: 2 })).toBe("123.00");
    });

    it("최대 및 최소 소수 자릿수 지정", () => {
      expect(num.format(123.4, { max: 3, min: 2 })).toBe("123.40");
    });

    it("Undefined는 undefined 반환", () => {
      expect(num.format(undefined)).toBe(undefined);
    });

    it("0 포맷", () => {
      expect(num.format(0)).toBe("0");
    });

    it("음수 포맷", () => {
      expect(num.format(-1234567)).toBe("-1,234,567");
    });
  });

  //#endregion
});
