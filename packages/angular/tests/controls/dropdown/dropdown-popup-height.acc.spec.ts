import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdDropdownTestDefault } from "./sd-dropdown-test.fixture";
import { SdDropdownPopup } from "../../../src/controls/dropdown/sd-dropdown-popup";
import "@simplysm/core-browser";

function setupTestBed() {
  TestBed.configureTestingModule({
    imports: [SdDropdownTestDefault],
  });
}

describe("Feature 3.1: sd-dropdown-popup 높이 제한 복원", () => {
  beforeEach(() => {
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.querySelectorAll("sd-dropdown-popup").forEach((el) => el.remove());
  });

  describe("Rule: popup 내부 컨텐츠가 300px를 초과하면 호스트 높이를 300px로 제한한다", () => {
    it("Scenario: 컨텐츠 높이가 300px 이하이면 height 스타일이 설정되지 않는다", () => {
      setupTestBed();
      const fixture = TestBed.createComponent(SdDropdownTestDefault);
      fixture.detectChanges();
      TestBed.flushEffects();

      // open dropdown
      const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
      dropdown.click();
      fixture.detectChanges();
      TestBed.flushEffects();

      const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
      const innerDiv = popup.querySelector("div") as HTMLElement;

      // clientHeight = 250 (300px 이하)
      Object.defineProperty(innerDiv, "clientHeight", { value: 250, configurable: true });

      // Get popup component and call onResize
      const popupDebug = fixture.debugElement.query(
        (de) => de.componentInstance instanceof SdDropdownPopup,
      );
      (popupDebug.componentInstance as SdDropdownPopup).onResize();

      expect(popup.style.height).toBe("");
    });

    it("Scenario: 컨텐츠 높이가 300px 초과이면 height: 300px가 설정된다", () => {
      setupTestBed();
      const fixture = TestBed.createComponent(SdDropdownTestDefault);
      fixture.detectChanges();
      TestBed.flushEffects();

      const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
      dropdown.click();
      fixture.detectChanges();
      TestBed.flushEffects();

      const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
      const innerDiv = popup.querySelector("div") as HTMLElement;

      Object.defineProperty(innerDiv, "clientHeight", { value: 350, configurable: true });

      const popupDebug = fixture.debugElement.query(
        (de) => de.componentInstance instanceof SdDropdownPopup,
      );
      (popupDebug.componentInstance as SdDropdownPopup).onResize();

      expect(popup.style.height).toBe("300px");
    });

    it("Scenario: 컨텐츠가 리사이즈되어 300px 이하로 줄어들면 height가 제거된다", () => {
      setupTestBed();
      const fixture = TestBed.createComponent(SdDropdownTestDefault);
      fixture.detectChanges();
      TestBed.flushEffects();

      const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
      dropdown.click();
      fixture.detectChanges();
      TestBed.flushEffects();

      const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
      const innerDiv = popup.querySelector("div") as HTMLElement;

      const popupDebug = fixture.debugElement.query(
        (de) => de.componentInstance instanceof SdDropdownPopup,
      );
      const popupInstance = popupDebug.componentInstance as SdDropdownPopup;

      // 먼저 300px 초과로 설정
      Object.defineProperty(innerDiv, "clientHeight", { value: 350, configurable: true });
      popupInstance.onResize();
      expect(popup.style.height).toBe("300px");

      // 이후 300px 이하로 줄어듦
      Object.defineProperty(innerDiv, "clientHeight", { value: 200, configurable: true });
      popupInstance.onResize();
      expect(popup.style.height).toBe("");
    });
  });
});
