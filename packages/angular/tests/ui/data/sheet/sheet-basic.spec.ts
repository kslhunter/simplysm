import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdSheetBasicTest,
  SdSheetMultiHeaderTest,
  SdSheetSummaryTest,
  SdSheetHiddenTest,
  SdSheetCollapseTest,
  SdSheetEmptyTest,
  SdSheetCellStyleTest,
  SdSheetInsetTest,
} from "./sd-sheet-test.fixture";

describe("Feature 6.1 Slice 1: 기본 렌더링", () => {
  it("Scenario: 기본 컬럼 렌더링 — 이름 헤더와 200px 너비의 컬럼이 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetBasicTest],
    }).createComponent(SdSheetBasicTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const th = host.querySelector("th") as HTMLElement;
    expect(th).toBeTruthy();
    expect(th.textContent.trim()).toBe("이름");

    const tds = host.querySelectorAll("tbody tr td");
    expect(tds.length).toBe(2); // 2 rows, 1 col each
    // Each td should have width style of 200px
    const firstTd = tds[0] as HTMLElement;
    expect(firstTd.style.width).toBe("200px");
  });

  it("Scenario: 다중 레벨 헤더 — 그룹A가 colspan=2로 상단, 세부1/세부2가 하단에 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetMultiHeaderTest],
    }).createComponent(SdSheetMultiHeaderTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const headerRows = host.querySelectorAll("thead tr");
    expect(headerRows.length).toBe(2);

    // First row: 그룹A with colspan=2
    const firstRowCells = headerRows[0].querySelectorAll("th");
    expect(firstRowCells.length).toBe(1);
    expect(firstRowCells[0].textContent.trim()).toBe("그룹A");
    expect(firstRowCells[0].getAttribute("colspan")).toBe("2");

    // Second row: 세부1, 세부2
    const secondRowCells = headerRows[1].querySelectorAll("th");
    expect(secondRowCells.length).toBe(2);
    expect(secondRowCells[0].textContent.trim()).toBe("세부1");
    expect(secondRowCells[1].textContent.trim()).toBe("세부2");
  });

  it("Scenario: 요약 행 표시 — 테이블 하단에 요약 행이 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetSummaryTest],
    }).createComponent(SdSheetSummaryTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const tfoot = host.querySelector("tfoot");
    expect(tfoot).toBeTruthy();
    const footCells = tfoot!.querySelectorAll("td");
    expect(footCells.length).toBe(1);
  });

  it("Scenario: 컬럼 숨김 — hidden=true인 컬럼이 테이블에서 제외된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetHiddenTest],
    }).createComponent(SdSheetHiddenTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const ths = host.querySelectorAll("thead th");
    expect(ths.length).toBe(1);
    expect(ths[0].textContent.trim()).toBe("이름");

    // Only 1 column per row
    const firstRowTds = host.querySelectorAll("tbody tr:first-child td");
    expect(firstRowTds.length).toBe(1);
  });

  it("Scenario: 컬럼 축소 — collapse=true인 컬럼이 축소된 상태로 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetCollapseTest],
    }).createComponent(SdSheetCollapseTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const ths = host.querySelectorAll("thead th");
    // Both columns should render (collapse is not hidden)
    expect(ths.length).toBe(2);

    // The collapsed column's td should have zero width
    const tds = host.querySelectorAll("tbody tr:first-child td");
    expect(tds.length).toBe(2);
    const collapsedTd = tds[1] as HTMLElement;
    expect(collapsedTd.style.width).toBe("0px");
    expect(collapsedTd.style.overflow).toBe("hidden");
  });

  it("Scenario: 빈 데이터 — 헤더만 표시되고 데이터 행은 없다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetEmptyTest],
    }).createComponent(SdSheetEmptyTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const ths = host.querySelectorAll("thead th");
    expect(ths.length).toBe(1);

    const trs = host.querySelectorAll("tbody tr");
    expect(trs.length).toBe(0);
  });

  it("Scenario: 커스텀 셀 스타일 — 각 셀에 함수가 반환한 클래스와 스타일이 적용된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetCellStyleTest],
    }).createComponent(SdSheetCellStyleTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const td = host.querySelector("tbody td") as HTMLElement;
    expect(td.classList.contains("custom-class")).toBe(true);
    expect(td.style.color).toBe("red");
  });

  it("Scenario: inset 모드 — 외곽 테두리가 제거된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetInsetTest],
    }).createComponent(SdSheetInsetTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const sdSheet = host.querySelector("sd-sheet") as HTMLElement;
    expect(sdSheet.getAttribute("data-sd-inset")).toBe("true");
  });
});
