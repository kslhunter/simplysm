import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdResizeEventPlugin } from "../../../src/core/events/sd-resize-event.plugin";
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

describe("Feature 5.1 Slice 1: SdSelect + SdSelectItem basic (single select)", () => {
  // Acceptance: Scenario - clicking an item in single mode sets the value
  it("Scenario: click item B sets value to B and dropdown closes", () => {
    setupTestBed(SdSelectSingleTest);
    const fixture = TestBed.createComponent(SdSelectSingleTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    // Open the dropdown
    const selectEl = fixture.nativeElement.querySelector("sd-select") as HTMLElement;
    const dropdownEl = selectEl.querySelector("sd-dropdown") as HTMLElement;
    dropdownEl.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    // Click item B's _content in the popup
    const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
    const itemContents = popup.querySelectorAll("sd-select-item ._content");
    const itemBContent = itemContents[1] as HTMLElement;
    itemBContent.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    // value should be B
    expect(fixture.componentInstance.value()).toBe("B");

    // dropdown should be closed (single mode auto-close)
    const popupInBody = Array.from(document.body.children).some(
      (el) => el.tagName.toLowerCase() === "sd-dropdown-popup",
    );
    expect(popupInBody).toBe(false);
  });

  // Acceptance: Scenario - changing selection from A to C
  it("Scenario: change selection from A to C", () => {
    setupTestBed(SdSelectPreselectedTest);
    const fixture = TestBed.createComponent(SdSelectPreselectedTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.value()).toBe("A");

    // Open the dropdown
    const selectEl = fixture.nativeElement.querySelector("sd-select") as HTMLElement;
    const dropdownEl = selectEl.querySelector("sd-dropdown") as HTMLElement;
    dropdownEl.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    // Click item C's _content
    const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
    const itemContents = popup.querySelectorAll("sd-select-item ._content");
    const itemCContent = itemContents[2] as HTMLElement;
    itemCContent.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.value()).toBe("C");
  });

  // Acceptance: Scenario - placeholder shown when no value selected
  it("Scenario: placeholder is shown when value is undefined", () => {
    setupTestBed(SdSelectPlaceholderTest);
    const fixture = TestBed.createComponent(SdSelectPlaceholderTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const selectEl = fixture.nativeElement.querySelector("sd-select") as HTMLElement;
    const contentEl = selectEl.querySelector("._sd-select-control-content") as HTMLElement;
    expect(contentEl).toBeTruthy();
    expect(contentEl.textContent.trim()).toBe("Select an item");
    // placeholder should have lighter color class
    const placeholderSpan = contentEl.querySelector("span.tx-trans-lighter");
    expect(placeholderSpan).toBeTruthy();
  });

  // Acceptance: Scenario - manual item placement renders correctly
  it("Scenario: manually placed sd-select-items render in popup", () => {
    setupTestBed(SdSelectSingleTest);
    const fixture = TestBed.createComponent(SdSelectSingleTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    // Open the dropdown
    const selectEl = fixture.nativeElement.querySelector("sd-select") as HTMLElement;
    const dropdownEl = selectEl.querySelector("sd-dropdown") as HTMLElement;
    dropdownEl.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    // Items should be rendered inside the popup
    const popup = document.body.querySelector("sd-dropdown-popup") as HTMLElement;
    const items = popup.querySelectorAll("sd-select-item");
    expect(items.length).toBe(3);
    expect(items[0].textContent.trim()).toBe("Item A");
    expect(items[1].textContent.trim()).toBe("Item B");
    expect(items[2].textContent.trim()).toBe("Item C");
  });
});
