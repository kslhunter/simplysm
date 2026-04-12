import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdPaginationFirstGroupTest,
  SdPaginationSecondGroupTest,
  SdPaginationSmallTotalTest,
  SdPaginationZeroTotalTest,
  SdPaginationCurrentPageHighlightTest,
} from "./sd-pagination-test.fixture";

describe("Feature 4.1.1 Slice 1: 페이지 그룹 표시 + 현재 페이지 강조", () => {
  it("첫 번째 그룹의 페이지 번호 1~10이 표시된다 (totalPageCount=20, visiblePageCount=10, currentPage=3)", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPaginationFirstGroupTest] })
      .createComponent(SdPaginationFirstGroupTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-pagination") as HTMLElement;
    const pageAnchors = host.querySelectorAll("sd-anchor.page-anchor");
    expect(pageAnchors.length).toBe(10);

    const pageNumbers = Array.from(pageAnchors).map((el) => el.textContent.trim());
    expect(pageNumbers).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
  });

  it("두 번째 그룹의 페이지 번호 11~20이 표시된다 (totalPageCount=20, visiblePageCount=10, currentPage=15)", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPaginationSecondGroupTest] })
      .createComponent(SdPaginationSecondGroupTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-pagination") as HTMLElement;
    const pageAnchors = host.querySelectorAll("sd-anchor.page-anchor");
    expect(pageAnchors.length).toBe(10);

    const pageNumbers = Array.from(pageAnchors).map((el) => el.textContent.trim());
    expect(pageNumbers).toEqual(["11", "12", "13", "14", "15", "16", "17", "18", "19", "20"]);
  });

  it("totalPageCount가 visiblePageCount보다 작으면 전체 페이지만 표시한다 (totalPageCount=5, visiblePageCount=10)", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPaginationSmallTotalTest] })
      .createComponent(SdPaginationSmallTotalTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-pagination") as HTMLElement;
    const pageAnchors = host.querySelectorAll("sd-anchor.page-anchor");
    expect(pageAnchors.length).toBe(5);

    const pageNumbers = Array.from(pageAnchors).map((el) => el.textContent.trim());
    expect(pageNumbers).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("totalPageCount가 0이면 페이지 번호가 표시되지 않는다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPaginationZeroTotalTest] })
      .createComponent(SdPaginationZeroTotalTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-pagination") as HTMLElement;
    const pageAnchors = host.querySelectorAll("sd-anchor.page-anchor");
    expect(pageAnchors.length).toBe(0);
  });

  it("현재 페이지 번호에 밑줄이 표시되고 다른 페이지에는 밑줄이 없다 (currentPage=3)", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdPaginationCurrentPageHighlightTest],
    }).createComponent(SdPaginationCurrentPageHighlightTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-pagination") as HTMLElement;
    const pageAnchors = Array.from(host.querySelectorAll("sd-anchor.page-anchor"));

    // currentPage=3 -> 4번째 페이지(1-based "4") 에 밑줄
    for (let i = 0; i < pageAnchors.length; i++) {
      const anchor = pageAnchors[i] as HTMLElement;
      if (i === 3) {
        expect(anchor.style.textDecoration).toContain("underline");
      } else {
        expect(anchor.style.textDecoration).not.toContain("underline");
      }
    }
  });
});
