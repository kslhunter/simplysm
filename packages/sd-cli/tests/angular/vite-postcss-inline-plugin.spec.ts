import { describe, it, expect } from "vitest";
import { processPostCssInline } from "../../src/angular/vite-postcss-inline-plugin";
import type postcss from "postcss";

// 간단한 PostCSS 플러그인: 모든 color 값을 "red"로 교체
const testPlugin: postcss.PluginCreator<void> = () => ({
  postcssPlugin: "test-color-red",
  Declaration(decl) {
    if (decl.prop === "color") {
      decl.value = "red";
    }
  },
});
testPlugin.postcss = true;

describe("processPostCssInline", () => {
  // Acceptance: Scenario "Angular 라이브러리 번들 JS 내 인라인 CSS에 PostCSS 적용"
  it("applies PostCSS to @Component styles array CSS strings", async () => {
    const input = `Component({ styles: ['.host { color: blue; }'] })`;
    const result = await processPostCssInline(input, "test.js", [testPlugin]);

    expect(result).toContain("color: red");
    expect(result).not.toContain("color: blue");
  });

  // Unit: template literal styles
  it("applies PostCSS to template literal styles", async () => {
    const input = "Component({ styles: [`.host { color: blue; }`] })";
    const result = await processPostCssInline(input, "test.js", [testPlugin]);

    expect(result).toContain("color: red");
  });

  // Unit: no Component keyword
  it("returns original code when no Component keyword present", async () => {
    const input = `var x = 1;`;
    const result = await processPostCssInline(input, "test.js", [testPlugin]);

    expect(result).toBe(input);
  });

  // Unit: multiple styles in array
  it("processes multiple styles in the array", async () => {
    const input = `Component({ styles: ['.a { color: blue; }', '.b { color: green; }'] })`;
    const result = await processPostCssInline(input, "test.js", [testPlugin]);

    expect(result).toContain(".a { color: red; }");
    expect(result).toContain(".b { color: red; }");
  });
});
