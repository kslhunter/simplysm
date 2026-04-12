import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdGapTestHeight,
  SdGapTestWidth,
  SdGapTestHeightPx,
  SdGapTestWidthEm,
  SdGapTestZero,
} from "./basic-elements-test.fixture";

describe("Feature 2.1 Slice 3: 기본 구조 요소", () => {
  // --- Gap ---

  it("sd-gap height='default' → display:block, data-sd-height 속성 적용", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdGapTestHeight] })
      .createComponent(SdGapTestHeight);
    fixture.detectChanges();
    TestBed.flushEffects();

    const el = fixture.nativeElement.querySelector("sd-gap") as HTMLElement;
    expect(el.getAttribute("data-sd-height")).toBe("default");
    expect(el.style.display).toBe("block");
  });

  it("sd-gap width='sm' → display:inline-block, data-sd-width 속성 적용", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdGapTestWidth] })
      .createComponent(SdGapTestWidth);
    fixture.detectChanges();
    TestBed.flushEffects();

    const el = fixture.nativeElement.querySelector("sd-gap") as HTMLElement;
    expect(el.getAttribute("data-sd-width")).toBe("sm");
    expect(el.style.display).toBe("inline-block");
  });

  it("sd-gap heightPx=20 → display:block, height:20px", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdGapTestHeightPx] })
      .createComponent(SdGapTestHeightPx);
    fixture.detectChanges();
    TestBed.flushEffects();

    const el = fixture.nativeElement.querySelector("sd-gap") as HTMLElement;
    expect(el.style.height).toBe("20px");
    expect(el.style.display).toBe("block");
  });

  it("sd-gap widthEm=2 → display:inline-block, width:2em", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdGapTestWidthEm] })
      .createComponent(SdGapTestWidthEm);
    fixture.detectChanges();
    TestBed.flushEffects();

    const el = fixture.nativeElement.querySelector("sd-gap") as HTMLElement;
    expect(el.style.width).toBe("2em");
    expect(el.style.display).toBe("inline-block");
  });

  it("sd-gap heightPx=0 → display:none", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdGapTestZero] })
      .createComponent(SdGapTestZero);
    fixture.detectChanges();
    TestBed.flushEffects();

    const el = fixture.nativeElement.querySelector("sd-gap") as HTMLElement;
    expect(el.style.display).toBe("none");
  });

});
