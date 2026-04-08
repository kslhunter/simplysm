import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { SdTopbarMenu } from "../../../../src/ui/navigation/topbar/sd-topbar-menu";
import { TopbarMenuUnitTest } from "./sd-topbar-menu-unit-test.fixture";

describe("SdTopbarMenu unit", () => {
  it("getMenuRouterLinkOption: children 없고 url 없으면 link와 queryParams 반환", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarMenuUnitTest],
      providers: [provideRouter([])],
    }).createComponent(TopbarMenuUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdTopbarMenu;
    const result = ctrl.getMenuRouterLinkOption({
      title: "Test",
      codeChain: ["mod", "pg"],
    });
    expect(result).toEqual({ link: "/home/mod/pg", queryParams: undefined });
  });

  it("getMenuRouterLinkOption: 쿼리스트링 포함 시 URLSearchParams로 파싱한다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarMenuUnitTest],
      providers: [provideRouter([])],
    }).createComponent(TopbarMenuUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdTopbarMenu;
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
      imports: [TopbarMenuUnitTest],
      providers: [provideRouter([])],
    }).createComponent(TopbarMenuUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdTopbarMenu;
    const result = ctrl.getMenuRouterLinkOption({
      title: "Parent",
      codeChain: ["p"],
      children: [{ title: "Child", codeChain: ["p", "c"] }],
    });
    expect(result).toBeUndefined();
  });

  it("getMenuRouterLinkOption: url이 있으면 undefined 반환", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarMenuUnitTest],
      providers: [provideRouter([])],
    }).createComponent(TopbarMenuUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdTopbarMenu;
    const result = ctrl.getMenuRouterLinkOption({
      title: "Ext",
      codeChain: ["ext"],
      url: "https://example.com",
    });
    expect(result).toBeUndefined();
  });

  it("getIsMenuSelected: fullPageCode와 codeChain.join('.')이 일치하면 true", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarMenuUnitTest],
      providers: [provideRouter([])],
    }).createComponent(TopbarMenuUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdTopbarMenu;
    // With empty URL, fullPageCode = "" and codeChain.join('.') = "" -> true
    const result = ctrl.getIsMenuSelected({ title: "X", codeChain: [] });
    expect(result).toBe(true);
  });

  it("getIsMenuSelected: codeChain이 불일치하면 false", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarMenuUnitTest],
      providers: [provideRouter([])],
    }).createComponent(TopbarMenuUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdTopbarMenu;
    // With empty URL, fullPageCode = "" but codeChain.join('.') = "module.page"
    const result = ctrl.getIsMenuSelected({
      title: "X",
      codeChain: ["module", "page"],
    });
    expect(result).toBe(false);
  });
});
