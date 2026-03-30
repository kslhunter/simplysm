import { describe, it, expect, beforeEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { ApplicationRef } from "@angular/core";
import { SdThemeProvider } from "../../../src/core/providers/sd-theme-provider";

describe("Feature 1.2.1 Slice 2: SdThemeProvider 단순화", () => {
  let provider: SdThemeProvider;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    provider = TestBed.inject(SdThemeProvider);
    document.body.className = "";
  });

  describe("Rule: SdThemeProvider에서 크기 테마 기능을 제거한다", () => {
    it("dark signal의 기본값이 false이다", () => {
      expect(provider.dark()).toBe(false);
    });

    it("dark true일 때 body에 sd-theme-dark 클래스가 설정된다", () => {
      provider.dark.set(true);
      TestBed.inject(ApplicationRef).tick();
      expect(document.body.classList.contains("sd-theme-dark")).toBe(true);
    });

    it("dark false일 때 body에 sd-theme-dark 클래스가 없다", () => {
      TestBed.inject(ApplicationRef).tick();
      expect(document.body.classList.contains("sd-theme-dark")).toBe(false);
    });
  });
});

describe("FIX-1 Slice 4: SdThemeProvider classList.toggle", () => {
  let provider: SdThemeProvider;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    provider = TestBed.inject(SdThemeProvider);
    document.body.className = "";
  });

  it("다크 모드 전환 시 기존 body 클래스가 유지된다", () => {
    document.body.classList.add("my-app");

    provider.dark.set(true);
    TestBed.inject(ApplicationRef).tick();

    expect(document.body.classList.contains("sd-theme-dark")).toBe(true);
    expect(document.body.classList.contains("my-app")).toBe(true);
  });
});
