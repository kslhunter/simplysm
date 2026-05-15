import { describe, it, expect } from "vitest";
import { toCamelCase } from "../src/index.js";

describe("toCamelCase", () => {
  it("converts kebab-case to camelCase", () => {
    expect(toCamelCase("foo-bar")).toBe("fooBar");
  });
  it("converts snake_case to camelCase", () => {
    expect(toCamelCase("foo_bar_baz")).toBe("fooBarBaz");
  });
});
