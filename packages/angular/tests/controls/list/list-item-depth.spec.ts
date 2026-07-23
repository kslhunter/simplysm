import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdListItemDepthTest, SdListItemFlatParentDepthTest } from "./sd-list-test.fixture";

function depthOf(el: HTMLElement): string {
  return el.style.getPropertyValue("--sd-list-item-depth").trim();
}

describe("sd-list-item 깊이 자기산출", () => {
  it("리터럴 중첩 3레벨에서 깊이가 0, 1, 2로 누적된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdListItemDepthTest],
    }).createComponent(SdListItemDepthTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const items = fixture.nativeElement.querySelectorAll(
      "sd-list-item",
    ) as NodeListOf<HTMLElement>;
    expect(items.length).toBe(3);
    expect(depthOf(items[0])).toBe("0");
    expect(depthOf(items[1])).toBe("1");
    expect(depthOf(items[2])).toBe("2");
  });

  it("깊이가 깊어질수록 들여쓰기 padding이 계단식으로 누적된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdListItemDepthTest],
    }).createComponent(SdListItemDepthTest);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();

    const items = fixture.nativeElement.querySelectorAll(
      "sd-list-item",
    ) as NodeListOf<HTMLElement>;
    const padOf = (el: HTMLElement): number =>
      parseFloat(getComputedStyle(el.querySelector(":scope > ._content")!).paddingLeft);

    const depth1Pad = padOf(items[1]);
    const depth2Pad = padOf(items[2]);
    expect(depth1Pad).toBeGreaterThan(0);
    // depth2(3em)는 depth1(1.5em)의 2배로 누적
    expect(depth2Pad).toBeCloseTo(depth1Pad * 2, 1);

    fixture.nativeElement.remove();
  });

  it("flat 부모는 깊이를 증가시키지 않는다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdListItemFlatParentDepthTest],
    }).createComponent(SdListItemFlatParentDepthTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const items = fixture.nativeElement.querySelectorAll(
      "sd-list-item",
    ) as NodeListOf<HTMLElement>;
    expect(items.length).toBe(2);
    expect(depthOf(items[0])).toBe("0");
    expect(depthOf(items[1])).toBe("0");
  });
});
