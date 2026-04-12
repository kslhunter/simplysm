import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdPaginationNavTest,
  SdPaginationNavFirstGroupTest,
  SdPaginationNavSecondGroupTest,
  SdPaginationNavMiddleGroupTest,
  SdPaginationNavZeroTotalTest,
} from "./sd-pagination-test.fixture";

describe("Feature 4.1.1 Slice 2: 페이지 탐색 + 경계 비활성화", () => {
  it("개별 페이지 번호를 클릭하면 currentPage가 해당 0-based 인덱스로 변경된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPaginationNavTest] })
      .createComponent(SdPaginationNavTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-pagination") as HTMLElement;
    const pageAnchors = host.querySelectorAll("sd-anchor.page-anchor");

    // 5번째 페이지 클릭 (인덱스 4, 텍스트 "5")
    (pageAnchors[4] as HTMLElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.currentPage()).toBe(4);
  });

  it("다음 그룹 버튼 클릭 시 다음 그룹의 첫 페이지로 이동한다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPaginationNavFirstGroupTest] })
      .createComponent(SdPaginationNavFirstGroupTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-pagination") as HTMLElement;
    const nextGroupBtn = host.querySelector(".nav-next-group") as HTMLElement;
    nextGroupBtn.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.currentPage()).toBe(10);
  });

  it("이전 그룹 버튼 클릭 시 이전 그룹으로 전환한다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPaginationNavSecondGroupTest] })
      .createComponent(SdPaginationNavSecondGroupTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-pagination") as HTMLElement;
    const prevGroupBtn = host.querySelector(".nav-prev-group") as HTMLElement;
    prevGroupBtn.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.currentPage()).toBe(0);
  });

  it("첫 페이지 버튼 클릭 시 currentPage가 0으로 변경된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPaginationNavSecondGroupTest] })
      .createComponent(SdPaginationNavSecondGroupTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-pagination") as HTMLElement;
    const firstBtn = host.querySelector(".nav-first") as HTMLElement;
    firstBtn.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.currentPage()).toBe(0);
  });

  it("마지막 페이지 버튼 클릭 시 currentPage가 totalPageCount-1로 변경된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPaginationNavTest] })
      .createComponent(SdPaginationNavTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-pagination") as HTMLElement;
    const lastBtn = host.querySelector(".nav-last") as HTMLElement;
    lastBtn.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.currentPage()).toBe(19);
  });

  it("첫 그룹에서 첫 페이지/이전 그룹 버튼이 disabled이고, 다음 그룹/마지막 페이지는 활성화된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPaginationNavFirstGroupTest] })
      .createComponent(SdPaginationNavFirstGroupTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-pagination") as HTMLElement;
    const firstBtn = host.querySelector(".nav-first") as HTMLElement;
    const prevGroupBtn = host.querySelector(".nav-prev-group") as HTMLElement;
    const nextGroupBtn = host.querySelector(".nav-next-group") as HTMLElement;
    const lastBtn = host.querySelector(".nav-last") as HTMLElement;

    expect(firstBtn.getAttribute("data-sd-disabled")).toBe("true");
    expect(prevGroupBtn.getAttribute("data-sd-disabled")).toBe("true");
    expect(nextGroupBtn.getAttribute("data-sd-disabled")).toBe("false");
    expect(lastBtn.getAttribute("data-sd-disabled")).toBe("false");
  });

  it("마지막 그룹에서 다음 그룹/마지막 페이지 버튼이 disabled이고, 첫 페이지/이전 그룹은 활성화된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPaginationNavSecondGroupTest] })
      .createComponent(SdPaginationNavSecondGroupTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-pagination") as HTMLElement;
    const firstBtn = host.querySelector(".nav-first") as HTMLElement;
    const prevGroupBtn = host.querySelector(".nav-prev-group") as HTMLElement;
    const nextGroupBtn = host.querySelector(".nav-next-group") as HTMLElement;
    const lastBtn = host.querySelector(".nav-last") as HTMLElement;

    expect(firstBtn.getAttribute("data-sd-disabled")).toBe("false");
    expect(prevGroupBtn.getAttribute("data-sd-disabled")).toBe("false");
    expect(nextGroupBtn.getAttribute("data-sd-disabled")).toBe("true");
    expect(lastBtn.getAttribute("data-sd-disabled")).toBe("true");
  });

  it("중간 그룹에서 모든 탐색 버튼이 활성화된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPaginationNavMiddleGroupTest] })
      .createComponent(SdPaginationNavMiddleGroupTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-pagination") as HTMLElement;
    const firstBtn = host.querySelector(".nav-first") as HTMLElement;
    const prevGroupBtn = host.querySelector(".nav-prev-group") as HTMLElement;
    const nextGroupBtn = host.querySelector(".nav-next-group") as HTMLElement;
    const lastBtn = host.querySelector(".nav-last") as HTMLElement;

    expect(firstBtn.getAttribute("data-sd-disabled")).toBe("false");
    expect(prevGroupBtn.getAttribute("data-sd-disabled")).toBe("false");
    expect(nextGroupBtn.getAttribute("data-sd-disabled")).toBe("false");
    expect(lastBtn.getAttribute("data-sd-disabled")).toBe("false");
  });

  it("totalPageCount가 0이면 모든 탐색 버튼이 disabled이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPaginationNavZeroTotalTest] })
      .createComponent(SdPaginationNavZeroTotalTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-pagination") as HTMLElement;
    const firstBtn = host.querySelector(".nav-first") as HTMLElement;
    const prevGroupBtn = host.querySelector(".nav-prev-group") as HTMLElement;
    const nextGroupBtn = host.querySelector(".nav-next-group") as HTMLElement;
    const lastBtn = host.querySelector(".nav-last") as HTMLElement;

    expect(firstBtn.getAttribute("data-sd-disabled")).toBe("true");
    expect(prevGroupBtn.getAttribute("data-sd-disabled")).toBe("true");
    expect(nextGroupBtn.getAttribute("data-sd-disabled")).toBe("true");
    expect(lastBtn.getAttribute("data-sd-disabled")).toBe("true");
  });
});
