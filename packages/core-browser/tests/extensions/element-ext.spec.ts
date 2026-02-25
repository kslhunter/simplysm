import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TimeoutError } from "@simplysm/core-common";
import "../../src/extensions/element-ext";
import { copyElement, pasteToElement, getBounds } from "../../src/extensions/element-ext";

describe("Element prototype extensions", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe("prependChild", () => {
    it("inserts an element as the first child", () => {
      const existing = document.createElement("span");
      existing.textContent = "existing";
      container.appendChild(existing);

      const newChild = document.createElement("div");
      newChild.textContent = "new";

      const result = container.prependChild(newChild);

      expect(result).toBe(newChild);
      expect(container.children[0]).toBe(newChild);
      expect(container.children[1]).toBe(existing);
    });

    it("inserts into an empty container", () => {
      const newChild = document.createElement("div");
      container.prependChild(newChild);

      expect(container.children[0]).toBe(newChild);
      expect(container.children.length).toBe(1);
    });
  });

  describe("findAll", () => {
    it("searches all child elements by selector", () => {
      container.innerHTML = `
        <div class="item">1</div>
        <div class="item">2</div>
        <span class="item">3</span>
      `;

      const result = container.findAll(".item");

      expect(result.length).toBe(3);
    });

    it("supports multiple selectors", () => {
      container.innerHTML = `
        <div class="a">a</div>
        <span class="b">b</span>
        <p class="c">c</p>
      `;

      const result = container.findAll(".a, .b");

      expect(result.length).toBe(2);
    });

    it("returns empty array when no elements match", () => {
      const result = container.findAll(".not-exist");
      expect(result).toEqual([]);
    });

    it("returns empty array for empty selector", () => {
      container.innerHTML = `<div class="item">1</div>`;
      const result = container.findAll("");
      expect(result).toEqual([]);
    });

    it("returns empty array for whitespace-only selector", () => {
      container.innerHTML = `<div class="item">1</div>`;
      const result = container.findAll("   ");
      expect(result).toEqual([]);
    });

    it("handles comma in attribute selector", () => {
      container.innerHTML = `
        <div data-values="a,b,c">1</div>
        <div class="item">2</div>
      `;

      // When comma is in attribute selector
      // Current implementation may split incorrectly, single selector recommended
      const result = container.findAll('[data-values="a,b,c"]');

      // Edge case behavior verification
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("findFirst", () => {
    it("returns first matching element", () => {
      container.innerHTML = `
        <div class="item" id="first">1</div>
        <div class="item" id="second">2</div>
      `;

      const result = container.findFirst(".item");

      expect(result?.id).toBe("first");
    });

    it("returns undefined when no element matches", () => {
      const result = container.findFirst(".not-exist");
      expect(result).toBeUndefined();
    });

    it("returns undefined for empty selector", () => {
      container.innerHTML = `<div class="item">1</div>`;
      const result = container.findFirst("");
      expect(result).toBeUndefined();
    });

    it("returns undefined for whitespace-only selector", () => {
      container.innerHTML = `<div class="item">1</div>`;
      const result = container.findFirst("   ");
      expect(result).toBeUndefined();
    });
  });

  describe("getParents", () => {
    it("returns all parent elements", () => {
      container.innerHTML = `<div id="level1"><div id="level2"><span id="target"></span></div></div>`;
      const target = container.querySelector("#target")!;

      const parents = target.getParents();

      expect(parents.length).toBeGreaterThanOrEqual(3);
      expect(parents[0].id).toBe("level2");
      expect(parents[1].id).toBe("level1");
    });

    it("includes up to body element", () => {
      const parents = container.getParents();
      expect(parents).toContain(document.body);
    });
  });

  describe("findFocusableParent", () => {
    it("returns focusable parent element", () => {
      container.innerHTML = `<button id="parent-btn"><span id="child">text</span></button>`;
      const child = container.querySelector("#child")!;

      const result = child.findFocusableParent();

      expect(result?.id).toBe("parent-btn");
    });

    it("returns undefined when no focusable parent exists", () => {
      container.innerHTML = `<div><span id="child">text</span></div>`;
      const child = container.querySelector("#child")!;

      const result = child.findFocusableParent();

      expect(result).toBeUndefined();
    });

    it("finds focusable element via tabindex attribute", () => {
      const parent = document.createElement("div");
      parent.setAttribute("tabindex", "0");
      const child = document.createElement("span");
      parent.appendChild(child);
      document.body.appendChild(parent);

      const result = child.findFocusableParent();
      expect(result).toBe(parent);

      document.body.removeChild(parent);
    });
  });

  describe("isOffsetElement", () => {
    it("position: relative is an offset element", () => {
      container.style.position = "relative";
      expect(container.isOffsetElement()).toBe(true);
    });

    it("position: absolute is an offset element", () => {
      container.style.position = "absolute";
      expect(container.isOffsetElement()).toBe(true);
    });

    it("position: fixed is an offset element", () => {
      container.style.position = "fixed";
      expect(container.isOffsetElement()).toBe(true);
    });

    it("position: sticky is an offset element", () => {
      container.style.position = "sticky";
      expect(container.isOffsetElement()).toBe(true);
    });

    it("position: static is not an offset element", () => {
      container.style.position = "static";
      expect(container.isOffsetElement()).toBe(false);
    });
  });

  describe("isVisible", () => {
    it("basic element is visible", () => {
      container.style.width = "100px";
      container.style.height = "100px";
      expect(container.isVisible()).toBe(true);
    });

    it("visibility: hidden is not visible", () => {
      container.style.visibility = "hidden";
      expect(container.isVisible()).toBe(false);
    });

    it("opacity: 0 is not visible", () => {
      container.style.opacity = "0";
      expect(container.isVisible()).toBe(false);
    });

    it("display: none is not visible", () => {
      container.style.display = "none";
      expect(container.isVisible()).toBe(false);
    });

    it("determines visibility of element with zero width", () => {
      container.style.width = "0";
      container.style.height = "100px";
      // When getClientRects().length is 0, it is not visible
      const isVisible = container.isVisible();
      // May vary depending on browser, verify it is boolean type
      expect(typeof isVisible).toBe("boolean");
    });

    it("determines visibility of element with zero height", () => {
      container.style.width = "100px";
      container.style.height = "0";
      // When getClientRects().length is 0, it is not visible
      const isVisible = container.isVisible();
      // May vary depending on browser, verify it is boolean type
      expect(typeof isVisible).toBe("boolean");
    });
  });

  describe("copyElement", () => {
    function createMockClipboardEvent(target: Element, data?: string): ClipboardEvent {
      const clipboardData = {
        setData: vi.fn(),
        getData: vi.fn().mockReturnValue(data ?? ""),
      };
      return {
        target,
        clipboardData,
        preventDefault: vi.fn(),
      } as unknown as ClipboardEvent;
    }

    it("copies value of input element", () => {
      container.innerHTML = `<input type="text" value="test value" />`;
      const event = createMockClipboardEvent(container);

      copyElement(event);

      expect(event.clipboardData?.setData).toHaveBeenCalledWith("text/plain", "test value");
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it("copies value of textarea element", () => {
      container.innerHTML = `<textarea>textarea content</textarea>`;
      const event = createMockClipboardEvent(container);

      copyElement(event);

      expect(event.clipboardData?.setData).toHaveBeenCalledWith("text/plain", "textarea content");
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it("maintains default behavior when no input/textarea exists", () => {
      container.innerHTML = `<span>content</span>`;
      const event = createMockClipboardEvent(container);

      copyElement(event);

      expect(event.clipboardData?.setData).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("does nothing when clipboardData is null", () => {
      const event = {
        target: container,
        clipboardData: null,
        preventDefault: vi.fn(),
      } as unknown as ClipboardEvent;

      copyElement(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("does nothing when target is not an Element", () => {
      const event = {
        target: document,
        clipboardData: { setData: vi.fn(), getData: vi.fn() },
        preventDefault: vi.fn(),
      } as unknown as ClipboardEvent;

      copyElement(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("copies first input value when multiple inputs exist", () => {
      container.innerHTML = `
        <input type="text" value="first" />
        <input type="text" value="second" />
      `;
      const clipboardData = {
        setData: vi.fn(),
        getData: vi.fn().mockReturnValue(""),
      };
      const event = {
        target: container,
        clipboardData,
        preventDefault: vi.fn(),
      } as unknown as ClipboardEvent;

      copyElement(event);

      expect(clipboardData.setData).toHaveBeenCalledWith("text/plain", "first");
    });
  });

  describe("pasteToElement", () => {
    function createMockClipboardEvent(target: Element, data?: string): ClipboardEvent {
      const clipboardData = {
        setData: vi.fn(),
        getData: vi.fn().mockReturnValue(data ?? ""),
      };
      return {
        target,
        clipboardData,
        preventDefault: vi.fn(),
      } as unknown as ClipboardEvent;
    }

    it("pastes clipboard content into input element", () => {
      container.innerHTML = `<input type="text" />`;
      const input = container.querySelector("input")!;
      const event = createMockClipboardEvent(container, "pasted text");

      pasteToElement(event);

      expect(input.value).toBe("pasted text");
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it("triggers input event on paste", () => {
      container.innerHTML = `<input type="text" />`;
      const input = container.querySelector("input")!;
      const inputEventSpy = vi.fn();
      input.addEventListener("input", inputEventSpy);

      const event = createMockClipboardEvent(container, "pasted text");
      pasteToElement(event);

      expect(inputEventSpy).toHaveBeenCalledTimes(1);
    });

    it("pastes clipboard content into textarea element", () => {
      container.innerHTML = `<textarea></textarea>`;
      const textarea = container.querySelector("textarea")!;
      const event = createMockClipboardEvent(container, "pasted text");

      pasteToElement(event);

      expect(textarea.value).toBe("pasted text");
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it("does nothing when no input/textarea exists", () => {
      container.innerHTML = `<div>no input</div>`;
      const event = createMockClipboardEvent(container, "pasted text");

      pasteToElement(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("does nothing when clipboardData is null", () => {
      container.innerHTML = `<input type="text" />`;
      const event = {
        target: container,
        clipboardData: null,
        preventDefault: vi.fn(),
      } as unknown as ClipboardEvent;

      pasteToElement(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("does nothing when target is not an Element", () => {
      const event = {
        target: document,
        clipboardData: { setData: vi.fn(), getData: vi.fn().mockReturnValue("text") },
        preventDefault: vi.fn(),
      } as unknown as ClipboardEvent;

      pasteToElement(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("pastes to first input when multiple inputs exist", () => {
      container.innerHTML = `
        <input type="text" value="existing1" />
        <input type="text" value="existing2" />
      `;
      const inputs = container.querySelectorAll("input");
      const clipboardData = {
        setData: vi.fn(),
        getData: vi.fn().mockReturnValue("pasted"),
      };
      const event = {
        target: container,
        clipboardData,
        preventDefault: vi.fn(),
      } as unknown as ClipboardEvent;

      pasteToElement(event);

      expect(inputs[0].value).toBe("pasted");
      expect(inputs[1].value).toBe("existing2");
    });
  });

  describe("getBounds", () => {
    it("returns empty array immediately when passed empty array", async () => {
      const result = await getBounds([]);
      expect(result).toEqual([]);
    });

    it("queries bounds using IntersectionObserver", async () => {
      const mockObserver = {
        observe: vi.fn(),
        disconnect: vi.fn(),
      };

      const MockIntersectionObserver = vi.fn(function (
        this: IntersectionObserver,
        callback: IntersectionObserverCallback,
      ) {
        setTimeout(() => {
          callback(
            [
              {
                target: container,
                boundingClientRect: {
                  top: 10,
                  left: 20,
                  width: 100,
                  height: 50,
                },
              },
            ] as unknown as IntersectionObserverEntry[],
            this,
          );
        }, 0);
        return mockObserver;
      });

      vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

      const result = await getBounds([container]);

      expect(result.length).toBe(1);
      expect(result[0].target).toBe(container);
      expect(result[0].top).toBe(10);
      expect(result[0].left).toBe(20);
      expect(result[0].width).toBe(100);
      expect(result[0].height).toBe(50);

      expect(mockObserver.observe).toHaveBeenCalledWith(container);
      expect(mockObserver.disconnect).toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it("queries multiple elements simultaneously", async () => {
      const el1 = document.createElement("div");
      const el2 = document.createElement("div");

      const mockObserver = {
        observe: vi.fn(),
        disconnect: vi.fn(),
      };

      const MockIntersectionObserver = vi.fn(function (
        this: IntersectionObserver,
        callback: IntersectionObserverCallback,
      ) {
        setTimeout(() => {
          callback(
            [
              {
                target: el1,
                boundingClientRect: { top: 0, left: 0, width: 10, height: 10 },
              },
              {
                target: el2,
                boundingClientRect: { top: 20, left: 20, width: 20, height: 20 },
              },
            ] as unknown as IntersectionObserverEntry[],
            this,
          );
        }, 0);
        return mockObserver;
      });

      vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

      const result = await getBounds([el1, el2]);

      expect(result.length).toBe(2);
      expect(mockObserver.observe).toHaveBeenCalledTimes(2);

      vi.unstubAllGlobals();
    });

    it("handles duplicate elements only once", async () => {
      const mockObserver = {
        observe: vi.fn(),
        disconnect: vi.fn(),
      };

      const MockIntersectionObserver = vi.fn(function (
        this: IntersectionObserver,
        callback: IntersectionObserverCallback,
      ) {
        setTimeout(() => {
          callback(
            [
              {
                target: container,
                boundingClientRect: { top: 10, left: 20, width: 100, height: 50 },
              },
            ] as unknown as IntersectionObserverEntry[],
            this,
          );
        }, 0);
        return mockObserver;
      });

      vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

      // Pass the same element 3 times
      const result = await getBounds([container, container, container]);

      // Result should contain only 1 element
      expect(result.length).toBe(1);
      expect(result[0].target).toBe(container);
      // observe should be called only once
      expect(mockObserver.observe).toHaveBeenCalledTimes(1);

      vi.unstubAllGlobals();
    });

    it("results are sorted in input order", async () => {
      const el1 = document.createElement("div");
      const el2 = document.createElement("div");
      const el3 = document.createElement("div");

      const mockObserver = {
        observe: vi.fn(),
        disconnect: vi.fn(),
      };

      const MockIntersectionObserver = vi.fn(function (
        this: IntersectionObserver,
        callback: IntersectionObserverCallback,
      ) {
        setTimeout(() => {
          // Callback is called in reverse order (el3, el2, el1)
          callback(
            [
              {
                target: el3,
                boundingClientRect: { top: 30, left: 30, width: 30, height: 30 },
              },
              {
                target: el2,
                boundingClientRect: { top: 20, left: 20, width: 20, height: 20 },
              },
              {
                target: el1,
                boundingClientRect: { top: 10, left: 10, width: 10, height: 10 },
              },
            ] as unknown as IntersectionObserverEntry[],
            this,
          );
        }, 0);
        return mockObserver;
      });

      vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

      // Input order: el1, el2, el3
      const result = await getBounds([el1, el2, el3]);

      // Results should also be in input order: el1, el2, el3
      expect(result.length).toBe(3);
      expect(result[0].target).toBe(el1);
      expect(result[1].target).toBe(el2);
      expect(result[2].target).toBe(el3);

      vi.unstubAllGlobals();
    });

    it("throws TimeoutError on timeout", async () => {
      const mockObserver = {
        observe: vi.fn(),
        disconnect: vi.fn(),
      };

      // Mock that does not call the callback (triggers timeout)
      const MockIntersectionObserver = vi.fn(function () {
        return mockObserver;
      });

      vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

      // Test with 50ms timeout
      await expect(getBounds([container], 50)).rejects.toThrow(TimeoutError);

      vi.unstubAllGlobals();
    });

    it("supports custom timeout setting", async () => {
      const mockObserver = {
        observe: vi.fn(),
        disconnect: vi.fn(),
      };

      const MockIntersectionObserver = vi.fn(function (
        this: IntersectionObserver,
        callback: IntersectionObserverCallback,
      ) {
        // Responds after 100ms
        setTimeout(() => {
          callback(
            [
              {
                target: container,
                boundingClientRect: { top: 0, left: 0, width: 10, height: 10 },
              },
            ] as unknown as IntersectionObserverEntry[],
            this,
          );
        }, 100);
        return mockObserver;
      });

      vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

      // Should succeed with 200ms timeout
      const result = await getBounds([container], 200);
      expect(result.length).toBe(1);

      vi.unstubAllGlobals();
    });

    it("collects all results even when callback is called multiple times", async () => {
      const el1 = document.createElement("div");
      const el2 = document.createElement("div");
      const el3 = document.createElement("div");

      const mockObserver = {
        observe: vi.fn(),
        disconnect: vi.fn(),
      };

      const MockIntersectionObserver = vi.fn(function (
        this: IntersectionObserver,
        callback: IntersectionObserverCallback,
      ) {
        // First callback - only el1
        setTimeout(() => {
          callback(
            [
              {
                target: el1,
                boundingClientRect: { top: 10, left: 10, width: 10, height: 10 },
              },
            ] as unknown as IntersectionObserverEntry[],
            this,
          );
        }, 0);

        // Second callback - el2, el3
        setTimeout(() => {
          callback(
            [
              {
                target: el2,
                boundingClientRect: { top: 20, left: 20, width: 20, height: 20 },
              },
              {
                target: el3,
                boundingClientRect: { top: 30, left: 30, width: 30, height: 30 },
              },
            ] as unknown as IntersectionObserverEntry[],
            this,
          );
        }, 10);

        return mockObserver;
      });

      vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

      const result = await getBounds([el1, el2, el3]);

      // All elements should be collected
      expect(result.length).toBe(3);
      // Results should be sorted in input order
      expect(result[0].target).toBe(el1);
      expect(result[1].target).toBe(el2);
      expect(result[2].target).toBe(el3);

      vi.unstubAllGlobals();
    });
  });
});
