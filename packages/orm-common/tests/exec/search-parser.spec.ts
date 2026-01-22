import { describe, expect, it } from "vitest";
import { parseSearchQuery } from "../../src/exec/search-parser";

describe("parseSearchQuery", () => {
  //#region ========== 기본 동작 ==========

  describe("기본 동작", () => {
    it("빈 문자열 → 빈 결과", () => {
      expect(parseSearchQuery("")).toEqual({ or: [], must: [], not: [] });
      expect(parseSearchQuery("   ")).toEqual({ or: [], must: [], not: [] });
    });

    it("단일 단어 → or 배열에 LIKE 패턴 추가", () => {
      expect(parseSearchQuery("사과")).toEqual({
        or: ["%사과%"],
        must: [],
        not: [],
      });
    });

    it("여러 단어 (공백 구분) → OR 조건", () => {
      expect(parseSearchQuery("사과 바나나")).toEqual({
        or: ["%사과%", "%바나나%"],
        must: [],
        not: [],
      });
    });
  });

  //#endregion

  //#region ========== 접두사 ==========

  describe("접두사", () => {
    it("+ 접두사 → must (AND 조건)", () => {
      expect(parseSearchQuery("+사과")).toEqual({
        or: [],
        must: ["%사과%"],
        not: [],
      });
    });

    it("- 접두사 → not (NOT 조건)", () => {
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

    it("여러 개의 동일 접두사", () => {
      expect(parseSearchQuery("+사과 +바나나")).toEqual({
        or: [],
        must: ["%사과%", "%바나나%"],
        not: [],
      });
    });

    it("접두사만 있는 경우 무시", () => {
      expect(parseSearchQuery("+ - ")).toEqual({ or: [], must: [], not: [] });
      expect(parseSearchQuery("+ 사과")).toEqual({ or: ["%사과%"], must: [], not: [] });
    });

    it("연속된 접두사", () => {
      // 첫 번째 접두사가 처리되고, 나머지는 리터럴로 포함됨
      expect(parseSearchQuery("++term")).toEqual({
        or: [],
        must: ["%+term%"], // + 접두사 처리 후 "+term"이 남아 리터럴 + 포함
        not: [],
      });
      expect(parseSearchQuery("--word")).toEqual({
        or: [],
        must: [],
        not: ["%-word%"], // - 접두사 처리 후 "-word"이 남아 리터럴 - 포함
      });
    });
  });

  //#endregion

  //#region ========== 따옴표 ==========

  describe("따옴표", () => {
    it("따옴표로 묶인 문구 → must (정확히 일치)", () => {
      expect(parseSearchQuery('"맛있는 과일"')).toEqual({
        or: [],
        must: ["%맛있는 과일%"],
        not: [],
      });
    });

    it("+따옴표 → must", () => {
      expect(parseSearchQuery('+"맛있는 과일"')).toEqual({
        or: [],
        must: ["%맛있는 과일%"],
        not: [],
      });
    });

    it("-따옴표 → not", () => {
      expect(parseSearchQuery('-"맛있는 과일"')).toEqual({
        or: [],
        must: [],
        not: ["%맛있는 과일%"],
      });
    });

    it("빈 따옴표 무시", () => {
      expect(parseSearchQuery('""')).toEqual({ or: [], must: [], not: [] });
      expect(parseSearchQuery('"  "')).toEqual({ or: [], must: [], not: [] });
    });

    it("따옴표와 일반 단어 혼합", () => {
      expect(parseSearchQuery('사과 "맛있는 과일" 바나나')).toEqual({
        or: ["%사과%", "%바나나%"],
        must: ["%맛있는 과일%"],
        not: [],
      });
    });
  });

  //#endregion

  //#region ========== 와일드카드 ==========

  describe("와일드카드", () => {
    it("앞에 * → 끝으로 검색", () => {
      expect(parseSearchQuery("*사과")).toEqual({
        or: ["%사과"],
        must: [],
        not: [],
      });
    });

    it("뒤에 * → 시작으로 검색", () => {
      expect(parseSearchQuery("사과*")).toEqual({
        or: ["사과%"],
        must: [],
        not: [],
      });
    });

    it("양쪽 * → 포함 검색 (명시적)", () => {
      expect(parseSearchQuery("*사과*")).toEqual({
        or: ["%사과%"],
        must: [],
        not: [],
      });
    });

    it("중간 * → 중간 와일드카드", () => {
      expect(parseSearchQuery("사*과")).toEqual({
        or: ["사%과"],
        must: [],
        not: [],
      });
    });
  });

  //#endregion

  //#region ========== 이스케이프 ==========

  describe("이스케이프", () => {
    it("\\* → 리터럴 *", () => {
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

    it('\\" → 리터럴 "', () => {
      expect(parseSearchQuery('\\"test\\"')).toEqual({
        or: ['%"test"%'],
        must: [],
        not: [],
      });
    });

    it("\\+ → 리터럴 + (접두사 아님)", () => {
      expect(parseSearchQuery("\\+positive")).toEqual({
        or: ["%+positive%"],
        must: [],
        not: [],
      });
    });

    it("\\- → 리터럴 - (접두사 아님)", () => {
      expect(parseSearchQuery("\\-negative")).toEqual({
        or: ["%-negative%"],
        must: [],
        not: [],
      });
    });

    it("\\\\ → 리터럴 \\", () => {
      expect(parseSearchQuery("path\\\\to\\\\file")).toEqual({
        or: ["%path\\\\to\\\\file%"],
        must: [],
        not: [],
      });
    });
  });

  //#endregion

  //#region ========== SQL 특수문자 ==========

  describe("SQL 특수문자 이스케이프", () => {
    it("_ → \\_ (SQL LIKE 이스케이프)", () => {
      expect(parseSearchQuery("file_name")).toEqual({
        or: ["%file\\_name%"],
        must: [],
        not: [],
      });
    });

    it("% → \\% (SQL LIKE 이스케이프)", () => {
      expect(parseSearchQuery("100%")).toEqual({
        or: ["%100\\%%"],
        must: [],
        not: [],
      });
    });

    it("[ → \\[ (SQL LIKE 이스케이프)", () => {
      expect(parseSearchQuery("array[0]")).toEqual({
        or: ["%array\\[0]%"],
        must: [],
        not: [],
      });
    });
  });

  //#endregion

  //#region ========== 복합 검색 ==========

  describe("복합 검색", () => {
    it("TSDoc 예시: 일반 + 따옴표 + 제외 + 필수", () => {
      expect(parseSearchQuery('사과 "맛있는 과일" -바나나 +딸기')).toEqual({
        or: ["%사과%"],
        must: ["%맛있는 과일%", "%딸기%"],
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
