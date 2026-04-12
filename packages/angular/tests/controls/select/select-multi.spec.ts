import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdResizeEventPlugin } from "../../../src/core/events/sd-resize-event.plugin";
import {
  SdSelectMultiTest,
  SdSelectMultiPreselectedTest,
  SdSelectMultiHideSelectAllTest,
  SdSelectMultiVerticalTest,
} from "./sd-select-test.fixture";
import "@simplysm/core-browser";

function setupTestBed(component: any) {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      { provide: EVENT_MANAGER_PLUGINS, useClass: SdResizeEventPlugin, multi: true },
    ],
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

function isPopupInBody(): boolean {
  return Array.from(document.body.children).some(
    (el) => el.tagName.toLowerCase() === "sd-dropdown-popup",
  );
}

describe("Feature 5.1 Slice 2: Multi select", () => {
  // Scenario: 항목 토글로 다중 선택
  it("Scenario: clicking item A in multi mode adds it to value array and dropdown stays open", () => {
    setupTestBed(SdSelectMultiTest);
    const fixture = TestBed.createComponent(SdSelectMultiTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = openDropdown(fixture);
    const itemContents = popup.querySelectorAll("sd-select-item ._content");
    (itemContents[0] as HTMLElement).click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.value()).toEqual(["A"]);
    expect(isPopupInBody()).toBe(true);
  });

  // Scenario: 선택된 항목 토글로 해제
  it("Scenario: clicking selected item A again removes it from value array", () => {
    setupTestBed(SdSelectMultiPreselectedTest);
    const fixture = TestBed.createComponent(SdSelectMultiPreselectedTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = openDropdown(fixture);
    const itemContents = popup.querySelectorAll("sd-select-item ._content");
    // Item A is at index 0, already selected
    (itemContents[0] as HTMLElement).click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.value()).toEqual(["B"]);
  });

  // Scenario: 다중 선택 시 체크박스 표시
  it("Scenario: in multi mode, each item shows a checkbox", () => {
    setupTestBed(SdSelectMultiTest);
    const fixture = TestBed.createComponent(SdSelectMultiTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = openDropdown(fixture);
    const checkboxes = popup.querySelectorAll("sd-select-item sd-checkbox");
    expect(checkboxes.length).toBe(3);
  });

  // Scenario: 전체선택
  it("Scenario: clicking select-all selects all non-disabled non-hidden items", () => {
    setupTestBed(SdSelectMultiTest);
    const fixture = TestBed.createComponent(SdSelectMultiTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = openDropdown(fixture);
    const selectAllLink = popup.querySelector("[data-sd-select-all]") as HTMLElement;
    expect(selectAllLink).toBeTruthy();
    selectAllLink.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.value()).toEqual(["A", "B", "C"]);
  });

  // Scenario: 전체해제
  it("Scenario: clicking deselect-all clears the value array", () => {
    setupTestBed(SdSelectMultiPreselectedTest);
    const fixture = TestBed.createComponent(SdSelectMultiPreselectedTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = openDropdown(fixture);
    const deselectAllLink = popup.querySelector("[data-sd-deselect-all]") as HTMLElement;
    expect(deselectAllLink).toBeTruthy();
    deselectAllLink.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.value()).toEqual([]);
  });

  // Scenario: 전체선택/해제 버튼 숨김
  it("Scenario: hideSelectAll=true hides select all/deselect all links", () => {
    setupTestBed(SdSelectMultiHideSelectAllTest);
    const fixture = TestBed.createComponent(SdSelectMultiHideSelectAllTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = openDropdown(fixture);
    const selectAllLink = popup.querySelector("[data-sd-select-all]");
    const deselectAllLink = popup.querySelector("[data-sd-deselect-all]");
    expect(selectAllLink).toBeNull();
    expect(deselectAllLink).toBeNull();
  });

  // Scenario: 다중 선택 세로 표시
  it("Scenario: multiSelectionDisplayDirection=vertical shows items with line breaks", () => {
    setupTestBed(SdSelectMultiVerticalTest);
    const fixture = TestBed.createComponent(SdSelectMultiVerticalTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const selectEl = fixture.nativeElement.querySelector("sd-select") as HTMLElement;
    const contentEl = selectEl.querySelector("._sd-select-control-content") as HTMLElement;
    expect(contentEl).toBeTruthy();
    // In vertical mode, items should be separated by <br>
    const brElements = contentEl.querySelectorAll("br");
    expect(brElements.length).toBeGreaterThanOrEqual(1);
  });

  // Scenario: 다중 선택 가로 표시 (기본)
  it("Scenario: default multi display shows items separated by comma", () => {
    setupTestBed(SdSelectMultiPreselectedTest);
    const fixture = TestBed.createComponent(SdSelectMultiPreselectedTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const selectEl = fixture.nativeElement.querySelector("sd-select") as HTMLElement;
    const contentEl = selectEl.querySelector("._sd-select-control-content") as HTMLElement;
    expect(contentEl).toBeTruthy();
    // Content should contain comma-separated items
    const text = contentEl.textContent;
    expect(text).toContain(",");
  });
});
