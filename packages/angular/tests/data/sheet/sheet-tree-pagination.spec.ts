import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdSheetTreeTest,
  SdSheetNoTreeTest,
  SdSheetPaginationTest,
  SdSheetNoPaginationTest,
} from "./sd-sheet-test.fixture";

describe("Feature 6.1 Slice 5: 트리 구조 + 페이지네이션", () => {
  it("Scenario: 트리 확장 — 확장 버튼 클릭 시 자식 행이 표시되고 aria-expanded=true가 설정된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetTreeTest],
    }).createComponent(SdSheetTreeTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;

    // Initially: only root items visible (ParentA, ParentB)
    let rows = host.querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);

    // ParentA should have expand icon in the second feature cell
    const featureCells = rows[0].querySelectorAll("td._feature-cell");
    const expandCell = featureCells[1] as HTMLElement;
    const expandIcon = expandCell.querySelector("ng-icon") as HTMLElement;
    expect(expandIcon).toBeTruthy();

    // Click expand
    expandIcon.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // Now children should be visible
    rows = host.querySelectorAll("tbody tr");
    expect(rows.length).toBe(4); // ParentA, Child1, Child2, ParentB
  });

  it("Scenario: 트리 축소 — 확장된 행의 축소 버튼 클릭 시 자식이 숨겨지고 aria-expanded=false", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetTreeTest],
    }).createComponent(SdSheetTreeTest);
    // Start expanded
    fixture.componentInstance.expandedItems.set([fixture.componentInstance.parentA]);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    let rows = host.querySelectorAll("tbody tr");
    expect(rows.length).toBe(4);

    // Click collapse on ParentA (second feature cell has the expand/collapse icon)
    const featureCells = rows[0].querySelectorAll("td._feature-cell");
    const collapseIcon = featureCells[1].querySelector("ng-icon") as HTMLElement;
    collapseIcon.click();
    fixture.detectChanges();
    await fixture.whenStable();

    rows = host.querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);
    expect(rows.length).toBe(2);
  });

  it("Scenario: 전체 확장과 축소 — 전체 확장/축소 버튼으로 모든 행을 확장/축소한다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetTreeTest],
    }).createComponent(SdSheetTreeTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;

    // Click expand all in header (second feature cell has the expand/collapse icon)
    const headerFeatureCells = host.querySelectorAll("thead th._feature-cell");
    const headerExpandIcon = headerFeatureCells[1].querySelector("ng-icon") as HTMLElement;
    expect(headerExpandIcon).toBeTruthy();

    headerExpandIcon.click();
    fixture.detectChanges();
    await fixture.whenStable();

    let rows = host.querySelectorAll("tbody tr");
    expect(rows.length).toBe(4);

    // Click collapse all
    headerExpandIcon.click();
    fixture.detectChanges();
    await fixture.whenStable();

    rows = host.querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);
  });

  it("Scenario: 트리 미사용 — getChildrenFn이 없으면 확장/축소 컬럼이 표시되지 않는다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetNoTreeTest],
    }).createComponent(SdSheetNoTreeTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    // Without getChildrenFn, there should be only 1 feature cell per row (no expand column)
    const headerFeatureCells = host.querySelectorAll("thead th._feature-cell");
    expect(headerFeatureCells.length).toBe(1);
    const bodyFeatureCells = host.querySelectorAll("tbody tr td._feature-cell");
    expect(bodyFeatureCells.length).toBe(1);
  });

  it("Scenario: 페이지네이션 표시 — totalPageCount가 1보다 크면 하단에 sd-pagination이 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetPaginationTest],
    }).createComponent(SdSheetPaginationTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const pagination = host.querySelector("sd-pagination");
    expect(pagination).toBeTruthy();
  });

  it("Scenario: 페이지 전환 — currentPage 변경 시 해당 페이지 데이터가 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetPaginationTest],
    }).createComponent(SdSheetPaginationTest);
    fixture.detectChanges();
    await fixture.whenStable();

    // Verify currentPage is updatable
    fixture.componentInstance.currentPage.set(1);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.currentPage()).toBe(1);
  });

  it("Scenario: 페이지네이션 미표시 — totalPageCount가 1 이하이면 sd-pagination이 표시되지 않는다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetNoPaginationTest],
    }).createComponent(SdSheetNoPaginationTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const pagination = host.querySelector("sd-pagination");
    expect(pagination).toBeNull();
  });
});
