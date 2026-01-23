import { describe, it, expect } from "vitest";
import { NumberUtils } from "@simplysm/core-common";

describe("NumberUtils", () => {
  //#region parseInt

  describe("parseInt()", () => {
    it("숫자 문자열을 정수로 파싱한다", () => {
      expect(NumberUtils.parseInt("123")).toBe(123);
    });

    it("음수 문자열을 파싱한다", () => {
      expect(NumberUtils.parseInt("-123")).toBe(-123);
    });

    it("실수 문자열은 정수 부분만 반환한다", () => {
      expect(NumberUtils.parseInt("123.45")).toBe(123);
    });

    it("숫자 타입이면 소수점 이하를 버린다", () => {
      expect(NumberUtils.parseInt(123.7)).toBe(123);
      expect(NumberUtils.parseInt(123.3)).toBe(123);
    });

    it("비숫자 문자를 제거 후 파싱한다", () => {
      expect(NumberUtils.parseInt("$1,234")).toBe(1234);
      expect(NumberUtils.parseInt("가나다123")).toBe(123);
    });

    it("빈 문자열이면 undefined를 반환한다", () => {
      expect(NumberUtils.parseInt("")).toBe(undefined);
    });

    it("숫자가 없는 문자열이면 undefined를 반환한다", () => {
      expect(NumberUtils.parseInt("abc")).toBe(undefined);
    });

    it("string이 아닌 타입이면 undefined를 반환한다", () => {
      expect(NumberUtils.parseInt(null)).toBe(undefined);
      expect(NumberUtils.parseInt(undefined)).toBe(undefined);
      expect(NumberUtils.parseInt({})).toBe(undefined);
    });
  });

  //#endregion

  //#region parseRoundedInt

  describe("parseRoundedInt()", () => {
    it("실수 문자열을 반올림하여 정수로 반환한다", () => {
      expect(NumberUtils.parseRoundedInt("123.5")).toBe(124);
      expect(NumberUtils.parseRoundedInt("123.4")).toBe(123);
    });

    it("정수 문자열은 그대로 반환한다", () => {
      expect(NumberUtils.parseRoundedInt("123")).toBe(123);
    });

    it("숫자 타입을 반올림하여 반환한다", () => {
      expect(NumberUtils.parseRoundedInt(123.7)).toBe(124);
    });

    it("파싱 불가능하면 undefined를 반환한다", () => {
      expect(NumberUtils.parseRoundedInt("abc")).toBe(undefined);
    });
  });

  //#endregion

  //#region parseFloat

  describe("parseFloat()", () => {
    it("실수 문자열을 파싱한다", () => {
      expect(NumberUtils.parseFloat("123.45")).toBe(123.45);
    });

    it("정수 문자열을 실수로 파싱한다", () => {
      expect(NumberUtils.parseFloat("123")).toBe(123);
    });

    it("음수 실수 문자열을 파싱한다", () => {
      expect(NumberUtils.parseFloat("-123.45")).toBe(-123.45);
    });

    it("숫자 타입이면 그대로 반환한다", () => {
      expect(NumberUtils.parseFloat(123.45)).toBe(123.45);
    });

    it("비숫자 문자를 제거 후 파싱한다", () => {
      expect(NumberUtils.parseFloat("$1,234.56")).toBe(1234.56);
    });

    it("빈 문자열이면 undefined를 반환한다", () => {
      expect(NumberUtils.parseFloat("")).toBe(undefined);
    });

    it("숫자가 없는 문자열이면 undefined를 반환한다", () => {
      expect(NumberUtils.parseFloat("abc")).toBe(undefined);
    });

    it("string이 아닌 타입이면 undefined를 반환한다", () => {
      expect(NumberUtils.parseFloat(null)).toBe(undefined);
      expect(NumberUtils.parseFloat(undefined)).toBe(undefined);
    });
  });

  //#endregion

  //#region isNullOrEmpty

  describe("isNullOrEmpty()", () => {
    it("undefined이면 true를 반환한다", () => {
      expect(NumberUtils.isNullOrEmpty(undefined)).toBe(true);
    });

    it("0이면 true를 반환한다", () => {
      expect(NumberUtils.isNullOrEmpty(0)).toBe(true);
    });

    it("양수이면 false를 반환한다", () => {
      expect(NumberUtils.isNullOrEmpty(123)).toBe(false);
    });

    it("음수이면 false를 반환한다", () => {
      expect(NumberUtils.isNullOrEmpty(-123)).toBe(false);
    });

    it("실수이면 false를 반환한다", () => {
      expect(NumberUtils.isNullOrEmpty(0.1)).toBe(false);
    });
  });

  //#endregion

  //#region format

  describe("format()", () => {
    it("천단위 구분자를 적용한다", () => {
      expect(NumberUtils.format(1234567)).toBe("1,234,567");
    });

    it("실수에 천단위 구분자를 적용한다", () => {
      const result = NumberUtils.format(1234567.89);
      expect(result).toContain("1,234,567");
    });

    it("최대 소수점 자릿수를 지정한다", () => {
      expect(NumberUtils.format(123.456, { max: 2 })).toBe("123.46");
    });

    it("최소 소수점 자릿수를 지정한다", () => {
      expect(NumberUtils.format(123, { min: 2 })).toBe("123.00");
    });

    it("최대/최소 소수점 자릿수를 함께 지정한다", () => {
      expect(NumberUtils.format(123.4, { max: 3, min: 2 })).toBe("123.40");
    });

    it("undefined이면 undefined를 반환한다", () => {
      expect(NumberUtils.format(undefined)).toBe(undefined);
    });

    it("0을 포맷팅한다", () => {
      expect(NumberUtils.format(0)).toBe("0");
    });

    it("음수를 포맷팅한다", () => {
      expect(NumberUtils.format(-1234567)).toBe("-1,234,567");
    });
  });

  //#endregion
});
