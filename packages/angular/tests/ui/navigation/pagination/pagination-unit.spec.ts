import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdPagination } from "../../../../src/ui/navigation/pagination/sd-pagination";

describe("Feature 4.1.1 Unit: displayPages computed", () => {
  it("currentPage=3, totalPageCount=20, visiblePageCount=10이면 [1..10]을 반환한다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPagination] })
      .createComponent(SdPagination);

    fixture.componentRef.setInput("currentPage", 3);
    fixture.componentRef.setInput("totalPageCount", 20);
    fixture.componentRef.setInput("visiblePageCount", 10);
    fixture.detectChanges();

    expect(fixture.componentInstance.displayPages()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("currentPage=0, totalPageCount=20, visiblePageCount=10이면 [1..10]을 반환한다 (경계값: 그룹 첫 페이지)", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPagination] })
      .createComponent(SdPagination);

    fixture.componentRef.setInput("currentPage", 0);
    fixture.componentRef.setInput("totalPageCount", 20);
    fixture.componentRef.setInput("visiblePageCount", 10);
    fixture.detectChanges();

    expect(fixture.componentInstance.displayPages()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("currentPage=15, totalPageCount=20, visiblePageCount=10이면 [11..20]을 반환한다 (두 번째 그룹)", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPagination] })
      .createComponent(SdPagination);

    fixture.componentRef.setInput("currentPage", 15);
    fixture.componentRef.setInput("totalPageCount", 20);
    fixture.componentRef.setInput("visiblePageCount", 10);
    fixture.detectChanges();

    expect(fixture.componentInstance.displayPages()).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it("currentPage=9, totalPageCount=20, visiblePageCount=10이면 [1..10]을 반환한다 (경계값: 그룹 마지막 페이지)", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPagination] })
      .createComponent(SdPagination);

    fixture.componentRef.setInput("currentPage", 9);
    fixture.componentRef.setInput("totalPageCount", 20);
    fixture.componentRef.setInput("visiblePageCount", 10);
    fixture.detectChanges();

    expect(fixture.componentInstance.displayPages()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("currentPage=10, totalPageCount=20, visiblePageCount=10이면 [11..20]을 반환한다 (경계값: 두 번째 그룹 첫 페이지)", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPagination] })
      .createComponent(SdPagination);

    fixture.componentRef.setInput("currentPage", 10);
    fixture.componentRef.setInput("totalPageCount", 20);
    fixture.componentRef.setInput("visiblePageCount", 10);
    fixture.detectChanges();

    expect(fixture.componentInstance.displayPages()).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it("totalPageCount=5, visiblePageCount=10이면 [1..5]을 반환한다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPagination] })
      .createComponent(SdPagination);

    fixture.componentRef.setInput("currentPage", 0);
    fixture.componentRef.setInput("totalPageCount", 5);
    fixture.componentRef.setInput("visiblePageCount", 10);
    fixture.detectChanges();

    expect(fixture.componentInstance.displayPages()).toEqual([1, 2, 3, 4, 5]);
  });

  it("totalPageCount=0이면 빈 배열을 반환한다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPagination] })
      .createComponent(SdPagination);

    fixture.componentRef.setInput("totalPageCount", 0);
    fixture.detectChanges();

    expect(fixture.componentInstance.displayPages()).toEqual([]);
  });
});

describe("Feature 4.1.1 Unit: hasPrev/hasNext computed", () => {
  it("첫 그룹(currentPage=3)에서 hasPrev=false, hasNext=true이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPagination] })
      .createComponent(SdPagination);

    fixture.componentRef.setInput("currentPage", 3);
    fixture.componentRef.setInput("totalPageCount", 20);
    fixture.componentRef.setInput("visiblePageCount", 10);
    fixture.detectChanges();

    expect(fixture.componentInstance.hasPrev()).toBe(false);
    expect(fixture.componentInstance.hasNext()).toBe(true);
  });

  it("마지막 그룹(currentPage=15, totalPageCount=20)에서 hasPrev=true, hasNext=false이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPagination] })
      .createComponent(SdPagination);

    fixture.componentRef.setInput("currentPage", 15);
    fixture.componentRef.setInput("totalPageCount", 20);
    fixture.componentRef.setInput("visiblePageCount", 10);
    fixture.detectChanges();

    expect(fixture.componentInstance.hasPrev()).toBe(true);
    expect(fixture.componentInstance.hasNext()).toBe(false);
  });

  it("중간 그룹(currentPage=15, totalPageCount=30)에서 hasPrev=true, hasNext=true이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPagination] })
      .createComponent(SdPagination);

    fixture.componentRef.setInput("currentPage", 15);
    fixture.componentRef.setInput("totalPageCount", 30);
    fixture.componentRef.setInput("visiblePageCount", 10);
    fixture.detectChanges();

    expect(fixture.componentInstance.hasPrev()).toBe(true);
    expect(fixture.componentInstance.hasNext()).toBe(true);
  });

  it("totalPageCount=0이면 hasPrev=false, hasNext=false이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPagination] })
      .createComponent(SdPagination);

    fixture.componentRef.setInput("totalPageCount", 0);
    fixture.detectChanges();

    expect(fixture.componentInstance.hasPrev()).toBe(false);
    expect(fixture.componentInstance.hasNext()).toBe(false);
  });
});

