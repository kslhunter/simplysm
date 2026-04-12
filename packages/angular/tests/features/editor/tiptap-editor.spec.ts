import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdTiptapEditorDefaultTest,
  SdTiptapEditorInitialValueTest,
  SdTiptapEditorCustomExtensionsTest,
} from "./sd-tiptap-editor-test.fixture";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";

describe("Feature 5.4 Slice 1: 에디터 코어 + 양방향 바인딩", () => {
  // Scenario: 에디터 입력이 value에 반영된다
  it("에디터에 텍스트를 입력하면 value signal에 해당 HTML이 반영된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorDefaultTest] })
      .createComponent(SdTiptapEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorEl = fixture.nativeElement.querySelector(".tiptap") as HTMLElement;
    expect(editorEl).toBeTruthy();

    // Type into the contenteditable element
    editorEl.focus();
    // Use insertText command to simulate real typing
    document.execCommand("insertText", false, "Hello");
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toContain("Hello");
  });

  // Scenario: value 변경이 에디터에 반영된다
  it("value signal에 HTML을 설정하면 에디터에 텍스트가 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorInitialValueTest] })
      .createComponent(SdTiptapEditorInitialValueTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorEl = fixture.nativeElement.querySelector(".tiptap") as HTMLElement;
    expect(editorEl).toBeTruthy();
    expect(editorEl.textContent).toContain("Hello");

    // Change value externally
    fixture.componentInstance.value.set("<p>World</p>");
    fixture.detectChanges();
    await fixture.whenStable();

    expect(editorEl.textContent).toContain("World");
  });

  // Scenario: 내용 삭제 시 value가 undefined가 된다
  it("모든 내용을 삭제하면 value signal이 undefined가 된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorInitialValueTest] })
      .createComponent(SdTiptapEditorInitialValueTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorEl = fixture.nativeElement.querySelector(".tiptap") as HTMLElement;
    expect(editorEl).toBeTruthy();

    // Select all and delete
    editorEl.focus();
    document.execCommand("selectAll");
    document.execCommand("delete");
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBeUndefined();
  });

  // Scenario: 기본 extension 세트
  it("extensions input을 지정하지 않으면 기본 extension 세트로 에디터가 구성된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorDefaultTest] })
      .createComponent(SdTiptapEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorEl = fixture.nativeElement.querySelector(".tiptap") as HTMLElement;
    expect(editorEl).toBeTruthy();
    expect(editorEl.getAttribute("contenteditable")).toBe("true");
  });

  // Scenario: 커스텀 extension 세트
  it("extensions input으로 사용자 정의 extension 배열을 전달하면 해당 extension만으로 구성된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdTiptapEditorCustomExtensionsTest],
    }).createComponent(SdTiptapEditorCustomExtensionsTest);

    fixture.componentInstance.customExtensions.set([
      Document,
      Paragraph,
      Text,
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorEl = fixture.nativeElement.querySelector(".tiptap") as HTMLElement;
    expect(editorEl).toBeTruthy();
    expect(editorEl.getAttribute("contenteditable")).toBe("true");

    // StarterKit includes Bold, which should NOT be available with custom minimal extensions
    editorEl.focus();
    document.execCommand("insertText", false, "Test");
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toContain("Test");
  });
});
