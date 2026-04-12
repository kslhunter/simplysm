import { describe, it, expect, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import { TopbarUserBasicTest } from "./sd-topbar-user-test.fixture";
import { SdDropdown } from "../../../src/controls/dropdown/sd-dropdown";

describe("Feature 4.4 Slice 3: SdTopbarUser 사용자 메뉴", () => {
  it("ng-content로 사용자 정보가 드롭다운 트리거에 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarUserBasicTest],
    }).createComponent(TopbarUserBasicTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const button = fixture.nativeElement.querySelector(
      "sd-topbar-user sd-button",
    ) as HTMLElement;
    expect(button).toBeTruthy();
    expect(button.textContent).toContain("홍길동");
  });

  it("사용자 버튼 클릭 시 메뉴 목록이 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarUserBasicTest],
    }).createComponent(TopbarUserBasicTest);
    fixture.detectChanges();
    await fixture.whenStable();

    // Click dropdown
    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    dropdown.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // Popup is moved to document.body
    const listItems = document.body.querySelectorAll(
      "sd-dropdown-popup sd-list-item",
    );
    expect(listItems.length).toBe(2);
  });

  it("메뉴 항목 클릭 시 onClick 콜백이 실행되고 드롭다운이 닫힌다", async () => {
    const onClickSpy = vi.fn();
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarUserBasicTest],
    }).createComponent(TopbarUserBasicTest);
    fixture.componentInstance.menus.set([
      { title: "프로필", onClick: () => {} },
      { title: "로그아웃", onClick: onClickSpy },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    // Open dropdown
    const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
    dropdown.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // Click "로그아웃" item in popup
    const listItems = document.body.querySelectorAll(
      "sd-dropdown-popup sd-list-item ._content",
    );
    expect(listItems.length).toBe(2);
    (listItems[1] as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(onClickSpy).toHaveBeenCalledOnce();

    // Dropdown should be closed
    const dropdownCtrl = fixture.debugElement
      .query((el) => el.componentInstance instanceof SdDropdown)
      .componentInstance as SdDropdown;
    expect(dropdownCtrl.open()).toBe(false);
  });
});
