import { describe, it, expect, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import type { Type } from "@angular/core";
import { provideRouter } from "@angular/router";
import { SdSidebarMenu } from "../../../src/layout/sidebar/sd-sidebar-menu";
import {
  SidebarMenuFlatTest,
  SidebarMenuAccordionTest,
  SidebarMenuForceLayoutTest,
  SidebarMenuChildrenTest,
  SidebarMenuExpandedTest,
  SidebarMenuIconTest,
  SidebarMenuUrlTest,
  SidebarMenuQueryStringTest,
  SidebarMenuCustomSelectedFnTest,
  SidebarMenuExpandControlTest,
  SidebarMenuAsyncExpandedTest,
} from "./sd-sidebar-menu-test.fixture";

describe("Feature 4.3 Slice 2: SdSidebarMenu 계층 메뉴", () => {
  it("최상위 메뉴 3개 이하일 때 flat 레이아웃이 자동 선택된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarMenuFlatTest],
      providers: [provideRouter([])],
    }).createComponent(SidebarMenuFlatTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-sidebar-menu") as HTMLElement;
    expect(host.getAttribute("data-sd-root-layout")).toBe("flat");
  });

  it("최상위 메뉴 4개 이상일 때 accordion 레이아웃이 자동 선택된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarMenuAccordionTest],
      providers: [provideRouter([])],
    }).createComponent(SidebarMenuAccordionTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-sidebar-menu") as HTMLElement;
    expect(host.getAttribute("data-sd-root-layout")).toBe("accordion");
  });

  it("layout 입력으로 레이아웃을 강제 지정한다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarMenuForceLayoutTest],
      providers: [provideRouter([])],
    }).createComponent(SidebarMenuForceLayoutTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-sidebar-menu") as HTMLElement;
    expect(host.getAttribute("data-sd-root-layout")).toBe("flat");
  });

  it("하위 메뉴는 항상 accordion 레이아웃이다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarMenuChildrenTest],
      providers: [provideRouter([])],
    }).createComponent(SidebarMenuChildrenTest);
    fixture.detectChanges();
    await fixture.whenStable();

    // The child sd-list-item elements inside the nested sd-list should have accordion layout
    const nestedListItems = fixture.nativeElement.querySelectorAll(
      "sd-list sd-list-item sd-list sd-list-item",
    ) as NodeListOf<HTMLElement>;
    expect(nestedListItems.length).toBeGreaterThan(0);
    for (const item of nestedListItems) {
      expect(item.getAttribute("data-sd-layout")).toBe("accordion");
    }
  });

  it("children이 있는 메뉴는 하위 메뉴를 재귀 렌더링한다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarMenuChildrenTest],
      providers: [provideRouter([])],
    }).createComponent(SidebarMenuChildrenTest);
    fixture.detectChanges();
    await fixture.whenStable();

    // Nested sd-list inside sd-list-item
    const nestedList = fixture.nativeElement.querySelector(
      "sd-list-item sd-list",
    ) as HTMLElement;
    expect(nestedList).toBeTruthy();

    const childItems = nestedList.querySelectorAll("sd-list-item");
    expect(childItems.length).toBe(2);
  });

  it("layout='accordion-expanded'이면 host data-sd-root-layout이 accordion-expanded이다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarMenuExpandedTest],
      providers: [provideRouter([])],
    }).createComponent(SidebarMenuExpandedTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-sidebar-menu") as HTMLElement;
    expect(host.getAttribute("data-sd-root-layout")).toBe("accordion-expanded");
  });

  it("layout='accordion-expanded'이면 모든 깊이의 하위 보유 항목이 펼친 채(open=true) 시작한다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarMenuExpandedTest],
      providers: [provideRouter([])],
    }).createComponent(SidebarMenuExpandedTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const parentItems = fixture.nativeElement.querySelectorAll(
      'sd-list-item[data-sd-has-children="true"]',
    ) as NodeListOf<HTMLElement>;
    // Parent 1, Child 2(중첩), Parent 2 → 하위 보유 항목 3개
    expect(parentItems.length).toBe(3);
    for (const item of parentItems) {
      expect(item.getAttribute("data-sd-open")).toBe("true");
    }
  });

  it("layout='accordion-expanded'에서 하위 없는 말단 항목은 펼침 시작 대상이 아니다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarMenuExpandedTest],
      providers: [provideRouter([])],
    }).createComponent(SidebarMenuExpandedTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const leafItems = fixture.nativeElement.querySelectorAll(
      'sd-list-item[data-sd-has-children="false"]',
    ) as NodeListOf<HTMLElement>;
    // Child 1, Grandchild, Child 3 → 말단 항목 3개
    expect(leafItems.length).toBe(3);
    for (const item of leafItems) {
      expect(item.getAttribute("data-sd-open")).toBe("false");
    }
  });

  it("layout='accordion-expanded'에서도 하위 보유 항목은 accordion 구조(토글 가능)다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarMenuExpandedTest],
      providers: [provideRouter([])],
    }).createComponent(SidebarMenuExpandedTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const parentItem = fixture.nativeElement.querySelector(
      'sd-list-item[data-sd-has-children="true"]',
    ) as HTMLElement;
    expect(parentItem.getAttribute("data-sd-layout")).toBe("accordion");
  });

  it("layout='accordion-expanded'에서 펼친 항목을 클릭하면 접힌다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarMenuExpandedTest],
      providers: [provideRouter([])],
    }).createComponent(SidebarMenuExpandedTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const parentItem = fixture.nativeElement.querySelector(
      'sd-list-item[data-sd-has-children="true"]',
    ) as HTMLElement;
    expect(parentItem.getAttribute("data-sd-open")).toBe("true");

    const content = parentItem.querySelector("._content") as HTMLElement;
    content.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(parentItem.getAttribute("data-sd-open")).toBe("false");
  });

  it("재귀 렌더링된 3레벨 메뉴에서 깊이가 관통 누적된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarMenuExpandedTest],
      providers: [provideRouter([])],
    }).createComponent(SidebarMenuExpandedTest);
    fixture.detectChanges();
    await fixture.whenStable();

    // 3중 중첩된 손자 항목(Grandchild)만 sd-list 3단 아래에 위치
    const grandchild = fixture.nativeElement.querySelector(
      "sd-list sd-list-item sd-list sd-list-item sd-list sd-list-item",
    ) as HTMLElement;
    expect(grandchild).toBeTruthy();
    expect(grandchild.style.getPropertyValue("--sd-list-item-depth").trim()).toBe("2");
  });

  it("메뉴에 아이콘이 있으면 제목 앞에 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarMenuIconTest],
      providers: [provideRouter([])],
    }).createComponent(SidebarMenuIconTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const icon = fixture.nativeElement.querySelector("ng-icon") as HTMLElement;
    expect(icon).toBeTruthy();
  });

  it("children과 url이 없는 메뉴는 라우터 링크로 연결된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarMenuFlatTest],
      providers: [provideRouter([])],
    }).createComponent(SidebarMenuFlatTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdSidebarMenu;
    const menu = { title: "Test", codeChain: ["module", "page"] };
    const option = ctrl.getMenuRouterLinkOption(menu);
    expect(option).toBeTruthy();
    expect(option!.link).toBe("/home/module/page");
  });

  it("codeChain에 쿼리스트링이 포함되면 queryParams로 분리된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarMenuQueryStringTest],
      providers: [provideRouter([])],
    }).createComponent(SidebarMenuQueryStringTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdSidebarMenu;
    const menu = { title: "QS", codeChain: ["module", "page?key=value"] };
    const option = ctrl.getMenuRouterLinkOption(menu);
    expect(option).toBeTruthy();
    expect(option!.link).toBe("/home/module/page");
    expect(option!.queryParams).toEqual({ key: "value" });
  });

  it("url이 있는 메뉴 클릭 시 새 탭에서 열린다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarMenuUrlTest],
      providers: [provideRouter([])],
    }).createComponent(SidebarMenuUrlTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    const listItem = fixture.nativeElement.querySelector("sd-list-item") as HTMLElement;
    const content = listItem.querySelector("._content") as HTMLElement;
    content.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(openSpy).toHaveBeenCalledWith("https://example.com", "_blank");
    openSpy.mockRestore();
  });

  it("children이 있는 메뉴는 라우터 링크가 없다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarMenuChildrenTest],
      providers: [provideRouter([])],
    }).createComponent(SidebarMenuChildrenTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdSidebarMenu;
    const menu = {
      title: "Parent",
      codeChain: ["parent"],
      children: [{ title: "Child", codeChain: ["parent", "child"] }],
    };
    const option = ctrl.getMenuRouterLinkOption(menu);
    expect(option).toBeUndefined();
  });

  it("커스텀 선택 함수가 제공되면 해당 함수로 선택 상태를 판단한다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarMenuCustomSelectedFnTest],
      providers: [provideRouter([])],
    }).createComponent(SidebarMenuCustomSelectedFnTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdSidebarMenu;
    const menu = { title: "Custom", codeChain: ["custom"] };
    expect(ctrl.getIsMenuSelected(menu)).toBe(true);
  });
});

