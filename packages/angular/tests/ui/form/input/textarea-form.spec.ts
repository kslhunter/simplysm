import "@simplysm/core-browser";
import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdTextareaDefaultTest,
  SdTextareaMinRowsTest,
  SdTextareaRequiredTest,
  SdTextareaValidatorTest,
  SdTextareaRequiredValidatorTest,
  SdTextareaDisabledTest,
  SdTextareaReadonlyTest,
  SdTextareaPlaceholderTest,
  SdTextareaDisabledPlaceholderTest,
  SdTextareaDisabledEmptyTest,
} from "./sd-textarea-test.fixture";

// region Feature 2.4.1 Slice 1: sd-textarea

describe("Feature 2.4.1 Slice 1: sd-textarea", () => {
  // Rule: 다중행 텍스트를 양방향 바인딩한다

  it("텍스트 입력 시 value에 반영된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextareaDefaultTest] })
      .createComponent(SdTextareaDefaultTest);
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();

    textarea.value = "hello\nworld";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe("hello\nworld");
  });

  it("value 설정 시 textarea에 표시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextareaDefaultTest] })
      .createComponent(SdTextareaDefaultTest);
    fixture.componentInstance.value.set("abc");
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea.value).toBe("abc");
  });

  it("빈 입력 시 value가 undefined이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextareaDefaultTest] })
      .createComponent(SdTextareaDefaultTest);
    fixture.componentInstance.value.set("existing");
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBeUndefined();
  });

  // Rule: 표시 행 수는 내용 줄 수와 minRows 중 큰 값이다

  it("내용 줄 수(3)가 minRows(1)보다 많으면 rows=3이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextareaMinRowsTest] })
      .createComponent(SdTextareaMinRowsTest);
    fixture.componentInstance.value.set("a\nb\nc");
    fixture.componentInstance.minRows.set(1);
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea.rows).toBe(3);
  });

  it("내용 줄 수(1)가 minRows(5)보다 적으면 rows=5이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextareaMinRowsTest] })
      .createComponent(SdTextareaMinRowsTest);
    fixture.componentInstance.value.set("a");
    fixture.componentInstance.minRows.set(5);
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea.rows).toBe(5);
  });

  it("value가 undefined이고 minRows=1이면 rows=1이다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextareaMinRowsTest] })
      .createComponent(SdTextareaMinRowsTest);
    fixture.componentInstance.minRows.set(1);
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea.rows).toBe(1);
  });

  // Rule: required 및 커스텀 검증을 수행한다

  it("required=true, value=undefined → 유효성 에러가 발생한다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextareaRequiredTest] })
      .createComponent(SdTextareaRequiredTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textarea") as HTMLElement;
    const hiddenInput = host.querySelector("input.sd-invalid-input") as HTMLInputElement;
    expect(hiddenInput).toBeTruthy();
    expect(hiddenInput.validationMessage).toContain("값을 입력하세요.");
  });

  it("required=true, value='abc' → 유효성 에러 없음", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextareaRequiredTest] })
      .createComponent(SdTextareaRequiredTest);
    fixture.componentInstance.value.set("abc");
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textarea") as HTMLElement;
    const hiddenInput = host.querySelector("input.sd-invalid-input") as HTMLInputElement;
    expect(hiddenInput.validity.valid).toBe(true);
  });

  it("커스텀 validatorFn이 에러를 반환하면 유효성 에러가 발생한다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextareaValidatorTest] })
      .createComponent(SdTextareaValidatorTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textarea") as HTMLElement;
    const hiddenInput = host.querySelector("input.sd-invalid-input") as HTMLInputElement;
    expect(hiddenInput.validationMessage).toContain("10자 이상 입력하세요");
  });

  it("required와 validatorFn 에러가 동시 발생하면 \\r\\n으로 구분된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextareaRequiredValidatorTest] })
      .createComponent(SdTextareaRequiredValidatorTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textarea") as HTMLElement;
    const hiddenInput = host.querySelector("input.sd-invalid-input") as HTMLInputElement;
    expect(hiddenInput.validationMessage).toContain("값을 입력하세요.");
    expect(hiddenInput.validationMessage).toContain("커스텀 에러");
  });

  // Rule: disabled/readonly 시 편집 불가 표시 뷰를 보여준다

  it("disabled 상태에서 textarea가 렌더링되지 않고 pre에 값이 표시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextareaDisabledTest] })
      .createComponent(SdTextareaDisabledTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textarea") as HTMLElement;
    expect(host.getAttribute("data-sd-disabled")).toBe("true");
    expect(host.querySelector("textarea")).toBeNull();

    const pre = host.querySelector("._contents pre") as HTMLPreElement;
    expect(pre).toBeTruthy();
    expect(pre.textContent).toContain("내용");
  });

  it("readonly 상태에서 textarea가 렌더링되지 않고 pre에 값이 표시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextareaReadonlyTest] })
      .createComponent(SdTextareaReadonlyTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textarea") as HTMLElement;
    expect(host.getAttribute("data-sd-readonly")).toBe("true");
    expect(host.querySelector("textarea")).toBeNull();

    const pre = host.querySelector("._contents pre") as HTMLPreElement;
    expect(pre).toBeTruthy();
    expect(pre.textContent).toContain("내용");
  });

  it("편집 가능 상태에서 placeholder가 표시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextareaPlaceholderTest] })
      .createComponent(SdTextareaPlaceholderTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textarea") as HTMLElement;
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea.getAttribute("placeholder")).toBe("입력하세요");

    const contents = host.querySelector("._contents") as HTMLElement;
    expect(contents.textContent).toContain("입력하세요");
  });

  it("disabled 상태에서 placeholder가 표시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextareaDisabledPlaceholderTest] })
      .createComponent(SdTextareaDisabledPlaceholderTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textarea") as HTMLElement;
    const contents = host.querySelector("._contents") as HTMLElement;
    expect(contents.textContent).toContain("입력하세요");
  });

  it("disabled 상태에서 값과 placeholder 모두 없으면 공백이 표시된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTextareaDisabledEmptyTest] })
      .createComponent(SdTextareaDisabledEmptyTest);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector("sd-textarea") as HTMLElement;
    const contents = host.querySelector("._contents") as HTMLElement;
    expect(contents.querySelector("span")).toBeTruthy();
    expect(contents.innerHTML).toContain("&nbsp;");
  });

});

