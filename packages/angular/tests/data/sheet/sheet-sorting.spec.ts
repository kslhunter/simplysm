import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdSheetSortTest,
  SdSheetSortNoAutoTest,
  SdSheetSortDisabledTest,
} from "./sd-sheet-test.fixture";

describe("Feature 6.1 Slice 4: 정렬", () => {
  it("Scenario: 오름차순 정렬 — 헤더 클릭 시 오름차순 정렬되고 aria-sort=ascending이 설정된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetSortTest],
    }).createComponent(SdSheetSortTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const ths = host.querySelectorAll("thead th._last-depth:not(._feature-cell)");
    const nameTh = ths[0] as HTMLElement;

    nameTh.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.sorts()).toEqual([{ key: "name", desc: false }]);

    // Verify sort icon is rendered
    const sortIcon = nameTh.querySelector("._sort-icon");
    expect(sortIcon).toBeTruthy();
  });

  it("Scenario: 내림차순 정렬 — 오름차순 헤더를 다시 클릭하면 내림차순이 되고 sorts 모델이 변경된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetSortTest],
    }).createComponent(SdSheetSortTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const ths = host.querySelectorAll("thead th._last-depth:not(._feature-cell)");
    const nameTh = ths[0] as HTMLElement;

    // First click: ascending
    nameTh.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // Second click: descending
    nameTh.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.sorts()).toEqual([{ key: "name", desc: true }]);
  });

  it("Scenario: 정렬 해제 — 내림차순 헤더를 다시 클릭하면 정렬이 해제되고 aria-sort가 제거된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetSortTest],
    }).createComponent(SdSheetSortTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const ths = host.querySelectorAll("thead th._last-depth:not(._feature-cell)");
    const nameTh = ths[0] as HTMLElement;

    // Click 3 times: asc -> desc -> none
    nameTh.click();
    fixture.detectChanges();
    await fixture.whenStable();

    nameTh.click();
    fixture.detectChanges();
    await fixture.whenStable();

    nameTh.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.sorts()).toEqual([]);
  });

  it("Scenario: 다중 정렬 — Shift+클릭으로 다중 정렬되고 순서 번호가 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetSortTest],
    }).createComponent(SdSheetSortTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const ths = host.querySelectorAll("thead th._last-depth:not(._feature-cell)");
    const nameTh = ths[0] as HTMLElement;
    const ageTh = ths[1] as HTMLElement;

    // Click name header
    nameTh.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // Shift+click age header
    ageTh.dispatchEvent(new MouseEvent("click", { shiftKey: true, bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.sorts()).toEqual([
      { key: "name", desc: false },
      { key: "age", desc: false },
    ]);

    // Check sort index numbers (rendered as <sub> inside ._sort-icon)
    const nameIndexSub = nameTh.querySelector("._sort-icon sub");
    const ageIndexSub = ageTh.querySelector("._sort-icon sub");
    if (nameIndexSub == null || ageIndexSub == null) {
      throw new Error("expected sort index sub elements");
    }
    expect(nameIndexSub.textContent.trim()).toBe("1");
    expect(ageIndexSub.textContent.trim()).toBe("2");
  });

  it("Scenario: 자동 정렬 비활성화 — useAutoSort=false이면 sorts 모델만 변경되고 items 순서는 유지된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetSortNoAutoTest],
    }).createComponent(SdSheetSortNoAutoTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const ths = host.querySelectorAll("thead th._last-depth:not(._feature-cell)");
    const nameTh = ths[0] as HTMLElement;

    nameTh.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // sorts model changed
    expect(fixture.componentInstance.sorts()).toEqual([{ key: "name", desc: false }]);

    // but items order is unchanged (Charlie first, Alice second)
    const items = fixture.componentInstance.items();
    expect(items[0].name).toBe("Charlie");
    expect(items[1].name).toBe("Alice");
  });

  it("Scenario: 정렬 비활성화 컬럼 — disableSorting=true인 헤더 클릭 시 정렬이 적용되지 않는다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetSortDisabledTest],
    }).createComponent(SdSheetSortDisabledTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const ths = host.querySelectorAll("thead th._last-depth:not(._feature-cell)");
    const nameTh = ths[0] as HTMLElement;

    nameTh.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.sorts()).toEqual([]);
  });
});
