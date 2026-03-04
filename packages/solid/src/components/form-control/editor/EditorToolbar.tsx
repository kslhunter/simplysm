import { type Component } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import type { Editor } from "@tiptap/core";
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
import { useI18n } from "../../../providers/i18n/I18nContext";

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

export const EditorToolbar: Component<EditorToolbarProps> = (props) => {
  const e = () => props.editor;
  const i18n = useI18n();

  // Track active state reactively with createEditorTransaction
  const isBold = createEditorTransaction(e, (editor) => editor.isActive("bold"));
  const isItalic = createEditorTransaction(e, (editor) => editor.isActive("italic"));
  const isUnderline = createEditorTransaction(e, (editor) => editor.isActive("underline"));
  const isStrike = createEditorTransaction(e, (editor) => editor.isActive("strike"));
  const isH1 = createEditorTransaction(e, (editor) => editor.isActive("heading", { level: 1 }));
  const isH2 = createEditorTransaction(e, (editor) => editor.isActive("heading", { level: 2 }));
  const isBulletList = createEditorTransaction(e, (editor) => editor.isActive("bulletList"));
  const isOrderedList = createEditorTransaction(e, (editor) => editor.isActive("orderedList"));
  const isBlockquote = createEditorTransaction(e, (editor) => editor.isActive("blockquote"));
  const isCodeBlock = createEditorTransaction(e, (editor) => editor.isActive("codeBlock"));
  const isAlignLeft = createEditorTransaction(e, (editor) =>
    editor.isActive({ textAlign: "left" } as unknown as string),
  );
  const isAlignCenter = createEditorTransaction(e, (editor) =>
    editor.isActive({ textAlign: "center" } as unknown as string),
  );
  const isAlignRight = createEditorTransaction(e, (editor) =>
    editor.isActive({ textAlign: "right" } as unknown as string),
  );
  const isAlignJustify = createEditorTransaction(e, (editor) =>
    editor.isActive({ textAlign: "justify" } as unknown as string),
  );

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
    <div class={twMerge(clsx("flex flex-wrap items-center", gap.sm, "border-b", border.default, pad.default), props.class)}>
      {/* 1. Header (H1, H2) */}
      <Button
        variant="ghost"
        size="xs"
        class={btnClass(isH1)}
        title={i18n.t("editorToolbar.heading1")}
        onClick={() => props.editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Icon icon={IconH1} size="1em" />
      </Button>
      <Button
        variant="ghost"
        size="xs"
        class={btnClass(isH2)}
        title={i18n.t("editorToolbar.heading2")}
        onClick={() => props.editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Icon icon={IconH2} size="1em" />
      </Button>

      {/* 2. Separator */}
      <div class={separatorClass} />

      {/* 3. Text format (Bold, Italic, Underline, Strike) */}
      <Button
        variant="ghost"
        size="xs"
        class={btnClass(isBold)}
        title={i18n.t("editorToolbar.bold")}
        onClick={() => props.editor.chain().focus().toggleBold().run()}
      >
        <Icon icon={IconBold} size="1em" />
      </Button>
      <Button
        variant="ghost"
        size="xs"
        class={btnClass(isItalic)}
        title={i18n.t("editorToolbar.italic")}
        onClick={() => props.editor.chain().focus().toggleItalic().run()}
      >
        <Icon icon={IconItalic} size="1em" />
      </Button>
      <Button
        variant="ghost"
        size="xs"
        class={btnClass(isUnderline)}
        title={i18n.t("editorToolbar.underline")}
        onClick={() => props.editor.chain().focus().toggleUnderline().run()}
      >
        <Icon icon={IconUnderline} size="1em" />
      </Button>
      <Button
        variant="ghost"
        size="xs"
        class={btnClass(isStrike)}
        title={i18n.t("editorToolbar.strikethrough")}
        onClick={() => props.editor.chain().focus().toggleStrike().run()}
      >
        <Icon icon={IconStrikethrough} size="1em" />
      </Button>

      {/* 4. Separator */}
      <div class={separatorClass} />

      {/* 5. Text color + background color (using input[type=color]) */}
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

      {/* 6. Separator */}
      <div class={separatorClass} />

      {/* 7. List (Bullet, Ordered) */}
      <Button
        variant="ghost"
        size="xs"
        class={btnClass(isBulletList)}
        title={i18n.t("editorToolbar.bulletList")}
        onClick={() => props.editor.chain().focus().toggleBulletList().run()}
      >
        <Icon icon={IconList} size="1em" />
      </Button>
      <Button
        variant="ghost"
        size="xs"
        class={btnClass(isOrderedList)}
        title={i18n.t("editorToolbar.numberedList")}
        onClick={() => props.editor.chain().focus().toggleOrderedList().run()}
      >
        <Icon icon={IconListNumbers} size="1em" />
      </Button>

      {/* 8. Separator */}
      <div class={separatorClass} />

      {/* 9. Indentation (Increase, Decrease) */}
      <Button
        variant="ghost"
        size="xs"
        class={toolbarBtnExtra}
        title={i18n.t("editorToolbar.increaseIndent")}
        onClick={() => props.editor.chain().focus().sinkListItem("listItem").run()}
      >
        <Icon icon={IconIndentIncrease} size="1em" />
      </Button>
      <Button
        variant="ghost"
        size="xs"
        class={toolbarBtnExtra}
        title={i18n.t("editorToolbar.decreaseIndent")}
        onClick={() => props.editor.chain().focus().liftListItem("listItem").run()}
      >
        <Icon icon={IconIndentDecrease} size="1em" />
      </Button>

      {/* 10. Separator */}
      <div class={separatorClass} />

      {/* 11. Block (Blockquote, CodeBlock) */}
      <Button
        variant="ghost"
        size="xs"
        class={btnClass(isBlockquote)}
        title={i18n.t("editorToolbar.blockquote")}
        onClick={() => props.editor.chain().focus().toggleBlockquote().run()}
      >
        <Icon icon={IconQuote} size="1em" />
      </Button>
      <Button
        variant="ghost"
        size="xs"
        class={btnClass(isCodeBlock)}
        title={i18n.t("editorToolbar.codeBlock")}
        onClick={() => props.editor.chain().focus().toggleCodeBlock().run()}
      >
        <Icon icon={IconCode} size="1em" />
      </Button>

      {/* 12. Separator */}
      <div class={separatorClass} />

      {/* 13. Alignment (Left, Center, Right, Justify) */}
      <Button
        variant="ghost"
        size="xs"
        class={btnClass(isAlignLeft)}
        title={i18n.t("editorToolbar.alignLeft")}
        onClick={() => props.editor.chain().focus().setTextAlign("left").run()}
      >
        <Icon icon={IconAlignLeft} size="1em" />
      </Button>
      <Button
        variant="ghost"
        size="xs"
        class={btnClass(isAlignCenter)}
        title={i18n.t("editorToolbar.alignCenter")}
        onClick={() => props.editor.chain().focus().setTextAlign("center").run()}
      >
        <Icon icon={IconAlignCenter} size="1em" />
      </Button>
      <Button
        variant="ghost"
        size="xs"
        class={btnClass(isAlignRight)}
        title={i18n.t("editorToolbar.alignRight")}
        onClick={() => props.editor.chain().focus().setTextAlign("right").run()}
      >
        <Icon icon={IconAlignRight} size="1em" />
      </Button>
      <Button
        variant="ghost"
        size="xs"
        class={btnClass(isAlignJustify)}
        title={i18n.t("editorToolbar.justify")}
        onClick={() => props.editor.chain().focus().setTextAlign("justify").run()}
      >
        <Icon icon={IconAlignJustified} size="1em" />
      </Button>

      {/* 14. Separator */}
      <div class={separatorClass} />

      {/* 15. Insert table */}
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

      {/* 16. Insert image */}
      <Button
        variant="ghost"
        size="xs"
        class={toolbarBtnExtra}
        title={i18n.t("editorToolbar.insertImage")}
        onClick={handleImageInsert}
      >
        <Icon icon={IconPhoto} size="1em" />
      </Button>

      {/* 17. Separator */}
      <div class={separatorClass} />

      {/* 18. Clear formatting */}
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
