import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  TopbarWithSidebarTest,
  TopbarWithExternalSidebarTest,
  TopbarNoSidebarTest,
} from "./sd-topbar-test.fixture";
import { SdSidebarContainer } from "../../../src/layout/sidebar/sd-sidebar-container";

describe("Feature 4.4 Slice 1: SdTopbar 사이드바 토글", () => {
  it("SdSidebarContainer이 부모에 있으면 토글 버튼이 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarWithSidebarTest],
    }).createComponent(TopbarWithSidebarTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const toggleBtn = fixture.nativeElement.querySelector(
      "sd-topbar button",
    ) as HTMLElement;
    expect(toggleBtn).toBeTruthy();
  });

  it("sidebarContainer input으로 외부 사이드바를 연결하면 토글 버튼이 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarWithExternalSidebarTest],
    }).createComponent(TopbarWithExternalSidebarTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const toggleBtn = fixture.nativeElement.querySelector(
      "sd-topbar button",
    ) as HTMLElement;
    expect(toggleBtn).toBeTruthy();
  });

  it("사이드바가 없으면 토글 버튼이 숨겨진다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarNoSidebarTest],
    }).createComponent(TopbarNoSidebarTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const toggleBtn = fixture.nativeElement.querySelector(
      "sd-topbar button",
    ) as HTMLElement;
    expect(toggleBtn).toBeFalsy();
  });

  it("토글 버튼 클릭 시 사이드바 toggle이 반전된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [TopbarWithSidebarTest],
    }).createComponent(TopbarWithSidebarTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const sidebarContainer = fixture.debugElement.children[0]
      .componentInstance as SdSidebarContainer;
    expect(sidebarContainer.toggle()).toBe(false);

    const toggleBtn = fixture.nativeElement.querySelector(
      "sd-topbar button",
    ) as HTMLElement;
    toggleBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(sidebarContainer.toggle()).toBe(true);
  });
});
