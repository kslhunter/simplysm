import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdTiptapEditorDefaultTest } from "./sd-tiptap-editor-test.fixture";

describe("Feature 5.4 Slice 2: Toolbar + 서식 편집", () => {
  // Scenario: 인라인 서식 적용
  it("텍스트를 선택하고 bold 버튼을 클릭하면 텍스트가 굵게 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorDefaultTest] })
      .createComponent(SdTiptapEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorCtrl = fixture.componentInstance.editorCtrl()!;
    const editor = editorCtrl.editor!;

    // Insert text and select "Hello" (positions 1-6 in ProseMirror doc)
    editor.commands.setContent("<p>Hello World</p>");
    editor.commands.setTextSelection({ from: 1, to: 6 });

    // Click bold button
    const boldBtn = fixture.nativeElement.querySelector(
      "sd-tiptap-editor ._toolbar button[data-cmd='bold']",
    ) as HTMLButtonElement;
    expect(boldBtn).toBeTruthy();
    boldBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // "Hello" should be bold
    expect(fixture.componentInstance.value()).toContain("<strong>Hello</strong>");
  });

  // Scenario: 블록 서식 적용
  it("커서가 있는 줄에 heading 1을 적용하면 h1 태그로 변환된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorDefaultTest] })
      .createComponent(SdTiptapEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorCtrl = fixture.componentInstance.editorCtrl()!;
    const editor = editorCtrl.editor!;

    editor.commands.setContent("<p>Title Text</p>");
    // Place cursor in the paragraph
    editor.commands.setTextSelection(1);

    // Click h1 button
    const h1Btn = fixture.nativeElement.querySelector(
      "sd-tiptap-editor ._toolbar button[data-cmd='h1']",
    ) as HTMLButtonElement;
    expect(h1Btn).toBeTruthy();
    h1Btn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toContain("<h1>");
  });

  // Scenario: 서식 제거
  it("굵게 표시된 텍스트를 선택하고 clean 버튼을 클릭하면 서식이 제거된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorDefaultTest] })
      .createComponent(SdTiptapEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorCtrl = fixture.componentInstance.editorCtrl()!;
    const editor = editorCtrl.editor!;

    editor.commands.setContent("<p><strong>Bold Text</strong></p>");
    // Select all the bold text
    editor.commands.setTextSelection({ from: 1, to: 10 });

    // Click clean button
    const cleanBtn = fixture.nativeElement.querySelector(
      "sd-tiptap-editor ._toolbar button[data-cmd='clean']",
    ) as HTMLButtonElement;
    expect(cleanBtn).toBeTruthy();
    cleanBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).not.toContain("<strong>");
    expect(fixture.componentInstance.value()).toContain("Bold Text");
  });
});
