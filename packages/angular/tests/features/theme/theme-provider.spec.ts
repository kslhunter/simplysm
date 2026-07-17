import { describe, it, expect, beforeEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { ApplicationRef } from "@angular/core";
import { SdThemeProvider } from "../../../src/features/theme/sd-theme-provider";

describe("테마 전환: SdThemeProvider", () => {
  let provider: SdThemeProvider;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    provider = TestBed.inject(SdThemeProvider);
    document.body.className = "";
  });

  it("theme signal의 기본값이 light이다", () => {
    expect(provider.theme()).toBe("light");
  });

  it("themes 에 내장 테마 목록(light·blueprint·ide-dark)이 정의된다", () => {
    expect(provider.themes.map((def) => def.value)).toEqual(["light", "blueprint", "ide-dark"]);
  });

  it("theme=blueprint일 때 body에 sd-theme-blueprint 클래스가 설정된다", () => {
    provider.theme.set("blueprint");
    TestBed.inject(ApplicationRef).tick();
    expect(document.body.classList.contains("sd-theme-blueprint")).toBe(true);
    expect(document.body.classList.contains("sd-theme-ide-dark")).toBe(false);
  });

  it("theme=ide-dark일 때 body에 sd-theme-ide-dark 클래스가 설정된다", () => {
    provider.theme.set("ide-dark");
    TestBed.inject(ApplicationRef).tick();
    expect(document.body.classList.contains("sd-theme-ide-dark")).toBe(true);
    expect(document.body.classList.contains("sd-theme-blueprint")).toBe(false);
  });

  it("테마 전환 시 이전 테마 클래스가 제거된다", () => {
    provider.theme.set("blueprint");
    TestBed.inject(ApplicationRef).tick();
    provider.theme.set("ide-dark");
    TestBed.inject(ApplicationRef).tick();
    expect(document.body.classList.contains("sd-theme-ide-dark")).toBe(true);
    expect(document.body.classList.contains("sd-theme-blueprint")).toBe(false);
  });

  it("theme=light일 때 body에 blueprint·ide-dark 클래스가 없다", () => {
    provider.theme.set("blueprint");
    TestBed.inject(ApplicationRef).tick();
    provider.theme.set("light");
    TestBed.inject(ApplicationRef).tick();
    expect(document.body.classList.contains("sd-theme-blueprint")).toBe(false);
    expect(document.body.classList.contains("sd-theme-ide-dark")).toBe(false);
  });
});

describe("Feature 1.1 Slice 1: SdThemeProvider 폰트 크기 — Unit", () => {
  let provider: SdThemeProvider;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    provider = TestBed.inject(SdThemeProvider);
    document.documentElement.style.fontSize = "";
  });

  it("fontSize 기본값이 12이다", () => {
    expect(provider.fontSize()).toBe(12);
  });

  it("비프리셋 값(15)에서 증가 시 다음 프리셋(16)으로 이동", () => {
    provider.fontSize.set(15);
    provider.increaseFontSize();
    expect(provider.fontSize()).toBe(16);
  });

  it("비프리셋 값(15)에서 감소 시 이전 프리셋(14)으로 이동", () => {
    provider.fontSize.set(15);
    provider.decreaseFontSize();
    expect(provider.fontSize()).toBe(14);
  });

  it("프리셋 최소값보다 작은 값(10)에서 증가 시 첫 프리셋(12)으로 이동", () => {
    provider.fontSize.set(10);
    provider.increaseFontSize();
    expect(provider.fontSize()).toBe(12);
  });

  it("프리셋 최대값보다 큰 값(30)에서 감소 시 마지막 프리셋(28)으로 이동", () => {
    provider.fontSize.set(30);
    provider.decreaseFontSize();
    expect(provider.fontSize()).toBe(28);
  });
});

describe("FIX-1 Slice 4: SdThemeProvider classList.toggle", () => {
  let provider: SdThemeProvider;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    provider = TestBed.inject(SdThemeProvider);
    document.body.className = "";
    document.documentElement.style.fontSize = "";
  });

  it("테마 전환 시 기존 body 클래스가 유지된다", () => {
    document.body.classList.add("my-app");

    provider.theme.set("blueprint");
    TestBed.inject(ApplicationRef).tick();

    expect(document.body.classList.contains("sd-theme-blueprint")).toBe(true);
    expect(document.body.classList.contains("my-app")).toBe(true);
  });
});
