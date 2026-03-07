import {
  type Component,
  type JSX,
  Show,
  createEffect,
  on,
  onCleanup,
  splitProps,
  untrack,
} from "solid-js";
import clsx from "clsx";
import "./RichTextEditor.tiptap.css";
import { twMerge } from "tailwind-merge";
import { createTiptapEditor } from "solid-tiptap";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Image from "@tiptap/extension-image";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import type { FieldSize } from "../field/Field.styles";
import { bg, border, text } from "../../../styles/base.styles";
import { pad } from "../../../styles/control.styles";
import { EditorToolbar } from "./EditorToolbar";

export interface RichTextEditorProps {
  /** HTML string value */
  value?: string;

  /** Value change callback */
  onValueChange?: (value: string) => void;

  /** Disabled */
  disabled?: boolean;

  /** Size */
  size?: FieldSize;

  /** Custom class */
  class?: string;

  /** Custom style */
  style?: JSX.CSSProperties;
}

// Editor content size-based style
const editorContentSizeClasses: Record<FieldSize, string> = {
  md: clsx(pad.xl, "min-h-32"),
  xs: clsx(pad.xs, "min-h-12"),
  sm: clsx(pad.sm, "min-h-24"),
  lg: clsx(pad.lg, "min-h-48"),
  xl: clsx(pad.xl, "min-h-64"),
};

export const RichTextEditor: Component<RichTextEditorProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "disabled",
    "size",
    "class",
    "style",
  ]);

  const [value, setValue] = createControllableSignal({
    value: () => local.value ?? "",
    onChange: () => local.onValueChange,
  });

  // Flag to distinguish editor internal update (onUpdate) from external value change
  let isInternalUpdate = false;

  let editorRef!: HTMLDivElement;

  const editor = createTiptapEditor(() => ({
    element: editorRef,
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    // untrack: prevent editor recreation on value/editable change (synced in createEffect)
    content: untrack(() => value()),
    editable: untrack(() => !local.disabled),
    onUpdate({ editor: e }) {
      const html = e.getHTML();
      isInternalUpdate = true;
      setValue(html === "<p></p>" ? "" : html);
      queueMicrotask(() => {
        isInternalUpdate = false;
      });
    },
  }));

  // Sync editor editable state when disabled changes
  createEffect(() => {
    const e = editor();
    if (e) {
      e.setEditable(!local.disabled);
    }
  });

  // Sync editor content only when external value changes
  createEffect(
    on(
      () => value(),
      (newValue) => {
        // Ignore value change from editor internal update
        if (isInternalUpdate) return;

        const e = editor();
        if (!e) return;

        const editorHtml = e.getHTML();
        const normalizedEditor = editorHtml === "<p></p>" ? "" : editorHtml;
        if (normalizedEditor !== newValue) {
          e.commands.setContent(newValue || "", { emitUpdate: false });
        }
      },
    ),
  );

  // Cleanup
  onCleanup(() => {
    editor()?.destroy();
  });

  const getWrapperClass = () =>
    twMerge(
      clsx("flex flex-col bg-primary-50 dark:bg-primary-950/30", text.default, "border", border.default, "rounded focus-within:border-primary-500"),
      local.disabled && clsx(bg.muted, text.muted),
      local.class,
    );

  const getContentClass = () =>
    twMerge("outline-none prose prose-sm max-w-none dark:prose-invert", editorContentSizeClasses[local.size ?? "md"]);

  return (
    <div {...rest} data-rich-text-editor class={getWrapperClass()} style={local.style}>
      <Show when={editor()}>
        {(instance) => (
          <Show when={!local.disabled}>
            <EditorToolbar editor={instance()} />
          </Show>
        )}
      </Show>
      <div ref={editorRef} class={getContentClass()} />
    </div>
  );
};
