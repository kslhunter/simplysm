import { signal, type Signal, type WritableSignal } from "@angular/core";
import type { Editor } from "@tiptap/core";

export interface TiptapActiveStates {
  h1: boolean;
  h2: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  bulletList: boolean;
  orderedList: boolean;
  blockquote: boolean;
  codeBlock: boolean;
  alignLeft: boolean;
  alignCenter: boolean;
  alignRight: boolean;
  alignJustify: boolean;
}

export const DEFAULT_ACTIVE_STATES: TiptapActiveStates = {
  h1: false,
  h2: false,
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  bulletList: false,
  orderedList: false,
  blockquote: false,
  codeBlock: false,
  alignLeft: false,
  alignCenter: false,
  alignRight: false,
  alignJustify: false,
};

interface TiptapToolbarOptions {
  editor: Signal<Editor | undefined>;
}

export function useTiptapToolbar(opt: TiptapToolbarOptions): {
  activeStates: WritableSignal<TiptapActiveStates>;
  activeColor: WritableSignal<string>;
  activeBgColor: WritableSignal<string>;
  colorPickerMode: WritableSignal<"text" | "bg" | undefined>;
  execCmd: (cmd: string) => void;
  refreshActiveStates: () => void;
  toggleColorPicker: (mode: "text" | "bg") => void;
  applyColor: (color: string | undefined) => void;
} {
  const activeStates: WritableSignal<TiptapActiveStates> = signal(DEFAULT_ACTIVE_STATES);
  const activeColor = signal("");
  const activeBgColor = signal("");
  const colorPickerMode = signal<"text" | "bg" | undefined>(undefined);

  function execCmd(cmd: string): void {
    const ed = opt.editor();
    if (ed == null) return;

    const chain = ed.chain().focus();
    switch (cmd) {
      case "bold":
        chain.toggleBold().run();
        break;
      case "italic":
        chain.toggleItalic().run();
        break;
      case "underline":
        chain.toggleUnderline().run();
        break;
      case "strike":
        chain.toggleStrike().run();
        break;
      case "h1":
        chain.toggleHeading({ level: 1 }).run();
        break;
      case "h2":
        chain.toggleHeading({ level: 2 }).run();
        break;
      case "bulletList":
        chain.toggleBulletList().run();
        break;
      case "orderedList":
        chain.toggleOrderedList().run();
        break;
      case "indent":
        chain.sinkListItem("listItem").run();
        break;
      case "outdent":
        chain.liftListItem("listItem").run();
        break;
      case "blockquote":
        chain.toggleBlockquote().run();
        break;
      case "codeBlock":
        chain.toggleCodeBlock().run();
        break;
      case "alignLeft":
        chain.setTextAlign("left").run();
        break;
      case "alignCenter":
        chain.setTextAlign("center").run();
        break;
      case "alignRight":
        chain.setTextAlign("right").run();
        break;
      case "alignJustify":
        chain.setTextAlign("justify").run();
        break;
      case "clean":
        chain.clearNodes().unsetAllMarks().run();
        break;
    }
  }

  function refreshActiveStates(): void {
    const ed = opt.editor();
    if (ed == null) return;
    activeStates.set({
      bold: ed.isActive("bold"),
      italic: ed.isActive("italic"),
      underline: ed.isActive("underline"),
      strike: ed.isActive("strike"),
      h1: ed.isActive("heading", { level: 1 }),
      h2: ed.isActive("heading", { level: 2 }),
      bulletList: ed.isActive("bulletList"),
      orderedList: ed.isActive("orderedList"),
      blockquote: ed.isActive("blockquote"),
      codeBlock: ed.isActive("codeBlock"),
      alignLeft: ed.isActive({ textAlign: "left" }),
      alignCenter: ed.isActive({ textAlign: "center" }),
      alignRight: ed.isActive({ textAlign: "right" }),
      alignJustify: ed.isActive({ textAlign: "justify" }),
    });

    const textColor = ed.getAttributes("textStyle")["color"];
    activeColor.set(typeof textColor === "string" ? textColor : "");
    const bgColor = ed.getAttributes("highlight")["color"];
    activeBgColor.set(typeof bgColor === "string" ? bgColor : "");
  }

  function toggleColorPicker(mode: "text" | "bg"): void {
    colorPickerMode.set(colorPickerMode() === mode ? undefined : mode);
  }

  function applyColor(color: string | undefined): void {
    const ed = opt.editor();
    if (ed == null) return;

    const chain = ed.chain().focus();
    const mode = colorPickerMode();
    if (mode === "text") {
      if (color !== undefined) {
        chain.setColor(color).run();
      } else {
        chain.unsetColor().run();
      }
    } else if (mode === "bg") {
      if (color !== undefined) {
        chain.setHighlight({ color }).run();
      } else {
        chain.unsetHighlight().run();
      }
    }
    colorPickerMode.set(undefined);
  }

  return {
    activeStates,
    activeColor,
    activeBgColor,
    colorPickerMode,
    execCmd,
    refreshActiveStates,
    toggleColorPicker,
    applyColor,
  };
}
