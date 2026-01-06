// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  repaint,
  getRelativeOffset,
  scrollIntoViewIfNeeded,
  getBoundsAsync,
} from "../../src/utils/html-element";

describe("html-element", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe("repaint", () => {
    it("offsetHeight 접근으로 리플로우 트리거", () => {
      const el = document.createElement("div");
      const offsetHeightSpy = vi.spyOn(el, "offsetHeight", "get").mockReturnValue(100);

      repaint(el);

      expect(offsetHeightSpy).toHaveBeenCalled();
    });
  });

  describe("getRelativeOffset", () => {
    it("부모 요소 기준 상대 위치 계산", () => {
      container.style.position = "relative";
      container.innerHTML = `<div id="child" style="position: absolute; top: 50px; left: 30px;"></div>`;

      const child = container.querySelector("#child") as HTMLElement;

      // happy-dom에서 getBoundingClientRect는 제한적이므로
      // 기본적인 호출 테스트만 수행
      expect(() => getRelativeOffset(child, container)).not.toThrow();
    });

    it("셀렉터로 부모 찾기", () => {
      container.id = "parent";
      container.innerHTML = `<div><span id="deep-child"></span></div>`;

      const deepChild = container.querySelector("#deep-child") as HTMLElement;

      expect(() => getRelativeOffset(deepChild, "#parent")).not.toThrow();
    });

    it("부모를 찾지 못하면 에러", () => {
      const child = document.createElement("div");
      container.appendChild(child);

      expect(() => getRelativeOffset(child, ".not-exist")).toThrow("Parent element not found");
    });
  });

  describe("scrollIntoViewIfNeeded", () => {
    it("대상이 offset보다 위에 있으면 스크롤", () => {
      container.style.overflow = "auto";
      container.style.height = "100px";
      container.scrollTop = 100;

      scrollIntoViewIfNeeded(container, { top: 50, left: 0 }, { top: 10, left: 0 });

      expect(container.scrollTop).toBe(40); // 50 - 10
    });

    it("대상이 충분히 보이면 스크롤 안함", () => {
      container.style.overflow = "auto";
      container.scrollTop = 0;

      scrollIntoViewIfNeeded(container, { top: 50, left: 0 }, { top: 10, left: 0 });

      expect(container.scrollTop).toBe(0);
    });

    it("기본 offset은 0", () => {
      container.scrollTop = 100;

      scrollIntoViewIfNeeded(container, { top: 50, left: 0 });

      expect(container.scrollTop).toBe(50);
    });
  });

  describe("getBoundsAsync", () => {
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

      const result = await getBoundsAsync([container]);

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

      const result = await getBoundsAsync([el1, el2]);

      expect(result.length).toBe(2);
      expect(mockObserver.observe).toHaveBeenCalledTimes(2);

      vi.unstubAllGlobals();
    });
  });
});
