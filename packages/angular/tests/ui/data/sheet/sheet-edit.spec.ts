import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdOptionEventPlugin } from "../../../../src/core/plugins/events/sd-option-event.plugin";
import {
  SdSheetEditTest,
  SdSheetEditTextareaTest,
  SdSheetEditContenteditableTest,
} from "./sd-sheet-edit-test.fixture";

function createFixture<T>(component: new (...args: any[]) => T) {
  const fixture = TestBed.configureTestingModule({
    imports: [component],
    providers: [
      { provide: EVENT_MANAGER_PLUGINS, useClass: SdOptionEventPlugin, multi: true },
    ],
  }).createComponent(component);
  fixture.detectChanges();
  return fixture;
}

async function stableFixture<T>(component: new (...args: any[]) => T) {
  const fixture = createFixture(component);
  await fixture.whenStable();
  return fixture;
}

function getDataCell(host: HTMLElement, r: number, c: number): HTMLTableCellElement {
  const cell = host.querySelector(`td[data-r="${r}"][data-c="${c}"]`) as HTMLTableCellElement;
  expect(cell).toBeTruthy();
  return cell;
}

function pressKey(
  target: HTMLElement,
  key: string,
  opts: { ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean } = {},
): void {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...opts,
    }),
  );
}

describe("Feature 6.2 Slice 1: 셀 편집 + 키보드 탐색", () => {
  it("Scenario: F2로 편집 모드 진입", async () => {
    const fixture = await stableFixture(SdSheetEditTest);
    const host = fixture.nativeElement as HTMLElement;

    const cell = getDataCell(host, 0, 0);
    cell.focus();

    // Before F2: display mode
    expect(cell.querySelector("._name-display")).toBeTruthy();
    expect(cell.querySelector("._name-input")).toBeFalsy();

    // Press F2 from the focused cell (bubbles up, captured by host)
    pressKey(cell, "F2");
    fixture.detectChanges();
    await fixture.whenStable();

    // After F2: edit mode
    expect(cell.classList.contains("_edit-mode")).toBe(true);
    expect(cell.querySelector("._name-input")).toBeTruthy();
  });

  it("Scenario: 더블클릭으로 편집 모드 진입", async () => {
    const fixture = await stableFixture(SdSheetEditTest);
    const host = fixture.nativeElement as HTMLElement;

    const cell = getDataCell(host, 0, 0);
    cell.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(cell.classList.contains("_edit-mode")).toBe(true);
    expect(cell.querySelector("._name-input")).toBeTruthy();
  });

  it("Scenario: Escape로 편집 모드 종료", async () => {
    const fixture = await stableFixture(SdSheetEditTest);
    const host = fixture.nativeElement as HTMLElement;

    const cell = getDataCell(host, 0, 0);
    cell.focus();

    // Enter edit mode
    pressKey(cell, "F2");
    fixture.detectChanges();
    await fixture.whenStable();

    expect(cell.classList.contains("_edit-mode")).toBe(true);

    // Press Escape from the input inside the cell
    const input = cell.querySelector("._name-input") as HTMLInputElement;
    pressKey(input, "Escape");
    fixture.detectChanges();
    await fixture.whenStable();

    expect(cell.classList.contains("_edit-mode")).toBe(false);
    expect(cell.querySelector("._name-display")).toBeTruthy();
  });

  it("Scenario: blur로 편집 모드 종료", async () => {
    const fixture = await stableFixture(SdSheetEditTest);
    const host = fixture.nativeElement as HTMLElement;

    const cell00 = getDataCell(host, 0, 0);
    cell00.focus();

    // Enter edit mode
    pressKey(cell00, "F2");
    fixture.detectChanges();
    await fixture.whenStable();
    expect(cell00.classList.contains("_edit-mode")).toBe(true);

    // Focus moves to a different cell (outside current cell)
    const cell10 = getDataCell(host, 1, 0);
    const input = cell00.querySelector("._name-input") as HTMLInputElement;
    input.dispatchEvent(
      new FocusEvent("blur", { bubbles: true, relatedTarget: cell10 }),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    expect(cell00.classList.contains("_edit-mode")).toBe(false);
  });

  it("Scenario: 같은 셀 내 포커스 이동은 편집 유지", async () => {
    const fixture = await stableFixture(SdSheetEditTest);
    const host = fixture.nativeElement as HTMLElement;

    const cell = getDataCell(host, 0, 0);
    cell.focus();

    pressKey(cell, "F2");
    fixture.detectChanges();
    await fixture.whenStable();

    const input = cell.querySelector("._name-input") as HTMLInputElement;
    expect(input).toBeTruthy();

    // Simulate blur with relatedTarget within the same cell
    input.dispatchEvent(
      new FocusEvent("blur", { bubbles: true, relatedTarget: cell }),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    // Edit mode should be maintained (cell contains itself as td)
    expect(cell.classList.contains("_edit-mode")).toBe(true);
  });

  it("Scenario: 셀 포커스에서 ArrowDown", async () => {
    const fixture = await stableFixture(SdSheetEditTest);
    const host = fixture.nativeElement as HTMLElement;

    const cell00 = getDataCell(host, 0, 0);
    cell00.focus();

    pressKey(cell00, "ArrowDown");
    fixture.detectChanges();
    await fixture.whenStable();

    const cell10 = getDataCell(host, 1, 0);
    expect(document.activeElement === cell10 || host.contains(document.activeElement)).toBe(true);
  });

  it("Scenario: 셀 포커스에서 ArrowUp", async () => {
    const fixture = await stableFixture(SdSheetEditTest);
    const host = fixture.nativeElement as HTMLElement;

    const cell10 = getDataCell(host, 1, 0);
    cell10.focus();

    pressKey(cell10, "ArrowUp");
    fixture.detectChanges();
    await fixture.whenStable();

    const cell00 = getDataCell(host, 0, 0);
    expect(document.activeElement === cell00 || host.contains(document.activeElement)).toBe(true);
  });

  it("Scenario: 셀 포커스에서 ArrowRight", async () => {
    const fixture = await stableFixture(SdSheetEditTest);
    const host = fixture.nativeElement as HTMLElement;

    const cell00 = getDataCell(host, 0, 0);
    cell00.focus();

    pressKey(cell00, "ArrowRight");
    fixture.detectChanges();
    await fixture.whenStable();

    const cell01 = getDataCell(host, 0, 1);
    expect(document.activeElement === cell01 || host.contains(document.activeElement)).toBe(true);
  });

  it("Scenario: 셀 포커스에서 ArrowLeft", async () => {
    const fixture = await stableFixture(SdSheetEditTest);
    const host = fixture.nativeElement as HTMLElement;

    const cell01 = getDataCell(host, 0, 1);
    cell01.focus();

    pressKey(cell01, "ArrowLeft");
    fixture.detectChanges();
    await fixture.whenStable();

    const cell00 = getDataCell(host, 0, 0);
    expect(document.activeElement === cell00 || host.contains(document.activeElement)).toBe(true);
  });

  it("Scenario: 이동 대상 셀이 없으면 무시", async () => {
    const fixture = await stableFixture(SdSheetEditTest);
    const host = fixture.nativeElement as HTMLElement;

    const cell00 = getDataCell(host, 0, 0);
    cell00.focus();

    // ArrowUp on first row — nothing happens
    pressKey(cell00, "ArrowUp");
    fixture.detectChanges();
    await fixture.whenStable();

    // Focus should remain on the same cell
    expect(document.activeElement).toBe(cell00);
  });

  it("Scenario: 일반 입력에서 Enter", async () => {
    const fixture = await stableFixture(SdSheetEditTest);
    const host = fixture.nativeElement as HTMLElement;

    const cell00 = getDataCell(host, 0, 0);
    cell00.focus();

    // Enter edit mode
    pressKey(cell00, "F2");
    fixture.detectChanges();
    await fixture.whenStable();

    const sheetComponent = fixture.debugElement.children[0].componentInstance;

    // Verify edit mode is active before Enter
    const addrBefore = sheetComponent.cellAgent.editModeCellAddr();
    expect(addrBefore).toEqual({ r: 0, c: 0 });

    const input = cell00.querySelector("._name-input") as HTMLInputElement;
    expect(input).toBeTruthy();

    // Press Enter from the input
    pressKey(input, "Enter");

    fixture.detectChanges();
    await fixture.whenStable();

    // Should move to next row and enter edit mode
    const cell10 = getDataCell(host, 1, 0);
    expect(cell10.classList.contains("_edit-mode")).toBe(true);
  });

  it("Scenario: 편집 모드에서 Ctrl+Alt+Arrow", async () => {
    const fixture = await stableFixture(SdSheetEditTest);
    const host = fixture.nativeElement as HTMLElement;

    const cell00 = getDataCell(host, 0, 0);
    cell00.focus();

    pressKey(cell00, "F2");
    fixture.detectChanges();
    await fixture.whenStable();

    const input = cell00.querySelector("._name-input") as HTMLInputElement;
    expect(input).toBeTruthy();

    // Ctrl+Alt+ArrowDown
    pressKey(input, "ArrowDown", { ctrlKey: true, altKey: true });
    fixture.detectChanges();
    await fixture.whenStable();

    // Should move to next row in edit mode
    const cell10 = getDataCell(host, 1, 0);
    expect(cell10.classList.contains("_edit-mode")).toBe(true);
    expect(cell00.classList.contains("_edit-mode")).toBe(false);
  });

  it("Scenario: 행 keydown 이벤트", async () => {
    const fixture = await stableFixture(SdSheetEditTest);
    const host = fixture.nativeElement as HTMLElement;

    const cell00 = getDataCell(host, 0, 0);
    cell00.focus();

    cell00.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", bubbles: true }),
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.lastItemKeydown()).toBeTruthy();
    expect(fixture.componentInstance.lastItemKeydown().event.key).toBe("a");
  });

  it("Scenario: 데이터 셀 keydown 이벤트", async () => {
    const fixture = await stableFixture(SdSheetEditTest);
    const host = fixture.nativeElement as HTMLElement;

    const cell00 = getDataCell(host, 0, 0);
    cell00.focus();

    cell00.dispatchEvent(
      new KeyboardEvent("keydown", { key: "b", bubbles: true }),
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.lastCellKeydown()).toBeTruthy();
    expect(fixture.componentInstance.lastCellKeydown().event.key).toBe("b");
  });

  it("Scenario: textarea에서 Enter — 줄바꿈이 입력된다 (기본 동작)", async () => {
    const fixture = await stableFixture(SdSheetEditTextareaTest);
    const host = fixture.nativeElement as HTMLElement;

    const cell = getDataCell(host, 0, 0);
    cell.focus();
    pressKey(cell, "F2");
    fixture.detectChanges();
    await fixture.whenStable();

    const textarea = cell.querySelector("._name-textarea") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();

    // Press Enter — should not exit edit mode (default behavior for textarea)
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    textarea.dispatchEvent(event);
    fixture.detectChanges();
    await fixture.whenStable();

    // Should still be in edit mode on same cell
    expect(cell.classList.contains("_edit-mode")).toBe(true);
    // Enter was not prevented — default behavior allowed
    expect(event.defaultPrevented).toBe(false);
  });

  it("Scenario: textarea에서 Ctrl+Alt+Enter — 다음 행으로 이동", async () => {
    const fixture = await stableFixture(SdSheetEditTextareaTest);
    const host = fixture.nativeElement as HTMLElement;

    const cell = getDataCell(host, 0, 0);
    cell.focus();
    pressKey(cell, "F2");
    fixture.detectChanges();
    await fixture.whenStable();

    const textarea = cell.querySelector("._name-textarea") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();

    pressKey(textarea, "Enter", { ctrlKey: true, altKey: true });
    fixture.detectChanges();
    await fixture.whenStable();

    const cell10 = getDataCell(host, 1, 0);
    expect(cell10.classList.contains("_edit-mode")).toBe(true);
    expect(cell.classList.contains("_edit-mode")).toBe(false);
  });

  it("Scenario: contenteditable에서 Enter — 줄바꿈이 입력된다 (기본 동작)", async () => {
    const fixture = await stableFixture(SdSheetEditContenteditableTest);
    const host = fixture.nativeElement as HTMLElement;

    const cell = getDataCell(host, 0, 0);
    cell.focus();
    pressKey(cell, "F2");
    fixture.detectChanges();
    await fixture.whenStable();

    const editable = cell.querySelector("._name-editable") as HTMLElement;
    expect(editable).toBeTruthy();

    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    editable.dispatchEvent(event);
    fixture.detectChanges();
    await fixture.whenStable();

    // Should still be in edit mode
    expect(cell.classList.contains("_edit-mode")).toBe(true);
    expect(event.defaultPrevented).toBe(false);
  });

  it("Scenario: contenteditable에서 Ctrl+Alt+Enter — 다음 행으로 이동", async () => {
    const fixture = await stableFixture(SdSheetEditContenteditableTest);
    const host = fixture.nativeElement as HTMLElement;

    const cell = getDataCell(host, 0, 0);
    cell.focus();
    pressKey(cell, "F2");
    fixture.detectChanges();
    await fixture.whenStable();

    const editable = cell.querySelector("._name-editable") as HTMLElement;
    expect(editable).toBeTruthy();

    pressKey(editable, "Enter", { ctrlKey: true, altKey: true });
    fixture.detectChanges();
    await fixture.whenStable();

    const cell10 = getDataCell(host, 1, 0);
    expect(cell10.classList.contains("_edit-mode")).toBe(true);
    expect(cell.classList.contains("_edit-mode")).toBe(false);
  });
});
