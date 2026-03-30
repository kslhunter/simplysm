import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdProgressHalfTest,
  SdProgressZeroTest,
  SdProgressFullTest,
} from "./sd-progress-test.fixture";

describe("Feature 2.6 Slice 2: sd-progress", () => {
  it("value=0.5, theme=primary이면 50% 텍스트와 50% 너비 바가 표시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdProgressHalfTest] })
      .createComponent(SdProgressHalfTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-progress") as HTMLElement;
    const content = host.querySelector("._content") as HTMLElement;
    const bar = host.querySelector("._progress") as HTMLElement;

    expect(content.textContent.trim()).toContain("50%");
    expect(bar.style.width).toBe("50%");
    expect(host.getAttribute("data-sd-theme")).toBe("primary");
  });

  it("value=0이면 0% 텍스트와 0% 너비 바가 표시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdProgressZeroTest] })
      .createComponent(SdProgressZeroTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-progress") as HTMLElement;
    const content = host.querySelector("._content") as HTMLElement;
    const bar = host.querySelector("._progress") as HTMLElement;

    expect(content.textContent.trim()).toContain("0%");
    expect(bar.style.width).toBe("0%");
  });

  it("value=1이면 100% 텍스트와 100% 너비 바가 표시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdProgressFullTest] })
      .createComponent(SdProgressFullTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-progress") as HTMLElement;
    const content = host.querySelector("._content") as HTMLElement;
    const bar = host.querySelector("._progress") as HTMLElement;

    expect(content.textContent.trim()).toContain("100%");
    expect(bar.style.width).toBe("100%");
  });

});
