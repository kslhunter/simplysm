import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdOptionEventPlugin } from "../../../src/core/events/sd-option-event.plugin";

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

});
