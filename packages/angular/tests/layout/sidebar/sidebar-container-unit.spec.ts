import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdSidebarContainer } from "../../../src/layout/sidebar/sd-sidebar-container";
import { provideRouter, Router } from "@angular/router";
import {
  ContainerUnitTest,
  ContainerRouterTest,
} from "./sd-sidebar-container-unit-test.fixture";

describe("SdSidebarContainer unit", () => {
  it("toggle 초기값이 false이다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ContainerUnitTest],
    }).createComponent(ContainerUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdSidebarContainer;
    expect(ctrl.toggle()).toBe(false);
  });

  it("toggle을 true로 설정하면 host에 data-sd-toggle=true가 반영된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ContainerUnitTest],
    }).createComponent(ContainerUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdSidebarContainer;
    ctrl.toggle.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector(
      "sd-sidebar-container",
    ) as HTMLElement;
    expect(host.getAttribute("data-sd-toggle")).toBe("true");
  });

  it("백드롭 요소가 렌더링된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ContainerUnitTest],
    }).createComponent(ContainerUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const backdrop = fixture.nativeElement.querySelector("._backdrop") as HTMLElement;
    expect(backdrop).toBeTruthy();
  });

  it("ng-content가 투영된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ContainerUnitTest],
    }).createComponent(ContainerUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const inner = fixture.nativeElement.querySelector(".inner") as HTMLElement;
    expect(inner).toBeTruthy();
  });

  it("CONSIST-002: 백드롭 클릭 시 toggle이 false로 설정된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ContainerUnitTest],
    }).createComponent(ContainerUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdSidebarContainer;
    ctrl.toggle.set(true);
    expect(ctrl.toggle()).toBe(true);

    const backdrop = fixture.nativeElement.querySelector("._backdrop") as HTMLElement;
    backdrop.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(ctrl.toggle()).toBe(false);
  });

  it("CONSIST-002: toggle=false 상태에서 백드롭 클릭해도 false를 유지한다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ContainerUnitTest],
    }).createComponent(ContainerUnitTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdSidebarContainer;
    expect(ctrl.toggle()).toBe(false);

    const backdrop = fixture.nativeElement.querySelector("._backdrop") as HTMLElement;
    backdrop.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(ctrl.toggle()).toBe(false);
  });

  it("Router가 있으면 NavigationStart에서 toggle이 false로 리셋된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ContainerRouterTest],
      providers: [provideRouter([])],
    }).createComponent(ContainerRouterTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const ctrl = fixture.debugElement.children[0]
      .componentInstance as SdSidebarContainer;
    ctrl.toggle.set(true);
    expect(ctrl.toggle()).toBe(true);

    // Trigger navigation
    const router = TestBed.inject(Router);
    await router.navigateByUrl("/");
    fixture.detectChanges();
    await fixture.whenStable();

    expect(ctrl.toggle()).toBe(false);
  });
});
