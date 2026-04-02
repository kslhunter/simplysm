import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdTiptapEditorDefaultTest,
  SdTiptapEditorInitialValueTest,
} from "./sd-tiptap-editor-test.fixture";

describe("Feature 3.1 Slice 1 Unit: lastEditorHtml 동기화 가드", () => {
  it("에디터 입력 후 effect가 에디터 내용을 재설정하지 않는다 — 커서 위치 보존", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdTiptapEditorDefaultTest],
    }).createComponent(SdTiptapEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorCtrl = fixture.componentInstance.editorCtrl()!;
    const editor = editorCtrl.editor()!;

    // Set content and position cursor in the middle
    editor.commands.setContent("<p>Hello World</p>");
    fixture.detectChanges();
    TestBed.flushEffects();
    await fixture.whenStable();

    editor.commands.setTextSelection(6); // After "Hello"

    // Insert at cursor → onUpdate → value.set
    editor.commands.insertContent("!");
    const cursorAfterInsert = editor.state.selection.from;

    // Flush effects — should NOT reset cursor
    fixture.detectChanges();
    TestBed.flushEffects();
    await fixture.whenStable();

    expect(editor.state.selection.from).toBe(cursorAfterInsert);
    expect(fixture.componentInstance.value()).toContain("Hello!");
  });

  it("에디터 value를 undefined로 설정 후 다시 값 설정하면 에디터에 반영된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdTiptapEditorInitialValueTest],
    }).createComponent(SdTiptapEditorInitialValueTest);
    fixture.detectChanges();
    await fixture.whenStable();

    // Clear value
    fixture.componentInstance.value.set(undefined);
    fixture.detectChanges();
    TestBed.flushEffects();
    await fixture.whenStable();

    const editorEl = fixture.nativeElement.querySelector(".tiptap") as HTMLElement;
    expect(editorEl.textContent.trim()).toBe("");

    // Re-set value
    fixture.componentInstance.value.set("<p>Restored</p>");
    fixture.detectChanges();
    TestBed.flushEffects();
    await fixture.whenStable();

    expect(editorEl.textContent).toContain("Restored");
  });
});
