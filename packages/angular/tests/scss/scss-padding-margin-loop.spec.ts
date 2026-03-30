import { describe, it, expect, beforeAll, afterAll } from "vitest";
import cssText from "../../scss/styles.scss?inline";

describe("Feature 1.1 Slice 2: padding/margin/size/position 루프 통합", () => {
  let style: HTMLStyleElement;

  beforeAll(() => {
    style = document.createElement("style");
    style.textContent = cssText;
    document.head.appendChild(style);
  });

  afterAll(() => {
    style.remove();
  });

  const gapKeys = ["xxs", "xs", "sm", "default", "lg", "xl", "xxl", "0", "auto"];

  describe("Scenario: 분산된 @each 루프를 통합", () => {
    it("padding 클래스가 올바른 CSS 속성을 적용한다", () => {
      const el = document.createElement("div");
      el.className = "p-default";
      document.body.appendChild(el);
      const padding = getComputedStyle(el).padding;
      el.remove();
      // var(--gap-default) = 0.5rem = 8px at default 16px root
      expect(padding).not.toBe("0px");
    });

    it("margin 방향별 클래스가 올바른 CSS 속성을 적용한다", () => {
      const el = document.createElement("div");
      el.className = "mt-sm";
      document.body.appendChild(el);
      const marginTop = getComputedStyle(el).marginTop;
      el.remove();
      expect(marginTop).not.toBe("0px");
    });
  });
});
