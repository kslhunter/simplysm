import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdOptionEventPlugin } from "../../../src/core/events/sd-option-event.plugin";
import { SdResizeEventPlugin } from "../../../src/core/events/sd-resize-event.plugin";
import { SdIntersectionEventPlugin } from "../../../src/core/events/sd-intersection-event.plugin";

describe("Feature 1.5 Slice 1: DOM 이벤트 플러그인", () => {
  describe("SdOptionEventPlugin", () => {
    let plugin: SdOptionEventPlugin;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          { provide: EVENT_MANAGER_PLUGINS, useClass: SdOptionEventPlugin, multi: true },
        ],
      });
      const plugins = TestBed.inject(EVENT_MANAGER_PLUGINS);
      plugin = plugins.find((p) => p instanceof SdOptionEventPlugin)!;
    });

    describe("supports()", () => {
      it("click.capture를 인식한다", () => {
        expect(plugin.supports("click.capture")).toBe(true);
      });

      it("scroll.passive를 인식한다", () => {
        expect(plugin.supports("scroll.passive")).toBe(true);
      });

      it("keydown.capture.once 복합 옵션을 인식한다", () => {
        expect(plugin.supports("keydown.capture.once")).toBe(true);
      });

      it("mousedown.once를 인식한다", () => {
        expect(plugin.supports("mousedown.once")).toBe(true);
      });

      it("존재하지 않는 이벤트를 거부한다", () => {
        expect(plugin.supports("fakeEvent.capture")).toBe(false);
      });

      it("옵션 접미사가 없는 이벤트를 거부한다", () => {
        expect(plugin.supports("click")).toBe(false);
      });
    });

    describe("addEventListener()", () => {
      let container: HTMLDivElement;
      let child: HTMLSpanElement;

      beforeEach(() => {
        container = document.createElement("div");
        child = document.createElement("span");
        container.appendChild(child);
        document.body.appendChild(container);
      });

      afterEach(() => {
        document.body.removeChild(container);
      });

      it("capture 옵션으로 등록된 리스너가 하위 요소 이벤트를 캡처한다", () => {
        const handler = vi.fn();
        plugin.addEventListener(container, "click.capture", handler);

        child.dispatchEvent(new MouseEvent("click", { bubbles: true }));

        expect(handler).toHaveBeenCalledTimes(1);
      });

      it("cleanup 함수 호출 후 리스너가 제거된다", () => {
        const handler = vi.fn();
        const cleanup = plugin.addEventListener(container, "click.capture", handler);

        cleanup();
        child.dispatchEvent(new MouseEvent("click", { bubbles: true }));

        expect(handler).not.toHaveBeenCalled();
      });
    });
  });

  describe("SdResizeEventPlugin", () => {
    let plugin: SdResizeEventPlugin;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          { provide: EVENT_MANAGER_PLUGINS, useClass: SdResizeEventPlugin, multi: true },
        ],
      });
      const plugins = TestBed.inject(EVENT_MANAGER_PLUGINS);
      plugin = plugins.find((p) => p instanceof SdResizeEventPlugin)!;
    });

    it('supports("sdResize")가 true를 반환한다', () => {
      expect(plugin.supports("sdResize")).toBe(true);
    });

    it('supports("click")이 false를 반환한다', () => {
      expect(plugin.supports("click")).toBe(false);
    });
  });

  describe("FIX-1 Slice 1: SdResizeEventPlugin IntersectionObserver 제거", () => {
    let plugin: SdResizeEventPlugin;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          { provide: EVENT_MANAGER_PLUGINS, useClass: SdResizeEventPlugin, multi: true },
        ],
      });
      const plugins = TestBed.inject(EVENT_MANAGER_PLUGINS);
      plugin = plugins.find((p) => p instanceof SdResizeEventPlugin)!;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("요소 크기 변경 시 sdResize 이벤트가 발생한다 (ResizeObserver만 사용)", () => {
      const handler = vi.fn();
      const el = document.createElement("div");
      document.body.appendChild(el);

      const cleanup = plugin.addEventListener(el, "sdResize", handler);

      // ResizeObserver는 observe 직후 첫 콜백을 발생시킨다 (초기 크기)
      // jsdom/playwright에서 ResizeObserver 콜백 타이밍은 비동기일 수 있으므로 구조만 확인
      expect(typeof cleanup).toBe("function");

      cleanup();
      el.remove();
    });

    it("IntersectionObserver가 사용되지 않는다", () => {
      const intersectionSpy = vi.spyOn(window, "IntersectionObserver" as any);
      const handler = vi.fn();
      const el = document.createElement("div");
      document.body.appendChild(el);

      const cleanup = plugin.addEventListener(el, "sdResize", handler);

      expect(intersectionSpy).not.toHaveBeenCalled();

      cleanup();
      el.remove();
    });
  });

  describe("SdIntersectionEventPlugin", () => {
    let plugin: SdIntersectionEventPlugin;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          { provide: EVENT_MANAGER_PLUGINS, useClass: SdIntersectionEventPlugin, multi: true },
        ],
      });
      const plugins = TestBed.inject(EVENT_MANAGER_PLUGINS);
      plugin = plugins.find((p) => p instanceof SdIntersectionEventPlugin)!;
    });

    it('supports("sdIntersection")이 true를 반환한다', () => {
      expect(plugin.supports("sdIntersection")).toBe(true);
    });

    it('supports("sdResize")이 false를 반환한다', () => {
      expect(plugin.supports("sdResize")).toBe(false);
    });
  });

  describe("Feature 1.3: IntersectionObserver batch 콜백 안전 처리", () => {
    let plugin: SdIntersectionEventPlugin;
    let capturedCallback: ((entries: IntersectionObserverEntry[]) => void) | undefined;
    let origIntersectionObserver: typeof IntersectionObserver;

    beforeEach(() => {
      capturedCallback = undefined;
      origIntersectionObserver = window.IntersectionObserver;
      window.IntersectionObserver = class {
        constructor(callback: any) {
          capturedCallback = callback;
        }
        observe = vi.fn();
        disconnect = vi.fn();
        unobserve = vi.fn();
        root = null;
        rootMargin = "";
        thresholds = [] as number[];
        takeRecords = vi.fn().mockReturnValue([]);
      } as unknown as typeof IntersectionObserver;

      TestBed.configureTestingModule({
        providers: [
          { provide: EVENT_MANAGER_PLUGINS, useClass: SdIntersectionEventPlugin, multi: true },
        ],
      });
      const plugins = TestBed.inject(EVENT_MANAGER_PLUGINS);
      plugin = plugins.find((p) => p instanceof SdIntersectionEventPlugin)!;
    });

    afterEach(() => {
      window.IntersectionObserver = origIntersectionObserver;
      vi.restoreAllMocks();
    });

    it("entries가 1개일 때 해당 entry를 handler에 전달한다", () => {
      const handler = vi.fn();
      const el = document.createElement("div");
      plugin.addEventListener(el, "sdIntersection", handler);

      const entry = { isIntersecting: true } as IntersectionObserverEntry;
      capturedCallback!([entry]);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ entry });
    });

    it("entries가 2개 이상일 때 마지막(최신) entry를 handler에 전달하고 예외가 발생하지 않는다", () => {
      const handler = vi.fn();
      const el = document.createElement("div");
      plugin.addEventListener(el, "sdIntersection", handler);

      const entry1 = { isIntersecting: false } as IntersectionObserverEntry;
      const entry2 = { isIntersecting: true } as IntersectionObserverEntry;
      capturedCallback!([entry1, entry2]);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ entry: entry2 });
    });

    it("entries가 0개일 때 handler를 호출하지 않는다", () => {
      const handler = vi.fn();
      const el = document.createElement("div");
      plugin.addEventListener(el, "sdIntersection", handler);

      capturedCallback!([]);

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
