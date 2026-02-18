import { describe, it, expect } from "vitest";
import { mergeStyles } from "../../src/helpers/mergeStyles";

describe("mergeStyles", () => {
  describe("object 스타일 병합", () => {
    it("여러 object 스타일을 병합", () => {
      const result = mergeStyles({ color: "red" }, { background: "blue" });

      expect(result).toEqual({ color: "red", background: "blue" });
    });

    it("동일 속성은 나중 값이 우선", () => {
      const result = mergeStyles({ color: "red" }, { color: "blue" });

      expect(result).toEqual({ color: "blue" });
    });

    it("여러 속성을 가진 object 병합", () => {
      const result = mergeStyles(
        { "color": "red", "font-size": "14px" },
        { background: "blue", padding: "10px" },
      );

      expect(result).toEqual({
        "color": "red",
        "font-size": "14px",
        "background": "blue",
        "padding": "10px",
      });
    });
  });

  describe("string 스타일 파싱 및 병합", () => {
    it("단일 string 스타일 파싱", () => {
      const result = mergeStyles("color: red;");

      expect(result).toEqual({ color: "red" });
    });

    it("여러 선언이 있는 string 스타일 파싱", () => {
      const result = mergeStyles("color: red; background: blue;");

      expect(result).toEqual({ color: "red", background: "blue" });
    });

    it("여러 string 스타일 병합", () => {
      const result = mergeStyles("color: red;", "background: blue;");

      expect(result).toEqual({ color: "red", background: "blue" });
    });

    it("세미콜론 없는 마지막 선언도 파싱", () => {
      const result = mergeStyles("color: red; background: blue");

      expect(result).toEqual({ color: "red", background: "blue" });
    });
  });

  describe("kebab-case to camelCase 변환", () => {
    it("kebab-case 속성을 camelCase로 변환", () => {
      const result = mergeStyles("background-color: red;");

      expect(result).toEqual({ backgroundColor: "red" });
    });

    it("여러 하이픈이 있는 속성 변환", () => {
      const result = mergeStyles("border-top-width: 1px;");

      expect(result).toEqual({ borderTopWidth: "1px" });
    });

    it("font-size, max-width 등 일반적인 속성 변환", () => {
      const result = mergeStyles("font-size: 14px; max-width: 100%;");

      expect(result).toEqual({ fontSize: "14px", maxWidth: "100%" });
    });
  });

  describe("mixed 스타일 병합 (string + object)", () => {
    it("string과 object를 함께 병합", () => {
      const result = mergeStyles({ color: "red" }, "background: blue;");

      expect(result).toEqual({ color: "red", background: "blue" });
    });

    it("object와 string 순서 상관없이 병합", () => {
      const result = mergeStyles("color: red;", { background: "blue" });

      expect(result).toEqual({ color: "red", background: "blue" });
    });

    it("string이 object를 덮어쓸 수 있음", () => {
      const result = mergeStyles({ color: "red" }, "color: blue;");

      expect(result).toEqual({ color: "blue" });
    });
  });

  describe("undefined 값 처리", () => {
    it("undefined는 무시", () => {
      const result = mergeStyles(undefined, { color: "red" });

      expect(result).toEqual({ color: "red" });
    });

    it("여러 undefined가 있어도 정상 동작", () => {
      const result = mergeStyles(
        undefined,
        { color: "red" },
        undefined,
        "background: blue;",
        undefined,
      );

      expect(result).toEqual({ color: "red", background: "blue" });
    });

    it("모두 undefined면 빈 객체 반환", () => {
      const result = mergeStyles(undefined, undefined);

      expect(result).toEqual({});
    });
  });

  describe("빈 문자열 처리", () => {
    it("빈 문자열은 빈 객체와 동일하게 처리", () => {
      const result = mergeStyles("", { color: "red" });

      expect(result).toEqual({ color: "red" });
    });

    it("공백만 있는 문자열도 정상 처리", () => {
      const result = mergeStyles("   ", { color: "red" });

      expect(result).toEqual({ color: "red" });
    });
  });

  describe("값 덮어쓰기 (나중 값 우선)", () => {
    it("여러 스타일에서 동일 속성이 있으면 마지막 값 적용", () => {
      const result = mergeStyles({ color: "red" }, { color: "green" }, { color: "blue" });

      expect(result).toEqual({ color: "blue" });
    });

    it("string과 object 혼합 시에도 순서대로 덮어쓰기", () => {
      const result = mergeStyles("color: red;", { color: "green" }, "color: blue;");

      expect(result).toEqual({ color: "blue" });
    });
  });

  describe("엣지 케이스", () => {
    it("콜론이 값에 포함된 경우 (URL 등)", () => {
      const result = mergeStyles("background-image: url(http://example.com);");

      expect(result).toEqual({ backgroundImage: "url(http://example.com)" });
    });

    it("빈 선언은 무시", () => {
      const result = mergeStyles("color: red; ; background: blue;");

      expect(result).toEqual({ color: "red", background: "blue" });
    });

    it("속성만 있고 값이 없으면 무시", () => {
      const result = mergeStyles("color:; background: blue;");

      expect(result).toEqual({ background: "blue" });
    });
  });
});
