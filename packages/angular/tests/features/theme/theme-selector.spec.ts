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

describe("sd-theme-selector unit", () => {
  describe("트리거 버튼", () => {
    it("sd-button이 inline이고 theme=link-gray이다", () => {
      setupTestBed();
      const fixture = TestBed.createComponent(SdThemeSelectorTest);
      fixture.detectChanges();
      TestBed.flushEffects();

      const button = fixture.nativeElement.querySelector("sd-dropdown > sd-button") as HTMLElement;
      expect(button).toBeTruthy();
      expect(button.getAttribute("data-sd-inline")).toBe("true");
      expect(button.getAttribute("data-sd-theme")).toBe("link-gray");
    });
  });

  describe("폰트 크기 스테퍼", () => {
    it("최소값(12)에서 감소 버튼은 disabled, 증가 버튼은 enabled이다", () => {
      setupTestBed();
      const fixture = TestBed.createComponent(SdThemeSelectorTest);
      fixture.detectChanges();
      TestBed.flushEffects();

      const popup = openPopup(fixture);
      const buttons = popup.querySelectorAll("sd-button");
      const minusBtn = buttons[0].querySelector("button") as HTMLButtonElement;
      const plusBtn = buttons[1].querySelector("button") as HTMLButtonElement;

      expect(minusBtn.disabled).toBe(true);
      expect(plusBtn.disabled).toBe(false);
    });

    it("외부에서 fontSize를 변경하면 표시값이 갱신된다", () => {
      setupTestBed();
      const fixture = TestBed.createComponent(SdThemeSelectorTest);
      fixture.detectChanges();
      TestBed.flushEffects();

      const sdTheme = TestBed.inject(SdThemeProvider);
      const popup = openPopup(fixture);

      sdTheme.fontSize.set(24);
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(popup.textContent).toContain("24px");
    });
  });

  describe("다크 모드", () => {
    it("dark가 이미 true이면 sd-switch가 ON 상태이다", () => {
      setupTestBed();
      const fixture = TestBed.createComponent(SdThemeSelectorTest);
      fixture.detectChanges();
      TestBed.flushEffects();

      const sdTheme = TestBed.inject(SdThemeProvider);
      sdTheme.dark.set(true);
      fixture.detectChanges();
      TestBed.flushEffects();

      const popup = openPopup(fixture);
      const switchEl = popup.querySelector("sd-switch") as HTMLElement;
      expect(switchEl.getAttribute("data-sd-on")).toBe("true");
    });
  });
});
