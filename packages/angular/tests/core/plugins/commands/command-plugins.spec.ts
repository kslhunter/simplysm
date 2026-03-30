import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdSaveCommandEventPlugin } from "../../../../src/core/plugins/commands/sd-save-command-event.plugin";
import { SdRefreshCommandEventPlugin } from "../../../../src/core/plugins/commands/sd-refresh-command-event.plugin";
import { SdInsertCommandEventPlugin } from "../../../../src/core/plugins/commands/sd-insert-command-event.plugin";

function injectPlugin<T>(cls: new (...args: any[]) => T): T {
  TestBed.configureTestingModule({
    providers: [{ provide: EVENT_MANAGER_PLUGINS, useClass: cls, multi: true }],
  });
  const plugins = TestBed.inject(EVENT_MANAGER_PLUGINS);
  return plugins.find((p) => p instanceof cls)! as T;
}

describe("Feature 1.5 Slice 2: 커맨드 플러그인", () => {
  describe("SdSaveCommandEventPlugin", () => {
    let plugin: SdSaveCommandEventPlugin;
    let element: HTMLDivElement;
    let handler: ReturnType<typeof vi.fn>;
    let cleanup: () => void;

    beforeEach(() => {
      plugin = injectPlugin(SdSaveCommandEventPlugin);
      element = document.createElement("div");
      document.body.appendChild(element);
      handler = vi.fn();
      cleanup = plugin.addEventListener(element, "sdSaveCommand", handler);
    });

    afterEach(() => {
      cleanup();
      document.body.removeChild(element);
    });

    it("Ctrl+S로 handler가 호출된다", () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true }));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("Ctrl+Shift+S는 handler를 호출하지 않는다", () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true, shiftKey: true }));
      expect(handler).not.toHaveBeenCalled();
    });

    it("cleanup 후 Ctrl+S가 무시된다", () => {
      cleanup();
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true }));
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("SdRefreshCommandEventPlugin", () => {
    it("Ctrl+Alt+L로 handler가 호출된다", () => {
      const plugin = injectPlugin(SdRefreshCommandEventPlugin);
      const el = document.createElement("div");
      const handler = vi.fn();
      const cleanup = plugin.addEventListener(el, "sdRefreshCommand", handler);

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "l", ctrlKey: true, altKey: true }));
      expect(handler).toHaveBeenCalledTimes(1);

      cleanup();
    });
  });

  describe("SdInsertCommandEventPlugin", () => {
    it("Ctrl+Insert로 handler가 호출된다", () => {
      const plugin = injectPlugin(SdInsertCommandEventPlugin);
      const el = document.createElement("div");
      const handler = vi.fn();
      const cleanup = plugin.addEventListener(el, "sdInsertCommand", handler);

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Insert", ctrlKey: true }));
      expect(handler).toHaveBeenCalledTimes(1);

      cleanup();
    });
  });
});
