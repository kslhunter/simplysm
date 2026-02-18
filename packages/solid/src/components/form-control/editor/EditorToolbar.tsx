import { type Component } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import type { Editor } from "@tiptap/core";
import { createEditorTransaction } from "solid-tiptap";
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

export interface EditorToolbarProps {
  editor: Editor;
  class?: string;
}

// 툴바 컨테이너 스타일
const toolbarClass = clsx(
  "flex flex-wrap items-center gap-0.5",
  "border-b border-base-300 dark:border-base-700",
  "px-2 py-1",
);

// 툴바 버튼 기본 스타일
const toolbarBtnClass = clsx(
  "inline-flex items-center justify-center",
  "size-7 rounded",
  "text-base-600 dark:text-base-400",
  "hover:bg-base-100 dark:hover:bg-base-800",
  "transition-colors",
);

// 툴바 버튼 활성 스타일
const toolbarBtnActiveClass = clsx(
  "bg-primary-100 text-primary-700",
  "dark:bg-primary-900/40 dark:text-primary-300",
);

// 구분선 스타일
const separatorClass = clsx("mx-1 h-5 w-px", "bg-base-300 dark:bg-base-700");

// 색상 선택 label 스타일
const colorLabelClass = clsx(
  "relative inline-flex items-center justify-center",
  "size-7 cursor-pointer rounded",
  "text-base-600 dark:text-base-400",
  "hover:bg-base-100 dark:hover:bg-base-800",
  "transition-colors",
);

// 색상 input 숨기기 스타일
const colorInputClass = clsx("absolute opacity-0", "size-0");

// 색상 indicator 스타일
const colorIndicatorClass = clsx("absolute inset-x-1 bottom-0.5", "h-0.5 rounded-full");

