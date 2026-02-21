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
  /** HTML 문자열 값 */
  value?: string;

  /** 값 변경 콜백 */
  onValueChange?: (value: string) => void;

  /** 비활성화 */
  disabled?: boolean;

  /** 사이즈 */
  size?: FieldSize;

  /** 커스텀 class */
  class?: string;

  /** 커스텀 style */
  style?: JSX.CSSProperties;
}

// 에디터 wrapper 스타일
const editorWrapperClass = clsx(
  "flex flex-col",
  "bg-white dark:bg-base-900",
  "text-base-900 dark:text-base-100",
  "border border-base-300 dark:border-base-700",
  "rounded",
  "focus-within:border-primary-500",
);

// 에디터 disabled 스타일
const editorDisabledClass = clsx("bg-base-100 dark:bg-base-800", "text-base-500");

// 에디터 콘텐츠 영역 스타일
const editorContentClass = clsx(
  "px-4 py-3",
  "min-h-32",
  "outline-none",
  "prose prose-sm max-w-none",
  "dark:prose-invert",
);

// 에디터 콘텐츠 사이즈별 스타일
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

  // 에디터 내부 업데이트(onUpdate)와 외부 value 변경을 구분하기 위한 플래그
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
    // untrack: value/editable 변경 시 에디터 재생성 방지 (createEffect에서 동기화)
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

  // disabled 변경 시 에디터 editable 상태 동기화
  createEffect(() => {
    const e = editor();
    if (e) {
      e.setEditable(!local.disabled);
    }
  });

  // 외부에서 value가 변경될 때만 에디터 콘텐츠 동기화
  createEffect(
    on(
      () => value(),
      (newValue) => {
        // 에디터 내부 업데이트로 인한 value 변경은 무시
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

  // 클린업
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
