import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { DateOnly } from "@simplysm/core-common";
import {
  SdRangeNumberTest,
  SdRangeDateTest,
  SdRangeDisabledTest,
  SdRangeRequiredTest,
} from "./sd-range-test.fixture";

// region Helper

function getActualInputs(host: HTMLElement): HTMLInputElement[] {
  return Array.from(
    host.querySelectorAll("sd-textfield input:not(.sd-invalid-input)"),
  );
}

// endregion

// region Unit Tests: SdRange structure

describe("SdRange unit tests", () => {
  it("두 개의 sd-textfield와 ~ 구분자가 렌더링된다", () => {
    TestBed.configureTestingModule({ imports: [SdRangeNumberTest] });
    const fixture = TestBed.createComponent(SdRangeNumberTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-range") as HTMLElement;
    const textfields = host.querySelectorAll("sd-textfield");
    expect(textfields.length).toBe(2);

    const divs = host.querySelectorAll(":scope > div");
    const separator = Array.from(divs).find((d) => d.textContent.trim() === "~");
    expect(separator).toBeTruthy();
  });

  it("to textfield에 min이 from 값으로 바인딩되어 validation에 사용된다", () => {
    TestBed.configureTestingModule({ imports: [SdRangeNumberTest] });
    const fixture = TestBed.createComponent(SdRangeNumberTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    fixture.componentInstance.from.set(10);
    fixture.detectChanges();
    TestBed.flushEffects();

    // to에 from보다 작은 값을 입력하면 validation 에러가 발생해야 한다
    const host = fixture.nativeElement.querySelector("sd-range") as HTMLElement;
    const inputs = getActualInputs(host);
    inputs[1].value = "5";
    inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    const textfields = host.querySelectorAll("sd-textfield");
    const toTextfield = textfields[1] as HTMLElement;
    const invalidInputEl = toTextfield.querySelector(
      "input.sd-invalid-input",
    ) as HTMLInputElement;
    expect(invalidInputEl).toBeTruthy();
    expect(invalidInputEl.checkValidity()).toBe(false);
  });
});

// endregion

// region Acceptance Tests: Range Scenarios

describe("Feature 5.2 Slice 1: SdRange", () => {
  it("Scenario: from과 to로 숫자 범위 입력", () => {
    TestBed.configureTestingModule({ imports: [SdRangeNumberTest] });
    const fixture = TestBed.createComponent(SdRangeNumberTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-range") as HTMLElement;
    const inputs = getActualInputs(host);

    inputs[0].value = "10";
    inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    inputs[1].value = "20";
    inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.from()).toBe(10);
    expect(fixture.componentInstance.to()).toBe(20);

    // "~" 구분자 표시 확인
    const divs = host.querySelectorAll(":scope > div");
    const separator = Array.from(divs).find((d) => d.textContent.trim() === "~");
    expect(separator).toBeTruthy();
  });

  it("Scenario: to의 최솟값이 from으로 제한된다", () => {
    TestBed.configureTestingModule({ imports: [SdRangeNumberTest] });
    const fixture = TestBed.createComponent(SdRangeNumberTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    fixture.componentInstance.from.set(10);
    fixture.detectChanges();
    TestBed.flushEffects();

    // to에 from보다 작은 값을 입력하면 validation 에러가 발생해야 한다
    const host = fixture.nativeElement.querySelector("sd-range") as HTMLElement;
    const inputs = getActualInputs(host);
    inputs[1].value = "5";
    inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    const textfields = host.querySelectorAll("sd-textfield");
    const toTextfield = textfields[1] as HTMLElement;
    const invalidInputEl = toTextfield.querySelector(
      "input.sd-invalid-input",
    ) as HTMLInputElement;
    expect(invalidInputEl.checkValidity()).toBe(false);
  });

  it("Scenario: 날짜 타입으로 범위 입력", () => {
    TestBed.configureTestingModule({ imports: [SdRangeDateTest] });
    const fixture = TestBed.createComponent(SdRangeDateTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-range") as HTMLElement;
    const inputs = getActualInputs(host);

    inputs[0].value = "2024-01-01";
    inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    inputs[1].value = "2024-12-31";
    inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.from()).toEqual(new DateOnly(2024, 1, 1));
    expect(fixture.componentInstance.to()).toEqual(new DateOnly(2024, 12, 31));
  });

  it("Scenario: disabled이면 양쪽 입력 비활성", () => {
    TestBed.configureTestingModule({ imports: [SdRangeDisabledTest] });
    const fixture = TestBed.createComponent(SdRangeDisabledTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-range") as HTMLElement;
    const textfields = host.querySelectorAll("sd-textfield");
    expect(textfields[0].getAttribute("data-sd-disabled")).toBe("true");
    expect(textfields[1].getAttribute("data-sd-disabled")).toBe("true");
  });

  it("Scenario: required이면 양쪽 입력 필수", () => {
    TestBed.configureTestingModule({ imports: [SdRangeRequiredTest] });
    const fixture = TestBed.createComponent(SdRangeRequiredTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-range") as HTMLElement;
    // Both textfields should have sd-invalid-input with invalid validity
    const invalidInputs = host.querySelectorAll(
      "input.sd-invalid-input",
    );
    expect(invalidInputs.length).toBe(2);
    expect((invalidInputs[0] as HTMLInputElement).checkValidity()).toBe(false);
    expect((invalidInputs[1] as HTMLInputElement).checkValidity()).toBe(false);
  });
});

// endregion
