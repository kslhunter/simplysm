import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdCalendarBasicTest,
  SdCalendarMondayStartTest,
  SdCalendarEmptyTest,
} from "./sd-calendar-test.fixture";

describe("Feature 2.6 Slice 3: sd-calendar", () => {
  it("월별 달력 그리드 — 6행 7열 테이블과 요일 헤더가 표시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCalendarBasicTest] })
      .createComponent(SdCalendarBasicTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-calendar") as HTMLElement;
    const headerCells = host.querySelectorAll("thead th");
    expect(headerCells.length).toBe(7);

    const bodyRows = host.querySelectorAll("tbody tr");
    expect(bodyRows.length).toBe(6);

    const firstRowCells = bodyRows[0].querySelectorAll("td");
    expect(firstRowCells.length).toBe(7);
  });

  it("기본 weekStartDay=0 — 요일 헤더가 일요일부터 시작한다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCalendarBasicTest] })
      .createComponent(SdCalendarBasicTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-calendar") as HTMLElement;
    const headerCells = host.querySelectorAll("thead th");
    expect(headerCells[0].textContent.trim()).toBe("일");
    expect(headerCells[6].textContent.trim()).toBe("토");
  });

  it("현재 월 외 날짜 — .not-current 클래스가 적용된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCalendarEmptyTest] })
      .createComponent(SdCalendarEmptyTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-calendar") as HTMLElement;
    const notCurrentCells = host.querySelectorAll("td.not-current");
    expect(notCurrentCells.length).toBeGreaterThan(0);
  });

  it("아이템을 날짜별로 매핑 — 해당 셀에 템플릿이 렌더링된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCalendarBasicTest] })
      .createComponent(SdCalendarBasicTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-calendar") as HTMLElement;
    const itemSpan = host.querySelector(".test-item") as HTMLElement;
    expect(itemSpan).toBeTruthy();
    expect(itemSpan.textContent.trim()).toBe("이벤트A");
  });

  it("weekStartDay=1 — 요일 헤더가 월요일부터 시작한다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCalendarMondayStartTest] })
      .createComponent(SdCalendarMondayStartTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-calendar") as HTMLElement;
    const headerCells = host.querySelectorAll("thead th");
    expect(headerCells[0].textContent.trim()).toBe("월");
    expect(headerCells[6].textContent.trim()).toBe("일");
  });

  it("3월 1일이 표시되는 셀이 존재한다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCalendarBasicTest] })
      .createComponent(SdCalendarBasicTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-calendar") as HTMLElement;
    const allDays = host.querySelectorAll("td:not(.not-current) .day");
    const dayTexts = Array.from(allDays).map((el) => el.textContent.trim());
    expect(dayTexts).toContain("1");
    expect(dayTexts).toContain("31");
  });
});
