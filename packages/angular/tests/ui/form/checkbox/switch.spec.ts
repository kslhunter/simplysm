import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdSwitchDefaultTest,
  SdSwitchOnTest,
  SdSwitchDisabledTest,
  SdSwitchPropagationTest,
} from "./sd-switch-test.fixture";

describe("Feature 2.5 Slice 2: sd-switch", () => {
  it("스위치 클릭으로 켜기 — value가 false→true로 변경되고 data-sd-on=true가 된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdSwitchDefaultTest] })
      .createComponent(SdSwitchDefaultTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-switch") as HTMLElement;
    expect(host.getAttribute("data-sd-on")).toBe("false");

    host.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe(true);
    expect(host.getAttribute("data-sd-on")).toBe("true");
  });

  it("켜진 스위치 클릭으로 끄기 — value가 true→false로 변경된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdSwitchOnTest] })
      .createComponent(SdSwitchOnTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-switch") as HTMLElement;
    expect(host.getAttribute("data-sd-on")).toBe("true");

    host.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe(false);
    expect(host.getAttribute("data-sd-on")).toBe("false");
  });

  it("Space 키로 스위치 토글 — value가 변경된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdSwitchDefaultTest] })
      .createComponent(SdSwitchDefaultTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-switch") as HTMLElement;
    host.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe(true);
  });

  it("클릭 이벤트가 상위 요소로 전파되지 않는다 (stopPropagation)", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdSwitchPropagationTest] })
      .createComponent(SdSwitchPropagationTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-switch") as HTMLElement;
    host.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe(true);
    expect(fixture.componentInstance.parentClicked).toBe(false);
  });

  it("disabled 스위치 클릭 — value가 변경되지 않는다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdSwitchDisabledTest] })
      .createComponent(SdSwitchDisabledTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-switch") as HTMLElement;
    expect(host.getAttribute("data-sd-disabled")).toBe("true");

    host.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe(false);
  });

  it("tabindex=0이 설정되어 포커스 가능하다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdSwitchDefaultTest] })
      .createComponent(SdSwitchDefaultTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-switch") as HTMLElement;
    expect(host.getAttribute("tabindex")).toBe("0");
  });

  it("슬라이딩 인디케이터 구조 — 외부 div > 내부 div 구조이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdSwitchDefaultTest] })
      .createComponent(SdSwitchDefaultTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-switch") as HTMLElement;
    const outerDiv = host.querySelector(":scope > div") as HTMLElement;
    expect(outerDiv).toBeTruthy();
    const innerDiv = outerDiv.querySelector(":scope > div") as HTMLElement;
    expect(innerDiv).toBeTruthy();
  });
});

// region FIX-2 Slice 4: switch Space 키 preventDefault (CONSIST-005)

describe("FIX-2 Slice 4: switch Space 키 preventDefault (CONSIST-005)", () => {
  it("Space 키 시 event.preventDefault()가 호출된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdSwitchDefaultTest] })
      .createComponent(SdSwitchDefaultTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-switch") as HTMLElement;
    const event = new KeyboardEvent("keydown", { key: " ", cancelable: true });
    host.dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.value()).toBe(true);
  });
});

// endregion
