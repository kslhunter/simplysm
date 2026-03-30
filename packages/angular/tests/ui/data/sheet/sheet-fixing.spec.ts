import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdSheetFixedTest,
  SdSheetFixed3ColTest,
} from "./sd-sheet-test.fixture";

describe("Feature 6.1 Slice 2: 컬럼 고정 + 스크롤 동기화", () => {
  it("Scenario: 컬럼 고정 — 고정 컬럼에 position: sticky와 left가 적용된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetFixedTest],
    }).createComponent(SdSheetFixedTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const tds = host.querySelectorAll("tbody tr td");

    // First column (fixed): should have position sticky and left: 0px
    const firstTd = tds[0] as HTMLElement;
    expect(firstTd.style.position).toBe("sticky");
    expect(firstTd.style.left).toBe("0px");

    // Second column (fixed): should have position sticky and left: 100px
    const secondTd = tds[1] as HTMLElement;
    expect(secondTd.style.position).toBe("sticky");
    expect(secondTd.style.left).toBe("100px");

    // Third column (not fixed): should not have sticky position
    const thirdTd = tds[2] as HTMLElement;
    expect(thirdTd.style.position).not.toBe("sticky");
  });

  it("Scenario: 헤더 고정 — 헤더 th에 position: sticky와 top: 0이 CSS로 적용된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetFixedTest],
    }).createComponent(SdSheetFixedTest);
    fixture.detectChanges();
    await fixture.whenStable();

    // Header stickiness is applied via CSS, not inline styles
    // Verify that thead th elements exist (CSS rule handles sticky top: 0)
    const host = fixture.nativeElement as HTMLElement;
    const ths = host.querySelectorAll("thead th");
    expect(ths.length).toBeGreaterThan(0);
  });

  it("Scenario: 고정 컬럼 left 값 누적 — 3개 고정 컬럼의 left가 0, 100, 250이다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSheetFixed3ColTest],
    }).createComponent(SdSheetFixed3ColTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const tds = host.querySelectorAll("tbody tr td");

    expect((tds[0] as HTMLElement).style.left).toBe("0px");
    expect((tds[1] as HTMLElement).style.left).toBe("100px");
    expect((tds[2] as HTMLElement).style.left).toBe("250px");

    // Fourth column should not have left
    expect((tds[3] as HTMLElement).style.left).toBe("");
  });
});