describe("SdSidebarMenu 전체 펼치기/접기", () => {
  function createFixture<T>(type: Type<T>) {
    return TestBed.configureTestingModule({
      imports: [type],
      providers: [provideRouter([])],
    }).createComponent(type);
  }

  function getHeaderAnchors(fixture: { nativeElement: HTMLElement }): HTMLElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll<HTMLElement>(
        "sd-sidebar-menu > .control-header sd-anchor",
      ),
    );
  }

  // 헤더 버튼 순서: [전체 펼치기, 전체 접기]
  function getExpandAllAnchor(fixture: { nativeElement: HTMLElement }): HTMLElement | undefined {
    return getHeaderAnchors(fixture)[0];
  }

  function getCollapseAllAnchor(fixture: { nativeElement: HTMLElement }): HTMLElement | undefined {
    return getHeaderAnchors(fixture)[1];
  }

  function getParentItems(fixture: { nativeElement: HTMLElement }): HTMLElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll<HTMLElement>(
        'sd-list-item[data-sd-has-children="true"]',
      ),
    );
  }

  it("하위 보유 메뉴가 없으면 헤더 버튼을 렌더하지 않는다", async () => {
    const fixture = createFixture(SidebarMenuFlatTest);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(getHeaderAnchors(fixture)).toHaveLength(0);
  });

  it("flat 로 렌더되는 depth-0 그룹만 있으면 대상이 없어 헤더 버튼을 렌더하지 않는다", async () => {
    // 최상위 1개(flat) + 그 자식들은 하위가 없음 → 접을 수 있는 항목 없음
    const fixture = createFixture(SidebarMenuChildrenTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0].componentInstance as SdSidebarMenu;
    expect(ctrl.rootLayout()).toBe("flat");
    expect(ctrl.hasExpandable()).toBe(false);
    expect(getHeaderAnchors(fixture)).toHaveLength(0);
  });

  it("헤더의 전체 접기 버튼으로 모두 접고, 전체 펼치기 버튼으로 모두 펼친다", async () => {
    const fixture = createFixture(SidebarMenuExpandedTest);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(getHeaderAnchors(fixture)).toHaveLength(2);
    expect(getParentItems(fixture).every((el) => el.getAttribute("data-sd-open") === "true")).toBe(
      true,
    );

    getCollapseAllAnchor(fixture)!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(getParentItems(fixture).every((el) => el.getAttribute("data-sd-open") === "false")).toBe(
      true,
    );

    getExpandAllAnchor(fixture)!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(getParentItems(fixture).every((el) => el.getAttribute("data-sd-open") === "true")).toBe(
      true,
    );
  });

  it("무의미한 동작의 버튼은 비활성된다", async () => {
    const fixture = createFixture(SidebarMenuExpandControlTest);
    fixture.detectChanges();
    await fixture.whenStable();

    // 전부 접힌 상태 → 접기 비활성, 펼치기 활성
    expect(getExpandAllAnchor(fixture)!.getAttribute("data-sd-disabled")).toBe("false");
    expect(getCollapseAllAnchor(fixture)!.getAttribute("data-sd-disabled")).toBe("true");

    getExpandAllAnchor(fixture)!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // 전부 펼친 상태 → 펼치기 비활성, 접기 활성
    expect(getExpandAllAnchor(fixture)!.getAttribute("data-sd-disabled")).toBe("true");
    expect(getCollapseAllAnchor(fixture)!.getAttribute("data-sd-disabled")).toBe("false");
  });

  it("일부만 펼쳐진 중간 상태에서는 두 버튼이 모두 활성된다", async () => {
    const fixture = createFixture(SidebarMenuExpandControlTest);
    fixture.componentInstance.expandedMenuCodes.set(["p1"]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(getExpandAllAnchor(fixture)!.getAttribute("data-sd-disabled")).toBe("false");
    expect(getCollapseAllAnchor(fixture)!.getAttribute("data-sd-disabled")).toBe("false");
  });

  it("호스트가 expandedMenuCodes 로 펼침 상태를 제어한다", async () => {
    const fixture = createFixture(SidebarMenuExpandControlTest);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.expandedMenuCodes.set(["p1"]);
    fixture.detectChanges();
    await fixture.whenStable();

    // DOM 순서: p1, p1.c2, p2
    const openStates = getParentItems(fixture).map((el) => el.getAttribute("data-sd-open"));
    expect(openStates).toEqual(["true", "false", "false"]);
  });

  it("사용자가 항목을 토글하면 expandedMenuCodes 에 반영된다", async () => {
    const fixture = createFixture(SidebarMenuExpandControlTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const parentContent = getParentItems(fixture)[0].querySelector("._content") as HTMLElement;
    parentContent.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.expandedMenuCodes()).toEqual(["p1"]);
  });

  it("메뉴가 늦게 도착해도 accordion-expanded 초기 펼침이 적용된다", async () => {
    const fixture = createFixture(SidebarMenuAsyncExpandedTest);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(getParentItems(fixture)).toHaveLength(0);

    fixture.componentInstance.load();
    fixture.detectChanges();
    await fixture.whenStable();

    const parentItems = getParentItems(fixture);
    expect(parentItems).toHaveLength(3);
    expect(parentItems.every((el) => el.getAttribute("data-sd-open") === "true")).toBe(true);
  });

  it("호스트가 지정한 expandedMenuCodes 가 accordion-expanded 보다 우선한다", async () => {
    const fixture = createFixture(SidebarMenuExpandControlTest);
    fixture.componentInstance.layout.set("accordion-expanded");
    fixture.detectChanges();
    await fixture.whenStable();

    expect(getParentItems(fixture).every((el) => el.getAttribute("data-sd-open") === "false")).toBe(
      true,
    );
  });
});
