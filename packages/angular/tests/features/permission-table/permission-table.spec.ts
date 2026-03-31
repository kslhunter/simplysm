import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdPermissionTableTwoLevelTest,
} from "./sd-permission-table-test.fixture";

describe("Feature 7.4b: sd-permission-table unit", () => {
  it("depthLength — 2단계 계층이면 최대 깊이 2를 반환한다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPermissionTableTwoLevelTest] })
      .createComponent(SdPermissionTableTwoLevelTest);
    fixture.detectChanges();

    const control = fixture.nativeElement.querySelector("sd-permission-table");
    const rows = control.querySelectorAll("tr");
    // depth 0: 모듈A (1개 _before td) + 0개 _after spacer td
    // depth 1: 기능1 (2개 _before td)
    const firstRow = rows[0] as HTMLElement;
    const firstRowBeforeTds = firstRow.querySelectorAll("._before");
    expect(firstRowBeforeTds.length).toBe(1); // depth 0 → 1개

    const secondRow = rows[1] as HTMLElement;
    const secondRowBeforeTds = secondRow.querySelectorAll("._before");
    expect(secondRowBeforeTds.length).toBe(2); // depth 1 → 2개
  });

  it("arr — 요청한 길이만큼의 인덱스 배열을 반환한다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPermissionTableTwoLevelTest] })
      .createComponent(SdPermissionTableTwoLevelTest);
    fixture.detectChanges();

    const table = fixture.debugElement.children[0].componentInstance;
    expect(table.arr(3)).toEqual([0, 1, 2]);
    expect(table.arr(0)).toEqual([]);
  });

  it("자식이 있는 항목에는 collapse icon이 표시되고 자식 없는 항목에는 표시되지 않는다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPermissionTableTwoLevelTest] })
      .createComponent(SdPermissionTableTwoLevelTest);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll("sd-permission-table tr");
    // 부모(모듈A) — 자식이 있으므로 sd-collapse-icon 존재
    const parentCollapseIcon = (rows[0] as HTMLElement).querySelector("sd-collapse-icon");
    expect(parentCollapseIcon).toBeTruthy();

    // 자식(기능1) — 자식이 없으므로 sd-collapse-icon 없음
    const childCollapseIcon = (rows[1] as HTMLElement).querySelector("sd-collapse-icon");
    expect(childCollapseIcon).toBeFalsy();
  });

  it("perms에 use와 edit가 있는 항목은 두 체크박스 모두 표시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPermissionTableTwoLevelTest] })
      .createComponent(SdPermissionTableTwoLevelTest);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll("sd-permission-table tr");
    // 기능1 — perms: ["use", "edit"]
    const func1Checkboxes = (rows[1] as HTMLElement).querySelectorAll("sd-checkbox");
    expect(func1Checkboxes.length).toBe(2);

    // 기능2 — perms: ["use"]
    const func2Checkboxes = (rows[2] as HTMLElement).querySelectorAll("sd-checkbox");
    expect(func2Checkboxes.length).toBe(1);
  });
});
