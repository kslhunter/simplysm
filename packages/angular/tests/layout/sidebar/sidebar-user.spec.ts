import { describe, it, expect, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdSidebarUser } from "../../../src/layout/sidebar/sd-sidebar-user";
import {
  SidebarUserProfileTest,
  SidebarUserMenuTest,
  SidebarUserNoMenuTest,
} from "./sd-sidebar-user-test.fixture";

describe("Feature 4.3 Slice 3: SdSidebarUser 사용자 메뉴", () => {
  it("ng-content로 사용자 프로필 영역을 표시한다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarUserProfileTest],
    }).createComponent(SidebarUserProfileTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const profile = fixture.nativeElement.querySelector(".profile") as HTMLElement;
    expect(profile).toBeTruthy();
    expect(profile.textContent).toContain("User Profile");
  });

  it("userMenu가 있으면 메뉴 버튼이 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarUserMenuTest],
    }).createComponent(SidebarUserMenuTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const menuButton = fixture.nativeElement.querySelector("._menu-button") as HTMLElement;
    expect(menuButton).toBeTruthy();
    expect(menuButton.textContent).toContain("Hong Gildong");

    // collapse-icon should be present
    const collapseIcon = menuButton.querySelector("sd-collapse-icon") as HTMLElement;
    expect(collapseIcon).toBeTruthy();
  });

  it("메뉴 버튼 클릭 시 메뉴 목록이 토글된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarUserMenuTest],
    }).createComponent(SidebarUserMenuTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdSidebarUser;
    expect(ctrl.menuOpen()).toBe(false);

    // Click menu button to open
    const menuButton = fixture.nativeElement.querySelector("._menu-button") as HTMLElement;
    menuButton.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(ctrl.menuOpen()).toBe(true);

    // collapse-icon should have openRotate=180
    const collapseIcon = menuButton.querySelector("sd-collapse-icon") as HTMLElement;
    expect(collapseIcon).toBeTruthy();

    // Click again to close
    menuButton.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(ctrl.menuOpen()).toBe(false);
  });

  it("메뉴 항목 클릭 시 onClick 콜백이 실행된다", async () => {
    const onClickSpy = vi.fn();
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarUserMenuTest],
    }).createComponent(SidebarUserMenuTest);
    fixture.componentInstance.userMenu.set({
      title: "Test User",
      menus: [{ title: "Action", onClick: onClickSpy }],
    });
    fixture.detectChanges();
    await fixture.whenStable();

    // Open the menu first
    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdSidebarUser;
    ctrl.menuOpen.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    // Find and click the list item
    const listItem = fixture.nativeElement.querySelector(
      "sd-collapse sd-list sd-list-item",
    ) as HTMLElement;
    expect(listItem).toBeTruthy();

    const content = listItem.querySelector("._content") as HTMLElement;
    content.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(onClickSpy).toHaveBeenCalledTimes(1);
  });

  it("userMenu가 없으면 메뉴 버튼과 collapse가 표시되지 않는다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarUserNoMenuTest],
    }).createComponent(SidebarUserNoMenuTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const menuButton = fixture.nativeElement.querySelector("._menu-button") as HTMLElement;
    expect(menuButton).toBeNull();

    const collapse = fixture.nativeElement.querySelector("sd-collapse") as HTMLElement;
    expect(collapse).toBeNull();
  });
});
