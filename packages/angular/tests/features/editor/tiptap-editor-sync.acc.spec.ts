import { describe, it, expect, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdTiptapEditorDefaultTest,
  SdTiptapEditorCustomExtensionsTest,
  SdTiptapEditorInitialValueTest,
} from "./sd-tiptap-editor-test.fixture";
import StarterKit from "@tiptap/starter-kit";

describe("Feature 3.1 Slice 1: 에디터 입력 시 불필요한 setContent 호출이 발생하지 않는다", () => {
  it("사용자 타이핑 후 getHTML 결과가 달라져도 effect에서 setContent가 호출되지 않는다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdTiptapEditorDefaultTest],
    }).createComponent(SdTiptapEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorCtrl = fixture.componentInstance.editorCtrl()!;
    const editor = editorCtrl.editor()!;

    // Insert content → onUpdate fires synchronously → value.set
    editor.commands.insertContent("Hello");

    // Spy on setContent AFTER insertion, mock getHTML to return different HTML
    const setContentSpy = vi.spyOn(editor.commands, "setContent");
    vi.spyOn(editor, "getHTML").mockReturnValue("<p>Hello </p>");

    // Flush effects
    fixture.detectChanges();
    TestBed.flushEffects();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toContain("Hello");
    // With lastEditorHtml: val matches stored html → skip → NOT called
    expect(setContentSpy).not.toHaveBeenCalled();
  });

  it("외부 value 변경 시 에디터에 반영된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdTiptapEditorInitialValueTest],
    }).createComponent(SdTiptapEditorInitialValueTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorEl = fixture.nativeElement.querySelector(".tiptap") as HTMLElement;

    fixture.componentInstance.value.set("<p>Updated</p>");
    fixture.detectChanges();
    TestBed.flushEffects();
    await fixture.whenStable();

    expect(editorEl.textContent).toContain("Updated");
  });

  it("에디터 재생성 시 이전 동기화 상태가 초기화되고 새 에디터가 현재 value로 초기화된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdTiptapEditorCustomExtensionsTest],
    }).createComponent(SdTiptapEditorCustomExtensionsTest);

    fixture.componentInstance.customExtensions.set([StarterKit]);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorCtrl = fixture.componentInstance.editorCtrl()!;
    const oldEditor = editorCtrl.editor()!;
    oldEditor.commands.insertContent("Hello");
    fixture.detectChanges();
    TestBed.flushEffects();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toContain("Hello");

    // Change extensions → triggers editor recreation
    fixture.componentInstance.customExtensions.set([StarterKit]);
    fixture.detectChanges();
    TestBed.flushEffects();
    await fixture.whenStable();

    const newEditor = editorCtrl.editor()!;
    expect(newEditor).not.toBe(oldEditor);
    expect(newEditor.getHTML()).toContain("Hello");
  });
});

describe("Feature 3.1 Slice 2: colorPickerMode가 signal 기반 반응형이다", () => {
  it("toggleColorPicker('text') 호출 시 colorPickerMode signal이 'text'로 변경되고 피커가 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdTiptapEditorDefaultTest],
    }).createComponent(SdTiptapEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorCtrl = fixture.componentInstance.editorCtrl()!;

    // colorPickerMode should be a signal (callable)
    const mode = editorCtrl.colorPickerMode;
    expect(mode()).toBeUndefined();

    editorCtrl.toggleColorPicker("text");
    expect(mode()).toBe("text");

    fixture.detectChanges();
    const picker = fixture.nativeElement.querySelector("._color-picker");
    expect(picker).toBeTruthy();
  });

  it("같은 모드로 toggleColorPicker 재호출 시 피커가 숨겨진다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdTiptapEditorDefaultTest],
    }).createComponent(SdTiptapEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorCtrl = fixture.componentInstance.editorCtrl()!;
    const mode = editorCtrl.colorPickerMode;

    editorCtrl.toggleColorPicker("text");
    expect(mode()).toBe("text");

    editorCtrl.toggleColorPicker("text");
    expect(mode()).toBeUndefined();

    fixture.detectChanges();
    const picker = fixture.nativeElement.querySelector("._color-picker");
    expect(picker).toBeFalsy();
  });

  it("applyColor 후 colorPickerMode가 undefined로 변경되고 피커가 닫힌다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdTiptapEditorDefaultTest],
    }).createComponent(SdTiptapEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorCtrl = fixture.componentInstance.editorCtrl()!;
    const mode = editorCtrl.colorPickerMode;

    editorCtrl.toggleColorPicker("bg");
    expect(mode()).toBe("bg");

    editorCtrl.applyColor("#ff0000");
    expect(mode()).toBeUndefined();

    fixture.detectChanges();
    const picker = fixture.nativeElement.querySelector("._color-picker");
    expect(picker).toBeFalsy();
  });
});
