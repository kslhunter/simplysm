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

  describe("테마 선택", () => {
    it("theme=blueprint이면 블루프린트 버튼이 primary(활성)이다", () => {
      setupTestBed();
      const fixture = TestBed.createComponent(SdThemeSelectorTest);
      fixture.detectChanges();
      TestBed.flushEffects();

      const sdTheme = TestBed.inject(SdThemeProvider);
      sdTheme.theme.set("blueprint");
      fixture.detectChanges();
      TestBed.flushEffects();

      const popup = openPopup(fixture);
      const buttons = popup.querySelectorAll("sd-button");
      // [0]글자-, [1]글자+, [2]라이트, [3]블루프린트, [4]다크
      const blueprintBtn = buttons[3];
      expect(blueprintBtn.getAttribute("data-sd-theme")).toBe("primary");
    });

    it("내장 테마 목록이 버튼으로 렌더된다", () => {
      setupTestBed();
      const fixture = TestBed.createComponent(SdThemeSelectorTest);
      fixture.detectChanges();
      TestBed.flushEffects();

      const sdTheme = TestBed.inject(SdThemeProvider);
      const popup = openPopup(fixture);
      for (const def of sdTheme.themes) {
        expect(popup.textContent).toContain(def.label);
      }
    });
  });
});
