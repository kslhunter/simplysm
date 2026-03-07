import { type Component, For } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import type { ChainedCommands, Editor } from "@tiptap/core";
import { createEditorTransaction } from "solid-tiptap";
import { Button } from "../Button";
import {
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikethrough,
  IconH1,
  IconH2,
  IconList,
  IconListNumbers,
  IconIndentIncrease,
  IconIndentDecrease,
  IconQuote,
  IconCode,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconAlignJustified,
  IconTablePlus,
  IconPhoto,
  IconClearFormatting,
} from "@tabler/icons-solidjs";
import { Icon } from "../../display/Icon";
import { border, text } from "../../../styles/base.styles";
import { gap, pad } from "../../../styles/control.styles";
import { themeTokens } from "../../../styles/theme.styles";
import { useI18n } from "../../../providers/i18n/I18nProvider";

export interface EditorToolbarProps {
  editor: Editor;
  class?: string;
}

// Toolbar button extra class
const toolbarBtnExtra = "size-7";

// Toolbar button active style
const toolbarBtnActiveClass = themeTokens.primary.light;

// Separator style
const separatorClass = clsx("mx-1 h-5 w-px", "bg-base-300 dark:bg-base-700");

// Color picker label style
const colorLabelClass = clsx(
  "inline-flex items-center justify-center",
  "cursor-pointer",
  "rounded",
  "transition-colors",
  text.muted,
  themeTokens.base.hoverBg,
  "relative",
  "size-7",
);

// Color input hide style
const colorInputClass = clsx("absolute opacity-0", "size-0");

interface ToolbarButtonItem {
  icon: Component;
  i18nKey: string;
  /** Tiptap editor command — receives editor.chain().focus() */
  command: (chain: ChainedCommands) => void;
  /** Active state check — receives editor instance */
  isActive?: (editor: Editor) => boolean;
}

type ToolbarItem = ToolbarButtonItem | "separator";

// Items before color pickers: Headings + Text formatting
const toolbarItemsBefore: ToolbarItem[] = [
  // Headings
  { icon: IconH1, i18nKey: "editorToolbar.heading1", command: (c) => c.toggleHeading({ level: 1 }).run(), isActive: (e) => e.isActive("heading", { level: 1 }) },
  { icon: IconH2, i18nKey: "editorToolbar.heading2", command: (c) => c.toggleHeading({ level: 2 }).run(), isActive: (e) => e.isActive("heading", { level: 2 }) },
  "separator",
  // Text formatting
  { icon: IconBold, i18nKey: "editorToolbar.bold", command: (c) => c.toggleBold().run(), isActive: (e) => e.isActive("bold") },
  { icon: IconItalic, i18nKey: "editorToolbar.italic", command: (c) => c.toggleItalic().run(), isActive: (e) => e.isActive("italic") },
  { icon: IconUnderline, i18nKey: "editorToolbar.underline", command: (c) => c.toggleUnderline().run(), isActive: (e) => e.isActive("underline") },
  { icon: IconStrikethrough, i18nKey: "editorToolbar.strikethrough", command: (c) => c.toggleStrike().run(), isActive: (e) => e.isActive("strike") },
];

// Items after color pickers: Lists + Indent + Block + Alignment
const toolbarItemsAfter: ToolbarItem[] = [
  // Lists
  { icon: IconList, i18nKey: "editorToolbar.bulletList", command: (c) => c.toggleBulletList().run(), isActive: (e) => e.isActive("bulletList") },
  { icon: IconListNumbers, i18nKey: "editorToolbar.numberedList", command: (c) => c.toggleOrderedList().run(), isActive: (e) => e.isActive("orderedList") },
  "separator",
  // Indentation
  { icon: IconIndentIncrease, i18nKey: "editorToolbar.increaseIndent", command: (c) => c.sinkListItem("listItem").run() },
  { icon: IconIndentDecrease, i18nKey: "editorToolbar.decreaseIndent", command: (c) => c.liftListItem("listItem").run() },
  "separator",
  // Block
  { icon: IconQuote, i18nKey: "editorToolbar.blockquote", command: (c) => c.toggleBlockquote().run(), isActive: (e) => e.isActive("blockquote") },
  { icon: IconCode, i18nKey: "editorToolbar.codeBlock", command: (c) => c.toggleCodeBlock().run(), isActive: (e) => e.isActive("codeBlock") },
  "separator",
  // Alignment
  { icon: IconAlignLeft, i18nKey: "editorToolbar.alignLeft", command: (c) => c.setTextAlign("left").run(), isActive: (e) => e.isActive({ textAlign: "left" }) },
  { icon: IconAlignCenter, i18nKey: "editorToolbar.alignCenter", command: (c) => c.setTextAlign("center").run(), isActive: (e) => e.isActive({ textAlign: "center" }) },
  { icon: IconAlignRight, i18nKey: "editorToolbar.alignRight", command: (c) => c.setTextAlign("right").run(), isActive: (e) => e.isActive({ textAlign: "right" }) },
  { icon: IconAlignJustified, i18nKey: "editorToolbar.justify", command: (c) => c.setTextAlign("justify").run(), isActive: (e) => e.isActive({ textAlign: "justify" }) },
];

