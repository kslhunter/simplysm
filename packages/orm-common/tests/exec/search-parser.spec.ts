import { describe, expect, it } from "vitest";
import { parseSearchQuery } from "../../src/exec/search-parser";

describe("parseSearchQuery", () => {
  //#region ========== Basic behavior ==========

  describe("Basic behavior", () => {
    it("Empty string → empty result", () => {
      expect(parseSearchQuery("")).toEqual({ or: [], must: [], not: [] });
      expect(parseSearchQuery("   ")).toEqual({ or: [], must: [], not: [] });
    });

    it("Single word → add LIKE pattern to or array", () => {
      expect(parseSearchQuery("사과")).toEqual({
        or: ["%사과%"],
        must: [],
        not: [],
      });
    });

    it("Multiple words (space separated) → OR condition", () => {
      expect(parseSearchQuery("사과 바나나")).toEqual({
        or: ["%사과%", "%바나나%"],
        must: [],
        not: [],
      });
    });
  });

  //#endregion

  //#region ========== Prefixes ==========

  describe("Prefixes", () => {
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

    it("Mixed prefixes", () => {
      expect(parseSearchQuery("사과 +딸기 -바나나")).toEqual({
        or: ["%사과%"],
        must: ["%딸기%"],
        not: ["%바나나%"],
      });
    });

    it("Multiple identical prefixes", () => {
      expect(parseSearchQuery("+사과 +바나나")).toEqual({
        or: [],
        must: ["%사과%", "%바나나%"],
        not: [],
      });
    });

    it("Ignore when only prefixes present", () => {
      expect(parseSearchQuery("+ - ")).toEqual({ or: [], must: [], not: [] });
      expect(parseSearchQuery("+ 사과")).toEqual({ or: ["%사과%"], must: [], not: [] });
    });

    it("Consecutive prefixes", () => {
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

  describe("Quotes", () => {
    it("Quoted phrase → must (exact match)", () => {
      expect(parseSearchQuery('"맛있는 과일"')).toEqual({
        or: [],
        must: ["%맛있는 과일%"],
        not: [],
      });
    });

    it("+quote → must", () => {
      expect(parseSearchQuery('+"맛있는 과일"')).toEqual({
        or: [],
        must: ["%맛있는 과일%"],
        not: [],
      });
    });

    it("-quote → not", () => {
      expect(parseSearchQuery('-"맛있는 과일"')).toEqual({
        or: [],
        must: [],
        not: ["%맛있는 과일%"],
      });
    });

    it("Ignore empty quotes", () => {
      expect(parseSearchQuery('""')).toEqual({ or: [], must: [], not: [] });
      expect(parseSearchQuery('"  "')).toEqual({ or: [], must: [], not: [] });
    });

    it("Mix quotes and regular words", () => {
      expect(parseSearchQuery('사과 "맛있는 과일" 바나나')).toEqual({
        or: ["%사과%", "%바나나%"],
        must: ["%맛있는 과일%"],
        not: [],
      });
    });
  });

  //#endregion

  //#region ========== Wildcards ==========

  describe("Wildcards", () => {
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

    it("* on both sides → contains search (explicit)", () => {
      expect(parseSearchQuery("*사과*")).toEqual({
        or: ["%사과%"],
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

  describe("Escaping", () => {
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

  describe("SQL special character escaping", () => {
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

  describe("Complex search", () => {
    it("TSDoc example: normal + quote + exclude + required", () => {
      expect(parseSearchQuery('사과 "맛있는 과일" -바나나 +딸기')).toEqual({
        or: ["%사과%"],
        must: ["%맛있는 과일%", "%딸기%"],
        not: ["%바나나%"],
      });
    });

    it("Mix wildcards and regular words", () => {
      expect(parseSearchQuery("app* test")).toEqual({
        or: ["app%", "%test%"],
        must: [],
        not: [],
      });
    });

    it("Mix all elements", () => {
      expect(parseSearchQuery('*start end* +must -not "exact phrase"')).toEqual({
        or: ["%start", "end%"],
        must: ["%exact phrase%", "%must%"],
        not: ["%not%"],
      });
    });
  });

  //#endregion
});
