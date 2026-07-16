import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdThemeProvider } from "../src/features/theme/sd-theme-provider";
import { SdOptionEventPlugin } from "../src/core/events/sd-option-event.plugin";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";

describe("Feature 1.1.1 Slice 1: TestBed 환경 구성", () => {
  describe("Rule: Angular TestBed가 Vitest 환경에서 동작한다", () => {
    it("TestBed.inject()로 providedIn: root 서비스를 생성한다", () => {
      TestBed.configureTestingModule({});
      const provider = TestBed.inject(SdThemeProvider);
      expect(provider).toBeDefined();
      expect(provider.theme()).toBe("light");
    });

    it("TestBed.inject()로 EVENT_MANAGER_PLUGINS 플러그인을 생성한다", () => {
      TestBed.configureTestingModule({
        providers: [{ provide: EVENT_MANAGER_PLUGINS, useClass: SdOptionEventPlugin, multi: true }],
      });

      const plugins = TestBed.inject(EVENT_MANAGER_PLUGINS);
      expect(plugins).toBeDefined();
      expect(plugins.length).toBeGreaterThan(0);

      const optionPlugin = plugins.find((p) => p instanceof SdOptionEventPlugin);
      expect(optionPlugin).toBeDefined();
      expect(optionPlugin!.supports("click.capture")).toBe(true);
    });
  });
});
