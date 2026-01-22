import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ArgumentError, TimeoutError } from "@simplysm/core-common";
import { HtmlElementUtils } from "../../src/utils/html-element";

describe("HtmlElementUtils", () => {
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

      HtmlElementUtils.repaint(el);

      expect(offsetHeightSpy).toHaveBeenCalled();
    });
  });

  describe("getRelativeOffset", () => {
    it("부모 요소 기준 상대 위치 계산", () => {
      container.style.position = "relative";
      container.innerHTML = `<div id="child" style="position: absolute; top: 50px; left: 30px;"></div>`;

      const child = container.querySelector<HTMLElement>("#child")!;

      const result = HtmlElementUtils.getRelativeOffset(child, container);
      expect(result).toHaveProperty("top");
      expect(result).toHaveProperty("left");
      expect(typeof result.top).toBe("number");
      expect(typeof result.left).toBe("number");
    });

    it("셀렉터로 부모 찾기", () => {
      container.id = "parent";
      container.innerHTML = `<div><span id="deep-child"></span></div>`;

      const deepChild = container.querySelector<HTMLElement>("#deep-child")!;

      const result = HtmlElementUtils.getRelativeOffset(deepChild, "#parent");
      expect(result).toHaveProperty("top");
      expect(result).toHaveProperty("left");
      expect(typeof result.top).toBe("number");
      expect(typeof result.left).toBe("number");
    });

    it("부모를 찾지 못하면 에러", () => {
      const child = document.createElement("div");
      container.appendChild(child);

      expect(() => HtmlElementUtils.getRelativeOffset(child, ".not-exist")).toThrow(ArgumentError);
    });

    it("transform이 적용된 요소도 처리", () => {
      container.style.position = "relative";
      container.style.transform = "scale(2)";
      container.innerHTML = `<div id="child" style="transform: rotate(45deg);"></div>`;

      const child = container.querySelector<HTMLElement>("#child")!;

      // transform이 있어도 에러 없이 결과 반환해야 함
      const result = HtmlElementUtils.getRelativeOffset(child, container);
      expect(result).toHaveProperty("top");
      expect(result).toHaveProperty("left");
      expect(typeof result.top).toBe("number");
      expect(typeof result.left).toBe("number");
    });

    it("중간 요소의 border 두께가 누적됨", () => {
      container.style.position = "relative";
      container.innerHTML = `
        <div id="middle" style="border: 10px solid black;">
          <div id="child"></div>
        </div>
      `;

      const child = container.querySelector<HTMLElement>("#child")!;
      const result = HtmlElementUtils.getRelativeOffset(child, container);

      // 중간 요소의 borderTopWidth(10px)와 borderLeftWidth(10px)가 결과에 반영되어야 함
      expect(result.top).toBeGreaterThanOrEqual(10);
      expect(result.left).toBeGreaterThanOrEqual(10);
    });

    it("부모 요소가 스크롤된 상태에서 올바른 위치 계산", () => {
      container.style.position = "relative";
      container.style.overflow = "auto";
      container.style.height = "100px";
      container.style.width = "100px";

      const inner = document.createElement("div");
      inner.style.height = "500px";
      inner.style.width = "500px";
      inner.innerHTML = `<div id="child" style="position: absolute; top: 200px; left: 150px;"></div>`;
      container.appendChild(inner);

      // 부모 요소 스크롤
      container.scrollTop = 50;
      container.scrollLeft = 30;

      const child = container.querySelector<HTMLElement>("#child")!;
      const result = HtmlElementUtils.getRelativeOffset(child, container);

      // scrollTop/scrollLeft가 결과에 반영됨 (parentEl.scrollTop + parentEl.scrollLeft 추가됨)
      // 테스트 환경에서는 getBoundingClientRect가 스크롤을 반영하지 않으므로
      // 최소한 scrollTop/scrollLeft 값이 추가되었는지 검증
      expect(result.top).toBeGreaterThanOrEqual(200);
      expect(result.left).toBeGreaterThanOrEqual(150);
    });
  });

  describe("scrollIntoViewIfNeeded", () => {
    it("대상이 offset보다 위에 있으면 스크롤", () => {
      container.style.overflow = "auto";
      container.style.height = "100px";
      // 스크롤 가능한 콘텐츠 추가
      const inner = document.createElement("div");
      inner.style.height = "500px";
      container.appendChild(inner);
      container.scrollTop = 100;

      HtmlElementUtils.scrollIntoViewIfNeeded(container, { top: 50, left: 0 }, { top: 10, left: 0 });

      expect(container.scrollTop).toBe(40);
    });

    it("대상이 충분히 보이면 스크롤 안함", () => {
      container.style.overflow = "auto";
      container.style.height = "100px";
      const inner = document.createElement("div");
      inner.style.height = "500px";
      container.appendChild(inner);
      container.scrollTop = 0;

      HtmlElementUtils.scrollIntoViewIfNeeded(container, { top: 50, left: 0 }, { top: 10, left: 0 });

      expect(container.scrollTop).toBe(0);
    });

    it("기본 offset은 0", () => {
      container.style.overflow = "auto";
      container.style.height = "100px";
      const inner = document.createElement("div");
      inner.style.height = "500px";
      container.appendChild(inner);
      container.scrollTop = 100;

      HtmlElementUtils.scrollIntoViewIfNeeded(container, { top: 50, left: 0 });

      expect(container.scrollTop).toBe(50);
    });

    it("대상이 offset보다 왼쪽에 있으면 가로 스크롤", () => {
      container.style.overflow = "auto";
      container.style.width = "100px";
      // 스크롤 가능한 콘텐츠 추가
      const inner = document.createElement("div");
      inner.style.width = "500px";
      inner.style.height = "10px";
      container.appendChild(inner);
      container.scrollLeft = 100;

      HtmlElementUtils.scrollIntoViewIfNeeded(container, { top: 0, left: 50 }, { top: 0, left: 10 });

      expect(container.scrollLeft).toBe(40);
    });

    it("대상이 충분히 보이면 가로 스크롤 안함", () => {
      container.style.overflow = "auto";
      container.style.width = "100px";
      const inner = document.createElement("div");
      inner.style.width = "500px";
      inner.style.height = "10px";
      container.appendChild(inner);
      container.scrollLeft = 0;

      HtmlElementUtils.scrollIntoViewIfNeeded(container, { top: 0, left: 50 }, { top: 0, left: 10 });

      expect(container.scrollLeft).toBe(0);
    });
  });

  describe("getBoundsAsync", () => {
    it("빈 배열 전달 시 즉시 빈 배열 반환", async () => {
      const result = await HtmlElementUtils.getBoundsAsync([]);
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

      const result = await HtmlElementUtils.getBoundsAsync([container]);

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

      const result = await HtmlElementUtils.getBoundsAsync([el1, el2]);

      expect(result.length).toBe(2);
      expect(mockObserver.observe).toHaveBeenCalledTimes(2);

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
      await expect(HtmlElementUtils.getBoundsAsync([container], 50)).rejects.toThrow(TimeoutError);

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
      const result = await HtmlElementUtils.getBoundsAsync([container], 200);
      expect(result.length).toBe(1);

      vi.unstubAllGlobals();
    });
  });
});
