import { describe, it, expect, beforeAll, afterAll } from "vitest";
import cssText from "../../scss/styles.scss?inline";

describe("FIX-4: SCSS/Theme Issues", () => {
  let style: HTMLStyleElement;

  beforeAll(() => {
    style = document.createElement("style");
    style.textContent = cssText;
    document.head.appendChild(style);
  });

  afterAll(() => {
    style.remove();
  });

  describe("SCSS-001: 다크 테마 trans-lightest 변수 존재", () => {
    it("다크 테마 CSS에 --trans-lightest 변수가 정의되어 있다", () => {
      // 다크 테마는 .sd-theme-dark 또는 prefers-color-scheme: dark에서 정의됨
      // CSS 텍스트에서 다크 테마 블록 내에 --trans-lightest가 있는지 확인
      expect(cssText).toMatch(/--trans-lightest:/);

      // 라이트 테마의 trans-lightest는 rgba(0, 0, 0, 0.03)
      // 다크 테마가 있는 경우, 다크 테마 블록에서도 정의되어야 함
      // sd-theme-dark 클래스 블록 내에 --trans-lightest가 있는지 확인
      const darkThemeMatch = cssText.match(
        /\.sd-theme-dark\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/,
      );
      expect(darkThemeMatch).not.toBeNull();
      expect(darkThemeMatch![1]).toContain("--trans-lightest:");
    });
  });

  describe("SCSS-002: table border-color-dark 수정", () => {
    it("table CSS에서 외곽 border와 내부 border가 다른 변수를 사용한다", () => {
      // $border-color-dark는 var(--border-color-default)를 사용해야 함
      // $border-color-light는 var(--theme-gray-lighter)를 유지
      // 컴파일된 CSS에서 .table의 border-right이 --border-color-default를 참조하는지 확인
      const tableBlock = cssText.match(/\.table\s*\{([^}]+)\}/);
      expect(tableBlock).not.toBeNull();
      expect(tableBlock![1]).toContain("var(--border-color-default)");
    });
  });

  describe("CONSIST-009: breakpoint SCSS 변수", () => {
    it("grid 미디어 쿼리에 올바른 breakpoint가 사용된다", () => {
      // 값 자체는 변경되지 않으므로 여전히 1280px, 1024px, 800px이어야 함
      expect(cssText).toMatch(/@media\s*\(max-width:\s*1280px\)/);
      expect(cssText).toMatch(/@media\s*\(max-width:\s*1024px\)/);
      expect(cssText).toMatch(/@media\s*\(max-width:\s*800px\)/);
    });
  });
});
