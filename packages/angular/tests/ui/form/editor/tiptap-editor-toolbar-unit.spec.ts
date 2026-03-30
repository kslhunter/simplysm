import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdTiptapEditorDefaultTest } from "./sd-tiptap-editor-test.fixture";

describe("Feature 5.4 Slice 2 Unit: Toolbar UI", () => {
  it("bold 버튼 클릭 시 active 상태가 토글된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorDefaultTest] })
      .createComponent(SdTiptapEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorCtrl = fixture.componentInstance.editorCtrl()!;
    const editor = editorCtrl.editor!;

    editor.commands.setContent("<p>Test</p>");
    editor.commands.setTextSelection({ from: 1, to: 5 });

    const boldBtn = fixture.nativeElement.querySelector(
      "sd-tiptap-editor ._toolbar button[data-cmd='bold']",
    ) as HTMLButtonElement;

    // Before bold: not active
    expect(boldBtn.classList.contains("_active")).toBe(false);

    boldBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // After bold: active
    expect(boldBtn.classList.contains("_active")).toBe(true);
  });
});