// endregion

// region Feature 2.4.1 Slice 2: sd-form

import {
  SdFormValidTest,
  SdFormInvalidTest,
  SdFormRequestSubmitTest,
} from "../sd-form-test.fixture";
import { SdForm } from "../../../../src/ui/form/sd-form";

describe("Feature 2.4.1 Slice 2: sd-form", () => {
  it("유효한 폼 제출 시 submit 이벤트가 방출되고 브라우저 기본 제출이 방지된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdFormValidTest] })
      .createComponent(SdFormValidTest);
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector("form") as HTMLFormElement;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.submitted()).toBe(true);
    expect(fixture.componentInstance.invalidated()).toBe(false);
  });

  it("유효하지 않은 폼 제출 시 invalid 이벤트가 방출된다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdFormInvalidTest] })
      .createComponent(SdFormInvalidTest);
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector("form") as HTMLFormElement;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.submitted()).toBe(false);
    expect(fixture.componentInstance.invalidated()).toBe(true);
  });

  it("requestSubmit()으로 폼 제출을 트리거할 수 있다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdFormRequestSubmitTest] })
      .createComponent(SdFormRequestSubmitTest);
    fixture.detectChanges();

    const sdForm = fixture.debugElement.children[0].componentInstance as SdForm;
    sdForm.requestSubmit();
    fixture.detectChanges();

    expect(fixture.componentInstance.submitted()).toBe(true);
  });

  it("hidden submit button이 존재한다", () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdFormValidTest] })
      .createComponent(SdFormValidTest);
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector("form") as HTMLFormElement;
    const hiddenBtn = form.querySelector("button[type='submit'][hidden]") as HTMLButtonElement;
    expect(hiddenBtn).toBeTruthy();
  });
});

// endregion
