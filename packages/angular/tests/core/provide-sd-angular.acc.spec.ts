import { describe, it, expect, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { ApplicationRef } from "@angular/core";
import { provideSdAngular } from "../../src/core/provideSdAngular";
import { SdThemeProvider } from "../../src/core/providers/sd-theme-provider";

describe("Feature 1.1 Slice 1: localStorage 폰트 크기 영속화", () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.style.fontSize = "";
  });

  describe("Rule: 기본 폰트 크기는 12px", () => {
    it("localStorage에 값이 없으면 fontSize() === 12", () => {
      TestBed.configureTestingModule({
        providers: [provideSdAngular({ clientName: "test-app" })],
      });
      TestBed.inject(ApplicationRef);

      const theme = TestBed.inject(SdThemeProvider);
      expect(theme.fontSize()).toBe(12);
    });
  });

  describe("Rule: localStorage에 폰트 크기 영속화", () => {
    it("폰트 크기 변경 시 localStorage에 저장", () => {
      TestBed.configureTestingModule({
        providers: [provideSdAngular({ clientName: "test-app" })],
      });
      TestBed.inject(ApplicationRef);

      const theme = TestBed.inject(SdThemeProvider);
      theme.fontSize.set(20);
      TestBed.flushEffects();

      const stored = window.localStorage.getItem("test-app.sd-theme-font-size");
      expect(stored).toBe(JSON.stringify(20));
    });

    it("앱 재시작 시 localStorage에서 복원", () => {
      window.localStorage.setItem("test-app.sd-theme-font-size", JSON.stringify(20));
      TestBed.configureTestingModule({
        providers: [provideSdAngular({ clientName: "test-app" })],
      });
      TestBed.inject(ApplicationRef);

      const theme = TestBed.inject(SdThemeProvider);
      expect(theme.fontSize()).toBe(20);
    });
  });
});
