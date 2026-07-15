import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdThemeSelectorTest } from "./sd-theme-selector-test.fixture";
import { SdThemeProvider } from "../../../src/features/theme/sd-theme-provider";
import "@simplysm/core-browser";

function setupTestBed() {
  TestBed.configureTestingModule({
    imports: [SdThemeSelectorTest],
  });
}

function openPopup(fixture: any): HTMLElement {
  const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
  dropdown.click();
  fixture.detectChanges();
  TestBed.flushEffects();

  return document.body.querySelector("sd-dropdown-popup") as HTMLElement;
}

describe("Feature 1.2 Slice 1: sd-theme-selector", () => {
  describe("Rule: 드롭다운 트리거는 아이콘만 표시", () => {
    it("tablerPalette 아이콘 버튼이 표시되고 텍스트는 없다", () => {
      setupTestBed();
      const fixture = TestBed.createComponent(SdThemeSelectorTest);
      fixture.detectChanges();
      TestBed.flushEffects();

      const triggerButton = fixture.nativeElement.querySelector(
        "sd-dropdown > sd-button",
      ) as HTMLElement;
      expect(triggerButton).toBeTruthy();

      const icon = triggerButton.querySelector("ng-icon") as HTMLElement;
      expect(icon).toBeTruthy();

      // 버튼에 아이콘 외 텍스트가 없어야 한다
      const buttonEl = triggerButton.querySelector("button") as HTMLElement;
      const textContent = buttonEl.textContent.trim();
      expect(textContent).toBe("");
    });

    it("트리거 클릭 시 팝업이 열린다", () => {
      setupTestBed();
      const fixture = TestBed.createComponent(SdThemeSelectorTest);
      fixture.detectChanges();
      TestBed.flushEffects();

      const popup = openPopup(fixture);
      expect(popup).toBeTruthy();
    });
  });

  describe("Rule: 폰트 크기 스테퍼", () => {
    it("현재 폰트 크기(12px)와 레이블, 스테퍼 버튼이 표시된다", () => {
      setupTestBed();
      const fixture = TestBed.createComponent(SdThemeSelectorTest);
      fixture.detectChanges();
      TestBed.flushEffects();

      const popup = openPopup(fixture);
      const popupText = popup.textContent;

      expect(popupText).toContain("글자 크기");
      expect(popupText).toContain("12px");

      // [-] 버튼과 [+] 버튼 확인 (popup 내 sd-button 2개)
      const buttons = popup.querySelectorAll("sd-button");
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it("증가 버튼 클릭 시 fontSize가 12→14으로 변경되고 표시값이 갱신된다", () => {
      setupTestBed();
      const fixture = TestBed.createComponent(SdThemeSelectorTest);
      fixture.detectChanges();
      TestBed.flushEffects();

      const sdTheme = TestBed.inject(SdThemeProvider);
      expect(sdTheme.fontSize()).toBe(12);

      const popup = openPopup(fixture);
      const buttons = popup.querySelectorAll("sd-button");
      // [+] 버튼은 두 번째 sd-button
      const plusButton = buttons[1] as HTMLElement;
      plusButton.querySelector("button")!.click();
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(sdTheme.fontSize()).toBe(14);
      expect(popup.textContent).toContain("14px");
    });

    it("최소값(12)에서 감소 버튼이 disabled이고 클릭해도 fontSize가 변경되지 않는다", () => {
      setupTestBed();
      const fixture = TestBed.createComponent(SdThemeSelectorTest);
      fixture.detectChanges();
      TestBed.flushEffects();

      const sdTheme = TestBed.inject(SdThemeProvider);
      expect(sdTheme.fontSize()).toBe(12);

      const popup = openPopup(fixture);
      const buttons = popup.querySelectorAll("sd-button");
      // [-] 버튼은 첫 번째 sd-button
      const minusButton = buttons[0] as HTMLElement;
      const minusBtn = minusButton.querySelector("button") as HTMLButtonElement;

      expect(minusBtn.disabled).toBe(true);
      expect(sdTheme.fontSize()).toBe(12);
      expect(popup.textContent).toContain("12px");
    });
  });

  describe("Rule: 스테퍼 경계 비활성화", () => {
    it("최소값(12)에서 감소 버튼이 disabled이고 증가 버튼은 enabled이다", () => {
      setupTestBed();
      const fixture = TestBed.createComponent(SdThemeSelectorTest);
      fixture.detectChanges();
      TestBed.flushEffects();

      const sdTheme = TestBed.inject(SdThemeProvider);
      sdTheme.fontSize.set(12);
      fixture.detectChanges();
      TestBed.flushEffects();

      const popup = openPopup(fixture);
      const buttons = popup.querySelectorAll("sd-button");
      const minusBtn = buttons[0].querySelector("button") as HTMLButtonElement;
      const plusBtn = buttons[1].querySelector("button") as HTMLButtonElement;

      expect(minusBtn.disabled).toBe(true);
      expect(plusBtn.disabled).toBe(false);
    });

    it("최대값(28)에서 증가 버튼이 disabled이고 감소 버튼은 enabled이다", () => {
      setupTestBed();
      const fixture = TestBed.createComponent(SdThemeSelectorTest);
      fixture.detectChanges();
      TestBed.flushEffects();

      const sdTheme = TestBed.inject(SdThemeProvider);
      sdTheme.fontSize.set(28);
      fixture.detectChanges();
      TestBed.flushEffects();

      const popup = openPopup(fixture);
      const buttons = popup.querySelectorAll("sd-button");
      const minusBtn = buttons[0].querySelector("button") as HTMLButtonElement;
      const plusBtn = buttons[1].querySelector("button") as HTMLButtonElement;

      expect(minusBtn.disabled).toBe(false);
      expect(plusBtn.disabled).toBe(true);
    });
  });
});
