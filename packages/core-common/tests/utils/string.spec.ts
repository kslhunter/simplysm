import { describe, it, expect } from "vitest";
import { StringUtils } from "@simplysm/core-common";

describe("StringUtils", () => {
  //#region getSuffix - 한글 조사 처리

  describe("getSuffix()", () => {
    describe("받침이 있는 경우", () => {
      it("'을' 타입은 '을'을 반환한다", () => {
        expect(StringUtils.getSuffix("책", "을")).toBe("을");
      });

      it("'은' 타입은 '은'을 반환한다", () => {
        expect(StringUtils.getSuffix("책", "은")).toBe("은");
      });

      it("'이' 타입은 '이'를 반환한다", () => {
        expect(StringUtils.getSuffix("책", "이")).toBe("이");
      });

      it("'와' 타입은 '과'를 반환한다", () => {
        expect(StringUtils.getSuffix("책", "와")).toBe("과");
      });

      it("'랑' 타입은 '이랑'을 반환한다", () => {
        expect(StringUtils.getSuffix("책", "랑")).toBe("이랑");
      });

      it("'로' 타입은 '으로'를 반환한다", () => {
        expect(StringUtils.getSuffix("책", "로")).toBe("으로");
      });

      it("'라' 타입은 '이라'를 반환한다", () => {
        expect(StringUtils.getSuffix("책", "라")).toBe("이라");
      });
    });

    describe("비한글 문자의 경우", () => {
      it("영문자로 끝나면 받침 없음으로 처리한다", () => {
        expect(StringUtils.getSuffix("ABC", "을")).toBe("를");
        expect(StringUtils.getSuffix("test", "은")).toBe("는");
      });

      it("숫자로 끝나면 받침 없음으로 처리한다", () => {
        expect(StringUtils.getSuffix("123", "을")).toBe("를");
        expect(StringUtils.getSuffix("456", "은")).toBe("는");
      });

      it("빈 문자열은 받침 없음으로 처리한다", () => {
        expect(StringUtils.getSuffix("", "을")).toBe("를");
        expect(StringUtils.getSuffix("", "은")).toBe("는");
      });
    });

    describe("받침이 없는 경우", () => {
      it("'을' 타입은 '를'을 반환한다", () => {
        expect(StringUtils.getSuffix("나무", "을")).toBe("를");
      });

      it("'은' 타입은 '는'을 반환한다", () => {
        expect(StringUtils.getSuffix("나무", "은")).toBe("는");
      });

      it("'이' 타입은 '가'를 반환한다", () => {
        expect(StringUtils.getSuffix("나무", "이")).toBe("가");
      });

      it("'와' 타입은 '와'를 반환한다", () => {
        expect(StringUtils.getSuffix("나무", "와")).toBe("와");
      });

      it("'랑' 타입은 '랑'을 반환한다", () => {
        expect(StringUtils.getSuffix("나무", "랑")).toBe("랑");
      });

      it("'로' 타입은 '로'를 반환한다", () => {
        expect(StringUtils.getSuffix("나무", "로")).toBe("로");
      });

      it("'라' 타입은 '라'를 반환한다", () => {
        expect(StringUtils.getSuffix("나무", "라")).toBe("라");
      });
    });
  });

  //#endregion

  //#region replaceSpecialDefaultChar - 전각→반각 변환

  describe("replaceSpecialDefaultChar()", () => {
    it("전각 알파벳을 반각으로 변환한다", () => {
      expect(StringUtils.replaceSpecialDefaultChar("ＡＢＣＤＥＦＧ")).toBe("ABCDEFG");
      expect(StringUtils.replaceSpecialDefaultChar("ＨＩＪＫＬＭＮ")).toBe("HIJKLMN");
      expect(StringUtils.replaceSpecialDefaultChar("ＯＰＱＲＳＴＵ")).toBe("OPQRSTU");
      expect(StringUtils.replaceSpecialDefaultChar("ＶＷＸＹＺ")).toBe("VWXYZ");
    });

    it("전각 숫자를 반각으로 변환한다", () => {
      expect(StringUtils.replaceSpecialDefaultChar("０１２３４５６７８９")).toBe("0123456789");
    });

    it("전각 괄호를 반각으로 변환한다", () => {
      expect(StringUtils.replaceSpecialDefaultChar("（ＡＢＣ）")).toBe("(ABC)");
    });

    it("전각 공백을 반각 공백으로 변환한다", () => {
      expect(StringUtils.replaceSpecialDefaultChar("Ａ　Ｂ　Ｃ")).toBe("A B C");
    });

    it("혼합된 전각/반각 문자열을 변환한다", () => {
      expect(StringUtils.replaceSpecialDefaultChar("ＡBC１23")).toBe("ABC123");
    });

    it("전각 문자가 없는 경우 원본을 반환한다", () => {
      expect(StringUtils.replaceSpecialDefaultChar("ABC123")).toBe("ABC123");
    });
  });

  //#endregion

  //#region 케이스 변환

  describe("toPascalCase()", () => {
    it("kebab-case를 PascalCase로 변환한다", () => {
      expect(StringUtils.toPascalCase("hello-world")).toBe("HelloWorld");
    });

    it("dot.case를 PascalCase로 변환한다", () => {
      expect(StringUtils.toPascalCase("hello.world")).toBe("HelloWorld");
    });

    it("snake_case를 PascalCase로 변환한다", () => {
      expect(StringUtils.toPascalCase("hello_world")).toBe("HelloWorld");
    });

    it("소문자로 시작하는 문자열의 첫 글자를 대문자로 변환한다", () => {
      expect(StringUtils.toPascalCase("hello")).toBe("Hello");
    });

    it("이미 PascalCase인 경우 그대로 반환한다", () => {
      expect(StringUtils.toPascalCase("HelloWorld")).toBe("HelloWorld");
    });

    it("연속된 하이픈을 처리한다", () => {
      expect(StringUtils.toPascalCase("hello-world-test")).toBe("HelloWorldTest");
    });
  });

  describe("toCamelCase()", () => {
    it("kebab-case를 camelCase로 변환한다", () => {
      expect(StringUtils.toCamelCase("hello-world")).toBe("helloWorld");
    });

    it("PascalCase를 camelCase로 변환한다", () => {
      expect(StringUtils.toCamelCase("HelloWorld")).toBe("helloWorld");
    });

    it("dot.case를 camelCase로 변환한다", () => {
      expect(StringUtils.toCamelCase("hello.world")).toBe("helloWorld");
    });

    it("snake_case를 camelCase로 변환한다", () => {
      expect(StringUtils.toCamelCase("hello_world")).toBe("helloWorld");
    });

    it("이미 camelCase인 경우 그대로 반환한다", () => {
      expect(StringUtils.toCamelCase("helloWorld")).toBe("helloWorld");
    });
  });

  describe("toKebabCase()", () => {
    it("PascalCase를 kebab-case로 변환한다", () => {
      expect(StringUtils.toKebabCase("HelloWorld")).toBe("hello-world");
    });

    it("camelCase를 kebab-case로 변환한다", () => {
      expect(StringUtils.toKebabCase("helloWorld")).toBe("hello-world");
    });

    it("언더스코어가 포함된 경우 언더스코어 앞에 하이픈을 추가한다", () => {
      // toKebabCase는 [-_]?[A-Z]를 -소문자로 변환하므로 _W → -_w가 됨
      expect(StringUtils.toKebabCase("Hello_World")).toBe("hello-_world");
    });

    it("이미 kebab-case인 경우 그대로 반환한다", () => {
      expect(StringUtils.toKebabCase("hello-world")).toBe("hello-world");
    });

    it("연속된 대문자를 처리한다", () => {
      expect(StringUtils.toKebabCase("HelloWorldTest")).toBe("hello-world-test");
    });
  });

  describe("toSnakeCase()", () => {
    it("PascalCase를 snake_case로 변환한다", () => {
      expect(StringUtils.toSnakeCase("HelloWorld")).toBe("hello_world");
    });

    it("camelCase를 snake_case로 변환한다", () => {
      expect(StringUtils.toSnakeCase("helloWorld")).toBe("hello_world");
    });

    it("이미 snake_case인 경우 그대로 반환한다", () => {
      expect(StringUtils.toSnakeCase("hello_world")).toBe("hello_world");
    });

    it("연속된 대문자를 처리한다", () => {
      expect(StringUtils.toSnakeCase("HelloWorldTest")).toBe("hello_world_test");
    });
  });

  //#endregion

  //#region 기타

  describe("isNullOrEmpty()", () => {
    it("undefined이면 true를 반환한다", () => {
      expect(StringUtils.isNullOrEmpty(undefined)).toBe(true);
    });

    it("빈 문자열이면 true를 반환한다", () => {
      expect(StringUtils.isNullOrEmpty("")).toBe(true);
    });

    it("일반 문자열이면 false를 반환한다", () => {
      expect(StringUtils.isNullOrEmpty("hello")).toBe(false);
    });

    it("공백만 있는 문자열은 false를 반환한다", () => {
      expect(StringUtils.isNullOrEmpty("   ")).toBe(false);
    });
  });

  describe("insert()", () => {
    it("문자열 시작에 삽입한다", () => {
      expect(StringUtils.insert("world", 0, "hello ")).toBe("hello world");
    });

    it("문자열 중간에 삽입한다", () => {
      expect(StringUtils.insert("helloworld", 5, " ")).toBe("hello world");
    });

    it("문자열 끝에 삽입한다", () => {
      expect(StringUtils.insert("hello", 5, " world")).toBe("hello world");
    });

    it("빈 문자열에 삽입한다", () => {
      expect(StringUtils.insert("", 0, "hello")).toBe("hello");
    });
  });

  //#endregion
});
