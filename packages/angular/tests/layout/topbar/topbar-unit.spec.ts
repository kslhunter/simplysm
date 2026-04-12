import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdTopbar } from "../../../src/layout/topbar/sd-topbar";
import {
  TopbarUnitWithSidebarTest,
  TopbarUnitExternalSidebarTest,
  TopbarUnitNoSidebarTest,
} from "./sd-topbar-unit-test.fixture";

describe("SdTopbar unit", () => {
  it("hasSidebar: inject된 SdSidebarContainer이 있으면 true", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarUnitWithSidebarTest],
    }).createComponent(TopbarUnitWithSidebarTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const topbar = fixture.debugElement.children[0].children[0]
      .componentInstance as SdTopbar;
    expect(topbar.hasSidebar()).toBe(true);
  });

  it("hasSidebar: sidebarContainer input이 있으면 true", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarUnitExternalSidebarTest],
    }).createComponent(TopbarUnitExternalSidebarTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const topbar = fixture.debugElement.query(
      (el) => el.componentInstance instanceof SdTopbar,
    ).componentInstance as SdTopbar;
    expect(topbar.hasSidebar()).toBe(true);
  });

  it("hasSidebar: inject도 input도 없으면 false", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarUnitNoSidebarTest],
    }).createComponent(TopbarUnitNoSidebarTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const topbar = fixture.debugElement.children[0]
      .componentInstance as SdTopbar;
    expect(topbar.hasSidebar()).toBe(false);
  });
});
