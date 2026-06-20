import { describe, expect, it } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdMarkdownEditorDefaultTest,
  SdMarkdownEditorDisabledTest,
  SdMarkdownEditorInitialValueTest,
  SdMarkdownEditorPlaceholderTest,
  SdMarkdownEditorReadonlyTest,
  SdMarkdownEditorRequiredTest,
  SdMarkdownEditorValidatorTest,
} from "./sd-markdown-editor-test.fixture";

describe("SdMarkdownEditor", () => {
  it("초기 Markdown value가 에디터에 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdMarkdownEditorInitialValueTest] })
      .createComponent(SdMarkdownEditorInitialValueTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorEl = fixture.nativeElement.querySelector(".tiptap") as HTMLElement;
    expect(editorEl).toBeTruthy();
    expect(editorEl.textContent).toContain("Hello");
  });

  it("에디터 내용을 바꾸면 value signal에 Markdown이 반영된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdMarkdownEditorDefaultTest] })
      .createComponent(SdMarkdownEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorCtrl = fixture.componentInstance.editorCtrl()!;
    editorCtrl.editor()!.commands.setContent("# Changed", { contentType: "markdown" });
    fixture.detectChanges();
    TestBed.flushEffects();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toContain("# Changed");
  });

  it("value signal에 Markdown을 설정하면 에디터 내용이 갱신된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdMarkdownEditorInitialValueTest] })
      .createComponent(SdMarkdownEditorInitialValueTest);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.value.set("## World");
    fixture.detectChanges();
    TestBed.flushEffects();
    await fixture.whenStable();

    const editorEl = fixture.nativeElement.querySelector(".tiptap") as HTMLElement;
    expect(editorEl.textContent).toContain("World");
  });

  it("모든 내용을 삭제하면 value signal이 undefined가 된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdMarkdownEditorInitialValueTest] })
      .createComponent(SdMarkdownEditorInitialValueTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorCtrl = fixture.componentInstance.editorCtrl()!;
    editorCtrl.editor()!.commands.clearContent();
    fixture.detectChanges();
    TestBed.flushEffects();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBeUndefined();
  });

  it("외부에서 빈 문자열을 설정하면 value signal이 undefined가 된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdMarkdownEditorInitialValueTest] })
      .createComponent(SdMarkdownEditorInitialValueTest);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.value.set("");
    fixture.detectChanges();
    TestBed.flushEffects();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBeUndefined();
  });

  it("disabled를 true로 설정하면 에디터가 편집 불가 상태가 되고 toolbar가 숨겨진다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdMarkdownEditorDisabledTest] })
      .createComponent(SdMarkdownEditorDisabledTest);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorEl = fixture.nativeElement.querySelector(".tiptap") as HTMLElement;
    expect(editorEl.getAttribute("contenteditable")).toBe("false");
    expect(fixture.nativeElement.querySelector("._toolbar")).toBeFalsy();
    expect(fixture.nativeElement.querySelector("sd-markdown-editor")
      .getAttribute("data-sd-disabled")).toBe("true");
  });

  it("readonly를 true로 설정하면 에디터가 편집 불가 상태가 된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdMarkdownEditorReadonlyTest] })
      .createComponent(SdMarkdownEditorReadonlyTest);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.readonly.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorEl = fixture.nativeElement.querySelector(".tiptap") as HTMLElement;
    expect(editorEl.getAttribute("contenteditable")).toBe("false");
    expect(fixture.nativeElement.querySelector("._toolbar")).toBeFalsy();
    expect(fixture.nativeElement.querySelector("sd-markdown-editor")
      .getAttribute("data-sd-readonly")).toBe("true");
  });

  it("에디터가 비어있으면 placeholder 텍스트가 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdMarkdownEditorPlaceholderTest] })
      .createComponent(SdMarkdownEditorPlaceholderTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorEl = fixture.nativeElement.querySelector(".tiptap") as HTMLElement;
    const placeholderNode = editorEl.querySelector(".is-editor-empty, .is-empty, [data-placeholder]");
    expect(placeholderNode).toBeTruthy();
  });

  it("required가 true이고 에디터 내용이 비어있으면 유효성 에러가 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdMarkdownEditorRequiredTest] })
      .createComponent(SdMarkdownEditorRequiredTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const hiddenInput = fixture.nativeElement.querySelector(
      "sd-markdown-editor input.sd-invalid-input",
    ) as HTMLInputElement;
    expect(hiddenInput).toBeTruthy();
    expect(hiddenInput.validationMessage).toContain("값을 입력하세요");
  });

  it("validatorFn이 에러 메시지를 반환하면 유효성 에러가 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdMarkdownEditorValidatorTest] })
      .createComponent(SdMarkdownEditorValidatorTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const hiddenInput = fixture.nativeElement.querySelector(
      "sd-markdown-editor input.sd-invalid-input",
    ) as HTMLInputElement;
    expect(hiddenInput).toBeTruthy();
    expect(hiddenInput.validationMessage).toContain("내용이 너무 짧습니다");
  });
});
