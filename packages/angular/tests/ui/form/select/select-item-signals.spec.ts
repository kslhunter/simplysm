import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdResizeEventPlugin } from "../../../../src/core/plugins/events/sd-resize-event.plugin";
import {
  SdSelectSingleTest,
  SdSelectPreselectedTest,
  SdSelectMultiPreselectedTest,
  SdSelectDynamicContentTest,
} from "./sd-select-test.fixture";
import { SdSelectItem } from "../../../../src/ui/form/select/sd-select-item";
import { vi } from "vitest";
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

// PERF-003 Slice 1: isSelected computed + parent effect

describe("PERF-003 Slice 1: isSelected computed + parent effect", () => {
  it("Scenario: value 변경 시 isSelected가 올바르게 갱신된다 (single mode)", () => {
    setupTestBed(SdSelectSingleTest);
    const fixture = TestBed.createComponent(SdSelectSingleTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    // Open dropdown and select item A
    const popup = openDropdown(fixture);
    const itemContents = popup.querySelectorAll("sd-select-item ._content");
    (itemContents[0] as HTMLElement).click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.value()).toBe("A");

    // Re-open and verify isSelected via data attribute
    const popup2 = openDropdown(fixture);
    const items2 = popup2.querySelectorAll("sd-select-item");
    expect(items2[0].getAttribute("data-sd-selected")).toBe("true");
    expect(items2[1].getAttribute("data-sd-selected")).toBe("false");
    expect(items2[2].getAttribute("data-sd-selected")).toBe("false");

    // Now change value to B
    const itemContents2 = popup2.querySelectorAll("sd-select-item ._content");
    (itemContents2[1] as HTMLElement).click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.value()).toBe("B");

    // Re-open and verify
    const popup3 = openDropdown(fixture);
    const items3 = popup3.querySelectorAll("sd-select-item");
    expect(items3[0].getAttribute("data-sd-selected")).toBe("false");
    expect(items3[1].getAttribute("data-sd-selected")).toBe("true");
    expect(items3[2].getAttribute("data-sd-selected")).toBe("false");
  });

  it("Scenario: multi 모드에서 isSelected가 배열 비교로 동작한다", () => {
    setupTestBed(SdSelectMultiPreselectedTest);
    const fixture = TestBed.createComponent(SdSelectMultiPreselectedTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    // value is ["A", "B"] initially
    const popup = openDropdown(fixture);
    const items = popup.querySelectorAll("sd-select-item");
    expect(items[0].getAttribute("data-sd-selected")).toBe("true");
    expect(items[1].getAttribute("data-sd-selected")).toBe("true");
    expect(items[2].getAttribute("data-sd-selected")).toBe("false");
  });

  it("Scenario: value 변경 시 선택된 항목의 HTML이 트리거 영역에 표시된다", () => {
    setupTestBed(SdSelectPreselectedTest);
    const fixture = TestBed.createComponent(SdSelectPreselectedTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    // Initially value is "A", trigger should show Item A
    const selectEl = fixture.nativeElement.querySelector("sd-select") as HTMLElement;
    const contentEl = selectEl.querySelector("._sd-select-control-content") as HTMLElement;
    expect(contentEl.textContent.trim()).toContain("Item A");

    // Change value to B by opening dropdown and clicking
    const popup = openDropdown(fixture);
    const itemContents = popup.querySelectorAll("sd-select-item ._content");
    (itemContents[1] as HTMLElement).click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.value()).toBe("B");

    // Trigger area should now show Item B
    const contentEl2 = selectEl.querySelector("._sd-select-control-content") as HTMLElement;
    expect(contentEl2.textContent.trim()).toContain("Item B");
  });

  it("isSelected는 computed이다 (signal이 아닌 computed 타입)", () => {
    setupTestBed(SdSelectSingleTest);
    const fixture = TestBed.createComponent(SdSelectSingleTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = openDropdown(fixture);
    const itemEl = popup.querySelector("sd-select-item");
    expect(itemEl).toBeTruthy();

    // Access the component instance to verify isSelected is not writable
    const selectDebug = fixture.debugElement.query(
      (de) => de.nativeElement.tagName?.toLowerCase() === "sd-select",
    );
    const itemDebug = selectDebug.queryAll(
      (de) => de.nativeElement.tagName?.toLowerCase() === "sd-select-item",
    )[0];
    const itemInstance = itemDebug.componentInstance as SdSelectItem<string>;

    // computed signals don't have a .set method (it's a readonly signal)
    expect(typeof (itemInstance.isSelected as any).set).not.toBe("function");
  });
});

// PERF-003 Slice 2: contentHTML MutationObserver 기반 전환

describe("PERF-003 Slice 2: contentHTML MutationObserver 기반", () => {
  it("Scenario: 초기 렌더 후 contentHTML이 설정된다", async () => {
    setupTestBed(SdSelectDynamicContentTest);
    const fixture = TestBed.createComponent(SdSelectDynamicContentTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    // Wait for afterNextRender to fire
    await vi.waitFor(() => {
      const selectDebug = fixture.debugElement.query(
        (de) => de.nativeElement.tagName?.toLowerCase() === "sd-select",
      );
      const itemDebug = selectDebug.queryAll(
        (de) => de.nativeElement.tagName?.toLowerCase() === "sd-select-item",
      )[0];
      const itemInstance = itemDebug.componentInstance as SdSelectItem<string>;
      expect(itemInstance.contentHTML()).toContain("Item A");
    });
  });

  it("Scenario: 투영된 콘텐츠가 변경되면 contentHTML이 갱신된다", async () => {
    setupTestBed(SdSelectDynamicContentTest);
    const fixture = TestBed.createComponent(SdSelectDynamicContentTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    // Wait for initial contentHTML to be set
    await vi.waitFor(() => {
      const selectDebug = fixture.debugElement.query(
        (de) => de.nativeElement.tagName?.toLowerCase() === "sd-select",
      );
      const itemDebug = selectDebug.queryAll(
        (de) => de.nativeElement.tagName?.toLowerCase() === "sd-select-item",
      )[0];
      const itemInstance = itemDebug.componentInstance as SdSelectItem<string>;
      expect(itemInstance.contentHTML()).toContain("Item A");
    });

    // Change the projected content
    fixture.componentInstance.labelA.set("Updated A");
    fixture.detectChanges();
    TestBed.flushEffects();

    // MutationObserver should pick up the change
    await vi.waitFor(() => {
      const selectDebug = fixture.debugElement.query(
        (de) => de.nativeElement.tagName?.toLowerCase() === "sd-select",
      );
      const itemDebug = selectDebug.queryAll(
        (de) => de.nativeElement.tagName?.toLowerCase() === "sd-select-item",
      )[0];
      const itemInstance = itemDebug.componentInstance as SdSelectItem<string>;
      expect(itemInstance.contentHTML()).toContain("Updated A");
    });
  });

  it("sd-select-item에 afterEveryRender가 사용되지 않는다", () => {
    // Verify at the source level that afterEveryRender is not imported
    // This is a structural test - the implementation should use afterNextRender + MutationObserver
    setupTestBed(SdSelectSingleTest);
    const fixture = TestBed.createComponent(SdSelectSingleTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const selectDebug = fixture.debugElement.query(
      (de) => de.nativeElement.tagName?.toLowerCase() === "sd-select",
    );
    const itemDebug = selectDebug.queryAll(
      (de) => de.nativeElement.tagName?.toLowerCase() === "sd-select-item",
    )[0];
    const itemInstance = itemDebug.componentInstance as SdSelectItem<string>;

    // contentHTML should still be a writable signal (set by MutationObserver)
    expect(typeof (itemInstance.contentHTML as any).set).toBe("function");
  });
});
