import { describe, expect, it } from "vitest";
import { parseSearchQuery } from "../../src/exec/search-parser";

describe("parseSearchQuery", () => {
  //#region ========== Basic behavior ==========

  describe("기본 동작", () => {
    it("빈 문자열 → 빈 결과", () => {
      expect(parseSearchQuery("")).toEqual({ or: [], must: [], not: [] });
      expect(parseSearchQuery("   ")).toEqual({ or: [], must: [], not: [] });
    });

    it("단일 단어 → or 배열에 LIKE 패턴 추가", () => {
      expect(parseSearchQuery("Apple")).toEqual({
        or: ["%Apple%"],
        must: [],
        not: [],
      });
    });

    it("복수 단어 (공백 구분) → OR 조건", () => {
      expect(parseSearchQuery("사과 바나나")).toEqual({
        or: ["%사과%", "%바나나%"],
        must: [],
        not: [],
      });
    });
  });

  //#endregion

  //#region ========== Prefixes ==========

  describe("접두사", () => {
    it("+ prefix → must (AND condition)", () => {
      expect(parseSearchQuery("+사과")).toEqual({
        or: [],
        must: ["%사과%"],
        not: [],
      });
    });

    it("- prefix → not (NOT condition)", () => {
      expect(parseSearchQuery("-바나나")).toEqual({
        or: [],
        must: [],
        not: ["%바나나%"],
      });
    });

    it("혼합 접두사", () => {
      expect(parseSearchQuery("사과 +딸기 -바나나")).toEqual({
        or: ["%사과%"],
        must: ["%딸기%"],
        not: ["%바나나%"],
      });
    });

    it("접두사만 있을 때 무시", () => {
      expect(parseSearchQuery("+ - ")).toEqual({ or: [], must: [], not: [] });
      expect(parseSearchQuery("+ 사과")).toEqual({ or: ["%사과%"], must: [], not: [] });
    });

    it("연속 접두사", () => {
      // First prefix is processed, remaining are included as literal
      expect(parseSearchQuery("++term")).toEqual({
        or: [],
        must: ["%+term%"], // + prefix processed, "+term" remains as literal including +
        not: [],
      });
      expect(parseSearchQuery("--word")).toEqual({
        or: [],
        must: [],
        not: ["%-word%"], // - prefix processed, "-word" remains as literal including -
      });
    });
  });

  //#endregion

  //#region ========== Quotes ==========

  describe("따옴표", () => {
    it("따옴표 구문 → must (정확한 매칭)", () => {
      expect(parseSearchQuery('"Delicious Fruit"')).toEqual({
        or: [],
        must: ["%Delicious Fruit%"],
        not: [],
      });
    });

    it("+quote → must", () => {
      expect(parseSearchQuery('+"Delicious Fruit"')).toEqual({
        or: [],
        must: ["%Delicious Fruit%"],
        not: [],
      });
    });

    it("-quote → not", () => {
      expect(parseSearchQuery('-"Delicious Fruit"')).toEqual({
        or: [],
        must: [],
        not: ["%Delicious Fruit%"],
      });
    });

    it("빈 따옴표 무시", () => {
      expect(parseSearchQuery('""')).toEqual({ or: [], must: [], not: [] });
      expect(parseSearchQuery('"  "')).toEqual({ or: [], must: [], not: [] });
    });

    it("따옴표와 일반 단어 혼합", () => {
      expect(parseSearchQuery('사과 "Delicious Fruit" 바나나')).toEqual({
        or: ["%사과%", "%바나나%"],
        must: ["%Delicious Fruit%"],
        not: [],
      });
    });
  });

  //#endregion

  //#region ========== Wildcards ==========

  describe("와일드카드", () => {
    it("* at start → search by suffix", () => {
      expect(parseSearchQuery("*사과")).toEqual({
        or: ["%사과"],
        must: [],
        not: [],
      });
    });

    it("* at end → search by prefix", () => {
      expect(parseSearchQuery("사과*")).toEqual({
        or: ["사과%"],
        must: [],
        not: [],
      });
    });

    it("* in middle → middle wildcard", () => {
      expect(parseSearchQuery("사*과")).toEqual({
        or: ["사%과"],
        must: [],
        not: [],
      });
    });
  });

  //#endregion

  //#region ========== Escaping ==========

  describe("이스케이핑", () => {
    it("\\* → literal *", () => {
      expect(parseSearchQuery("app\\*test")).toEqual({
        or: ["%app*test%"],
        must: [],
        not: [],
      });
    });

    it("\\% → SQL LIKE \\%", () => {
      expect(parseSearchQuery("100\\%")).toEqual({
        or: ["%100\\%%"],
        must: [],
        not: [],
      });
    });

    it('\\" → literal "', () => {
      expect(parseSearchQuery('\\"test\\"')).toEqual({
        or: ['%"test"%'],
        must: [],
        not: [],
      });
    });

    it("\\+ → literal + (not prefix)", () => {
      expect(parseSearchQuery("\\+positive")).toEqual({
        or: ["%+positive%"],
        must: [],
        not: [],
      });
    });

    it("\\- → literal - (not prefix)", () => {
      expect(parseSearchQuery("\\-negative")).toEqual({
        or: ["%-negative%"],
        must: [],
        not: [],
      });
    });

    it("\\\\ → literal \\", () => {
      expect(parseSearchQuery("path\\\\to\\\\file")).toEqual({
        or: ["%path\\\\to\\\\file%"],
        must: [],
        not: [],
      });
    });
  });

  //#endregion

  //#region ========== SQL special characters ==========

  describe("SQL 특수 문자 이스케이핑", () => {
    it("_ → \\_ (SQL LIKE escape)", () => {
      expect(parseSearchQuery("file_name")).toEqual({
        or: ["%file\\_name%"],
        must: [],
        not: [],
      });
    });

    it("% → \\% (SQL LIKE escape)", () => {
      expect(parseSearchQuery("100%")).toEqual({
        or: ["%100\\%%"],
        must: [],
        not: [],
      });
    });

    it("[ → \\[ (SQL LIKE escape)", () => {
      expect(parseSearchQuery("array[0]")).toEqual({
        or: ["%array\\[0]%"],
        must: [],
        not: [],
      });
    });
  });

  //#endregion

  //#region ========== Complex search ==========

  describe("복합 검색", () => {
    it("TSDoc 예제: 일반 + 따옴표 + 제외 + 필수", () => {
      expect(parseSearchQuery('사과 "Delicious Fruit" -바나나 +딸기')).toEqual({
        or: ["%사과%"],
        must: ["%Delicious Fruit%", "%딸기%"],
        not: ["%바나나%"],
      });
    });

    it("와일드카드와 일반 단어 혼합", () => {
      expect(parseSearchQuery("app* test")).toEqual({
        or: ["app%", "%test%"],
        must: [],
        not: [],
      });
    });

    it("모든 요소 혼합", () => {
      expect(parseSearchQuery('*start end* +must -not "exact phrase"')).toEqual({
        or: ["%start", "end%"],
        must: ["%exact phrase%", "%must%"],
        not: ["%not%"],
      });
    });
  });

  //#endregion
});
