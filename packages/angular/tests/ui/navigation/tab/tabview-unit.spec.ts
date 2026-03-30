import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdTabviewBasicTest } from "./sd-tabview-test.fixture";

describe("SdTabviewItemControl unit", () => {
  it("isSelected가 부모 value와 자신의 value를 비교하여 계산된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTabviewBasicTest] })
      .createComponent(SdTabviewBasicTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const items = fixture.nativeElement.querySelectorAll(
      "sd-tabview-item",
    ) as NodeListOf<HTMLElement>;

    // A가 선택 상태 -> display: block
    expect(items[0].getAttribute("data-sd-selected")).toBe("true");
    // B는 미선택 -> display: none (CSS로)
    expect(items[1].getAttribute("data-sd-selected")).not.toBe("true");

    // value 변경
    fixture.componentInstance.value.set("B");
    fixture.detectChanges();
    await fixture.whenStable();

    expect(items[0].getAttribute("data-sd-selected")).not.toBe("true");
    expect(items[1].getAttribute("data-sd-selected")).toBe("true");
  });
});
