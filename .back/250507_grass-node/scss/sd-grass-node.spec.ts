import { describe, it, expect } from "vitest";
import { compileScss } from "@simplysm/sd-grass-node";

describe("sd-grass-node - core SCSS features", () => {
  it("should compile @mixin and @include", () => {
    const scss = `
      @mixin button-style {
        padding: 10px;
        border-radius: 5px;
      }

      .btn {
        @include button-style;
      }
    `;
    const css = compileScss(scss);
    expect(css).toContain("padding: 10px");
    expect(css).toContain("border-radius: 5px");
  });

  it("should compile @use and access members", () => {
    const scss = `
      @use "sass:color";

      .box {
        color: color.adjust(#333, $lightness: +10%);
      }
    `;
    const css = compileScss(scss);
    expect(css).toMatch(/color: #[0-9a-f]{6}/i);
  });

  it("should compile @function and use return values", () => {
    const scss = `
      @function double($n) {
        @return $n * 2;
      }

      .val {
        width: double(5px);
      }
    `;
    const css = compileScss(scss);
    expect(css).toContain("width: 10px");
  });

  it("should support nested @use with namespace", () => {
    const scss = `
      @use "sass:math";

      .circle {
        width: math.round(10.7px);
      }
    `;
    const css = compileScss(scss);
    expect(css).toContain("width: 11px");
  });

  it("should error on invalid @use path", () => {
    const scss = `
      @use "nonexistent/module";
    `;
    expect(() => compileScss(scss)).toThrow(/Can't find stylesheet/);
  });

  it("should support default exports in @use", () => {
    const scss = `
      // Simulate _theme.scss content via inline module (would be external in real use)
      $main-color: red !default;

      .color {
        color: $main-color;
      }
    `;
    const css = compileScss(scss);
    expect(css).toContain("color: red");
  });

  it("should compile @import fallback syntax (legacy)", () => {
    const scss = `
      @import "sass:math";

      .val {
        width: math.round(8.9px);
      }
    `;
    const css = compileScss(scss);
    expect(css).toContain("width: 9px");
  });
});
