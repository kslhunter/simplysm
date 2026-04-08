import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdResizeEventPlugin } from "../../../../src/core/plugins/events/sd-resize-event.plugin";
import {
  SdSelectSingleTest,
  SdSelectPreselectedTest,
  SdSelectPlaceholderTest,
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

describe("SdSelect unit tests", () => {
  it("renders sd-dropdown with trigger area and sd-dropdown-popup", () => {
    setupTestBed(SdSelectSingleTest);
    const fixture = TestBed.createComponent(SdSelectSingleTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const selectEl = fixture.nativeElement.querySelector("sd-select") as HTMLElement;
    expect(selectEl).toBeTruthy();

    const dropdownEl = selectEl.querySelector("sd-dropdown") as HTMLElement;
    expect(dropdownEl).toBeTruthy();

    const triggerArea = dropdownEl.querySelector("._sd-select-control") as HTMLElement;
    expect(triggerArea).toBeTruthy();

    const popupEl = selectEl.querySelector("sd-dropdown-popup") as HTMLElement;
    expect(popupEl).toBeTruthy();
  });

  it("renders items inside sd-dropdown-popup", () => {
    setupTestBed(SdSelectSingleTest);
    const fixture = TestBed.createComponent(SdSelectSingleTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    // Items should exist within the popup area of the select
    const selectEl = fixture.nativeElement.querySelector("sd-select") as HTMLElement;
    const popupEl = selectEl.querySelector("sd-dropdown-popup") as HTMLElement;
    const items = popupEl.querySelectorAll("sd-select-item");
    expect(items.length).toBe(3);
  });

  it("displays placeholder text in content area when value is undefined", () => {
    setupTestBed(SdSelectPlaceholderTest);
    const fixture = TestBed.createComponent(SdSelectPlaceholderTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const selectEl = fixture.nativeElement.querySelector("sd-select") as HTMLElement;
    const contentEl = selectEl.querySelector("._sd-select-control-content") as HTMLElement;
    expect(contentEl).toBeTruthy();

    const placeholderSpan = contentEl.querySelector("span.tx-trans-lighter");
    expect(placeholderSpan).toBeTruthy();
    expect(placeholderSpan!.textContent.trim()).toBe("Select an item");
  });

  it("SdSelectItem click triggers value change on parent", () => {
    setupTestBed(SdSelectSingleTest);
    const fixture = TestBed.createComponent(SdSelectSingleTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = openDropdown(fixture);
    const itemContents = popup.querySelectorAll("sd-select-item ._content");
    (itemContents[0] as HTMLElement).click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.value()).toBe("A");
  });

  it("in single mode, clicking an item closes the dropdown", () => {
    setupTestBed(SdSelectSingleTest);
    const fixture = TestBed.createComponent(SdSelectSingleTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = openDropdown(fixture);
    const itemContents = popup.querySelectorAll("sd-select-item ._content");
    (itemContents[0] as HTMLElement).click();
    fixture.detectChanges();
    TestBed.flushEffects();

    const dropdownDebug = fixture.debugElement.query(
      (de) => de.nativeElement.tagName?.toLowerCase() === "sd-dropdown",
    );
    const dropdownInstance = dropdownDebug.componentInstance;
    expect(dropdownInstance.open()).toBe(false);
  });

  it("displays selected item content in trigger area when value is set", () => {
    setupTestBed(SdSelectPreselectedTest);
    const fixture = TestBed.createComponent(SdSelectPreselectedTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const selectEl = fixture.nativeElement.querySelector("sd-select") as HTMLElement;
    const contentEl = selectEl.querySelector("._sd-select-control-content") as HTMLElement;
    expect(contentEl).toBeTruthy();
    // The content should show Item A's HTML
    expect(contentEl.textContent.trim()).toContain("Item A");
  });
});

// region FIX-2 Slice 4: sd-select-item 효율화 (PERF-003)

describe("FIX-2 Slice 4: sd-select-item isSelected 동작 확인 (PERF-003)", () => {
  it("parent value 변경 시 isSelected가 정확히 갱신된다", () => {
    setupTestBed(SdSelectSingleTest);
    const fixture = TestBed.createComponent(SdSelectSingleTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    // Open dropdown
    const popup = openDropdown(fixture);
    const items = popup.querySelectorAll("sd-select-item");
    expect(items.length).toBe(3);

    // Select first item
    const firstContent = items[0].querySelector("._content") as HTMLElement;
    firstContent.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.value()).toBe("A");

    // Re-open and check selected state
    const popup2 = openDropdown(fixture);
    const items2 = popup2.querySelectorAll("sd-select-item");
    expect(items2[0].getAttribute("data-sd-selected")).toBe("true");
    expect(items2[1].getAttribute("data-sd-selected")).toBe("false");
  });
});

// endregion
