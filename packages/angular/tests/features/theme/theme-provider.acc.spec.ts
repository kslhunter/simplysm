import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { ApplicationRef } from "@angular/core";
import { SdThemeProvider } from "../../../src/features/theme/sd-theme-provider";

describe("Feature 1.1 Slice 1: SdThemeProvider 폰트 크기 상태 관리", () => {
  let provider: SdThemeProvider;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    provider = TestBed.inject(SdThemeProvider);
  });

  afterEach(() => {
    document.documentElement.style.fontSize = "";
  });

  describe("Rule: 프리셋은 [12, 14, 16, 20, 24, 28]로 고정", () => {
    it("fontSizePresets === [12, 14, 16, 20, 24, 28]", () => {
      expect(provider.fontSizePresets).toEqual([12, 14, 16, 20, 24, 28]);
    });
  });

  describe("Rule: 증가 시 프리셋의 다음 값으로 이동", () => {
    it("16px에서 증가 시 20px", () => {
      provider.fontSize.set(16);
      provider.increaseFontSize();
      expect(provider.fontSize()).toBe(20);
    });

    it("최대값(28px)에서 증가 시 변경 없음", () => {
      provider.fontSize.set(28);
      provider.increaseFontSize();
      expect(provider.fontSize()).toBe(28);
    });
  });

  describe("Rule: 감소 시 프리셋의 이전 값으로 이동", () => {
    it("16px에서 감소 시 14px", () => {
      provider.fontSize.set(16);
      provider.decreaseFontSize();
      expect(provider.fontSize()).toBe(14);
    });

    it("최소값(12px)에서 감소 시 변경 없음", () => {
      provider.fontSize.set(12);
      provider.decreaseFontSize();
      expect(provider.fontSize()).toBe(12);
    });
  });

  describe("Rule: HTML root font-size가 signal에 연동", () => {
    it("폰트 크기 변경 시 document.documentElement.style.fontSize 업데이트", () => {
      provider.fontSize.set(20);
      TestBed.inject(ApplicationRef).tick();
      expect(document.documentElement.style.fontSize).toBe("20px");
    });
  });
});
