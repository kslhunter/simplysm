import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdTiptapEditorDefaultTest,
  SdTiptapEditorDisabledTest,
  SdTiptapEditorInitialValueTest,
} from "./sd-tiptap-editor-test.fixture";

describe("Feature 5.4 Slice 1 Unit: TipTap 에디터 라이프사이클", () => {
  it("컴포넌트가 렌더링되면 contenteditable 요소가 생성된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorDefaultTest] })
      .createComponent(SdTiptapEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorEl = fixture.nativeElement.querySelector(".tiptap") as HTMLElement;
    expect(editorEl).toBeTruthy();
    expect(editorEl.getAttribute("contenteditable")).toBe("true");
  });

  it("초기 value가 있으면 에디터에 해당 내용이 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorInitialValueTest] })
      .createComponent(SdTiptapEditorInitialValueTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorEl = fixture.nativeElement.querySelector(".tiptap") as HTMLElement;
    expect(editorEl).toBeTruthy();
    expect(editorEl.innerHTML).toContain("Hello");
  });

  it("빈 에디터의 value는 undefined이다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorDefaultTest] })
      .createComponent(SdTiptapEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBeUndefined();
  });

  it("외부에서 value를 변경하면 에디터 내용이 갱신된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorInitialValueTest] })
      .createComponent(SdTiptapEditorInitialValueTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorEl = fixture.nativeElement.querySelector(".tiptap") as HTMLElement;
    expect(editorEl.textContent).toContain("Hello");

    fixture.componentInstance.value.set("<p>Updated</p>");
    fixture.detectChanges();
    TestBed.flushEffects();
    await fixture.whenStable();

    expect(editorEl.textContent).toContain("Updated");
  });
});

// region FIX-2 Slice 2: TipTap editor 수정 (LOGIC-011, LOGIC-019)

describe("FIX-2 Slice 2: DEFAULT_EXTENSIONS에 Underline 포함 (LOGIC-019)", () => {
  it("에디터가 초기화된 후 underline 확장이 활성화되어 있다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorDefaultTest] })
      .createComponent(SdTiptapEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorCtrl = fixture.componentInstance.editorCtrl()!;
    const editor = editorCtrl.editor()!;

    // Underline extension should be registered
    const underlineExt = editor.extensionManager.extensions.find(
      (ext) => ext.name === "underline",
    );
    expect(underlineExt).toBeTruthy();
  });

  it("execCmd('underline')이 에러 없이 실행된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorDefaultTest] })
      .createComponent(SdTiptapEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorCtrl = fixture.componentInstance.editorCtrl()!;
    const editor = editorCtrl.editor()!;

    editor.commands.setContent("<p>Hello</p>");
    editor.commands.setTextSelection({ from: 1, to: 6 });

    // Should not throw
    expect(() => editorCtrl.execCmd("underline")).not.toThrow();
  });
});

describe("FIX-2 Slice 2: editor DOM 타이밍 (LOGIC-011)", () => {
  it("editor-container가 렌더된 후 editor가 생성된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorDefaultTest] })
      .createComponent(SdTiptapEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const container = fixture.nativeElement.querySelector("._editor-container") as HTMLElement;
    expect(container).toBeTruthy();

    const editorCtrl = fixture.componentInstance.editorCtrl()!;
    expect(editorCtrl.editor()).toBeTruthy();

    // The tiptap element should be inside the container
    const tiptapEl = container.querySelector(".tiptap");
    expect(tiptapEl).toBeTruthy();
  });
});

// endregion

// region Feature 1.2a Slice 2: Signal 변환 (LOGIC-012, DESIGN-005)

describe("Feature 1.2a Slice 2: editor signal 변환 (LOGIC-012)", () => {
  it("editor()가 Editor 인스턴스를 반환한다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorDefaultTest] })
      .createComponent(SdTiptapEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorCtrl = fixture.componentInstance.editorCtrl()!;
    // editor가 signal이면 editor()로 접근 가능
    expect(editorCtrl.editor()).toBeTruthy();
    expect(editorCtrl.editor()!.isEditable).toBe(true);
  });

  it("disabled=true로 초기화 후 editor 생성 시 editable이 false이다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorDisabledTest] })
      .createComponent(SdTiptapEditorDisabledTest);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorCtrl = fixture.componentInstance.editorCtrl()!;
    expect(editorCtrl.editor()).toBeTruthy();
    expect(editorCtrl.editor()!.isEditable).toBe(false);
  });
});

describe("Feature 1.2a Slice 2: activeStates signal 변환 (DESIGN-005)", () => {
  it("activeStates()가 에디터 상태를 반영한다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorDefaultTest] })
      .createComponent(SdTiptapEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorCtrl = fixture.componentInstance.editorCtrl()!;
    const editor = editorCtrl.editor()!;

    editor.commands.setContent("<p>Hello</p>");
    editor.commands.setTextSelection({ from: 1, to: 6 });
    editor.commands.toggleBold();

    // activeStates가 signal이면 activeStates()로 접근 가능
    expect(editorCtrl.activeStates().bold).toBe(true);
  });

  it("activeColor()가 텍스트 색상을 반영한다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorDefaultTest] })
      .createComponent(SdTiptapEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorCtrl = fixture.componentInstance.editorCtrl()!;
    const editor = editorCtrl.editor()!;

    editor.commands.setContent("<p>Hello</p>");
    editor.commands.setTextSelection({ from: 1, to: 6 });
    editor.commands.setColor("#ff0000");

    expect(editorCtrl.activeColor()).toBe("#ff0000");
  });
});

// endregion
