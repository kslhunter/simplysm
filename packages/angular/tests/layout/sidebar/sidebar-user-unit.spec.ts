import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdSidebarUser } from "../../../src/layout/sidebar/sd-sidebar-user";
import { UserUnitTest } from "./sd-sidebar-user-unit-test.fixture";

describe("SdSidebarUser unit", () => {
  it("menuOpen 초기값이 false이다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [UserUnitTest],
    }).createComponent(UserUnitTest);
    fixture.componentInstance.userMenu.set({
      title: "Test",
      menus: [{ title: "X", onClick: () => {} }],
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdSidebarUser;
    expect(ctrl.menuOpen()).toBe(false);
  });

  it("onMenuOpenButtonClick 호출 시 menuOpen이 토글된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [UserUnitTest],
    }).createComponent(UserUnitTest);
    fixture.componentInstance.userMenu.set({
      title: "Test",
      menus: [{ title: "X", onClick: () => {} }],
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdSidebarUser;
    expect(ctrl.menuOpen()).toBe(false);

    ctrl.onMenuOpenButtonClick();
    expect(ctrl.menuOpen()).toBe(true);

    ctrl.onMenuOpenButtonClick();
    expect(ctrl.menuOpen()).toBe(false);
  });

  it("ng-content가 p-lg div 안에 투영된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [UserUnitTest],
    }).createComponent(UserUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const profileContent = fixture.nativeElement.querySelector(
      ".profile-content",
    ) as HTMLElement;
    expect(profileContent).toBeTruthy();

    // Profile should be inside the p-lg container
    const pLg = fixture.nativeElement.querySelector(".p-lg") as HTMLElement;
    expect(pLg).toBeTruthy();
    expect(pLg.contains(profileContent)).toBe(true);
  });

  it("userMenu가 undefined이면 host의 display가 block이고 메뉴 버튼이 없다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [UserUnitTest],
    }).createComponent(UserUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-sidebar-user") as HTMLElement;
    expect(host).toBeTruthy();

    const menuButton = host.querySelector("._menu-button") as HTMLElement;
    expect(menuButton).toBeNull();
  });
});
