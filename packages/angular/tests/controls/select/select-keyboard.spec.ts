import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdSelectKeyboardTest,
  SdSelectKeyboardMultiTest,
} from "./sd-select-test.fixture";
import "@simplysm/core-browser";

function setupTestBed(component: any) {
  TestBed.configureTestingModule({
    imports: [component],
  });
}

function openDropdown(fixture: any): HTMLElement {
  const selectEl = fixture.nativeElement.querySelector("sd-select") as HTMLElement;
  const dropdownEl = selectEl.querySelector("sd-dropdown") as HTMLElement;
  dropdownEl.click();
  fixture.detectChanges();
  TestBed.flushEffects();
  return document.body.querySelector("sd-dropdown-popup") as HTMLElement;
}

function pressKey(el: HTMLElement, key: string): void {
  el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

function isPopupInBody(): boolean {
  return Array.from(document.body.children).some(
    (el) => el.tagName.toLowerCase() === "sd-dropdown-popup",
  );
}

describe("Feature 5.1 Slice 5: Keyboard navigation", () => {
  // Scenario: ArrowDown으로 다음 항목 포커스
  it("Scenario: ArrowDown moves focus to next item", () => {
    setupTestBed(SdSelectKeyboardTest);
    const fixture = TestBed.createComponent(SdSelectKeyboardTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = openDropdown(fixture);
    const itemContents = popup.querySelectorAll("sd-select-item");
    const firstItem = itemContents[0] as HTMLElement;
    firstItem.focus();

    pressKey(popup, "ArrowDown");
    fixture.detectChanges();
    TestBed.flushEffects();

    // Focus should move to second item
    expect(document.activeElement).toBe(itemContents[1]);
  });

  // Scenario: ArrowUp으로 드롭다운 트리거 복귀
  it("Scenario: ArrowUp on first item returns focus to dropdown trigger", () => {
    setupTestBed(SdSelectKeyboardTest);
    const fixture = TestBed.createComponent(SdSelectKeyboardTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = openDropdown(fixture);
    const itemContents = popup.querySelectorAll("sd-select-item");
    const firstItem = itemContents[0] as HTMLElement;
    firstItem.focus();

    pressKey(popup, "ArrowUp");
    fixture.detectChanges();
    TestBed.flushEffects();

    // Focus should be on the dropdown trigger
    const selectEl = fixture.nativeElement.querySelector("sd-select") as HTMLElement;
    const dropdownEl = selectEl.querySelector("sd-dropdown") as HTMLElement;
    expect(document.activeElement === dropdownEl || dropdownEl.contains(document.activeElement)).toBe(true);
  });

  // Scenario: Space로 항목 토글 (드롭다운 유지)
  it("Scenario: Space toggles item selection and keeps dropdown open", () => {
    setupTestBed(SdSelectKeyboardTest);
    const fixture = TestBed.createComponent(SdSelectKeyboardTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = openDropdown(fixture);
    const itemContents = popup.querySelectorAll("sd-select-item");
    const firstItem = itemContents[0] as HTMLElement;
    firstItem.focus();

    pressKey(firstItem, " ");
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.value()).toBe("A");
    // Dropdown should remain open
    expect(isPopupInBody()).toBe(true);
  });

  // Scenario: Enter로 단일 선택 후 닫기
  it("Scenario: Enter selects item and closes dropdown in single mode", () => {
    setupTestBed(SdSelectKeyboardTest);
    const fixture = TestBed.createComponent(SdSelectKeyboardTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = openDropdown(fixture);
    const itemContents = popup.querySelectorAll("sd-select-item");
    const firstItem = itemContents[0] as HTMLElement;
    firstItem.focus();

    pressKey(firstItem, "Enter");
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.value()).toBe("A");
    expect(isPopupInBody()).toBe(false);
  });

  // Scenario: Enter로 다중 선택 토글
  it("Scenario: Enter toggles item and keeps dropdown open in multi mode", () => {
    setupTestBed(SdSelectKeyboardMultiTest);
    const fixture = TestBed.createComponent(SdSelectKeyboardMultiTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = openDropdown(fixture);
    const itemContents = popup.querySelectorAll("sd-select-item");
    const firstItem = itemContents[0] as HTMLElement;
    firstItem.focus();

    pressKey(firstItem, "Enter");
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.value()).toEqual(["A"]);
    expect(isPopupInBody()).toBe(true);
  });
});
