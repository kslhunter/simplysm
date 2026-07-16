import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { TopbarMenuChildrenTest } from "./sd-topbar-menu-test.fixture";

function findTopbarMenuStyleEl(): HTMLStyleElement | undefined {
  const styles = document.querySelectorAll("style");
  return Array.from(styles).find((s) => s.textContent.includes("sd-topbar-menu"));
}

describe("Feature 5.2 Slice 1: sd-topbar-menu flat 레이아웃 및 배경색 복원", () => {
  describe("Rule: 중첩 리스트에 배경색 적용", () => {
    it("Scenario: children이 있는 메뉴의 중첩 리스트에 배경색이 적용된다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [TopbarMenuChildrenTest],
        providers: [provideRouter([])],
      }).createComponent(TopbarMenuChildrenTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const styleEl = findTopbarMenuStyleEl();
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toMatch(
        /sd-list\s+sd-list\s*\{[^}]*background-color:\s*var\(--sd-bg-gray-subtle\)/,
      );
    });
  });

  describe("Rule: 메뉴 항목은 flat 레이아웃을 사용한다", () => {
    it("Scenario: children이 있는 메뉴 항목이 flat 레이아웃으로 렌더링된다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [TopbarMenuChildrenTest],
        providers: [provideRouter([])],
      }).createComponent(TopbarMenuChildrenTest);
      fixture.detectChanges();
      await fixture.whenStable();

      // 드롭다운 열기
      const dropdown = fixture.nativeElement.querySelector("sd-dropdown") as HTMLElement;
      dropdown.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // sd-list-item의 layout이 flat이어야 한다
      const listItems = document.body.querySelectorAll<HTMLElement>(
        "sd-dropdown-popup sd-list-item",
      );
      expect(listItems.length).toBeGreaterThan(0);
      for (const item of Array.from(listItems)) {
        expect(item.getAttribute("data-sd-layout")).toBe("flat");
      }

      // collapse-icon이 없어야 한다
      const collapseIcons = document.body.querySelectorAll("sd-dropdown-popup sd-collapse-icon");
      expect(collapseIcons.length).toBe(0);

      // children이 있는 항목의 하위 메뉴가 항상 펼쳐져 있다
      const nestedLists = document.body.querySelectorAll("sd-dropdown-popup sd-list sd-list");
      expect(nestedLists.length).toBeGreaterThan(0);
    });
  });
});
