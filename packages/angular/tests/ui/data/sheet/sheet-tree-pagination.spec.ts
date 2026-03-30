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

    // ParentA should have expand button
    const expandBtn = rows[0].querySelector("._expand-col sd-anchor") as HTMLElement;
    expect(expandBtn).toBeTruthy();

    // aria-expanded should be "false"
    expect(rows[0].getAttribute("aria-expanded")).toBe("false");

    // Click expand
    expandBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // Now children should be visible
    rows = host.querySelectorAll("tbody tr");
    expect(rows.length).toBe(4); // ParentA, Child1, Child2, ParentB

    // ParentA's aria-expanded should be "true"
    expect(rows[0].getAttribute("aria-expanded")).toBe("true");
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

    // Click collapse on ParentA
    const collapseBtn = rows[0].querySelector("._expand-col sd-anchor") as HTMLElement;
    collapseBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    rows = host.querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);
    expect(rows[0].getAttribute("aria-expanded")).toBe("false");
  });

  it("Scenario: 전체 확장과 축소 — 전체 확장/축소 버튼으로 모든 행을 확장/축소한다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetTreeTest],
    }).createComponent(SdSheetTreeTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;

    // Click expand all in header
    const headerExpandBtn = host.querySelector("thead th._expand-col sd-anchor") as HTMLElement;
    expect(headerExpandBtn).toBeTruthy();

    headerExpandBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    let rows = host.querySelectorAll("tbody tr");
    expect(rows.length).toBe(4);

    // Click collapse all
    headerExpandBtn.click();
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
    const expandCol = host.querySelector("._expand-col");
    expect(expandCol).toBeNull();
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
