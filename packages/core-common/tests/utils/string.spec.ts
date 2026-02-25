import { describe, it, expect } from "vitest";
import {
  koreanGetSuffix,
  strReplaceFullWidth,
  strToPascalCase,
  strToCamelCase,
  strToKebabCase,
  strToSnakeCase,
  strInsert,
} from "@simplysm/core-common";

describe("string utils", () => {
  //#region getSuffix - Korean postposition handling

  describe("koreanGetSuffix()", () => {
    describe("With final consonant", () => {
      it("'을' type returns '을'", () => {
        expect(koreanGetSuffix("책", "을")).toBe("을");
      });

      it("'은' type returns '은'", () => {
        expect(koreanGetSuffix("책", "은")).toBe("은");
      });

      it("'이' type returns '이'", () => {
        expect(koreanGetSuffix("책", "이")).toBe("이");
      });

      it("'와' type returns '과'", () => {
        expect(koreanGetSuffix("책", "와")).toBe("과");
      });

      it("'랑' type returns '이랑'", () => {
        expect(koreanGetSuffix("책", "랑")).toBe("이랑");
      });

      it("'로' type returns '으로'", () => {
        expect(koreanGetSuffix("책", "로")).toBe("으로");
      });

      it("'라' type returns '이라'", () => {
        expect(koreanGetSuffix("책", "라")).toBe("이라");
      });
    });

    describe("Non-Korean character cases", () => {
      it("Treats words ending with English letter as no final consonant", () => {
        expect(koreanGetSuffix("ABC", "을")).toBe("를");
        expect(koreanGetSuffix("test", "은")).toBe("는");
      });

      it("Treats words ending with number as no final consonant", () => {
        expect(koreanGetSuffix("123", "을")).toBe("를");
        expect(koreanGetSuffix("456", "은")).toBe("는");
      });

      it("Empty string treated as no final consonant", () => {
        expect(koreanGetSuffix("", "을")).toBe("를");
        expect(koreanGetSuffix("", "은")).toBe("는");
      });
    });

    describe("Without final consonant", () => {
      it("'을' type returns '를'", () => {
        expect(koreanGetSuffix("나무", "을")).toBe("를");
      });

      it("'은' type returns '는'", () => {
        expect(koreanGetSuffix("나무", "은")).toBe("는");
      });

      it("'이' type returns '가'", () => {
        expect(koreanGetSuffix("나무", "이")).toBe("가");
      });

      it("'와' type returns '와'", () => {
        expect(koreanGetSuffix("나무", "와")).toBe("와");
      });

      it("'랑' type returns '랑'", () => {
        expect(koreanGetSuffix("나무", "랑")).toBe("랑");
      });

      it("'로' type returns '로'", () => {
        expect(koreanGetSuffix("나무", "로")).toBe("로");
      });

      it("'라' type returns '라'", () => {
        expect(koreanGetSuffix("나무", "라")).toBe("라");
      });
    });

    describe("Final consonant ㄹ (special '로' handling)", () => {
      it("'로' type returns '로' for final ㄹ (Seoul)", () => {
        expect(koreanGetSuffix("서울", "로")).toBe("로");
      });

      it("'로' type returns '로' for final ㄹ (Road)", () => {
        expect(koreanGetSuffix("길", "로")).toBe("로");
      });

      it("'로' type returns '로' for final ㄹ (Foot)", () => {
        expect(koreanGetSuffix("발", "로")).toBe("로");
      });

      it("'로' type returns '로' for final ㄹ (Alcohol)", () => {
        expect(koreanGetSuffix("술", "로")).toBe("로");
      });

      it("'을' type returns '을' for final ㄹ by general rule", () => {
        expect(koreanGetSuffix("서울", "을")).toBe("을");
      });

      it("'은' type returns '은' for final ㄹ by general rule", () => {
        expect(koreanGetSuffix("서울", "은")).toBe("은");
      });
    });
  });

  //#endregion

  //#region replaceSpecialDefaultChar - Full-width to half-width conversion

  describe("strReplaceFullWidth()", () => {
    it("Converts full-width alphabet to half-width", () => {
      expect(strReplaceFullWidth("ＡＢＣＤＥＦＧ")).toBe("ABCDEFG");
      expect(strReplaceFullWidth("ＨＩＪＫＬＭＮ")).toBe("HIJKLMN");
      expect(strReplaceFullWidth("ＯＰＱＲＳＴＵ")).toBe("OPQRSTU");
      expect(strReplaceFullWidth("ＶＷＸＹＺ")).toBe("VWXYZ");
    });

    it("Converts full-width number to half-width", () => {
      expect(strReplaceFullWidth("０１２３４５６７８９")).toBe("0123456789");
    });

    it("Converts full-width parenthesis to half-width", () => {
      expect(strReplaceFullWidth("（ＡＢＣ）")).toBe("(ABC)");
    });

    it("Converts full-width space to half-width space", () => {
      expect(strReplaceFullWidth("Ａ　Ｂ　Ｃ")).toBe("A B C");
    });

    it("Converts mixed full-width/half-width string", () => {
      expect(strReplaceFullWidth("ＡBC１23")).toBe("ABC123");
    });

    it("Returns original if no full-width characters", () => {
      expect(strReplaceFullWidth("ABC123")).toBe("ABC123");
    });
  });

  //#endregion

  //#region Case conversion

  describe("strToPascalCase()", () => {
    it("Converts kebab-case to PascalCase", () => {
      expect(strToPascalCase("hello-world")).toBe("HelloWorld");
    });

    it("Converts dot.case to PascalCase", () => {
      expect(strToPascalCase("hello.world")).toBe("HelloWorld");
    });

    it("Converts snake_case to PascalCase", () => {
      expect(strToPascalCase("hello_world")).toBe("HelloWorld");
    });

    it("Capitalizes first letter of lowercase string", () => {
      expect(strToPascalCase("hello")).toBe("Hello");
    });

    it("Returns as-is if already PascalCase", () => {
      expect(strToPascalCase("HelloWorld")).toBe("HelloWorld");
    });

    it("Handles consecutive hyphens", () => {
      expect(strToPascalCase("hello-world-test")).toBe("HelloWorldTest");
    });
  });

  describe("strToCamelCase()", () => {
    it("Converts kebab-case to camelCase", () => {
      expect(strToCamelCase("hello-world")).toBe("helloWorld");
    });

    it("Converts PascalCase to camelCase", () => {
      expect(strToCamelCase("HelloWorld")).toBe("helloWorld");
    });

    it("Converts dot.case to camelCase", () => {
      expect(strToCamelCase("hello.world")).toBe("helloWorld");
    });

    it("Converts snake_case to camelCase", () => {
      expect(strToCamelCase("hello_world")).toBe("helloWorld");
    });

    it("Returns as-is if already camelCase", () => {
      expect(strToCamelCase("helloWorld")).toBe("helloWorld");
    });
  });

  describe("strToKebabCase()", () => {
    it("Converts PascalCase to kebab-case", () => {
      expect(strToKebabCase("HelloWorld")).toBe("hello-world");
    });

    it("Converts camelCase to kebab-case", () => {
      expect(strToKebabCase("helloWorld")).toBe("hello-world");
    });

    it("Adds hyphen before underscore when present", () => {
      // toKebabCase converts [-_]?[A-Z] to -lowercase, so _W → -_w
      expect(strToKebabCase("Hello_World")).toBe("hello-_world");
    });

    it("Returns as-is if already kebab-case", () => {
      expect(strToKebabCase("hello-world")).toBe("hello-world");
    });

    it("Handles consecutive uppercase letters", () => {
      expect(strToKebabCase("HelloWorldTest")).toBe("hello-world-test");
    });

    it("Handles consecutive uppercase followed by lowercase", () => {
      // each uppercase letter treated as separate word
      expect(strToKebabCase("XMLParser")).toBe("x-m-l-parser");
      expect(strToKebabCase("HTTPSConnection")).toBe("h-t-t-p-s-connection");
    });
  });

  describe("strToSnakeCase()", () => {
    it("Converts PascalCase to snake_case", () => {
      expect(strToSnakeCase("HelloWorld")).toBe("hello_world");
    });

    it("Converts camelCase to snake_case", () => {
      expect(strToSnakeCase("helloWorld")).toBe("hello_world");
    });

    it("Returns as-is if already snake_case", () => {
      expect(strToSnakeCase("hello_world")).toBe("hello_world");
    });

    it("Handles consecutive uppercase letters", () => {
      expect(strToSnakeCase("HelloWorldTest")).toBe("hello_world_test");
    });
  });

  //#endregion

  //#region Other

  describe("strInsert()", () => {
    it("Inserts at start of string", () => {
      expect(strInsert("world", 0, "hello ")).toBe("hello world");
    });

    it("Inserts in middle of string", () => {
      expect(strInsert("helloworld", 5, " ")).toBe("hello world");
    });

    it("Inserts at end of string", () => {
      expect(strInsert("hello", 5, " world")).toBe("hello world");
    });

    it("Inserts into empty string", () => {
      expect(strInsert("", 0, "hello")).toBe("hello");
    });
  });

  //#endregion
});
