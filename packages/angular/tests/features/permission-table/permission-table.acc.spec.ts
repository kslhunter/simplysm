import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdPermissionTableEmptyTest,
  SdPermissionTableTwoLevelTest,
  SdPermissionTableThreeLevelTest,
  SdPermissionTableDisabledTest,
} from "./sd-permission-table-test.fixture";

describe("Feature 7.4b Slice 1: 계층형 권한 트리 렌더링", () => {
  it("2단계 계층 렌더링 — 부모 행과 자식 2개 행이 모두 표시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPermissionTableTwoLevelTest] })
      .createComponent(SdPermissionTableTwoLevelTest);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll("sd-permission-table tr");
    // 부모(모듈A) + 자식(기능1) + 자식(기능2) = 3행
    expect(rows.length).toBe(3);

    const titles = Array.from(rows as NodeListOf<HTMLElement>).map(
      (row) => row.querySelector("._title")?.textContent.trim(),
    );
    expect(titles).toContain("모듈A");
    expect(titles).toContain("기능1");
    expect(titles).toContain("기능2");
  });

  it("빈 배열 렌더링 — 테이블 본문이 비어있다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPermissionTableEmptyTest] })
      .createComponent(SdPermissionTableEmptyTest);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll("sd-permission-table tr");
    expect(rows.length).toBe(0);
  });

  it("깊이별 테마 색상 적용 — depth에 따라 테마 속성이 설정된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPermissionTableThreeLevelTest] })
      .createComponent(SdPermissionTableThreeLevelTest);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll("sd-permission-table tr");
    // depth 0 → "first", depth 1 → "info" (1 % 3 === 1), depth 2 → "warning" (2 % 3 === 2)
    expect((rows[0] as HTMLElement).getAttribute("data-sd-theme")).toBe("first");
    expect((rows[1] as HTMLElement).getAttribute("data-sd-theme")).toBe("info");
    expect((rows[2] as HTMLElement).getAttribute("data-sd-theme")).toBe("warning");
  });
});

describe("Feature 7.4b Slice 2: 접기/펼치기", () => {
  it("자식이 있는 항목 클릭 시 하위 항목이 숨겨진다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPermissionTableThreeLevelTest] })
      .createComponent(SdPermissionTableThreeLevelTest);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll("sd-permission-table tr");
    expect(rows.length).toBe(3);

    // 최상위 항목의 앵커(접기 버튼) 클릭
    const anchor = (rows[0] as HTMLElement).querySelector("sd-anchor") as HTMLElement;
    anchor.click();
    fixture.detectChanges();

    // 자식과 손자 행이 data-sd-collapse="true"로 숨겨져야 한다
    const updatedRows = fixture.nativeElement.querySelectorAll("sd-permission-table tr");
    expect((updatedRows[1] as HTMLElement).getAttribute("data-sd-collapse")).toBe("true");
    expect((updatedRows[2] as HTMLElement).getAttribute("data-sd-collapse")).toBe("true");
  });

  it("접힌 항목 다시 클릭 시 직접 자식 항목이 표시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPermissionTableTwoLevelTest] })
      .createComponent(SdPermissionTableTwoLevelTest);
    fixture.detectChanges();

    const anchor = (
      fixture.nativeElement.querySelector("sd-permission-table tr sd-anchor") as HTMLElement
    );

    // 접기
    anchor.click();
    fixture.detectChanges();

    const rowsAfterCollapse = fixture.nativeElement.querySelectorAll("sd-permission-table tr");
    expect((rowsAfterCollapse[1] as HTMLElement).getAttribute("data-sd-collapse")).toBe("true");

    // 다시 클릭 → 펼치기
    anchor.click();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll("sd-permission-table tr");
    expect((rows[1] as HTMLElement).getAttribute("data-sd-collapse")).not.toBe("true");
    expect((rows[2] as HTMLElement).getAttribute("data-sd-collapse")).not.toBe("true");
  });
});

