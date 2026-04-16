import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { TopbarNoSidebarTest } from "./sd-topbar-test.fixture";

function findTopbarStyleEl(): HTMLStyleElement | undefined {
  const styles = document.querySelectorAll("style");
  return Array.from(styles).find(
    (s) =>
      s.textContent.includes("sd-topbar") &&
      !s.textContent.includes("sd-topbar-"),
  );
}

describe("Feature 2.2 Slice 1: sd-topbar min-height 복원", () => {
  describe("Rule: sd-topbar는 최소 높이를 보장하면서 콘텐츠 확장을 허용해야 한다", () => {
    it("Scenario: sd-topbar 스타일에 min-height: var(--topbar-height)가 적용된다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [TopbarNoSidebarTest],
      }).createComponent(TopbarNoSidebarTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const topbarStyleEl = findTopbarStyleEl();
      expect(topbarStyleEl).toBeTruthy();
      expect(topbarStyleEl!.textContent).toMatch(/min-height:\s*var\(--topbar-height\)/);
    });

    it("Scenario: sd-topbar에 고정 height 대신 min-height가 사용된다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [TopbarNoSidebarTest],
      }).createComponent(TopbarNoSidebarTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const topbarStyleEl = findTopbarStyleEl();
      expect(topbarStyleEl).toBeTruthy();
      expect(topbarStyleEl!.textContent).not.toMatch(
        /(?<!min-)height:\s*var\(--topbar-height\)/,
      );
    });
  });
});
