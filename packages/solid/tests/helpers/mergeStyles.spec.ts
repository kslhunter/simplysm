import { describe, it, expect } from "vitest";
import { mergeStyles } from "../../src/helpers/mergeStyles";

describe("mergeStyles", () => {
  describe("object style merging", () => {
    it("merges multiple object styles", () => {
      const result = mergeStyles({ color: "red" }, { background: "blue" });

      expect(result).toEqual({ color: "red", background: "blue" });
    });

    it("later value takes priority for same property", () => {
      const result = mergeStyles({ color: "red" }, { color: "blue" });

      expect(result).toEqual({ color: "blue" });
    });

    it("merges objects with multiple properties", () => {
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

  describe("string style parsing and merging", () => {
    it("parses single string style", () => {
      const result = mergeStyles("color: red;");

      expect(result).toEqual({ color: "red" });
    });

    it("parses string style with multiple declarations", () => {
      const result = mergeStyles("color: red; background: blue;");

      expect(result).toEqual({ color: "red", background: "blue" });
    });

    it("merges multiple string styles", () => {
      const result = mergeStyles("color: red;", "background: blue;");

      expect(result).toEqual({ color: "red", background: "blue" });
    });

    it("parses last declaration without semicolon", () => {
      const result = mergeStyles("color: red; background: blue");

      expect(result).toEqual({ color: "red", background: "blue" });
    });
  });

  describe("kebab-case to camelCase conversion", () => {
    it("converts kebab-case property to camelCase", () => {
      const result = mergeStyles("background-color: red;");

      expect(result).toEqual({ backgroundColor: "red" });
    });

    it("converts property with multiple hyphens", () => {
      const result = mergeStyles("border-top-width: 1px;");

      expect(result).toEqual({ borderTopWidth: "1px" });
    });

    it("converts common properties like font-size and max-width", () => {
      const result = mergeStyles("font-size: 14px; max-width: 100%;");

      expect(result).toEqual({ fontSize: "14px", maxWidth: "100%" });
    });
  });

  describe("mixed style merging (string + object)", () => {
    it("merges string and object together", () => {
      const result = mergeStyles({ color: "red" }, "background: blue;");

      expect(result).toEqual({ color: "red", background: "blue" });
    });

    it("merges regardless of object/string order", () => {
      const result = mergeStyles("color: red;", { background: "blue" });

      expect(result).toEqual({ color: "red", background: "blue" });
    });

    it("string can override object", () => {
      const result = mergeStyles({ color: "red" }, "color: blue;");

      expect(result).toEqual({ color: "blue" });
    });
  });

  describe("undefined handling", () => {
    it("ignores undefined", () => {
      const result = mergeStyles(undefined, { color: "red" });

      expect(result).toEqual({ color: "red" });
    });

    it("works correctly with multiple undefineds", () => {
      const result = mergeStyles(
        undefined,
        { color: "red" },
        undefined,
        "background: blue;",
        undefined,
      );

      expect(result).toEqual({ color: "red", background: "blue" });
    });

    it("returns empty object when all are undefined", () => {
      const result = mergeStyles(undefined, undefined);

      expect(result).toEqual({});
    });
  });

  describe("empty string handling", () => {
    it("treats empty string same as empty object", () => {
      const result = mergeStyles("", { color: "red" });

      expect(result).toEqual({ color: "red" });
    });

    it("handles whitespace-only string correctly", () => {
      const result = mergeStyles("   ", { color: "red" });

      expect(result).toEqual({ color: "red" });
    });
  });

  describe("value overwriting (last value wins)", () => {
    it("applies last value when same property exists in multiple styles", () => {
      const result = mergeStyles({ color: "red" }, { color: "green" }, { color: "blue" });

      expect(result).toEqual({ color: "blue" });
    });

    it("overwrites in order with mixed string and object", () => {
      const result = mergeStyles("color: red;", { color: "green" }, "color: blue;");

      expect(result).toEqual({ color: "blue" });
    });
  });

  describe("edge cases", () => {
    it("handles colon in value (e.g., URL)", () => {
      const result = mergeStyles("background-image: url(http://example.com);");

      expect(result).toEqual({ backgroundImage: "url(http://example.com)" });
    });

    it("ignores empty declarations", () => {
      const result = mergeStyles("color: red; ; background: blue;");

      expect(result).toEqual({ color: "red", background: "blue" });
    });

    it("ignores declarations with property but no value", () => {
      const result = mergeStyles("color:; background: blue;");

      expect(result).toEqual({ background: "blue" });
    });
  });
});
