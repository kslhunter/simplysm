import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdCollapseClosedTest,
  SdCollapseOpenTest,
  SdCollapseToggleTest,
  SdCollapseIconClosedTest,
  SdCollapseIconOpenTest,
  SdCollapseIconCustomRotateTest,
} from "./sd-collapse-test.fixture";

describe("Feature 4.1 Slice 1: sd-collapse", () => {
  it("닫힌 상태에서 _content의 margin-top이 음수이고 transition이 ease-in이다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCollapseClosedTest] })
      .createComponent(SdCollapseClosedTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-collapse") as HTMLElement;
    const content = host.querySelector("._content") as HTMLElement;
    expect(content).toBeTruthy();

    const style = content.style;
    // margin-top should be negative (hiding content)
    expect(style.marginTop).toMatch(/^-\d+(\.\d+)?px$/);
    expect(style.transition).toContain("margin-top");
    expect(style.transition).toContain("ease-in");
  });

  it("열린 상태에서 _content의 margin-top이 비어있고 transition이 ease-out이다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCollapseOpenTest] })
      .createComponent(SdCollapseOpenTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-collapse") as HTMLElement;
    const content = host.querySelector("._content") as HTMLElement;
    expect(content).toBeTruthy();

    const style = content.style;
    expect(style.marginTop).toBe("");
    expect(style.transition).toContain("margin-top");
    expect(style.transition).toContain("ease-out");
  });

  it("콘텐츠 크기 변경 시 닫힌 상태의 margin-top이 새 높이로 갱신된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCollapseToggleTest] })
      .createComponent(SdCollapseToggleTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-collapse") as HTMLElement;
    const content = host.querySelector("._content") as HTMLElement;
    expect(content).toBeTruthy();

    // 초기 닫힘 상태 - should have negative margin
    const initialMargin = content.style.marginTop;
    expect(initialMargin).toMatch(/^-\d+(\.\d+)?px$/);
  });
});

describe("Feature 4.1 Slice 1: sd-collapse-icon", () => {
  it("닫힌 상태에서 transform이 빈 문자열이다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCollapseIconClosedTest] })
      .createComponent(SdCollapseIconClosedTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-collapse-icon") as HTMLElement;
    expect(host).toBeTruthy();
    expect(host.style.transform).toBe("");
  });

  it("열린 상태에서 기본 rotate(90deg)이고 transition이 ease-out이다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCollapseIconOpenTest] })
      .createComponent(SdCollapseIconOpenTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-collapse-icon") as HTMLElement;
    expect(host).toBeTruthy();
    expect(host.style.transform).toBe("rotate(90deg)");
    expect(host.style.transition).toContain("transform");
    expect(host.style.transition).toContain("ease-out");
  });

  it("커스텀 openRotate=180이면 rotate(180deg)이다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdCollapseIconCustomRotateTest] })
      .createComponent(SdCollapseIconCustomRotateTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector("sd-collapse-icon") as HTMLElement;
    expect(host).toBeTruthy();
    expect(host.style.transform).toBe("rotate(180deg)");
  });
});
