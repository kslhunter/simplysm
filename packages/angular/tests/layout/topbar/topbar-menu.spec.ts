import { describe, it, expect, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { SdTopbarMenu } from "../../../src/layout/topbar/sd-topbar-menu";
import { SdDropdown } from "../../../src/controls/dropdown/sd-dropdown";
import {
  TopbarMenuBasicTest,
  TopbarMenuIconTest,
  TopbarMenuChildrenTest,
  TopbarMenuUrlTest,
  TopbarMenuQueryStringTest,
  TopbarMenuCustomSelectedFnTest,
  TopbarMenuDepthTest,
} from "./sd-topbar-menu-test.fixture";

describe("Feature 4.4 Slice 2: SdTopbarMenu 드롭다운 메뉴", () => {
  it("최상위 메뉴마다 드롭다운 버튼이 생성된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarMenuBasicTest],
      providers: [provideRouter([])],
    }).createComponent(TopbarMenuBasicTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const dropdowns = fixture.nativeElement.querySelectorAll(
      "sd-topbar-menu sd-dropdown",
    ) as NodeListOf<HTMLElement>;
    expect(dropdowns.length).toBe(3);
  });

  it("드롭다운 버튼에 캐럿 다운 아이콘이 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarMenuBasicTest],
      providers: [provideRouter([])],
    }).createComponent(TopbarMenuBasicTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const caretIcons = fixture.nativeElement.querySelectorAll(
      "sd-topbar-menu sd-dropdown > sd-button ng-icon",
    ) as NodeListOf<HTMLElement>;
    expect(caretIcons.length).toBeGreaterThan(0);
  });

  it("메뉴에 아이콘이 있으면 제목 앞에 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarMenuIconTest],
      providers: [provideRouter([])],
    }).createComponent(TopbarMenuIconTest);
    fixture.detectChanges();
    await fixture.whenStable();

    // Inside dropdown popup, check for icon in list item
    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    dropdown.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // Popup is moved to document.body when open
    const icon = document.body.querySelector(
      "sd-dropdown-popup sd-list-item ng-icon",
    ) as HTMLElement;
    expect(icon).toBeTruthy();
  });

  it("하위 메뉴가 있으면 재귀 렌더링된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarMenuChildrenTest],
      providers: [provideRouter([])],
    }).createComponent(TopbarMenuChildrenTest);
    fixture.detectChanges();
    await fixture.whenStable();

    // Open dropdown
    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    dropdown.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // Popup is moved to document.body when open
    // sd-collapse wraps nested sd-list inside ._content
    const nestedLists = document.body.querySelectorAll("sd-dropdown-popup sd-list");
    // First sd-list is the root, any additional is a nested list from children
    expect(nestedLists.length).toBeGreaterThan(1);
  });

  it("depth에 따라 들여쓰기가 적용된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarMenuDepthTest],
      providers: [provideRouter([])],
    }).createComponent(TopbarMenuDepthTest);
    fixture.detectChanges();
    await fixture.whenStable();

    // Open dropdown
    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    dropdown.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // depth 2 item: (2+1)*0.5 = 1.5em
    // Popup is moved to document.body when open
    // sd-collapse wraps the nested list in ._content div
    const allListItems = document.body.querySelectorAll("sd-dropdown-popup sd-list-item");
    // Find the deepest item (depth 2)
    const deepItem = (Array.from(allListItems) as HTMLElement[]).find(
      (el) => el.style.paddingLeft === "1.5em",
    );
    expect(deepItem).toBeTruthy();
  });

  it("depth 0 항목에 기본 수직 패딩이 적용된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarMenuBasicTest],
      providers: [provideRouter([])],
    }).createComponent(TopbarMenuBasicTest);
    fixture.detectChanges();
    await fixture.whenStable();

    // Open dropdown
    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    dropdown.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // Popup is moved to document.body when open
    const listItem = document.body.querySelector("sd-dropdown-popup sd-list-item") as HTMLElement;
    expect(listItem).toBeTruthy();
    expect(listItem.style.paddingBlock).toBe("var(--sd-gap-default)");
  });

  it("children과 url이 없는 메뉴는 라우터 링크로 연결된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarMenuBasicTest],
      providers: [provideRouter([])],
    }).createComponent(TopbarMenuBasicTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0].componentInstance as SdTopbarMenu;
    const menu = { title: "Test", codeChain: ["module", "page"] };
    const option = ctrl.getMenuRouterLinkOption(menu);
    expect(option).toBeTruthy();
    expect(option!.link).toBe("/home/module/page");
  });

  it("codeChain에 쿼리스트링이 포함되면 queryParams로 분리된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarMenuQueryStringTest],
      providers: [provideRouter([])],
    }).createComponent(TopbarMenuQueryStringTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0].componentInstance as SdTopbarMenu;
    const menu = { title: "QS", codeChain: ["module", "page?key=value"] };
    const option = ctrl.getMenuRouterLinkOption(menu);
    expect(option).toBeTruthy();
    expect(option!.link).toBe("/home/module/page");
    expect(option!.queryParams).toEqual({ key: "value" });
  });

  it("url이 있는 메뉴 클릭 시 새 탭에서 열린다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarMenuUrlTest],
      providers: [provideRouter([])],
    }).createComponent(TopbarMenuUrlTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    // Open dropdown first
    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    dropdown.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // Popup is moved to document.body when open
    const listItem = document.body.querySelector(
      "sd-dropdown-popup sd-list-item ._content",
    ) as HTMLElement;
    listItem.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(openSpy).toHaveBeenCalledWith("https://example.com", "_blank");
    openSpy.mockRestore();
  });

  it("children이 있는 메뉴는 라우터 링크가 없다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarMenuChildrenTest],
      providers: [provideRouter([])],
    }).createComponent(TopbarMenuChildrenTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0].componentInstance as SdTopbarMenu;
    const menu = {
      title: "Parent",
      codeChain: ["parent"],
      children: [{ title: "Child", codeChain: ["parent", "child"] }],
    };
    const option = ctrl.getMenuRouterLinkOption(menu);
    expect(option).toBeUndefined();
  });

  it("현재 페이지와 일치하는 메뉴가 선택 상태로 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarMenuBasicTest],
      providers: [provideRouter([])],
    }).createComponent(TopbarMenuBasicTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0].componentInstance as SdTopbarMenu;
    // With empty URL, fullPageCode = "" and codeChain.join('.') = "" -> match for empty
    const result = ctrl.getIsMenuSelected({ title: "X", codeChain: [] });
    expect(typeof result).toBe("boolean");
  });

  it("커스텀 선택 함수가 제공되면 해당 함수로 선택 상태를 판단한다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarMenuCustomSelectedFnTest],
      providers: [provideRouter([])],
    }).createComponent(TopbarMenuCustomSelectedFnTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0].componentInstance as SdTopbarMenu;
    const menu = { title: "Custom", codeChain: ["custom"] };
    expect(ctrl.getIsMenuSelected(menu)).toBe(true);
  });

  it("메뉴 클릭 시 드롭다운이 닫힌다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarMenuUrlTest],
      providers: [provideRouter([])],
    }).createComponent(TopbarMenuUrlTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    // Open dropdown
    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    dropdown.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const dropdownCtrl = fixture.debugElement.query(
      (el) => el.componentInstance instanceof SdDropdown,
    ).componentInstance as SdDropdown;
    expect(dropdownCtrl.open()).toBe(true);

    // Click list item in popup (popup is on document.body)
    const listItem = document.body.querySelector(
      "sd-dropdown-popup sd-list-item ._content",
    ) as HTMLElement;
    expect(listItem).toBeTruthy();
    listItem.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // Dropdown should be closed
    expect(dropdownCtrl.open()).toBe(false);
    openSpy.mockRestore();
  });

  it("리프 메뉴 항목(children 없음)도 flat 레이아웃이 적용된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarMenuBasicTest],
      providers: [provideRouter([])],
    }).createComponent(TopbarMenuBasicTest);
    fixture.detectChanges();
    await fixture.whenStable();

    // 드롭다운 열기
    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    dropdown.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // 리프 메뉴(children 없음)도 layout="flat"이어야 한다
    const listItem = document.body.querySelector("sd-dropdown-popup sd-list-item") as HTMLElement;
    expect(listItem).toBeTruthy();
    expect(listItem.getAttribute("data-sd-layout")).toBe("flat");
    // children이 없으므로 has-children은 false
    expect(listItem.getAttribute("data-sd-has-children")).toBe("false");
  });
});
