import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdOptionEventPlugin } from "../../../../src/core/plugins/events/sd-option-event.plugin";
import {
  SdSheetResizeTest,
  SdSheetResizeDisabledTest,
} from "./sd-sheet-edit-test.fixture";

async function stableFixture<T>(component: new (...args: any[]) => T) {
  const fixture = TestBed.configureTestingModule({
    imports: [component],
    providers: [
      { provide: EVENT_MANAGER_PLUGINS, useClass: SdOptionEventPlugin, multi: true },
    ],
  }).createComponent(component);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe("Feature 6.2 Slice 2: 컬럼 리사이징", () => {
  it("Scenario: 리사이저 드래그 — 컬럼 너비가 변경되고 config에 저장된다", async () => {
    const fixture = await stableFixture(SdSheetResizeTest);
    const host = fixture.nativeElement as HTMLElement;

    const resizer = host.querySelector("._resizer") as HTMLElement;
    expect(resizer).toBeTruthy();

    const th = resizer.parentElement as HTMLElement;
    const startWidth = th.offsetWidth;

    // Simulate mousedown
    resizer.dispatchEvent(
      new MouseEvent("mousedown", { clientX: 100, bubbles: true }),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    // Check indicator is visible
    const indicator = host.querySelector("._resize-indicator") as HTMLElement;
    expect(indicator.style.display).toBe("block");

    // Simulate mousemove (drag 50px right)
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 150, bubbles: true }),
    );
    fixture.detectChanges();

    // Simulate mouseup
    document.dispatchEvent(
      new MouseEvent("mouseup", { clientX: 150, bubbles: true }),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    // Indicator should be hidden
    expect(indicator.style.display).toBe("none");

    // Config should be saved with new width
    const sheetComponent = fixture.debugElement.children[0].componentInstance;
    const colDefs = sheetComponent.layout.columnDefs();
    const nameCol = colDefs.find((c: any) => c.key === "name");
    expect(nameCol.width).toBe(`${startWidth + 50}px`);
  });

  it("Scenario: 최소 너비 제한 — 너비가 5px 미만이 되지 않는다", async () => {
    const fixture = await stableFixture(SdSheetResizeTest);
    const host = fixture.nativeElement as HTMLElement;

    const resizer = host.querySelector("._resizer") as HTMLElement;
    const th = resizer.parentElement as HTMLElement;
    const startWidth = th.offsetWidth;

    // Simulate drag to shrink column far beyond its width
    resizer.dispatchEvent(
      new MouseEvent("mousedown", { clientX: 1000, bubbles: true }),
    );
    document.dispatchEvent(
      new MouseEvent("mouseup", { clientX: 1000 - startWidth - 100, bubbles: true }),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const sheetComponent = fixture.debugElement.children[0].componentInstance;
    const colDefs = sheetComponent.layout.columnDefs();
    const nameCol = colDefs.find((c: any) => c.key === "name");
    expect(nameCol.width).toBe("5px");
  });

  it("Scenario: 리사이저 더블클릭으로 너비 초기화", async () => {
    const fixture = await stableFixture(SdSheetResizeTest);
    const host = fixture.nativeElement as HTMLElement;
    const sheetComponent = fixture.debugElement.children[0].componentInstance;

    // First, resize to change config
    const resizer = host.querySelector("._resizer") as HTMLElement;
    resizer.dispatchEvent(
      new MouseEvent("mousedown", { clientX: 100, bubbles: true }),
    );
    document.dispatchEvent(
      new MouseEvent("mouseup", { clientX: 150, bubbles: true }),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    // Now double-click to reset
    resizer.dispatchEvent(
      new MouseEvent("dblclick", { bubbles: true }),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    // Width should revert to the column definition default (200px)
    const colDefs = sheetComponent.layout.columnDefs();
    const nameCol = colDefs.find((c: any) => c.key === "name");
    expect(nameCol.width).toBe("200px");
  });

  it("Scenario: disableResizing 컬럼 — 리사이저 핸들이 표시되지 않는다", async () => {
    const fixture = await stableFixture(SdSheetResizeDisabledTest);
    const host = fixture.nativeElement as HTMLElement;

    const ths = host.querySelectorAll("thead th");
    // First column (name) has disableResizing=true — no resizer
    const nameResizer = ths[0].querySelector("._resizer");
    expect(nameResizer).toBeFalsy();

    // Second column (age) has default — has resizer
    const ageResizer = ths[1].querySelector("._resizer");
    expect(ageResizer).toBeTruthy();
  });

  it("Scenario: 리사이징 중 정렬 방지 — mouseup 후 300ms 이내에 정렬되지 않는다", async () => {
    const fixture = await stableFixture(SdSheetResizeTest);
    const host = fixture.nativeElement as HTMLElement;
    const sheetComponent = fixture.debugElement.children[0].componentInstance;

    const resizer = host.querySelector("._resizer") as HTMLElement;

    // Resize
    resizer.dispatchEvent(
      new MouseEvent("mousedown", { clientX: 100, bubbles: true }),
    );
    document.dispatchEvent(
      new MouseEvent("mouseup", { clientX: 150, bubbles: true }),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    // Immediately click header (should be blocked)
    const th = host.querySelector("thead th") as HTMLElement;
    th.click();
    fixture.detectChanges();

    // No sort should be applied
    expect(sheetComponent.sorts()).toEqual([]);
  });
});
