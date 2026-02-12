import { describe, expect, it } from "vitest";
import { html, js } from "../../src/index.js";

describe("template-strings", () => {
  describe("기본 동작", () => {
    it("문자열 조합", () => {
      const name = "test";
      expect(js`const x = "${name}"`).toBe('const x = "test"');
    });

    it("들여쓰기 제거", () => {
      const result = js`
        const x = 1;
        const y = 2;
      `;
      expect(result).toBe("const x = 1;\nconst y = 2;");
    });

    it("첫/마지막 빈 줄 제거", () => {
      const result = html`
        <div>test</div>
      `;
      expect(result).toBe("<div>test</div>");
    });

    it("중간 빈 줄 유지", () => {
      const result = js`
        const x = 1;

        const y = 2;
      `;
      expect(result).toBe("const x = 1;\n\nconst y = 2;");
    });
  });

  describe("값 보간", () => {
    it("undefined 값 처리", () => {
      const value = undefined;
      expect(js`x = ${value}`).toBe("x = ");
    });

    it("숫자 값 처리", () => {
      expect(js`x = ${42}`).toBe("x = 42");
    });

    it("여러 값 보간", () => {
      const a = 1;
      const b = 2;
      expect(js`${a} + ${b} = ${a + b}`).toBe("1 + 2 = 3");
    });

    it("객체 값 처리", () => {
      const obj = { toString: () => "custom" };
      expect(js`value = ${obj}`).toBe("value = custom");
    });
  });
});
