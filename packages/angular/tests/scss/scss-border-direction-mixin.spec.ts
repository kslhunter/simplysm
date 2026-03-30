import { describe, it, expect, beforeAll, afterAll } from "vitest";
import cssText from "../../scss/styles.scss?inline";

describe("Feature 1.1 Slice 3: border 방향별 mixin 추출", () => {
  let style: HTMLStyleElement;

  beforeAll(() => {
    style = document.createElement("style");
    style.textContent = cssText;
    document.head.appendChild(style);
  });

  afterAll(() => {
    style.remove();
  });

  const _directions = [
    { d: "t", dir: "top" },
    { d: "r", dir: "right" },
    { d: "b", dir: "bottom" },
    { d: "l", dir: "left" },
  ];

  it(".bdt-theme-primary-default가 border-top-color를 적용한다", () => {
    const el = document.createElement("div");
    el.className = "bdt-theme-primary-default";
    document.body.appendChild(el);
    const color = getComputedStyle(el).borderTopColor;
    el.remove();
    expect(color).not.toBe("");
  });
});
