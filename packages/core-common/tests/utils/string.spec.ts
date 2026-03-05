import { describe, it, expect } from "vitest";
import { str } from "@simplysm/core-common";

describe("string utils", () => {
  //#region koreanGetSuffix - Korean postposition handling

  describe("koreanGetSuffix()", () => {
    describe("with final consonant", () => {
      it("'을' type returns '을'", () => {
        expect(str.getKoreanSuffix("책", "을")).toBe("을");
      });

      it("'은' type returns '은'", () => {
        expect(str.getKoreanSuffix("책", "은")).toBe("은");
      });

      it("'이' type returns '이'", () => {
        expect(str.getKoreanSuffix("책", "이")).toBe("이");
      });

      it("'와' type returns '과'", () => {
        expect(str.getKoreanSuffix("책", "와")).toBe("과");
      });

      it("'랑' type returns '이랑'", () => {
        expect(str.getKoreanSuffix("책", "랑")).toBe("이랑");
      });

      it("'로' type returns '으로'", () => {
        expect(str.getKoreanSuffix("책", "로")).toBe("으로");
      });

      it("'라' type returns '이라'", () => {
        expect(str.getKoreanSuffix("책", "라")).toBe("이라");
      });
    });

    describe("non-Korean character cases", () => {
      it("treats words ending with English letter as no final consonant", () => {
        expect(str.getKoreanSuffix("ABC", "을")).toBe("를");
        expect(str.getKoreanSuffix("test", "은")).toBe("는");
      });

      it("treats words ending with number as no final consonant", () => {
        expect(str.getKoreanSuffix("123", "을")).toBe("를");
        expect(str.getKoreanSuffix("456", "은")).toBe("는");
      });

      it("empty string treated as no final consonant", () => {
        expect(str.getKoreanSuffix("", "을")).toBe("를");
        expect(str.getKoreanSuffix("", "은")).toBe("는");
      });
    });

    describe("without final consonant", () => {
      it("'을' type returns '를'", () => {
        expect(str.getKoreanSuffix("나무", "을")).toBe("를");
      });

      it("'은' type returns '는'", () => {
        expect(str.getKoreanSuffix("나무", "은")).toBe("는");
      });

      it("'이' type returns '가'", () => {
        expect(str.getKoreanSuffix("나무", "이")).toBe("가");
      });

      it("'와' type returns '와'", () => {
        expect(str.getKoreanSuffix("나무", "와")).toBe("와");
      });

      it("'랑' type returns '랑'", () => {
        expect(str.getKoreanSuffix("나무", "랑")).toBe("랑");
      });

      it("'로' type returns '로'", () => {
        expect(str.getKoreanSuffix("나무", "로")).toBe("로");
      });

      it("'라' type returns '라'", () => {
        expect(str.getKoreanSuffix("나무", "라")).toBe("라");
      });
    });

    describe("final consonant ㄹ (special '로' handling)", () => {
      it("'로' type returns '로' for final ㄹ (Seoul)", () => {
        expect(str.getKoreanSuffix("서울", "로")).toBe("로");
      });

      it("'로' type returns '로' for final ㄹ (road)", () => {
        expect(str.getKoreanSuffix("길", "로")).toBe("로");
      });

      it("'로' type returns '로' for final ㄹ (foot)", () => {
        expect(str.getKoreanSuffix("발", "로")).toBe("로");
      });

      it("'로' type returns '로' for final ㄹ (alcohol)", () => {
        expect(str.getKoreanSuffix("술", "로")).toBe("로");
      });

      it("'을' type returns '을' for final ㄹ by general rule", () => {
        expect(str.getKoreanSuffix("서울", "을")).toBe("을");
      });

      it("'은' type returns '은' for final ㄹ by general rule", () => {
        expect(str.getKoreanSuffix("서울", "은")).toBe("은");
      });
    });
  });

  //#endregion

  //#endregion

  //#region strReplaceFullWidth - Full-width to half-width conversion

  describe("replaceFullWidth()", () => {
    it("converts full-width alphabet to half-width", () => {
      expect(str.replaceFullWidth("ＡＢＣＤＥＦＧ")).toBe("ABCDEFG");
      expect(str.replaceFullWidth("ＨＩＪＫＬＭＮ")).toBe("HIJKLMN");
      expect(str.replaceFullWidth("ＯＰＱＲＳＴＵ")).toBe("OPQRSTU");
      expect(str.replaceFullWidth("ＶＷＸＹＺ")).toBe("VWXYZ");
    });

    it("converts full-width number to half-width", () => {
      expect(str.replaceFullWidth("０１２３４５６７８９")).toBe("0123456789");
    });

    it("converts full-width parenthesis to half-width", () => {
      expect(str.replaceFullWidth("（ＡＢＣ）")).toBe("(ABC)");
    });

    it("converts full-width space to half-width space", () => {
      expect(str.replaceFullWidth("Ａ　Ｂ　Ｃ")).toBe("A B C");
    });

    it("converts mixed full-width/half-width string", () => {
      expect(str.replaceFullWidth("ＡBC１23")).toBe("ABC123");
    });

    it("returns original if no full-width characters", () => {
      expect(str.replaceFullWidth("ABC123")).toBe("ABC123");
    });
  });

  //#endregion

  //#endregion

  //#region Case conversion

  describe("toPascalCase()", () => {
    it("converts kebab-case to PascalCase", () => {
      expect(str.toPascalCase("hello-world")).toBe("HelloWorld");
    });

    it("converts dot.case to PascalCase", () => {
      expect(str.toPascalCase("hello.world")).toBe("HelloWorld");
    });

    it("converts snake_case to PascalCase", () => {
      expect(str.toPascalCase("hello_world")).toBe("HelloWorld");
    });

    it("capitalizes first letter of lowercase string", () => {
      expect(str.toPascalCase("hello")).toBe("Hello");
    });

    it("returns as-is if already PascalCase", () => {
      expect(str.toPascalCase("HelloWorld")).toBe("HelloWorld");
    });

    it("handles consecutive hyphens", () => {
      expect(str.toPascalCase("hello-world-test")).toBe("HelloWorldTest");
    });
  });

  describe("toCamelCase()", () => {
    it("converts kebab-case to camelCase", () => {
      expect(str.toCamelCase("hello-world")).toBe("helloWorld");
    });

    it("converts PascalCase to camelCase", () => {
      expect(str.toCamelCase("HelloWorld")).toBe("helloWorld");
    });

    it("converts dot.case to camelCase", () => {
      expect(str.toCamelCase("hello.world")).toBe("helloWorld");
    });

    it("converts snake_case to camelCase", () => {
      expect(str.toCamelCase("hello_world")).toBe("helloWorld");
    });

    it("returns as-is if already camelCase", () => {
      expect(str.toCamelCase("helloWorld")).toBe("helloWorld");
    });
  });

  describe("toKebabCase()", () => {
    it("converts PascalCase to kebab-case", () => {
      expect(str.toKebabCase("HelloWorld")).toBe("hello-world");
    });

    it("converts camelCase to kebab-case", () => {
      expect(str.toKebabCase("helloWorld")).toBe("hello-world");
    });

    it("adds hyphen before underscore when present", () => {
      // toKebabCase converts [-_]?[A-Z] to -lowercase, so _W → -_w
      expect(str.toKebabCase("Hello_World")).toBe("hello-_world");
    });

    it("returns as-is if already kebab-case", () => {
      expect(str.toKebabCase("hello-world")).toBe("hello-world");
    });

    it("handles consecutive uppercase letters", () => {
      expect(str.toKebabCase("HelloWorldTest")).toBe("hello-world-test");
    });

    it("handles consecutive uppercase followed by lowercase", () => {
      // each uppercase letter treated as separate word
      expect(str.toKebabCase("XMLParser")).toBe("x-m-l-parser");
      expect(str.toKebabCase("HTTPSConnection")).toBe("h-t-t-p-s-connection");
    });
  });

  describe("toSnakeCase()", () => {
    it("converts PascalCase to snake_case", () => {
      expect(str.toSnakeCase("HelloWorld")).toBe("hello_world");
    });

    it("converts camelCase to snake_case", () => {
      expect(str.toSnakeCase("helloWorld")).toBe("hello_world");
    });

    it("returns as-is if already snake_case", () => {
      expect(str.toSnakeCase("hello_world")).toBe("hello_world");
    });

    it("handles consecutive uppercase letters", () => {
      expect(str.toSnakeCase("HelloWorldTest")).toBe("hello_world_test");
    });
  });

  //#endregion

  //#endregion

  //#region Other

  describe("insert()", () => {
    it("inserts at start of string", () => {
      expect(str.insert("world", 0, "hello ")).toBe("hello world");
    });

    it("inserts at end of string", () => {
      expect(str.insert("hello", 5, " world")).toBe("hello world");
    });
  });

  //#endregion
});
