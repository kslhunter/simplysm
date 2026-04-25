import { describe, it, expect, beforeAll, afterAll } from "vitest";

// Vite compiles SCSS and returns CSS as string (no DOM injection)
import cssText from "../../scss/styles.scss?inline";

describe("Feature 1.2.1 Slice 1: SCSS 크기 테마 제거 + rem 전환", () => {
  let style: HTMLStyleElement;

  beforeAll(() => {
    style = document.createElement("style");
    style.textContent = cssText;
    document.head.appendChild(style);
  });

  afterAll(() => {
    style.remove();
  });

  function getCssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  describe("Rule: 크기 테마(mobile/kiosk) SCSS를 제거한다", () => {
    it("CSS에 .sd-theme-mobile 클래스가 없다", () => {
      expect(cssText).not.toContain(".sd-theme-mobile");
    });

    it("CSS에 .sd-theme-kiosk 클래스가 없다", () => {
      expect(cssText).not.toContain(".sd-theme-kiosk");
    });

    it("@layer 선언에 theme 레이어가 없다", () => {
      const layerMatch = cssText.match(/@layer\s+([^;]+);/);
      expect(layerMatch).not.toBeNull();
      const layers = layerMatch![1].split(",").map((l) => l.trim());
      expect(layers).not.toContain("theme");
      expect(layers).toContain("base");
      expect(layers).toContain("theme-variant");
      expect(layers).toContain("utilities");
    });
  });

  describe("Rule: 크기 CSS 변수를 rem 단위로 표현한다", () => {
    it("gap 변수가 rem이다", () => {
      expect(getCssVar("--gap-xxs")).toBe("0.0833rem");
      expect(getCssVar("--gap-xs")).toBe("0.1667rem");
      expect(getCssVar("--gap-sm")).toBe("0.3333rem");
      expect(getCssVar("--gap-default")).toBe("0.5rem");
      expect(getCssVar("--gap-lg")).toBe("0.6667rem");
      expect(getCssVar("--gap-xl")).toBe("1rem");
      expect(getCssVar("--gap-xxl")).toBe("1.5rem");
    });

    it("font-size 변수가 rem이다", () => {
      expect(getCssVar("--font-size-sm")).toBe("0.9167rem");
      expect(getCssVar("--font-size-default")).toBe("1rem");
      expect(getCssVar("--font-size-lg")).toBe("1.1667rem");
      expect(getCssVar("--font-size-h1")).toBe("2rem");
      expect(getCssVar("--font-size-h2")).toBe("1.5rem");
      expect(getCssVar("--font-size-h3")).toBe("1.3333rem");
      expect(getCssVar("--font-size-h4")).toBe("1.1667rem");
      expect(getCssVar("--font-size-h5")).toBe("1rem");
      expect(getCssVar("--font-size-h6")).toBe("0.9167rem");
    });

    it("elevation-size가 rem이다", () => {
      expect(getCssVar("--elevation-size")).toBe("0.0833rem");
    });

    it("border-radius는 gap var() 참조를 유지한다", () => {
      // getPropertyValue resolves var() references, so check CSS text directly
      expect(cssText).toMatch(/--border-radius-xs:\s*var\(--gap-xxs\)/);
      expect(cssText).toMatch(/--border-radius-default:\s*var\(--gap-sm\)/);
    });
  });

  describe("Rule: 이미 em인 값은 em을 유지한다", () => {
    it("sidebar width는 15rem이다", () => {
      expect(getCssVar("--sidebar-width")).toBe("15rem");
    });

    it("topbar height는 3rem이다", () => {
      expect(getCssVar("--topbar-height")).toBe("3rem");
    });

    it("line-height는 1.5em이다", () => {
      expect(getCssVar("--line-height")).toBe("1.5em");
    });
  });

  describe("Rule: border 너비는 px 유지, 크기 관련 하드코드 px은 rem 전환", () => {
    it("스크롤바 크기가 rem이다", () => {
      expect(cssText).toMatch(/::-webkit-scrollbar\s*\{[^}]*width:\s*1rem/);
      expect(cssText).toMatch(/::-webkit-scrollbar\s*\{[^}]*height:\s*1rem/);
    });

    it("스크롤바 border-radius가 rem이다", () => {
      expect(cssText).toMatch(/::-webkit-scrollbar-thumb\s*\{[^}]*border-radius:\s*0\.6667rem/);
    });

    it("스크롤바 border 너비는 px이다", () => {
      expect(cssText).toMatch(/::-webkit-scrollbar-thumb\s*\{[^}]*border:\s*2px\s+solid\s+transparent/);
    });

    it("hr separator는 1px이다", () => {
      expect(cssText).toMatch(/\bhr\s*\{[^}]*height:\s*1px/);
    });

    it("유틸리티 border 클래스는 1px이다", () => {
      expect(cssText).toMatch(/\.bd\s*\{[^}]*border:\s*1px\s+solid/);
    });
  });
});
