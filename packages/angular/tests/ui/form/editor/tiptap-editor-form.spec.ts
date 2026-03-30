import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdTiptapEditorDisabledTest,
  SdTiptapEditorReadonlyTest,
  SdTiptapEditorPlaceholderTest,
  SdTiptapEditorRequiredTest,
  SdTiptapEditorValidatorTest,
} from "./sd-tiptap-editor-test.fixture";

describe("Feature 5.4 Slice 4: 폼 통합", () => {
  // Scenario: disabled 활성화
  it("disabled를 true로 설정하면 에디터가 편집 불가 상태가 되고 toolbar가 숨겨진다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorDisabledTest] })
      .createComponent(SdTiptapEditorDisabledTest);
    fixture.detectChanges();
    await fixture.whenStable();

    // Initially editable
    const editorEl = fixture.nativeElement.querySelector(".tiptap") as HTMLElement;
    expect(editorEl.getAttribute("contenteditable")).toBe("true");
    expect(fixture.nativeElement.querySelector("._toolbar")).toBeTruthy();

    // Disable
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(editorEl.getAttribute("contenteditable")).toBe("false");
    expect(fixture.nativeElement.querySelector("._toolbar")).toBeFalsy();
    expect(fixture.nativeElement.querySelector("sd-tiptap-editor")
      .getAttribute("data-sd-disabled")).toBe("true");
  });

  // Scenario: disabled 해제
  it("disabled를 false로 되돌리면 에디터가 편집 가능해지고 toolbar가 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorDisabledTest] })
      .createComponent(SdTiptapEditorDisabledTest);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.disabled.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorEl = fixture.nativeElement.querySelector(".tiptap") as HTMLElement;
    expect(editorEl.getAttribute("contenteditable")).toBe("true");
    expect(fixture.nativeElement.querySelector("._toolbar")).toBeTruthy();
  });

  // Scenario: readonly 활성화
  it("readonly를 true로 설정하면 에디터가 편집 불가 상태가 된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorReadonlyTest] })
      .createComponent(SdTiptapEditorReadonlyTest);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.readonly.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorEl = fixture.nativeElement.querySelector(".tiptap") as HTMLElement;
    expect(editorEl.getAttribute("contenteditable")).toBe("false");
    expect(fixture.nativeElement.querySelector("sd-tiptap-editor")
      .getAttribute("data-sd-readonly")).toBe("true");
  });

  // Scenario: placeholder 표시
  it("에디터가 비어있으면 placeholder 텍스트가 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorPlaceholderTest] })
      .createComponent(SdTiptapEditorPlaceholderTest);
    fixture.detectChanges();
    await fixture.whenStable();

    // Placeholder extension adds data-placeholder attribute and is-editor-empty class
    const editorEl = fixture.nativeElement.querySelector(".tiptap") as HTMLElement;
    const placeholderNode = editorEl.querySelector(".is-editor-empty, .is-empty, [data-placeholder]");
    expect(placeholderNode).toBeTruthy();
  });

  // Scenario: 필수 값 누락
  it("required가 true이고 에디터 내용이 비어있으면 유효성 에러가 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorRequiredTest] })
      .createComponent(SdTiptapEditorRequiredTest);
    fixture.detectChanges();
    await fixture.whenStable();

    // setupInvalid creates a hidden input with custom validity
    const hiddenInput = fixture.nativeElement.querySelector("sd-tiptap-editor input.sd-invalid-input") as HTMLInputElement;
    expect(hiddenInput).toBeTruthy();
    expect(hiddenInput.validationMessage).toContain("값을 입력하세요");
  });

  // Scenario: 커스텀 유효성 검증
  it("validatorFn이 에러 메시지를 반환하면 유효성 에러가 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorValidatorTest] })
      .createComponent(SdTiptapEditorValidatorTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const hiddenInput = fixture.nativeElement.querySelector("sd-tiptap-editor input.sd-invalid-input") as HTMLInputElement;
    expect(hiddenInput).toBeTruthy();
    expect(hiddenInput.validationMessage).toContain("내용이 너무 짧습니다");
  });
});