export const EditorToolbar: Component<EditorToolbarProps> = (props) => {
  const e = () => props.editor;
  const i18n = useI18n();

  // Track active state reactively with createEditorTransaction
  const activeStates = new Map<ToolbarButtonItem, () => boolean>();
  for (const item of [...toolbarItemsBefore, ...toolbarItemsAfter]) {
    if (item !== "separator" && item.isActive) {
      const check = item.isActive;
      activeStates.set(item, createEditorTransaction(e, (editor) => check(editor)));
    }
  }

  // Current text color
  const currentColor = createEditorTransaction(
    e,
    (editor) => (editor.getAttributes("textStyle")["color"] as string | undefined) ?? "#000000",
  );

  // Current highlight color
  const currentHighlight = createEditorTransaction(
    e,
    (editor) => (editor.getAttributes("highlight")["color"] as string | undefined) ?? "#ffff00",
  );

  const btnClass = (active: () => boolean) =>
    twMerge(toolbarBtnExtra, active() && toolbarBtnActiveClass);

  function renderToolbarItems(items: ToolbarItem[]) {
    return (
      <For each={items}>
        {(item) =>
          item === "separator" ? (
            <div class={separatorClass} />
          ) : (
            <Button
              variant="ghost"
              size="xs"
              class={item.isActive ? btnClass(() => activeStates.get(item)?.() ?? false) : toolbarBtnExtra}
              title={i18n.t(item.i18nKey)}
              onClick={() => item.command(props.editor.chain().focus())}
            >
              <Icon icon={item.icon} size="1em" />
            </Button>
          )
        }
      </For>
    );
  }

  // Image insert handler
  const handleImageInsert = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result;
        if (typeof src === "string") {
          props.editor.chain().focus().setImage({ src }).run();
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div class={twMerge(clsx("flex flex-wrap items-center", gap.sm, "border-b", border.default, pad.md), props.class)}>
      {renderToolbarItems(toolbarItemsBefore)}

      {/* Color pickers */}
      <div class={separatorClass} />
      <label class={colorLabelClass} title={i18n.t("editorToolbar.textColor")}>
        <span class={clsx("text-sm font-bold")}>A</span>
        <div class="absolute inset-x-1 bottom-0.5 h-0.5 rounded-full" style={{ "background-color": currentColor() }} />
        <input
          type="color"
          class={colorInputClass}
          value={currentColor()}
          onInput={(ev) => props.editor.chain().focus().setColor(ev.currentTarget.value).run()}
        />
      </label>
      <label class={colorLabelClass} title={i18n.t("editorToolbar.bgColor")}>
        <span
          class={clsx("rounded px-0.5 text-sm font-bold")}
          style={{ "background-color": currentHighlight() }}
        >
          A
        </span>
        <input
          type="color"
          class={colorInputClass}
          value={currentHighlight()}
          onInput={(ev) =>
            props.editor.chain().focus().toggleHighlight({ color: ev.currentTarget.value }).run()
          }
        />
      </label>

      <div class={separatorClass} />
      {renderToolbarItems(toolbarItemsAfter)}

      {/* Insert table */}
      <div class={separatorClass} />
      <Button
        variant="ghost"
        size="xs"
        class={toolbarBtnExtra}
        title={i18n.t("editorToolbar.insertTable")}
        onClick={() =>
          props.editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      >
        <Icon icon={IconTablePlus} size="1em" />
      </Button>

      {/* Insert image */}
      <Button
        variant="ghost"
        size="xs"
        class={toolbarBtnExtra}
        title={i18n.t("editorToolbar.insertImage")}
        onClick={handleImageInsert}
      >
        <Icon icon={IconPhoto} size="1em" />
      </Button>

      {/* Clear formatting */}
      <div class={separatorClass} />
      <Button
        variant="ghost"
        size="xs"
        class={toolbarBtnExtra}
        title={i18n.t("editorToolbar.clearFormatting")}
        onClick={() => props.editor.chain().focus().clearNodes().unsetAllMarks().run()}
      >
        <Icon icon={IconClearFormatting} size="1em" />
      </Button>
    </div>
  );
};