describe("Feature 7.4b Slice 3: use/edit 체크박스 토글 및 전파", () => {
  it("use 체크 시 value에 기록된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPermissionTableTwoLevelTest] })
      .createComponent(SdPermissionTableTwoLevelTest);
    fixture.detectChanges();

    // 기능1 행(index 1)의 use 체크박스 클릭
    const rows = fixture.nativeElement.querySelectorAll("sd-permission-table tr");
    const useCheckbox = (rows[1] as HTMLElement).querySelectorAll("sd-checkbox")[0] as HTMLElement;
    useCheckbox.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()["moduleA.func1.use"]).toBe(true);
  });

  it("부모 use 체크 시 모든 자식의 use도 체크된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPermissionTableTwoLevelTest] })
      .createComponent(SdPermissionTableTwoLevelTest);
    fixture.detectChanges();

    // 부모(모듈A) 행(index 0)의 use 체크박스 클릭
    const rows = fixture.nativeElement.querySelectorAll("sd-permission-table tr");
    const parentUseCheckbox = (rows[0] as HTMLElement).querySelectorAll(
      "sd-checkbox",
    )[0] as HTMLElement;
    parentUseCheckbox.click();
    fixture.detectChanges();

    const value = fixture.componentInstance.value();
    expect(value["moduleA.func1.use"]).toBe(true);
    expect(value["moduleA.func2.use"]).toBe(true);
  });

  it("부모 use 해제 시 모든 자식의 use도 해제된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPermissionTableTwoLevelTest] })
      .createComponent(SdPermissionTableTwoLevelTest);
    // 미리 체크 상태로 설정
    fixture.componentInstance.value.set({
      "moduleA.func1.use": true,
      "moduleA.func2.use": true,
    });
    fixture.detectChanges();

    // 부모 use 체크박스 클릭 (해제)
    const rows = fixture.nativeElement.querySelectorAll("sd-permission-table tr");
    const parentUseCheckbox = (rows[0] as HTMLElement).querySelectorAll(
      "sd-checkbox",
    )[0] as HTMLElement;
    parentUseCheckbox.click();
    fixture.detectChanges();

    const value = fixture.componentInstance.value();
    expect(value["moduleA.func1.use"]).toBe(false);
    expect(value["moduleA.func2.use"]).toBe(false);
  });

  it("use 해제 시 edit도 자동으로 해제된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPermissionTableTwoLevelTest] })
      .createComponent(SdPermissionTableTwoLevelTest);
    // use와 edit 모두 체크된 상태
    fixture.componentInstance.value.set({
      "moduleA.func1.use": true,
      "moduleA.func1.edit": true,
    });
    fixture.detectChanges();

    // 기능1 use 체크박스 클릭 (해제)
    const rows = fixture.nativeElement.querySelectorAll("sd-permission-table tr");
    const useCheckbox = (rows[1] as HTMLElement).querySelectorAll("sd-checkbox")[0] as HTMLElement;
    useCheckbox.click();
    fixture.detectChanges();

    const value = fixture.componentInstance.value();
    expect(value["moduleA.func1.use"]).toBe(false);
    expect(value["moduleA.func1.edit"]).toBe(false);
  });

  it("use 미체크 상태에서 edit 체크박스가 disabled이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPermissionTableTwoLevelTest] })
      .createComponent(SdPermissionTableTwoLevelTest);
    fixture.detectChanges();

    // 기능1 행의 edit 체크박스(index 1의 두 번째 체크박스)
    const rows = fixture.nativeElement.querySelectorAll("sd-permission-table tr");
    const editCheckbox = (rows[1] as HTMLElement).querySelectorAll("sd-checkbox")[1] as HTMLElement;
    expect(editCheckbox.getAttribute("data-sd-disabled")).toBe("true");
  });

  it("disabled=true 시 모든 체크박스가 비활성화된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdPermissionTableDisabledTest] })
      .createComponent(SdPermissionTableDisabledTest);
    fixture.detectChanges();

    const checkboxes = fixture.nativeElement.querySelectorAll("sd-permission-table sd-checkbox");
    for (const cb of Array.from(checkboxes)) {
      expect((cb as HTMLElement).getAttribute("data-sd-disabled")).toBe("true");
    }
  });
});
