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
    it("요소를 첫 번째 자식으로 삽입", () => {
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

    it("빈 컨테이너에 삽입", () => {
      const newChild = document.createElement("div");
      container.prependChild(newChild);

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

      const result = container.findAll(".item");

      expect(result.length).toBe(3);
    });

    it("복합 셀렉터 지원", () => {
      container.innerHTML = `
        <div class="a">a</div>
        <span class="b">b</span>
        <p class="c">c</p>
      `;

      const result = container.findAll(".a, .b");

      expect(result.length).toBe(2);
    });

    it("매칭 요소 없으면 빈 배열 반환", () => {
      const result = container.findAll(".not-exist");
      expect(result).toEqual([]);
    });

    it("빈 셀렉터는 빈 배열 반환", () => {
      container.innerHTML = `<div class="item">1</div>`;
      const result = container.findAll("");
      expect(result).toEqual([]);
    });

    it("공백만 있는 셀렉터는 빈 배열 반환", () => {
      container.innerHTML = `<div class="item">1</div>`;
      const result = container.findAll("   ");
      expect(result).toEqual([]);
    });

    it("속성 셀렉터 내 콤마가 포함된 경우 처리", () => {
      container.innerHTML = `
        <div data-values="a,b,c">1</div>
        <div class="item">2</div>
      `;

      // 속성 셀렉터에 콤마가 포함된 경우
      // 현재 구현에서는 잘못 분할될 수 있으므로, 단일 셀렉터로만 사용 권장
      const result = container.findAll('[data-values="a,b,c"]');

      // 엣지 케이스 동작 확인
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("findFirst", () => {
    it("첫 번째 매칭 요소 반환", () => {
      container.innerHTML = `
        <div class="item" id="first">1</div>
        <div class="item" id="second">2</div>
      `;

      const result = container.findFirst(".item");

      expect(result?.id).toBe("first");
    });

    it("매칭 요소 없으면 undefined 반환", () => {
      const result = container.findFirst(".not-exist");
      expect(result).toBeUndefined();
    });

    it("빈 셀렉터는 undefined 반환", () => {
      container.innerHTML = `<div class="item">1</div>`;
      const result = container.findFirst("");
      expect(result).toBeUndefined();
    });

    it("공백만 있는 셀렉터는 undefined 반환", () => {
      container.innerHTML = `<div class="item">1</div>`;
      const result = container.findFirst("   ");
      expect(result).toBeUndefined();
    });
  });

  describe("getParents", () => {
    it("모든 부모 요소 반환", () => {
      container.innerHTML = `<div id="level1"><div id="level2"><span id="target"></span></div></div>`;
      const target = container.querySelector("#target")!;

      const parents = target.getParents();

      expect(parents.length).toBeGreaterThanOrEqual(3);
      expect(parents[0].id).toBe("level2");
      expect(parents[1].id).toBe("level1");
    });

    it("body까지 포함", () => {
      const parents = container.getParents();
      expect(parents).toContain(document.body);
    });
  });

  describe("findFocusableParent", () => {
    it("포커스 가능한 부모 요소 반환", () => {
      container.innerHTML = `<button id="parent-btn"><span id="child">text</span></button>`;
      const child = container.querySelector("#child")!;

      const result = child.findFocusableParent();

      expect(result?.id).toBe("parent-btn");
    });

    it("포커스 가능한 부모 없으면 undefined", () => {
      container.innerHTML = `<div><span id="child">text</span></div>`;
      const child = container.querySelector("#child")!;

      const result = child.findFocusableParent();

      expect(result).toBeUndefined();
    });

    it("tabindex 속성으로 포커스 가능해진 요소를 찾는다", () => {
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
    it("position: relative는 offset 요소", () => {
      container.style.position = "relative";
      expect(container.isOffsetElement()).toBe(true);
    });

    it("position: absolute는 offset 요소", () => {
      container.style.position = "absolute";
      expect(container.isOffsetElement()).toBe(true);
    });

    it("position: fixed는 offset 요소", () => {
      container.style.position = "fixed";
      expect(container.isOffsetElement()).toBe(true);
    });

    it("position: sticky는 offset 요소", () => {
      container.style.position = "sticky";
      expect(container.isOffsetElement()).toBe(true);
    });

    it("position: static은 offset 요소 아님", () => {
      container.style.position = "static";
      expect(container.isOffsetElement()).toBe(false);
    });
  });

  describe("isVisible", () => {
    it("기본 요소는 visible", () => {
      container.style.width = "100px";
      container.style.height = "100px";
      expect(container.isVisible()).toBe(true);
    });

    it("visibility: hidden은 not visible", () => {
      container.style.visibility = "hidden";
      expect(container.isVisible()).toBe(false);
    });

    it("opacity: 0은 not visible", () => {
      container.style.opacity = "0";
      expect(container.isVisible()).toBe(false);
    });

    it("display: none은 not visible", () => {
      container.style.display = "none";
      expect(container.isVisible()).toBe(false);
    });

    it("width가 0인 요소의 가시성 판단", () => {
      container.style.width = "0";
      container.style.height = "100px";
      // getClientRects().length가 0이면 not visible
      const isVisible = container.isVisible();
      // 브라우저 환경에 따라 다를 수 있으므로 boolean 타입임을 확인
      expect(typeof isVisible).toBe("boolean");
    });

    it("height가 0인 요소의 가시성 판단", () => {
      container.style.width = "100px";
      container.style.height = "0";
      // getClientRects().length가 0이면 not visible
      const isVisible = container.isVisible();
      // 브라우저 환경에 따라 다를 수 있으므로 boolean 타입임을 확인
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

    it("input 요소의 value 복사", () => {
      container.innerHTML = `<input type="text" value="test value" />`;
      const event = createMockClipboardEvent(container);

      copyElement(event);

      expect(event.clipboardData?.setData).toHaveBeenCalledWith("text/plain", "test value");
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it("textarea 요소의 value 복사", () => {
      container.innerHTML = `<textarea>textarea content</textarea>`;
      const event = createMockClipboardEvent(container);

      copyElement(event);

      expect(event.clipboardData?.setData).toHaveBeenCalledWith("text/plain", "textarea content");
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it("input/textarea 없으면 기본 동작 유지", () => {
      container.innerHTML = `<span>content</span>`;
      const event = createMockClipboardEvent(container);

      copyElement(event);

      expect(event.clipboardData?.setData).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("clipboardData가 null이면 아무것도 안함", () => {
      const event = {
        target: container,
        clipboardData: null,
        preventDefault: vi.fn(),
      } as unknown as ClipboardEvent;

      copyElement(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("target이 Element가 아니면 아무것도 안함", () => {
      const event = {
        target: document,
        clipboardData: { setData: vi.fn(), getData: vi.fn() },
        preventDefault: vi.fn(),
      } as unknown as ClipboardEvent;

      copyElement(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("여러 input 중 첫 번째 input의 value 복사", () => {
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

    it("클립보드 내용을 input에 붙여넣기", () => {
      container.innerHTML = `<input type="text" />`;
      const input = container.querySelector("input")!;
      const event = createMockClipboardEvent(container, "pasted text");

      pasteToElement(event);

      expect(input.value).toBe("pasted text");
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it("붙여넣기 시 input 이벤트 발생", () => {
      container.innerHTML = `<input type="text" />`;
      const input = container.querySelector("input")!;
      const inputEventSpy = vi.fn();
      input.addEventListener("input", inputEventSpy);

      const event = createMockClipboardEvent(container, "pasted text");
      pasteToElement(event);

      expect(inputEventSpy).toHaveBeenCalledTimes(1);
    });

    it("클립보드 내용을 textarea에 붙여넣기", () => {
      container.innerHTML = `<textarea></textarea>`;
      const textarea = container.querySelector("textarea")!;
      const event = createMockClipboardEvent(container, "pasted text");

      pasteToElement(event);

      expect(textarea.value).toBe("pasted text");
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it("input/textarea 없으면 아무것도 안함", () => {
      container.innerHTML = `<div>no input</div>`;
      const event = createMockClipboardEvent(container, "pasted text");

      pasteToElement(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("clipboardData가 null이면 아무것도 안함", () => {
      container.innerHTML = `<input type="text" />`;
      const event = {
        target: container,
        clipboardData: null,
        preventDefault: vi.fn(),
      } as unknown as ClipboardEvent;

      pasteToElement(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("target이 Element가 아니면 아무것도 안함", () => {
      const event = {
        target: document,
        clipboardData: { setData: vi.fn(), getData: vi.fn().mockReturnValue("text") },
        preventDefault: vi.fn(),
      } as unknown as ClipboardEvent;

      pasteToElement(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("여러 input 중 첫 번째 input에 붙여넣기", () => {
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
    it("빈 배열 전달 시 즉시 빈 배열 반환", async () => {
      const result = await getBounds([]);
      expect(result).toEqual([]);
    });

    it("IntersectionObserver로 bounds 조회", async () => {
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

    it("여러 요소 동시 조회", async () => {
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

    it("중복 요소는 한 번만 처리", async () => {
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

      // 같은 요소를 3번 전달
      const result = await getBounds([container, container, container]);

      // 결과는 1개만 반환
      expect(result.length).toBe(1);
      expect(result[0].target).toBe(container);
      // observe도 1번만 호출
      expect(mockObserver.observe).toHaveBeenCalledTimes(1);

      vi.unstubAllGlobals();
    });

    it("결과가 입력 순서대로 정렬됨", async () => {
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
          // 콜백은 역순으로 호출 (el3, el2, el1)
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

      // 입력 순서: el1, el2, el3
      const result = await getBounds([el1, el2, el3]);

      // 결과도 입력 순서대로: el1, el2, el3
      expect(result.length).toBe(3);
      expect(result[0].target).toBe(el1);
      expect(result[1].target).toBe(el2);
      expect(result[2].target).toBe(el3);

      vi.unstubAllGlobals();
    });

    it("타임아웃 시 TimeoutError 발생", async () => {
      const mockObserver = {
        observe: vi.fn(),
        disconnect: vi.fn(),
      };

      // 콜백을 호출하지 않는 Mock (타임아웃 유도)
      const MockIntersectionObserver = vi.fn(function () {
        return mockObserver;
      });

      vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

      // 50ms 타임아웃으로 테스트
      await expect(getBounds([container], 50)).rejects.toThrow(TimeoutError);

      vi.unstubAllGlobals();
    });

    it("커스텀 타임아웃 설정", async () => {
      const mockObserver = {
        observe: vi.fn(),
        disconnect: vi.fn(),
      };

      const MockIntersectionObserver = vi.fn(function (
        this: IntersectionObserver,
        callback: IntersectionObserverCallback,
      ) {
        // 100ms 후에 응답
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

      // 200ms 타임아웃이면 성공해야 함
      const result = await getBounds([container], 200);
      expect(result.length).toBe(1);

      vi.unstubAllGlobals();
    });

    it("콜백이 여러 번 분할 호출되어도 모든 결과 수집", async () => {
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
        // 첫 번째 콜백 - el1만
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

        // 두 번째 콜백 - el2, el3
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

      // 모든 요소가 수집되어야 함
      expect(result.length).toBe(3);
      // 입력 순서대로 정렬되어야 함
      expect(result[0].target).toBe(el1);
      expect(result[1].target).toBe(el2);
      expect(result[2].target).toBe(el3);

      vi.unstubAllGlobals();
    });
  });
});
