import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdViewTestBasic } from "./sd-view-test.fixture";

describe("Feature 2.2 Slice 2: View 전환", () => {
  // --- Acceptance Tests ---

  it("value가 일치하는 view-item만 선택 상태이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdViewTestBasic] })
      .createComponent(SdViewTestBasic);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll("sd-view-item") as NodeListOf<HTMLElement>;
    expect(items[0].getAttribute("data-sd-selected")).toBe("true");
    expect(items[1].getAttribute("data-sd-selected")).toBe("false");
  });

  it("value 변경 시 표시 item이 전환된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdViewTestBasic] })
      .createComponent(SdViewTestBasic);
    fixture.detectChanges();

    fixture.componentInstance.activeTab.set("tab2");
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll("sd-view-item") as NodeListOf<HTMLElement>;
    expect(items[0].getAttribute("data-sd-selected")).toBe("false");
    expect(items[1].getAttribute("data-sd-selected")).toBe("true");
  });

  // --- Unit Tests ---

  it("view-item은 부모 SdView을 inject하여 computed로 선택 상태를 판단한다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdViewTestBasic] })
      .createComponent(SdViewTestBasic);
    fixture.detectChanges();

    // tab1이 선택된 상태에서 tab2로 변경하면 isSelected가 반응적으로 갱신된다
    const items = fixture.nativeElement.querySelectorAll("sd-view-item") as NodeListOf<HTMLElement>;
    expect(items[0].getAttribute("data-sd-selected")).toBe("true");

    fixture.componentInstance.activeTab.set("tab2");
    fixture.detectChanges();

    expect(items[0].getAttribute("data-sd-selected")).toBe("false");
    expect(items[1].getAttribute("data-sd-selected")).toBe("true");

    // 다시 tab1으로 변경
    fixture.componentInstance.activeTab.set("tab1");
    fixture.detectChanges();

    expect(items[0].getAttribute("data-sd-selected")).toBe("true");
    expect(items[1].getAttribute("data-sd-selected")).toBe("false");
  });
});
