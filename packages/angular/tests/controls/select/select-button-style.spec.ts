import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdResizeEventPlugin } from "../../../src/core/events/sd-resize-event.plugin";
import {
  SdSelectButtonTest,
  SdSelectButtonDisabledTest,
  SdSelectDisabledTest,
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

describe("Feature 5.1 Slice 4: SdSelectButton + style variants", () => {
  // Scenario: 선택 버튼 표시
  it("Scenario: sd-select-button renders next to dropdown trigger", () => {
    setupTestBed(SdSelectButtonTest);
    const fixture = TestBed.createComponent(SdSelectButtonTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const selectEl = fixture.nativeElement.querySelector("sd-select") as HTMLElement;
    const buttonEl = selectEl.querySelector("sd-select-button") as HTMLElement;
    expect(buttonEl).toBeTruthy();
    expect(buttonEl.textContent.trim()).toBe("Open");
  });

  // Scenario: disabled 상태에서 선택 버튼 숨김
  it("Scenario: sd-select-button is not rendered when disabled", () => {
    setupTestBed(SdSelectButtonDisabledTest);
    const fixture = TestBed.createComponent(SdSelectButtonDisabledTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const selectEl = fixture.nativeElement.querySelector("sd-select") as HTMLElement;
    const buttonEl = selectEl.querySelector("sd-select-button");
    // Button should be hidden when select is disabled
    expect(buttonEl == null || getComputedStyle(buttonEl).display === "none").toBe(true);
  });

  // Scenario: disabled 스타일
  it("Scenario: disabled applies data-sd-disabled=true and hides caret", () => {
    setupTestBed(SdSelectDisabledTest);
    const fixture = TestBed.createComponent(SdSelectDisabledTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const selectEl = fixture.nativeElement.querySelector("sd-select") as HTMLElement;
    expect(selectEl.getAttribute("data-sd-disabled")).toBe("true");

    // Caret icon should not be rendered
    const caretIcon = selectEl.querySelector("._sd-select-control-icon");
    expect(caretIcon).toBeNull();
  });
});
