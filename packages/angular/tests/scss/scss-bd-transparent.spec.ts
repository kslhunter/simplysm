import { describe, it, expect, beforeAll, afterAll } from "vitest";
import cssText from "../../scss/styles.scss?inline";

describe("Feature 1.1 Slice 1: .bd-trans → .bd-transparent 네이밍 변경", () => {
  let style: HTMLStyleElement;

  beforeAll(() => {
    style = document.createElement("style");
    style.textContent = cssText;
    document.head.appendChild(style);
  });

  afterAll(() => {
    style.remove();
  });

  it(".bd-transparent 클래스가 border-color: transparent를 적용한다", () => {
    const el = document.createElement("div");
    el.className = "bd-transparent";
    document.body.appendChild(el);
    const borderColor = getComputedStyle(el).borderColor;
    el.remove();
    expect(borderColor).toMatch(/transparent|rgba\(0,\s*0,\s*0,\s*0\)/);
  });

  it(".bdt-transparent 클래스가 border-top-color: transparent를 적용한다", () => {
    const el = document.createElement("div");
    el.className = "bdt-transparent";
    document.body.appendChild(el);
    const borderTopColor = getComputedStyle(el).borderTopColor;
    el.remove();
    expect(borderTopColor).toMatch(/transparent|rgba\(0,\s*0,\s*0,\s*0\)/);
  });
});
