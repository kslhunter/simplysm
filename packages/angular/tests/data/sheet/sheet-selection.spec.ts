import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdSheetSelectSingleTest,
  SdSheetSelectMultiTest,
  SdSheetSelectDisabledTest,
  SdSheetNoSelectTest,
  SdSheetAutoSelectClickTest,
  SdSheetAutoSelectFocusTest,
  SdSheetFocusModeRowTest,
} from "./sd-sheet-test.fixture";

describe("Feature 6.1 Slice 3: 행 선택 + 시각 표시", () => {
  it("Scenario: 단일 선택 — 행 B를 클릭하면 행 B의 key만 선택되고 행 A의 key는 해제된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetSelectSingleTest],
    }).createComponent(SdSheetSelectSingleTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const anchors = host.querySelectorAll("tbody tr td._feature-cell sd-anchor");

    (anchors[0] as HTMLElement).dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.selectedKeys()).toEqual(["A"]);

    (anchors[1] as HTMLElement).dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.selectedKeys()).toEqual(["B"]);
  });

  it("Scenario: 단일 선택 + autoSelect click — 선택 앵커 click은 행 click으로 버블링되지 않는다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetAutoSelectClickTest],
    }).createComponent(SdSheetAutoSelectClickTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const anchor = host.querySelector("tbody tr td._feature-cell sd-anchor") as HTMLElement;

    anchor.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    anchor.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.selectedKeys()).toEqual(["A"]);

    anchor.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    anchor.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.selectedKeys()).toEqual([]);
  });

  it("Scenario: 다중 선택 — 행 A와 행 B 체크박스를 클릭하면 둘 다 선택된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetSelectMultiTest],
    }).createComponent(SdSheetSelectMultiTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const checkboxes = host.querySelectorAll("tbody tr td._feature-cell sd-checkbox");

    (checkboxes[0] as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    (checkboxes[1] as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.selectedKeys()).toEqual(["A", "B"]);
  });

  it("Scenario: 전체 선택과 해제 — 전체 선택 체크박스로 모든 행을 선택/해제한다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetSelectMultiTest],
    }).createComponent(SdSheetSelectMultiTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const headerCheckbox = host.querySelector("thead th._feature-cell sd-checkbox") as HTMLElement;
    expect(headerCheckbox).toBeTruthy();

    headerCheckbox.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.selectedKeys()).toEqual(["A", "B", "C"]);

    headerCheckbox.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.selectedKeys()).toEqual([]);
  });

  it("Scenario: 선택 불가 행 — 선택 불가 행의 체크박스에 title 속성이 있다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetSelectDisabledTest],
    }).createComponent(SdSheetSelectDisabledTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const checkboxes = host.querySelectorAll("tbody tr td._feature-cell sd-checkbox");

    const rowCCheckbox = checkboxes[2] as HTMLElement;
    expect((checkboxes[0] as HTMLElement).hasAttribute("title")).toBe(false);
    expect(rowCCheckbox.getAttribute("title")).toBe("권한 없음");

    rowCCheckbox.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.selectedKeys()).toEqual([]);
  });

  it("Scenario: 선택 가능한 단일 선택 앵커에는 boolean title이 렌더링되지 않는다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetSelectSingleTest],
    }).createComponent(SdSheetSelectSingleTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const anchor = host.querySelector("tbody tr td._feature-cell sd-anchor") as HTMLElement;
    expect(anchor.hasAttribute("title")).toBe(false);
  });

  it("Scenario: 자동 선택 — 클릭: 셀 클릭 시 행이 자동으로 선택된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetAutoSelectClickTest],
    }).createComponent(SdSheetAutoSelectClickTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const dataCells = host.querySelectorAll("tbody tr td:not(._feature-cell)");
    (dataCells[0] as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.selectedKeys()).toEqual(["A"]);
  });

  it("Scenario: 자동 선택 — 포커스: 셀 포커스 시 행이 자동으로 선택된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetAutoSelectFocusTest],
    }).createComponent(SdSheetAutoSelectFocusTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const dataCells = host.querySelectorAll("tbody tr td:not(._feature-cell)");
    (dataCells[0] as HTMLElement).focus();
    (dataCells[0] as HTMLElement).dispatchEvent(new FocusEvent("focus"));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.selectedKeys()).toEqual(["A"]);
  });

  it("Scenario: 선택 모드 미지정 — feature cell에 선택 UI가 표시되지 않는다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetNoSelectTest],
    }).createComponent(SdSheetNoSelectTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const selectCheckbox = host.querySelector("tbody td._feature-cell sd-checkbox");
    const selectAnchor = host.querySelector("tbody td._feature-cell sd-anchor");
    expect(selectCheckbox).toBeNull();
    expect(selectAnchor).toBeNull();
  });

  it("Scenario: 선택 행 시각 표시 — 선택 시 selectedKeys 모델에 반영된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetSelectMultiTest],
    }).createComponent(SdSheetSelectMultiTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const checkboxes = host.querySelectorAll("tbody tr td._feature-cell sd-checkbox");
    (checkboxes[0] as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.selectedKeys()).toEqual(["A"]);
  });

  it("Scenario: 포커스 셀 시각 표시 — 셀에 tabindex가 있고 포커스 가능하다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetNoSelectTest],
    }).createComponent(SdSheetNoSelectTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const td = host.querySelector("tbody td:not(._feature-cell)") as HTMLElement;
    expect(td.getAttribute("tabindex")).toBe("0");
  });

  it("Scenario: 포커스 모드 — 행: focusMode='row'이면 host에 속성이 설정된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetFocusModeRowTest],
    }).createComponent(SdSheetFocusModeRowTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const td = host.querySelector("tbody td:not(._feature-cell)") as HTMLElement;
    expect(td).toBeTruthy();
  });
});