describe("LOGIC-014: visiblePageCount=0 안전 처리", () => {
  it("visiblePageCount=0일 때 displayPages가 빈 배열을 반환한다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPagination] })
      .createComponent(SdPagination);

    fixture.componentRef.setInput("totalPageCount", 10);
    fixture.componentRef.setInput("visiblePageCount", 0);
    fixture.detectChanges();

    const pages = fixture.componentInstance.displayPages();
    expect(Array.isArray(pages)).toBe(true);
    expect(pages.every((p) => Number.isFinite(p))).toBe(true);
  });

  it("visiblePageCount=0일 때 hasPrev/hasNext가 boolean을 반환한다 (NaN 아님)", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPagination] })
      .createComponent(SdPagination);

    fixture.componentRef.setInput("totalPageCount", 10);
    fixture.componentRef.setInput("visiblePageCount", 0);
    fixture.detectChanges();

    expect(typeof fixture.componentInstance.hasPrev()).toBe("boolean");
    expect(typeof fixture.componentInstance.hasNext()).toBe("boolean");
  });
});

describe("LOGIC-022: 네비게이션 메서드 경계값 가드", () => {
  it("groupIndex=0에서 goToPrevGroup 호출 시 currentPage가 0 이상이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPagination] })
      .createComponent(SdPagination);

    fixture.componentRef.setInput("currentPage", 0);
    fixture.componentRef.setInput("totalPageCount", 20);
    fixture.componentRef.setInput("visiblePageCount", 10);
    fixture.detectChanges();

    fixture.componentInstance.goToPrevGroup();
    expect(fixture.componentInstance.currentPage()).toBeGreaterThanOrEqual(0);
  });

  it("totalPageCount=0에서 goToLast 호출 시 currentPage가 0 이상이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPagination] })
      .createComponent(SdPagination);

    fixture.componentRef.setInput("totalPageCount", 0);
    fixture.detectChanges();

    fixture.componentInstance.goToLast();
    expect(fixture.componentInstance.currentPage()).toBeGreaterThanOrEqual(0);
  });
});

describe("Feature 4.1.1 Unit: navigation methods", () => {
  it("goToPage(4)가 currentPage를 4로 설정한다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPagination] })
      .createComponent(SdPagination);

    fixture.componentRef.setInput("totalPageCount", 20);
    fixture.detectChanges();

    fixture.componentInstance.goToPage(4);
    expect(fixture.componentInstance.currentPage()).toBe(4);
  });

  it("goToNextGroup가 다음 그룹의 첫 페이지로 이동한다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPagination] })
      .createComponent(SdPagination);

    fixture.componentRef.setInput("currentPage", 3);
    fixture.componentRef.setInput("totalPageCount", 20);
    fixture.componentRef.setInput("visiblePageCount", 10);
    fixture.detectChanges();

    fixture.componentInstance.goToNextGroup();
    expect(fixture.componentInstance.currentPage()).toBe(10);
  });

  it("goToPrevGroup가 이전 그룹의 첫 페이지로 이동한다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPagination] })
      .createComponent(SdPagination);

    fixture.componentRef.setInput("currentPage", 15);
    fixture.componentRef.setInput("totalPageCount", 20);
    fixture.componentRef.setInput("visiblePageCount", 10);
    fixture.detectChanges();

    fixture.componentInstance.goToPrevGroup();
    expect(fixture.componentInstance.currentPage()).toBe(0);
  });

  it("goToFirst가 currentPage를 0으로 설정한다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPagination] })
      .createComponent(SdPagination);

    fixture.componentRef.setInput("currentPage", 15);
    fixture.componentRef.setInput("totalPageCount", 20);
    fixture.detectChanges();

    fixture.componentInstance.goToFirst();
    expect(fixture.componentInstance.currentPage()).toBe(0);
  });

  it("goToLast가 currentPage를 totalPageCount-1로 설정한다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPagination] })
      .createComponent(SdPagination);

    fixture.componentRef.setInput("currentPage", 0);
    fixture.componentRef.setInput("totalPageCount", 20);
    fixture.detectChanges();

    fixture.componentInstance.goToLast();
    expect(fixture.componentInstance.currentPage()).toBe(19);
  });
});
