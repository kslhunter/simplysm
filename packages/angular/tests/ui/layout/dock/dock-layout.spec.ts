import { describe, it, expect, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdSystemConfigProvider } from "../../../../src/core/providers/sd-system-config.provider";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdResizeEventPlugin } from "../../../../src/core/plugins/events/sd-resize-event.plugin";
import {
  SdDockTestTop,
  SdDockTestMulti,
  SdDockTestEmpty,
  SdDockTestContentClass,
  SdDockTestResizable,
  SdDockTestNotResizable,
} from "./sd-dock-test.fixture";

function setupTestBed(component: any) {
  const mockConfigProvider = {
    getAsync: vi.fn().mockResolvedValue(undefined),
    setAsync: vi.fn().mockResolvedValue(undefined),
  };

  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      { provide: SdSystemConfigProvider, useValue: mockConfigProvider },
      { provide: EVENT_MANAGER_PLUGINS, useClass: SdResizeEventPlugin, multi: true },
    ],
  });

  return { mockConfigProvider };
}

describe("Feature 2.1 Slice 4: Dock 레이아웃", () => {
  // --- Acceptance Tests: 배치 ---

  it("top dock이 있으면 dock에 position 속성이 설정되고 top 스타일이 적용된다", () => {
    setupTestBed(SdDockTestTop);
    const fixture = TestBed.createComponent(SdDockTestTop);
    fixture.detectChanges();
    TestBed.flushEffects();

    const dock = fixture.nativeElement.querySelector("sd-dock") as HTMLElement;
    expect(dock.getAttribute("data-sd-position")).toBe("top");
    expect(dock.style.top).toBe("0px");
    expect(dock.style.left).toBe("0px");
    expect(dock.style.right).toBe("0px");
  });

  it("여러 방향의 dock이 독립적으로 배치된다", () => {
    setupTestBed(SdDockTestMulti);
    const fixture = TestBed.createComponent(SdDockTestMulti);
    fixture.detectChanges();
    TestBed.flushEffects();

    const docks = fixture.nativeElement.querySelectorAll("sd-dock") as NodeListOf<HTMLElement>;
    expect(docks[0].getAttribute("data-sd-position")).toBe("left");
    expect(docks[1].getAttribute("data-sd-position")).toBe("top");
  });

  it("dock 없이 컨테이너만 사용하면 컨텐츠가 전체 영역을 차지한다", () => {
    setupTestBed(SdDockTestEmpty);
    const fixture = TestBed.createComponent(SdDockTestEmpty);
    fixture.detectChanges();
    TestBed.flushEffects();

    const content = fixture.nativeElement.querySelector("._content") as HTMLElement;
    expect(content.style.paddingTop).toBe("0px");
    expect(content.style.paddingLeft).toBe("0px");
    expect(content.style.paddingRight).toBe("0px");
    expect(content.style.paddingBottom).toBe("0px");
  });

  it("contentClass가 컨텐츠 영역에 적용된다", () => {
    setupTestBed(SdDockTestContentClass);
    const fixture = TestBed.createComponent(SdDockTestContentClass);
    fixture.detectChanges();

    const content = fixture.nativeElement.querySelector("._content") as HTMLElement;
    expect(content.classList.contains("my-class")).toBe(true);
  });

  // --- Acceptance Tests: resize ---

  it("resizable=false이면 resize bar가 없다", () => {
    setupTestBed(SdDockTestNotResizable);
    const fixture = TestBed.createComponent(SdDockTestNotResizable);
    fixture.detectChanges();

    const resizeBar = fixture.nativeElement.querySelector("._resize-bar");
    expect(resizeBar).toBeNull();
  });

  it("resizable=true이면 resize bar가 있다", () => {
    setupTestBed(SdDockTestResizable);
    const fixture = TestBed.createComponent(SdDockTestResizable);
    fixture.detectChanges();

    const resizeBar = fixture.nativeElement.querySelector("._resize-bar");
    expect(resizeBar).not.toBeNull();
  });

  // --- Unit Tests ---

  it("DESIGN-004: 리사이즈 드래그 중 컴포넌트 파괴 시 document 리스너가 해제된다", () => {
    setupTestBed(SdDockTestResizable);
    const fixture = TestBed.createComponent(SdDockTestResizable);
    fixture.detectChanges();
    TestBed.flushEffects();

    const resizeBar = fixture.nativeElement.querySelector("._resize-bar") as HTMLElement;
    const removeSpy = vi.spyOn(document, "removeEventListener");

    // 드래그 시작
    resizeBar.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 100, clientY: 100 }));

    // 컴포넌트 파괴 (mouseup 없이)
    fixture.destroy();

    // document에서 mousemove/mouseup 리스너가 해제되었는지 확인
    const removeCallArgs = removeSpy.mock.calls.map((call) => call[0]);
    expect(removeCallArgs).toContain("mousemove");
    expect(removeCallArgs).toContain("mouseup");

    removeSpy.mockRestore();
  });
});
