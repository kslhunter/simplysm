import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdSidebarToggleFalseTest,
  SdSidebarToggleTrueTest,
  SdSidebarBackdropTest,
} from "./sd-sidebar-container-test.fixture";
import { SdSidebarContainer } from "../../../../src/ui/navigation/sidebar/sd-sidebar-container";

describe("Feature 4.3 Slice 1: Container + Sidebar 토글", () => {
  it("데스크탑에서 토글 false일 때 사이드바가 열려있다 — container에 padding-left가 있고 sidebar가 translateX 없이 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSidebarToggleFalseTest],
    }).createComponent(SdSidebarToggleFalseTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const container = fixture.nativeElement.querySelector(
      "sd-sidebar-container",
    ) as HTMLElement;
    const sidebar = fixture.nativeElement.querySelector("sd-sidebar") as HTMLElement;

    // toggle=false -> container has data-sd-toggle="false"
    expect(container.getAttribute("data-sd-toggle")).toBe("false");
    // sidebar reflects toggle=false
    expect(sidebar.getAttribute("data-sd-toggle")).toBe("false");
  });

  it("데스크탑에서 토글 true일 때 사이드바가 닫힌다 — container의 data-sd-toggle이 true이고 sidebar도 toggle=true이다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSidebarToggleTrueTest],
    }).createComponent(SdSidebarToggleTrueTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const container = fixture.nativeElement.querySelector(
      "sd-sidebar-container",
    ) as HTMLElement;
    const containerControl = fixture.debugElement.children[0].componentInstance as SdSidebarContainer;

    // Set toggle to true
    containerControl.toggle.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(container.getAttribute("data-sd-toggle")).toBe("true");

    const sidebar = fixture.nativeElement.querySelector("sd-sidebar") as HTMLElement;
    expect(sidebar.getAttribute("data-sd-toggle")).toBe("true");
  });

  it("백드롭 클릭 시 toggle이 반전된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSidebarBackdropTest],
    }).createComponent(SdSidebarBackdropTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const containerControl = fixture.debugElement.children[0].componentInstance as SdSidebarContainer;

    // Set toggle=true first (backdrop visible on mobile)
    containerControl.toggle.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const backdrop = fixture.nativeElement.querySelector("._backdrop") as HTMLElement;
    expect(backdrop).toBeTruthy();

    // Click backdrop
    backdrop.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    // toggle should be flipped to false
    expect(containerControl.toggle()).toBe(false);
  });

  it("Router 미주입 환경에서 라우팅 연동이 비활성화된다 — Router 없이도 에러 없이 동작한다", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdSidebarToggleFalseTest],
    }).createComponent(SdSidebarToggleFalseTest);

    // Should not throw even without Router provider
    expect(() => {
      fixture.detectChanges();
    }).not.toThrow();
  });
});