export const EditorToolbar: Component<EditorToolbarProps> = (props) => {
  const e = () => props.editor;

  // createEditorTransaction으로 반응적 활성 상태 추적
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

  // 현재 텍스트 색상
  const currentColor = createEditorTransaction(
    e,
    (editor) => (editor.getAttributes("textStyle")["color"] as string | undefined) ?? "#000000",
  );

  // 현재 하이라이트 색상
  const currentHighlight = createEditorTransaction(
    e,
    (editor) => (editor.getAttributes("highlight")["color"] as string | undefined) ?? "#ffff00",
  );

  const btnClass = (active: () => boolean) =>
    twMerge(toolbarBtnClass, active() && toolbarBtnActiveClass);

  // 이미지 삽입 핸들러
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
    <div class={twMerge(toolbarClass, props.class)}>
      {/* 1. 헤더 (H1, H2) */}
      <button
        type="button"
        class={btnClass(isH1)}
        title="제목 1"
        onClick={() => props.editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Icon icon={IconH1} size="1em" />
      </button>
      <button
        type="button"
        class={btnClass(isH2)}
        title="제목 2"
        onClick={() => props.editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Icon icon={IconH2} size="1em" />
      </button>

      {/* 2. 구분선 */}
      <div class={separatorClass} />

      {/* 3. 텍스트 서식 (Bold, Italic, Underline, Strike) */}
      <button
        type="button"
        class={btnClass(isBold)}
        title="굵게"
        onClick={() => props.editor.chain().focus().toggleBold().run()}
      >
        <Icon icon={IconBold} size="1em" />
      </button>
      <button
        type="button"
        class={btnClass(isItalic)}
        title="기울임"
        onClick={() => props.editor.chain().focus().toggleItalic().run()}
      >
        <Icon icon={IconItalic} size="1em" />
      </button>
      <button
        type="button"
        class={btnClass(isUnderline)}
        title="밑줄"
        onClick={() => props.editor.chain().focus().toggleUnderline().run()}
      >
        <Icon icon={IconUnderline} size="1em" />
      </button>
      <button
        type="button"
        class={btnClass(isStrike)}
        title="취소선"
        onClick={() => props.editor.chain().focus().toggleStrike().run()}
      >
        <Icon icon={IconStrikethrough} size="1em" />
      </button>

      {/* 4. 구분선 */}
      <div class={separatorClass} />

      {/* 5. 텍스트 색상 + 배경색 (input[type=color] 사용) */}
      <label class={colorLabelClass} title="텍스트 색상">
        <span class={clsx("text-sm font-bold")}>A</span>
        <div class={colorIndicatorClass} style={{ "background-color": currentColor() }} />
        <input
          type="color"
          class={colorInputClass}
          value={currentColor()}
          onInput={(ev) => props.editor.chain().focus().setColor(ev.currentTarget.value).run()}
        />
      </label>
      <label class={colorLabelClass} title="배경색">
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

      {/* 6. 구분선 */}
      <div class={separatorClass} />

      {/* 7. 리스트 (Bullet, Ordered) */}
      <button
        type="button"
        class={btnClass(isBulletList)}
        title="글머리 기호 목록"
        onClick={() => props.editor.chain().focus().toggleBulletList().run()}
      >
        <Icon icon={IconList} size="1em" />
      </button>
      <button
        type="button"
        class={btnClass(isOrderedList)}
        title="번호 매기기 목록"
        onClick={() => props.editor.chain().focus().toggleOrderedList().run()}
      >
        <Icon icon={IconListNumbers} size="1em" />
      </button>

      {/* 8. 구분선 */}
      <div class={separatorClass} />

      {/* 9. 들여쓰기 (Increase, Decrease) */}
      <button
        type="button"
        class={toolbarBtnClass}
        title="들여쓰기"
        onClick={() => props.editor.chain().focus().sinkListItem("listItem").run()}
      >
        <Icon icon={IconIndentIncrease} size="1em" />
      </button>
      <button
        type="button"
        class={toolbarBtnClass}
        title="내어쓰기"
        onClick={() => props.editor.chain().focus().liftListItem("listItem").run()}
      >
        <Icon icon={IconIndentDecrease} size="1em" />
      </button>

      {/* 10. 구분선 */}
      <div class={separatorClass} />

      {/* 11. 블록 (Blockquote, CodeBlock) */}
      <button
        type="button"
        class={btnClass(isBlockquote)}
        title="인용"
        onClick={() => props.editor.chain().focus().toggleBlockquote().run()}
      >
        <Icon icon={IconQuote} size="1em" />
      </button>
      <button
        type="button"
        class={btnClass(isCodeBlock)}
        title="코드 블록"
        onClick={() => props.editor.chain().focus().toggleCodeBlock().run()}
      >
        <Icon icon={IconCode} size="1em" />
      </button>

      {/* 12. 구분선 */}
      <div class={separatorClass} />

      {/* 13. 정렬 (Left, Center, Right, Justify) */}
      <button
        type="button"
        class={btnClass(isAlignLeft)}
        title="왼쪽 정렬"
        onClick={() => props.editor.chain().focus().setTextAlign("left").run()}
      >
        <Icon icon={IconAlignLeft} size="1em" />
      </button>
      <button
        type="button"
        class={btnClass(isAlignCenter)}
        title="가운데 정렬"
        onClick={() => props.editor.chain().focus().setTextAlign("center").run()}
      >
        <Icon icon={IconAlignCenter} size="1em" />
      </button>
      <button
        type="button"
        class={btnClass(isAlignRight)}
        title="오른쪽 정렬"
        onClick={() => props.editor.chain().focus().setTextAlign("right").run()}
      >
        <Icon icon={IconAlignRight} size="1em" />
      </button>
      <button
        type="button"
        class={btnClass(isAlignJustify)}
        title="양쪽 정렬"
        onClick={() => props.editor.chain().focus().setTextAlign("justify").run()}
      >
        <Icon icon={IconAlignJustified} size="1em" />
      </button>

      {/* 14. 구분선 */}
      <div class={separatorClass} />

      {/* 15. 테이블 삽입 */}
      <button
        type="button"
        class={toolbarBtnClass}
        title="테이블 삽입"
        onClick={() =>
          props.editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      >
        <Icon icon={IconTablePlus} size="1em" />
      </button>

      {/* 16. 이미지 삽입 */}
      <button type="button" class={toolbarBtnClass} title="이미지 삽입" onClick={handleImageInsert}>
        <Icon icon={IconPhoto} size="1em" />
      </button>

      {/* 17. 구분선 */}
      <div class={separatorClass} />

      {/* 18. 서식 지우기 */}
      <button
        type="button"
        class={toolbarBtnClass}
        title="서식 지우기"
        onClick={() => props.editor.chain().focus().clearNodes().unsetAllMarks().run()}
      >
        <Icon icon={IconClearFormatting} size="1em" />
      </button>
    </div>
  );
};
