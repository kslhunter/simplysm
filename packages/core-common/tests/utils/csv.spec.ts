import { describe, it, expect } from "vitest";
import { CsvConvert } from "@simplysm/core-common";

describe("CsvConvert", () => {
  //#region parse

  describe("parse()", () => {
    it("기본 CSV를 파싱한다", () => {
      const csv = "a,b,c\r\n1,2,3";
      const result = CsvConvert.parse(csv, ",");

      expect(result).toEqual([
        ["a", "b", "c"],
        ["1", "2", "3"],
      ]);
    });

    it("다른 구분자를 사용한다", () => {
      const csv = "a;b;c\r\n1;2;3";
      const result = CsvConvert.parse(csv, ";");

      expect(result).toEqual([
        ["a", "b", "c"],
        ["1", "2", "3"],
      ]);
    });

    it("큰따옴표로 감싼 값을 파싱한다", () => {
      const csv = '"a","b","c"\r\n"1","2","3"';
      const result = CsvConvert.parse(csv, ",");

      expect(result).toEqual([
        ["a", "b", "c"],
        ["1", "2", "3"],
      ]);
    });

    it("큰따옴표 안의 쉼표를 값으로 인식한다", () => {
      const csv = '"a,b",c,d\r\n1,2,3';
      const result = CsvConvert.parse(csv, ",");

      expect(result).toEqual([
        ["a,b", "c", "d"],
        ["1", "2", "3"],
      ]);
    });

    it('큰따옴표 안의 ""를 하나의 "로 파싱한다', () => {
      const csv = '"a""b",c,d\r\n1,2,3';
      const result = CsvConvert.parse(csv, ",");

      expect(result).toEqual([
        ['a"b', "c", "d"],
        ["1", "2", "3"],
      ]);
    });

    it("빈 셀을 undefined로 파싱한다", () => {
      const csv = "a,,c\r\n1,,3";
      const result = CsvConvert.parse(csv, ",");

      expect(result).toEqual([
        ["a", undefined, "c"],
        ["1", undefined, "3"],
      ]);
    });

    it("빈 줄을 건너뛴다", () => {
      const csv = "a,b,c\r\n\r\n1,2,3";
      const result = CsvConvert.parse(csv, ",");

      expect(result).toEqual([
        ["a", "b", "c"],
        ["1", "2", "3"],
      ]);
    });

    it("빈 문자열을 파싱하면 빈 배열을 반환한다", () => {
      const result = CsvConvert.parse("", ",");

      expect(result).toEqual([]);
    });

    it("컬럼 수가 일치하지 않으면 에러를 던진다", () => {
      const csv = "a,b,c\r\n1,2";

      expect(() => CsvConvert.parse(csv, ",")).toThrow("CSV 형식 오류");
    });

    it("값 앞뒤 공백을 제거한다", () => {
      const csv = "  a  ,  b  ,  c  \r\n  1  ,  2  ,  3  ";
      const result = CsvConvert.parse(csv, ",");

      expect(result).toEqual([
        ["a", "b", "c"],
        ["1", "2", "3"],
      ]);
    });

    it("단일 행을 파싱한다", () => {
      const csv = "a,b,c";
      const result = CsvConvert.parse(csv, ",");

      expect(result).toEqual([["a", "b", "c"]]);
    });
  });

  //#endregion
});
