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
    it("숫자 문자열을 정수로 파싱한다", () => {
      expect(parseInt("123")).toBe(123);
    });

    it("음수 문자열을 파싱한다", () => {
      expect(parseInt("-123")).toBe(-123);
    });

    it("실수 문자열은 정수 부분만 반환한다", () => {
      expect(parseInt("123.45")).toBe(123);
    });

    it("숫자 타입이면 소수점 이하를 버린다", () => {
      expect(parseInt(123.7)).toBe(123);
      expect(parseInt(123.3)).toBe(123);
    });

    it("비숫자 문자를 제거 후 파싱한다", () => {
      expect(parseInt("$1,234")).toBe(1234);
      expect(parseInt("가나다123")).toBe(123);
    });

    it("문자 사이의 음수 부호를 처리한다", () => {
      expect(parseInt("가-123나")).toBe(-123);
      expect(parseInt("abc-456def")).toBe(-456);
    });

    it("빈 문자열이면 undefined를 반환한다", () => {
      expect(parseInt("")).toBe(undefined);
    });

    it("숫자가 없는 문자열이면 undefined를 반환한다", () => {
      expect(parseInt("abc")).toBe(undefined);
    });

    it("string이 아닌 타입이면 undefined를 반환한다", () => {
      expect(parseInt(null)).toBe(undefined);
      expect(parseInt(undefined)).toBe(undefined);
      expect(parseInt({})).toBe(undefined);
    });
  });

  //#endregion

  //#region numParseRoundedInt

  describe("numParseRoundedInt()", () => {
    it("실수 문자열을 반올림하여 정수로 반환한다", () => {
      expect(parseRoundedInt("123.5")).toBe(124);
      expect(parseRoundedInt("123.4")).toBe(123);
    });

    it("정수 문자열은 그대로 반환한다", () => {
      expect(parseRoundedInt("123")).toBe(123);
    });

    it("숫자 타입을 반올림하여 반환한다", () => {
      expect(parseRoundedInt(123.7)).toBe(124);
    });

    it("파싱 불가능하면 undefined를 반환한다", () => {
      expect(parseRoundedInt("abc")).toBe(undefined);
    });
  });

  //#endregion

  //#region numParseFloat

  describe("numParseFloat()", () => {
    it("실수 문자열을 파싱한다", () => {
      expect(parseFloat("123.45")).toBe(123.45);
    });

    it("정수 문자열을 실수로 파싱한다", () => {
      expect(parseFloat("123")).toBe(123);
    });

    it("음수 실수 문자열을 파싱한다", () => {
      expect(parseFloat("-123.45")).toBe(-123.45);
    });

    it("숫자 타입이면 그대로 반환한다", () => {
      expect(parseFloat(123.45)).toBe(123.45);
    });

    it("비숫자 문자를 제거 후 파싱한다", () => {
      expect(parseFloat("$1,234.56")).toBe(1234.56);
    });

    it("빈 문자열이면 undefined를 반환한다", () => {
      expect(parseFloat("")).toBe(undefined);
    });

    it("숫자가 없는 문자열이면 undefined를 반환한다", () => {
      expect(parseFloat("abc")).toBe(undefined);
    });

    it("string이 아닌 타입이면 undefined를 반환한다", () => {
      expect(parseFloat(null)).toBe(undefined);
      expect(parseFloat(undefined)).toBe(undefined);
    });
  });

  //#endregion

  //#region numFormat

  describe("numFormat()", () => {
    it("천단위 구분자를 적용한다", () => {
      expect(format(1234567)).toBe("1,234,567");
    });

    it("실수에 천단위 구분자를 적용한다", () => {
      const result = format(1234567.89);
      expect(result).toContain("1,234,567");
    });

    it("최대 소수점 자릿수를 지정한다", () => {
      expect(format(123.456, { max: 2 })).toBe("123.46");
    });

    it("최소 소수점 자릿수를 지정한다", () => {
      expect(format(123, { min: 2 })).toBe("123.00");
    });

    it("최대/최소 소수점 자릿수를 함께 지정한다", () => {
      expect(format(123.4, { max: 3, min: 2 })).toBe("123.40");
    });

    it("undefined이면 undefined를 반환한다", () => {
      expect(format(undefined)).toBe(undefined);
    });

    it("0을 포맷팅한다", () => {
      expect(format(0)).toBe("0");
    });

    it("음수를 포맷팅한다", () => {
      expect(format(-1234567)).toBe("-1,234,567");
    });
  });

  //#endregion
});
