import { describe, it, expect, beforeAll, afterAll } from "vitest";
import cssText from "../../scss/styles.scss?inline";

describe("Feature 1.1 Slice 4: border-radius 방향별 정리", () => {
  let style: HTMLStyleElement;

  beforeAll(() => {
    style = document.createElement("style");
    style.textContent = cssText;
    document.head.appendChild(style);
  });

  afterAll(() => {
    style.remove();
  });

  const radiusKeys = ["xs", "sm", "default", "lg", "xl", "xxl"];

  describe("Scenario: 반복되는 방향별 radius 패턴을 정리", () => {
    it(".bdt-radius-default가 top-right와 top-left radius를 설정한다", () => {
      // CSS 텍스트에서 올바른 속성이 포함되어 있는지 확인
      const match = cssText.match(/\.bdt-radius-default\s*\{([^}]+)\}/);
      expect(match).not.toBeNull();
      const body = match![1];
      expect(body).toContain("border-top-right-radius");
      expect(body).toContain("border-top-left-radius");
      // bottom radius는 포함되지 않아야 한다
      expect(body).not.toContain("border-bottom");
    });

    it(".bdl-radius-default가 top-left와 bottom-left radius를 설정한다", () => {
      const match = cssText.match(/\.bdl-radius-default\s*\{([^}]+)\}/);
      expect(match).not.toBeNull();
      const body = match![1];
      expect(body).toContain("border-top-left-radius");
      expect(body).toContain("border-bottom-left-radius");
      // right radius는 포함되지 않아야 한다
      expect(body).not.toContain("right-radius");
    });
  });
});
