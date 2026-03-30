import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdSidebarContainerControl } from "../../../../src/ui/navigation/sidebar/sd-sidebar-container.control";
import { SidebarUnitTest } from "./sd-sidebar-unit-test.fixture";

describe("SdSidebarControl unit", () => {
  it("부모 container의 toggle을 반영하여 data-sd-toggle 속성을 바인딩한다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarUnitTest],
    }).createComponent(SidebarUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const sidebar = fixture.nativeElement.querySelector("sd-sidebar") as HTMLElement;
    expect(sidebar.getAttribute("data-sd-toggle")).toBe("false");

    // toggle parent to true
    const containerCtrl = fixture.debugElement.children[0]
      .componentInstance as SdSidebarContainerControl;
    containerCtrl.toggle.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(sidebar.getAttribute("data-sd-toggle")).toBe("true");
  });

  it("ng-content를 투영한다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SidebarUnitTest],
    }).createComponent(SidebarUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const sidebar = fixture.nativeElement.querySelector("sd-sidebar") as HTMLElement;
    expect(sidebar.textContent).toContain("Sidebar");
  });

});
