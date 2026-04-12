import { describe, it, expect } from "vitest";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { useTiptapToolbar, DEFAULT_ACTIVE_STATES } from "../../../src/features/editor/useTiptapToolbar";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";

function createEditor(content = "<p>Hello World</p>"): Editor {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return new Editor({
    element: container,
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content,
  });
}

describe("useTiptapToolbar", () => {
  it("execCmd toggles bold on editor", () => {
    const ed = createEditor();
    const editorSignal = signal<Editor | undefined>(ed);

    // Must run in injection context for signal creation
    let toolbar: ReturnType<typeof useTiptapToolbar>;
    TestBed.runInInjectionContext(() => {
      toolbar = useTiptapToolbar({ editor: editorSignal });
    });

    ed.commands.setTextSelection({ from: 1, to: 6 });
    toolbar!.execCmd("bold");

    expect(ed.getHTML()).toContain("<strong>Hello</strong>");

    ed.destroy();
  });

  it("refreshActiveStates updates signals from editor state", () => {
    const ed = createEditor("<p><strong>Bold</strong></p>");
    const editorSignal = signal<Editor | undefined>(ed);

    let toolbar: ReturnType<typeof useTiptapToolbar>;
    TestBed.runInInjectionContext(() => {
      toolbar = useTiptapToolbar({ editor: editorSignal });
    });

    // Initial state should be defaults
    expect(toolbar!.activeStates()).toEqual(DEFAULT_ACTIVE_STATES);

    // Place cursor in bold text
    ed.commands.setTextSelection(2);
    toolbar!.refreshActiveStates();

    expect(toolbar!.activeStates().bold).toBe(true);
    expect(toolbar!.activeStates().italic).toBe(false);

    ed.destroy();
  });

  it("toggleColorPicker toggles mode signal", () => {
    const editorSignal = signal<Editor | undefined>(undefined);

    let toolbar: ReturnType<typeof useTiptapToolbar>;
    TestBed.runInInjectionContext(() => {
      toolbar = useTiptapToolbar({ editor: editorSignal });
    });

    expect(toolbar!.colorPickerMode()).toBe(undefined);

    toolbar!.toggleColorPicker("text");
    expect(toolbar!.colorPickerMode()).toBe("text");

    toolbar!.toggleColorPicker("text");
    expect(toolbar!.colorPickerMode()).toBe(undefined);

    toolbar!.toggleColorPicker("bg");
    expect(toolbar!.colorPickerMode()).toBe("bg");
  });

  it("execCmd does nothing when editor is undefined", () => {
    const editorSignal = signal<Editor | undefined>(undefined);

    let toolbar: ReturnType<typeof useTiptapToolbar>;
    TestBed.runInInjectionContext(() => {
      toolbar = useTiptapToolbar({ editor: editorSignal });
    });

    // Should not throw
    expect(() => toolbar!.execCmd("bold")).not.toThrow();
  });
});
