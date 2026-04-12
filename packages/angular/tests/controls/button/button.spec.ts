import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdButtonDefaultTest,
  SdButtonDisabledTest,
  SdButtonCustomTest,
  SdAnchorDefaultTest,
  SdAnchorDisabledTest,
  SdAdditionalButtonDefaultTest,
  SdAdditionalButtonSizeTest,
  SdAdditionalButtonInsetTest,
} from "./button-test.fixture";

describe("Feature 2.3 Slice 1: sd-button", () => {
  it("기본 버튼에 inner button이 있고 type=button, tabindex=0이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdButtonDefaultTest] })
      .createComponent(SdButtonDefaultTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-button") as HTMLElement;
    const btn = host.querySelector("button") as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.type).toBe("button");
    expect(btn.tabIndex).toBe(0);
    expect(btn.disabled).toBe(false);
    expect(host.getAttribute("data-sd-disabled")).toBe("false");
    expect(host.getAttribute("data-sd-theme")).toBeNull();
    expect(host.getAttribute("data-sd-size")).toBeNull();
  });

  it("disabled이면 host에 data-sd-disabled=true이고 inner button이 disabled이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdButtonDisabledTest] })
      .createComponent(SdButtonDisabledTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-button") as HTMLElement;
    const btn = host.querySelector("button") as HTMLButtonElement;
    expect(host.getAttribute("data-sd-disabled")).toBe("true");
    expect(btn.disabled).toBe(true);
  });

  it("buttonStyle과 buttonClass가 inner button에 적용된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdButtonCustomTest] })
      .createComponent(SdButtonCustomTest);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector("sd-button > button") as HTMLButtonElement;
    expect(btn.style.width).toBe("200px");
    expect(btn.classList.contains("my-class")).toBe(true);
  });

  it("기본 버튼의 inner button이 클릭 가능한 상태이다 (리플 전제조건)", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdButtonDefaultTest] })
      .createComponent(SdButtonDefaultTest);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector("sd-button > button") as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.disabled).toBe(false);
  });
});

describe("Feature 2.3 Slice 2: sd-anchor", () => {
  it("disabled이면 data-sd-disabled=true이고 tabindex가 없다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdAnchorDisabledTest] })
      .createComponent(SdAnchorDisabledTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-anchor") as HTMLElement;
    expect(host.getAttribute("data-sd-disabled")).toBe("true");
    expect(host.getAttribute("tabindex")).toBeNull();
  });

  it("ng-content로 텍스트가 표시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdAnchorDefaultTest] })
      .createComponent(SdAnchorDefaultTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-anchor") as HTMLElement;
    expect(host.textContent.trim()).toBe("Link");
  });
});

describe("Feature 2.3 Slice 3: sd-additional-button", () => {
  it("기본 레이아웃에 ._content와 ._button 영역이 있다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdAdditionalButtonDefaultTest] })
      .createComponent(SdAdditionalButtonDefaultTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-additional-button") as HTMLElement;
    const content = host.querySelector("._content") as HTMLElement;
    const button = host.querySelector("._button") as HTMLElement;
    expect(content).toBeTruthy();
    expect(button).toBeTruthy();
    expect(content.textContent).toContain("Content");
  });

  it("sd-anchor와 sd-button이 ._button 영역에 슬롯된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdAdditionalButtonDefaultTest] })
      .createComponent(SdAdditionalButtonDefaultTest);
    fixture.detectChanges();

    const buttonArea = fixture.nativeElement.querySelector(
      "sd-additional-button > ._button",
    ) as HTMLElement;
    expect(buttonArea.querySelector("sd-anchor")).toBeTruthy();
    expect(buttonArea.querySelector("sd-button")).toBeTruthy();
  });

  it("size=sm이면 host에 data-sd-size=sm이 적용된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdAdditionalButtonSizeTest] })
      .createComponent(SdAdditionalButtonSizeTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-additional-button") as HTMLElement;
    expect(host.getAttribute("data-sd-size")).toBe("sm");
  });

  it("inset이면 host에 data-sd-inset=true가 적용된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdAdditionalButtonInsetTest] })
      .createComponent(SdAdditionalButtonInsetTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-additional-button") as HTMLElement;
    expect(host.getAttribute("data-sd-inset")).toBe("true");
  });
});
