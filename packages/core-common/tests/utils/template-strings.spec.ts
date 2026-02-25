import { describe, expect, it } from "vitest";
import { html, js } from "../../src/index.js";

describe("template-strings", () => {
  describe("Basic behavior", () => {
    it("String concatenation", () => {
      const name = "test";
      expect(js`const x = "${name}"`).toBe('const x = "test"');
    });

    it("Removes indentation", () => {
      const result = js`
        const x = 1;
        const y = 2;
      `;
      expect(result).toBe("const x = 1;\nconst y = 2;");
    });

    it("Removes first/last empty lines", () => {
      const result = html`
        <div>test</div>
      `;
      expect(result).toBe("<div>test</div>");
    });

    it("Preserves middle empty lines", () => {
      const result = js`
        const x = 1;

        const y = 2;
      `;
      expect(result).toBe("const x = 1;\n\nconst y = 2;");
    });
  });

  describe("Value interpolation", () => {
    it("Handles undefined value", () => {
      const value = undefined;
      expect(js`x = ${value}`).toBe("x = ");
    });

    it("Handles number value", () => {
      expect(js`x = ${42}`).toBe("x = 42");
    });

    it("Interpolates multiple values", () => {
      const a = 1;
      const b = 2;
      expect(js`${a} + ${b} = ${a + b}`).toBe("1 + 2 = 3");
    });

    it("Handles object value", () => {
      const obj = { toString: () => "custom" };
      expect(js`value = ${obj}`).toBe("value = custom");
    });
  });
});
