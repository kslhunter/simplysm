import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ArgumentError } from "@simplysm/core-common";
import "../../src/extensions/html-element-ext";

describe("HTMLElement prototype extensions", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe("repaint", () => {
    it("triggers reflow by accessing offsetHeight", () => {
      const el = document.createElement("div");
      const offsetHeightSpy = vi.spyOn(el, "offsetHeight", "get").mockReturnValue(100);

      el.repaint();

      expect(offsetHeightSpy).toHaveBeenCalled();
    });
  });

  describe("getRelativeOffset", () => {
    it("calculates relative position based on parent element", () => {
      container.style.position = "relative";
      container.innerHTML = `<div id="child" style="position: absolute; top: 50px; left: 30px;"></div>`;

      const child = container.querySelector<HTMLElement>("#child")!;

      const result = child.getRelativeOffset(container);
      expect(result).toHaveProperty("top");
      expect(result).toHaveProperty("left");
      expect(typeof result.top).toBe("number");
      expect(typeof result.left).toBe("number");
    });

    it("finds parent by selector", () => {
      container.id = "parent";
      container.innerHTML = `<div><span id="deep-child"></span></div>`;

      const deepChild = container.querySelector<HTMLElement>("#deep-child")!;

      const result = deepChild.getRelativeOffset("#parent");
      expect(result).toHaveProperty("top");
      expect(result).toHaveProperty("left");
      expect(typeof result.top).toBe("number");
      expect(typeof result.left).toBe("number");
    });

    it("throws error when parent is not found", () => {
      const child = document.createElement("div");
      container.appendChild(child);

      expect(() => child.getRelativeOffset(".not-exist")).toThrow(ArgumentError);
    });

    it("handles elements with transforms", () => {
      container.style.position = "relative";
      container.style.transform = "scale(2)";
      container.innerHTML = `<div id="child" style="transform: rotate(45deg);"></div>`;

      const child = container.querySelector<HTMLElement>("#child")!;

      // Should return result without error even with transforms
      const result = child.getRelativeOffset(container);
      expect(result).toHaveProperty("top");
      expect(result).toHaveProperty("left");
      expect(typeof result.top).toBe("number");
      expect(typeof result.left).toBe("number");
    });

    it("accumulates border width of intermediate elements", () => {
      container.style.position = "relative";
      container.innerHTML = `
        <div id="middle" style="border: 10px solid black;">
          <div id="child"></div>
        </div>
      `;

      const child = container.querySelector<HTMLElement>("#child")!;
      const result = child.getRelativeOffset(container);

      // borderTopWidth(10px) and borderLeftWidth(10px) should be reflected in result
      expect(result.top).toBeGreaterThanOrEqual(10);
      expect(result.left).toBeGreaterThanOrEqual(10);
    });

    it("calculates correct position when parent element is scrolled", () => {
      container.style.position = "relative";
      container.style.overflow = "auto";
      container.style.height = "100px";
      container.style.width = "100px";

      const inner = document.createElement("div");
      inner.style.height = "500px";
      inner.style.width = "500px";
      inner.innerHTML = `<div id="child" style="position: absolute; top: 200px; left: 150px;"></div>`;
      container.appendChild(inner);

      // Scroll parent element
      container.scrollTop = 50;
      container.scrollLeft = 30;

      const child = container.querySelector<HTMLElement>("#child")!;
      const result = child.getRelativeOffset(container);

      // scrollTop/scrollLeft are reflected in result (parentEl.scrollTop + parentEl.scrollLeft added)
      // In test environment, getBoundingClientRect does not reflect scroll
      // Verify that at least scrollTop/scrollLeft values are added
      expect(result.top).toBeGreaterThanOrEqual(200);
      expect(result.left).toBeGreaterThanOrEqual(150);
    });
  });

  describe("scrollIntoViewIfNeeded", () => {
    it("scrolls when target is above offset", () => {
      container.style.overflow = "auto";
      container.style.height = "100px";
      // Add scrollable content
      const inner = document.createElement("div");
      inner.style.height = "500px";
      container.appendChild(inner);
      container.scrollTop = 100;

      container.scrollIntoViewIfNeeded({ top: 50, left: 0 }, { top: 10, left: 0 });

      expect(container.scrollTop).toBe(40);
    });

    it("does not scroll if target is sufficiently visible", () => {
      container.style.overflow = "auto";
      container.style.height = "100px";
      const inner = document.createElement("div");
      inner.style.height = "500px";
      container.appendChild(inner);
      container.scrollTop = 0;

      container.scrollIntoViewIfNeeded({ top: 50, left: 0 }, { top: 10, left: 0 });

      expect(container.scrollTop).toBe(0);
    });

    it("defaults to 0 offset", () => {
      container.style.overflow = "auto";
      container.style.height = "100px";
      const inner = document.createElement("div");
      inner.style.height = "500px";
      container.appendChild(inner);
      container.scrollTop = 100;

      container.scrollIntoViewIfNeeded({ top: 50, left: 0 });

      expect(container.scrollTop).toBe(50);
    });

    it("scrolls horizontally when target is to the left of offset", () => {
      container.style.overflow = "auto";
      container.style.width = "100px";
      // Add scrollable content
      const inner = document.createElement("div");
      inner.style.width = "500px";
      inner.style.height = "10px";
      container.appendChild(inner);
      container.scrollLeft = 100;

      container.scrollIntoViewIfNeeded({ top: 0, left: 50 }, { top: 0, left: 10 });

      expect(container.scrollLeft).toBe(40);
    });

    it("does not scroll horizontally if target is sufficiently visible", () => {
      container.style.overflow = "auto";
      container.style.width = "100px";
      const inner = document.createElement("div");
      inner.style.width = "500px";
      inner.style.height = "10px";
      container.appendChild(inner);
      container.scrollLeft = 0;

      container.scrollIntoViewIfNeeded({ top: 0, left: 50 }, { top: 0, left: 10 });

      expect(container.scrollLeft).toBe(0);
    });
  });
});
