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

function openDropdownAndGetRefs(fixture: any) {
  const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
  dropdown.click();
  fixture.detectChanges();
  TestBed.flushEffects();

  const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
  const innerDiv = popup.querySelector("div") as HTMLElement;
  const popupDebug = fixture.debugElement.query(
    (de: any) => de.componentInstance instanceof SdDropdownPopup,
  );
  const popupInstance = popupDebug.componentInstance as SdDropdownPopup;

  return { popup, innerDiv, popupInstance };
}

describe("sd-dropdown-popup onResize 단위 테스트", () => {
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

  it("경계값: clientHeight가 정확히 300이면 height가 설정되지 않는다", () => {
    setupTestBed();
    const fixture = TestBed.createComponent(SdDropdownTestDefault);
    fixture.detectChanges();
    TestBed.flushEffects();

    const { popup, innerDiv, popupInstance } = openDropdownAndGetRefs(fixture);

    Object.defineProperty(innerDiv, "clientHeight", { value: 300, configurable: true });
    popupInstance.onResize();

    expect(popup.style.height).toBe("");
  });

  it("경계값: clientHeight가 301이면 height: 300px가 설정된다", () => {
    setupTestBed();
    const fixture = TestBed.createComponent(SdDropdownTestDefault);
    fixture.detectChanges();
    TestBed.flushEffects();

    const { popup, innerDiv, popupInstance } = openDropdownAndGetRefs(fixture);

    Object.defineProperty(innerDiv, "clientHeight", { value: 301, configurable: true });
    popupInstance.onResize();

    expect(popup.style.height).toBe("300px");
  });

  it("clientHeight가 0이면 height가 설정되지 않는다", () => {
    setupTestBed();
    const fixture = TestBed.createComponent(SdDropdownTestDefault);
    fixture.detectChanges();
    TestBed.flushEffects();

    const { popup, innerDiv, popupInstance } = openDropdownAndGetRefs(fixture);

    Object.defineProperty(innerDiv, "clientHeight", { value: 0, configurable: true });
    popupInstance.onResize();

    expect(popup.style.height).toBe("");
  });
});
