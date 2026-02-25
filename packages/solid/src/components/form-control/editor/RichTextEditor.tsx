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
import "./editor.css";
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

// Editor wrapper style
const editorWrapperClass = clsx(
  "flex flex-col",
  "bg-primary-50 dark:bg-primary-950/30",
  "text-base-900 dark:text-base-100",
  "border border-base-300 dark:border-base-700",
  "rounded",
  "focus-within:border-primary-500",
);

// Editor disabled style
const editorDisabledClass = clsx("bg-base-100 dark:bg-base-800", "text-base-500");

// Editor content area style
const editorContentClass = clsx(
  "px-4 py-3",
  "min-h-32",
  "outline-none",
  "prose prose-sm max-w-none",
  "dark:prose-invert",
);

// Editor content size-based style
const editorContentSizeClasses: Record<FieldSize, string> = {
  xs: clsx("px-1.5 py-1", "min-h-12"),
  sm: clsx("px-3 py-2", "min-h-24"),
  lg: clsx("px-5 py-4", "min-h-48"),
  xl: clsx("px-6 py-5", "min-h-64"),
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
    twMerge(editorWrapperClass, local.disabled && editorDisabledClass, local.class);

  const getContentClass = () =>
    twMerge(editorContentClass, local.size && editorContentSizeClasses[local.size]);

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
