// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ElementUtils } from "../../src/utils/element";

describe("ElementUtils", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe("prependChild", () => {
    it("요소를 첫 번째 자식으로 삽입", () => {
      const existing = document.createElement("span");
      existing.textContent = "existing";
      container.appendChild(existing);

      const newChild = document.createElement("div");
      newChild.textContent = "new";

      const result = ElementUtils.prependChild(container, newChild);

      expect(result).toBe(newChild);
      expect(container.children[0]).toBe(newChild);
      expect(container.children[1]).toBe(existing);
    });

    it("빈 컨테이너에 삽입", () => {
      const newChild = document.createElement("div");
      ElementUtils.prependChild(container, newChild);

      expect(container.children[0]).toBe(newChild);
      expect(container.children.length).toBe(1);
    });
  });

  describe("findAll", () => {
    it("셀렉터로 하위 요소 전체 검색", () => {
      container.innerHTML = `
        <div class="item">1</div>
        <div class="item">2</div>
        <span class="item">3</span>
      `;

      const result = ElementUtils.findAll(container, ".item");

      expect(result.length).toBe(3);
    });

    it("복합 셀렉터 지원", () => {
      container.innerHTML = `
        <div class="a">a</div>
        <span class="b">b</span>
        <p class="c">c</p>
      `;

      const result = ElementUtils.findAll(container, ".a, .b");

      expect(result.length).toBe(2);
    });

    it("매칭 요소 없으면 빈 배열 반환", () => {
      const result = ElementUtils.findAll(container, ".not-exist");
      expect(result).toEqual([]);
    });
  });

  describe("findFirst", () => {
    it("첫 번째 매칭 요소 반환", () => {
      container.innerHTML = `
        <div class="item" id="first">1</div>
        <div class="item" id="second">2</div>
      `;

      const result = ElementUtils.findFirst(container, ".item");

      expect(result?.id).toBe("first");
    });

    it("매칭 요소 없으면 undefined 반환", () => {
      const result = ElementUtils.findFirst(container, ".not-exist");
      expect(result).toBeUndefined();
    });
  });

  describe("getParents", () => {
    it("모든 부모 요소 반환", () => {
      container.innerHTML = `<div id="level1"><div id="level2"><span id="target"></span></div></div>`;
      const target = container.querySelector("#target")!;

      const parents = ElementUtils.getParents(target);

      expect(parents.length).toBeGreaterThanOrEqual(3);
      expect(parents[0].id).toBe("level2");
      expect(parents[1].id).toBe("level1");
    });

    it("body까지 포함", () => {
      const parents = ElementUtils.getParents(container);
      expect(parents).toContain(document.body);
    });
  });

  describe("findFocusableParent", () => {
    it("포커스 가능한 부모 요소 반환", () => {
      container.innerHTML = `<button id="parent-btn"><span id="child">text</span></button>`;
      const child = container.querySelector("#child")!;

      const result = ElementUtils.findFocusableParent(child);

      expect(result?.id).toBe("parent-btn");
    });

    it("포커스 가능한 부모 없으면 undefined", () => {
      container.innerHTML = `<div><span id="child">text</span></div>`;
      const child = container.querySelector("#child")!;

      const result = ElementUtils.findFocusableParent(child);

      expect(result).toBeUndefined();
    });
  });

  describe("isOffsetElement", () => {
    it("position: relative는 offset 요소", () => {
      container.style.position = "relative";
      expect(ElementUtils.isOffsetElement(container)).toBe(true);
    });

    it("position: absolute는 offset 요소", () => {
      container.style.position = "absolute";
      expect(ElementUtils.isOffsetElement(container)).toBe(true);
    });

    it("position: fixed는 offset 요소", () => {
      container.style.position = "fixed";
      expect(ElementUtils.isOffsetElement(container)).toBe(true);
    });

    it("position: sticky는 offset 요소", () => {
      container.style.position = "sticky";
      expect(ElementUtils.isOffsetElement(container)).toBe(true);
    });

    it("position: static은 offset 요소 아님", () => {
      container.style.position = "static";
      expect(ElementUtils.isOffsetElement(container)).toBe(false);
    });
  });

  describe("isVisible", () => {
    it("기본 요소는 visible", () => {
      container.style.width = "100px";
      container.style.height = "100px";
      expect(ElementUtils.isVisible(container)).toBe(true);
    });

    it("visibility: hidden은 not visible", () => {
      container.style.visibility = "hidden";
      expect(ElementUtils.isVisible(container)).toBe(false);
    });

    it("opacity: 0은 not visible", () => {
      container.style.opacity = "0";
      expect(ElementUtils.isVisible(container)).toBe(false);
    });
  });

  describe("copyElement", () => {
    function createMockClipboardEvent(
      target: Element,
      data?: string,
    ): ClipboardEvent {
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

    it("input 요소의 value 복사", () => {
      container.innerHTML = `<input type="text" value="test value" />`;
      const event = createMockClipboardEvent(container);

      ElementUtils.copyElement(event);

      expect(event.clipboardData?.setData).toHaveBeenCalledWith("text/plain", "test value");
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it("textarea 요소의 value 복사", () => {
      container.innerHTML = `<textarea>textarea content</textarea>`;
      const event = createMockClipboardEvent(container);

      ElementUtils.copyElement(event);

      expect(event.clipboardData?.setData).toHaveBeenCalledWith("text/plain", "textarea content");
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it("input/textarea 없으면 기본 동작 유지", () => {
      container.innerHTML = `<span>content</span>`;
      const event = createMockClipboardEvent(container);

      ElementUtils.copyElement(event);

      expect(event.clipboardData?.setData).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("clipboardData가 null이면 아무것도 안함", () => {
      const event = { target: container, clipboardData: null, preventDefault: vi.fn() } as unknown as ClipboardEvent;

      ElementUtils.copyElement(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("target이 Element가 아니면 아무것도 안함", () => {
      const event = {
        target: document,
        clipboardData: { setData: vi.fn(), getData: vi.fn() },
        preventDefault: vi.fn(),
      } as unknown as ClipboardEvent;

      ElementUtils.copyElement(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe("pasteToElement", () => {
    function createMockClipboardEvent(
      target: Element,
      data?: string,
    ): ClipboardEvent {
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

    it("클립보드 내용을 input에 붙여넣기", () => {
      container.innerHTML = `<input type="text" />`;
      const input = container.querySelector("input")!;
      const event = createMockClipboardEvent(container, "pasted text");

      ElementUtils.pasteToElement(event);

      expect(input.value).toBe("pasted text");
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it("클립보드 내용을 textarea에 붙여넣기", () => {
      container.innerHTML = `<textarea></textarea>`;
      const textarea = container.querySelector("textarea")!;
      const event = createMockClipboardEvent(container, "pasted text");

      ElementUtils.pasteToElement(event);

      expect(textarea.value).toBe("pasted text");
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it("input/textarea 없으면 아무것도 안함", () => {
      container.innerHTML = `<div>no input</div>`;
      const event = createMockClipboardEvent(container, "pasted text");

      ElementUtils.pasteToElement(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("clipboardData가 null이면 아무것도 안함", () => {
      container.innerHTML = `<input type="text" />`;
      const event = { target: container, clipboardData: null, preventDefault: vi.fn() } as unknown as ClipboardEvent;

      ElementUtils.pasteToElement(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("target이 Element가 아니면 아무것도 안함", () => {
      const event = {
        target: document,
        clipboardData: { setData: vi.fn(), getData: vi.fn().mockReturnValue("text") },
        preventDefault: vi.fn(),
      } as unknown as ClipboardEvent;

      ElementUtils.pasteToElement(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });
});
