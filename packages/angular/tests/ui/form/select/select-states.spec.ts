import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdResizeEventPlugin } from "../../../../src/core/plugins/events/sd-resize-event.plugin";
import {
  SdSelectDisabledItemTest,
  SdSelectHiddenItemTest,
  SdSelectMultiMixedStateTest,
  SdSelectRequiredTest,
  SdSelectRequiredSelectedTest,
  SdSelectItemsTemplateTest,
  SdSelectHierarchyTest,
  SdSelectHeaderTplTest,
  SdSelectBeforeTplTest,
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

describe("Feature 5.1 Slice 3: Item states + validation + items template", () => {
  // Scenario: 비활성화된 아이템 클릭 무시
  it("Scenario: clicking a disabled item does not change the value", () => {
    setupTestBed(SdSelectDisabledItemTest);
    const fixture = TestBed.createComponent(SdSelectDisabledItemTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = openDropdown(fixture);
    const items = popup.querySelectorAll("sd-select-item");
    const disabledItem = items[0] as HTMLElement;

    expect(disabledItem.getAttribute("data-sd-disabled")).toBe("true");

    const contentEl = disabledItem.querySelector("._content") as HTMLElement;
    contentEl.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.value()).toBeUndefined();
  });

  // Scenario: 숨겨진 아이템 비표시
  it("Scenario: hidden item is not visible", () => {
    setupTestBed(SdSelectHiddenItemTest);
    const fixture = TestBed.createComponent(SdSelectHiddenItemTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = openDropdown(fixture);
    const items = popup.querySelectorAll("sd-select-item");
    const hiddenItem = items[0] as HTMLElement;
    expect(hiddenItem.getAttribute("data-sd-hidden")).toBe("true");
  });

  // Scenario: 전체선택 시 disabled/hidden 항목 제외
  it("Scenario: select all excludes disabled and hidden items", () => {
    setupTestBed(SdSelectMultiMixedStateTest);
    const fixture = TestBed.createComponent(SdSelectMultiMixedStateTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = openDropdown(fixture);
    const selectAllLink = popup.querySelector("[data-sd-select-all]") as HTMLElement;
    selectAllLink.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    // A is disabled, C is hidden => only B, D selected
    expect(fixture.componentInstance.value()).toEqual(["B", "D"]);
  });

  // Scenario: 필수 미선택 시 에러
  it("Scenario: required with no value shows validation error", () => {
    setupTestBed(SdSelectRequiredTest);
    const fixture = TestBed.createComponent(SdSelectRequiredTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const selectEl = fixture.nativeElement.querySelector("sd-select") as HTMLElement;
    const invalidInput = selectEl.querySelector("input.sd-invalid-input") as HTMLInputElement;
    expect(invalidInput).toBeTruthy();
    expect(invalidInput.validationMessage).toBeTruthy();
  });

  // Scenario: 필수 선택 완료 시 에러 없음
  it("Scenario: required with value has no validation error", () => {
    setupTestBed(SdSelectRequiredSelectedTest);
    const fixture = TestBed.createComponent(SdSelectRequiredSelectedTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const selectEl = fixture.nativeElement.querySelector("sd-select") as HTMLElement;
    const invalidInput = selectEl.querySelector("input.sd-invalid-input") as HTMLInputElement;
    expect(invalidInput).toBeTruthy();
    expect(invalidInput.validationMessage).toBe("");
  });

  // Scenario: items + itemOf 템플릿으로 자동 렌더링
  it("Scenario: items with itemOf template renders each item", () => {
    setupTestBed(SdSelectItemsTemplateTest);
    const fixture = TestBed.createComponent(SdSelectItemsTemplateTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = openDropdown(fixture);
    const items = popup.querySelectorAll("sd-select-item");
    expect(items.length).toBe(3);
    expect(items[0].textContent.trim()).toContain("Label A");
    expect(items[1].textContent.trim()).toContain("Label B");
    expect(items[2].textContent.trim()).toContain("Label C");
  });

  // Scenario: 계층 구조 렌더링
  it("Scenario: hierarchy items rendered with children indented", () => {
    setupTestBed(SdSelectHierarchyTest);
    const fixture = TestBed.createComponent(SdSelectHierarchyTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = openDropdown(fixture);
    const items = popup.querySelectorAll("sd-select-item");
    expect(items.length).toBe(3);
    expect(items[0].textContent.trim()).toContain("Parent A");
    expect(items[1].textContent.trim()).toContain("Child A-1");
    expect(items[2].textContent.trim()).toContain("Child A-2");
  });

  // Scenario: 헤더 템플릿
  it("Scenario: headerTpl renders at top of popup", () => {
    setupTestBed(SdSelectHeaderTplTest);
    const fixture = TestBed.createComponent(SdSelectHeaderTplTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = openDropdown(fixture);
    const header = popup.querySelector(".custom-header") as HTMLElement;
    expect(header).toBeTruthy();
    expect(header.textContent.trim()).toBe("Header Content");
  });

  // Scenario: before 템플릿
  it("Scenario: beforeTpl renders before item list", () => {
    setupTestBed(SdSelectBeforeTplTest);
    const fixture = TestBed.createComponent(SdSelectBeforeTplTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const popup = openDropdown(fixture);
    const before = popup.querySelector(".custom-before") as HTMLElement;
    expect(before).toBeTruthy();
    expect(before.textContent.trim()).toBe("Before Content");
  });
});
