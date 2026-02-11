# Tiptap Rich Text Editor 마이그레이션 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Quill 기반 Angular 에디터를 Tiptap 3.0 기반 SolidJS 컴포넌트로 마이그레이션한다.

**Architecture:** `solid-tiptap` 래퍼를 사용하여 Tiptap 에디터를 SolidJS에 통합한다. 헤드리스 Tiptap 코어 위에 Tailwind CSS 기반 툴바 UI를 직접 구성한다. 기존 simplysm 폼 컴포넌트 패턴(`value`/`onValueChange`, `createPropSignal`, `splitProps`, `twMerge`)을 따른다.

**Tech Stack:** Tiptap 3.0, solid-tiptap, @tiptap/starter-kit, 각종 @tiptap/extension-\*, SolidJS, Tailwind CSS, @tabler/icons-solidjs

---

## Task 1: 의존성 설치

**Files:**

- Modify: `packages/solid/package.json`

**Step 1: npm 패키지 설치**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/tiptap-editor-migration
pnpm add -F @simplysm/solid \
  @tiptap/core \
  @tiptap/pm \
  @tiptap/starter-kit \
  @tiptap/extension-underline \
  @tiptap/extension-text-align \
  @tiptap/extension-color \
  @tiptap/extension-text-style \
  @tiptap/extension-highlight \
  @tiptap/extension-table \
  @tiptap/extension-table-row \
  @tiptap/extension-table-header \
  @tiptap/extension-table-cell \
  @tiptap/extension-image \
  solid-tiptap
```

**Step 2: 설치 확인**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/tiptap-editor-migration
node -e "require.resolve('@tiptap/core')" && echo "OK"
```

Expected: `OK`

**Step 3: 커밋**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/tiptap-editor-migration
git add packages/solid/package.json pnpm-lock.yaml
git commit -m "feat(solid): Tiptap 에디터 의존성 추가"
```

---

## Task 2: 에디터 코어 컴포넌트 생성

**Files:**

- Create: `packages/solid/src/components/form-control/editor/RichTextEditor.tsx`

**Step 1: 기본 에디터 컴포넌트 작성**

Tiptap 에디터를 SolidJS 컴포넌트로 래핑한다. 기존 폼 컴포넌트 패턴을 따른다.

```tsx
import { type Component, type JSX, createEffect, on, onCleanup, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { createTiptapEditor, useEditorHTML } from "solid-tiptap";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Image from "@tiptap/extension-image";
import { createPropSignal } from "../../../utils/createPropSignal";
import type { FieldSize } from "../field/Field.styles";

export interface RichTextEditorProps {
  /** HTML 문자열 값 */
  value?: string;

  /** 값 변경 콜백 */
  onValueChange?: (value: string) => void;

  /** 비활성화 */
  disabled?: boolean;

  /** 읽기 전용 */
  readonly?: boolean;

  /** 에러 상태 */
  error?: boolean;

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

// 에디터 에러 스타일
const editorErrorClass = clsx("border-danger-500");

// 에디터 disabled 스타일
const editorDisabledClass = clsx("bg-base-100 dark:bg-base-800", "text-base-500");

// 에디터 콘텐츠 영역 스타일
const editorContentClass = clsx(
  "px-4 py-3",
  "min-h-[8rem]",
  "outline-none",
  "prose prose-sm max-w-none",
  "dark:prose-invert",
);

// 에디터 콘텐츠 사이즈별 스타일
const editorContentSizeClasses: Record<FieldSize, string> = {
  sm: clsx("px-3 py-2", "min-h-[6rem]"),
  lg: clsx("px-5 py-4", "min-h-[12rem]"),
};

export const RichTextEditor: Component<RichTextEditorProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "disabled",
    "readonly",
    "error",
    "size",
    "class",
    "style",
  ]);

  const [value, setValue] = createPropSignal({
    value: () => local.value ?? "",
    onChange: () => local.onValueChange,
  });

  let editorRef!: HTMLDivElement;

  const editor = createTiptapEditor(() => ({
    element: editorRef,
    extensions: [
      StarterKit,
      Underline,
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
    content: value(),
    editable: !local.disabled && !local.readonly,
    onUpdate({ editor: e }) {
      const html = e.getHTML();
      // Tiptap 빈 에디터는 "<p></p>"를 반환하므로 빈 문자열로 변환
      setValue(html === "<p></p>" ? "" : html);
    },
  }));

  // disabled/readonly 변경 시 에디터 editable 상태 동기화
  createEffect(() => {
    const e = editor();
    if (e) {
      e.setEditable(!local.disabled && !local.readonly);
    }
  });

  // 외부에서 value가 변경될 때 에디터 콘텐츠 동기화
  createEffect(
    on(
      () => value(),
      (newValue) => {
        const e = editor();
        if (e && e.getHTML() !== newValue && newValue !== (e.getHTML() === "<p></p>" ? "" : e.getHTML())) {
          e.commands.setContent(newValue || "", false);
        }
      },
    ),
  );

  // 클린업
  onCleanup(() => {
    editor()?.destroy();
  });

  const getWrapperClass = () =>
    twMerge(editorWrapperClass, local.error && editorErrorClass, local.disabled && editorDisabledClass, local.class);

  const getContentClass = () => twMerge(editorContentClass, local.size && editorContentSizeClasses[local.size]);

  return (
    <div {...rest} data-rich-text-editor class={getWrapperClass()} style={local.style}>
      {/* Task 3에서 툴바 추가 예정 */}
      <div ref={editorRef} class={getContentClass()} />
    </div>
  );
};
```

**Step 2: 타입체크 실행**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/tiptap-editor-migration
pnpm typecheck packages/solid
```

Expected: 에러 없음

**Step 3: 커밋**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/tiptap-editor-migration
git add packages/solid/src/components/form-control/editor/RichTextEditor.tsx
git commit -m "feat(solid): RichTextEditor 코어 컴포넌트 생성"
```

---

## Task 3: 툴바 컴포넌트 생성

**Files:**

- Create: `packages/solid/src/components/form-control/editor/EditorToolbar.tsx`
- Modify: `packages/solid/src/components/form-control/editor/RichTextEditor.tsx`

**Step 1: 툴바 컴포넌트 작성**

Tiptap 에디터 커맨드와 연동되는 툴바 UI를 구현한다. `@tabler/icons-solidjs`의 아이콘을 활용하고, `useEditorIsActive` 등 solid-tiptap 유틸로 활성 상태를 반응적으로 추적한다.

```tsx
import { type Component, Show } from "solid-js";
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
  IconTable,
  IconTablePlus,
  IconTableMinus,
  IconRowInsertBottom,
  IconRowInsertTop,
  IconColumnInsertLeft,
  IconColumnInsertRight,
  IconTrash,
  IconClearFormatting,
  IconPhoto,
} from "@tabler/icons-solidjs";
import { Icon } from "../../display/Icon";

// 참고: 아이콘 이름은 @tabler/icons-solidjs에서 실제 존재하는 것을 확인 후 사용해야 함.
// 없는 아이콘이 있다면 대체 아이콘을 선택하거나 Text 버튼으로 교체할 것.

export interface EditorToolbarProps {
  editor: Editor;
  class?: string;
}

// 툴바 wrapper 스타일
const toolbarClass = clsx(
  "flex flex-wrap items-center gap-0.5",
  "border-b border-base-300 dark:border-base-700",
  "px-2 py-1",
);

// 툴바 버튼 공통 스타일
const toolbarBtnClass = clsx(
  "inline-flex items-center justify-center",
  "size-7 rounded",
  "text-base-600 dark:text-base-400",
  "hover:bg-base-100 dark:hover:bg-base-800",
  "transition-colors",
);

// 툴바 버튼 활성 상태
const toolbarBtnActiveClass = clsx("bg-primary-100 text-primary-700", "dark:bg-primary-900/40 dark:text-primary-300");

// 구분선
const separatorClass = clsx("w-px h-5 mx-1", "bg-base-300 dark:bg-base-700");

export const EditorToolbar: Component<EditorToolbarProps> = (props) => {
  const e = () => props.editor;

  // 반응적 활성 상태 추적
  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    createEditorTransaction(e, (editor) => editor.isActive(name, attrs));

  const isBold = isActive("bold");
  const isItalic = isActive("italic");
  const isUnderline = isActive("underline");
  const isStrike = isActive("strike");
  const isH1 = isActive("heading", { level: 1 });
  const isH2 = isActive("heading", { level: 2 });
  const isBulletList = isActive("bulletList");
  const isOrderedList = isActive("orderedList");
  const isBlockquote = isActive("blockquote");
  const isCodeBlock = isActive("codeBlock");
  const isAlignLeft = isActive({ textAlign: "left" });
  const isAlignCenter = isActive({ textAlign: "center" });
  const isAlignRight = isActive({ textAlign: "right" });
  const isAlignJustify = isActive({ textAlign: "justify" });

  // 툴바 버튼 헬퍼
  const btnClass = (active: () => boolean) => twMerge(toolbarBtnClass, active() && toolbarBtnActiveClass);

  // 이미지 삽입
  const insertImage = () => {
    const url = window.prompt("이미지 URL을 입력하세요:");
    if (url) {
      e().chain().focus().setImage({ src: url }).run();
    }
  };

  // 테이블 삽입
  const insertTable = () => {
    e().chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div class={twMerge(toolbarClass, props.class)}>
      {/* 헤더 */}
      <button
        type="button"
        class={btnClass(isH1)}
        onClick={() => e().chain().focus().toggleHeading({ level: 1 }).run()}
        title="제목 1"
      >
        <Icon icon={IconH1} size="1em" />
      </button>
      <button
        type="button"
        class={btnClass(isH2)}
        onClick={() => e().chain().focus().toggleHeading({ level: 2 }).run()}
        title="제목 2"
      >
        <Icon icon={IconH2} size="1em" />
      </button>

      <div class={separatorClass} />

      {/* 텍스트 서식 */}
      <button
        type="button"
        class={btnClass(isBold)}
        onClick={() => e().chain().focus().toggleBold().run()}
        title="굵게"
      >
        <Icon icon={IconBold} size="1em" />
      </button>
      <button
        type="button"
        class={btnClass(isItalic)}
        onClick={() => e().chain().focus().toggleItalic().run()}
        title="기울임"
      >
        <Icon icon={IconItalic} size="1em" />
      </button>
      <button
        type="button"
        class={btnClass(isUnderline)}
        onClick={() => e().chain().focus().toggleUnderline().run()}
        title="밑줄"
      >
        <Icon icon={IconUnderline} size="1em" />
      </button>
      <button
        type="button"
        class={btnClass(isStrike)}
        onClick={() => e().chain().focus().toggleStrike().run()}
        title="취소선"
      >
        <Icon icon={IconStrikethrough} size="1em" />
      </button>

      <div class={separatorClass} />

      {/* 텍스트 색상 (간단한 input[type=color] 사용) */}
      <label class={toolbarBtnClass} title="텍스트 색상" style={{ position: "relative" }}>
        <span style={{ "color": "currentColor", "font-weight": "bold", "font-size": "0.85em" }}>A</span>
        <input
          type="color"
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            width: "100%",
            height: "4px",
            padding: "0",
            border: "none",
            cursor: "pointer",
          }}
          onInput={(ev) => {
            e().chain().focus().setColor(ev.currentTarget.value).run();
          }}
        />
      </label>
      <label class={toolbarBtnClass} title="배경색" style={{ position: "relative" }}>
        <span
          style={{
            "background-color": "yellow",
            "font-weight": "bold",
            "font-size": "0.85em",
            "padding-left": "2px",
            "padding-right": "2px",
          }}
        >
          A
        </span>
        <input
          type="color"
          value="#ffff00"
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            width: "100%",
            height: "4px",
            padding: "0",
            border: "none",
            cursor: "pointer",
          }}
          onInput={(ev) => {
            e().chain().focus().toggleHighlight({ color: ev.currentTarget.value }).run();
          }}
        />
      </label>

      <div class={separatorClass} />

      {/* 리스트 */}
      <button
        type="button"
        class={btnClass(isBulletList)}
        onClick={() => e().chain().focus().toggleBulletList().run()}
        title="글머리 기호 목록"
      >
        <Icon icon={IconList} size="1em" />
      </button>
      <button
        type="button"
        class={btnClass(isOrderedList)}
        onClick={() => e().chain().focus().toggleOrderedList().run()}
        title="번호 목록"
      >
        <Icon icon={IconListNumbers} size="1em" />
      </button>

      <div class={separatorClass} />

      {/* 들여쓰기 */}
      <button
        type="button"
        class={toolbarBtnClass}
        onClick={() => e().chain().focus().sinkListItem("listItem").run()}
        title="들여쓰기"
      >
        <Icon icon={IconIndentIncrease} size="1em" />
      </button>
      <button
        type="button"
        class={toolbarBtnClass}
        onClick={() => e().chain().focus().liftListItem("listItem").run()}
        title="내어쓰기"
      >
        <Icon icon={IconIndentDecrease} size="1em" />
      </button>

      <div class={separatorClass} />

      {/* 블록 */}
      <button
        type="button"
        class={btnClass(isBlockquote)}
        onClick={() => e().chain().focus().toggleBlockquote().run()}
        title="인용"
      >
        <Icon icon={IconQuote} size="1em" />
      </button>
      <button
        type="button"
        class={btnClass(isCodeBlock)}
        onClick={() => e().chain().focus().toggleCodeBlock().run()}
        title="코드 블록"
      >
        <Icon icon={IconCode} size="1em" />
      </button>

      <div class={separatorClass} />

      {/* 정렬 */}
      <button
        type="button"
        class={btnClass(isAlignLeft)}
        onClick={() => e().chain().focus().setTextAlign("left").run()}
        title="왼쪽 정렬"
      >
        <Icon icon={IconAlignLeft} size="1em" />
      </button>
      <button
        type="button"
        class={btnClass(isAlignCenter)}
        onClick={() => e().chain().focus().setTextAlign("center").run()}
        title="가운데 정렬"
      >
        <Icon icon={IconAlignCenter} size="1em" />
      </button>
      <button
        type="button"
        class={btnClass(isAlignRight)}
        onClick={() => e().chain().focus().setTextAlign("right").run()}
        title="오른쪽 정렬"
      >
        <Icon icon={IconAlignRight} size="1em" />
      </button>
      <button
        type="button"
        class={btnClass(isAlignJustify)}
        onClick={() => e().chain().focus().setTextAlign("justify").run()}
        title="양쪽 정렬"
      >
        <Icon icon={IconAlignJustified} size="1em" />
      </button>

      <div class={separatorClass} />

      {/* 테이블 */}
      <button type="button" class={toolbarBtnClass} onClick={insertTable} title="테이블 삽입">
        <Icon icon={IconTablePlus} size="1em" />
      </button>

      {/* 이미지 */}
      <button type="button" class={toolbarBtnClass} onClick={insertImage} title="이미지 삽입">
        <Icon icon={IconPhoto} size="1em" />
      </button>

      <div class={separatorClass} />

      {/* 서식 지우기 */}
      <button
        type="button"
        class={toolbarBtnClass}
        onClick={() => e().chain().focus().clearNodes().unsetAllMarks().run()}
        title="서식 지우기"
      >
        <Icon icon={IconClearFormatting} size="1em" />
      </button>
    </div>
  );
};
```

**Step 2: RichTextEditor에 툴바 통합**

`RichTextEditor.tsx`에서 `<Show when={editor()}>` 안에 `EditorToolbar`를 렌더링한다.

```tsx
// RichTextEditor.tsx의 return 부분을 수정:
import { EditorToolbar } from "./EditorToolbar";

// return 부분:
return (
  <div {...rest} data-rich-text-editor class={getWrapperClass()} style={local.style}>
    <Show when={editor()}>
      {(instance) => (
        <Show when={!local.disabled && !local.readonly}>
          <EditorToolbar editor={instance()} />
        </Show>
      )}
    </Show>
    <div ref={editorRef} class={getContentClass()} />
  </div>
);
```

**Step 3: 타입체크 실행**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/tiptap-editor-migration
pnpm typecheck packages/solid
```

Expected: 에러 없음. 아이콘 import가 실패하면 존재하는 아이콘으로 대체한다.

**Step 4: 린트 실행**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/tiptap-editor-migration
pnpm lint packages/solid/src/components/form-control/editor
```

Expected: 에러 없음

**Step 5: 커밋**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/tiptap-editor-migration
git add packages/solid/src/components/form-control/editor/
git commit -m "feat(solid): RichTextEditor 툴바 컴포넌트 추가"
```

---

## Task 4: index.ts에 export 추가

**Files:**

- Modify: `packages/solid/src/index.ts`

**Step 1: export 추가**

`packages/solid/src/index.ts`의 `// form-control` 섹션 끝에 다음을 추가:

```typescript
export * from "./components/form-control/editor/RichTextEditor";
```

**Step 2: 타입체크 실행**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/tiptap-editor-migration
pnpm typecheck packages/solid
```

Expected: 에러 없음

**Step 3: 커밋**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/tiptap-editor-migration
git add packages/solid/src/index.ts
git commit -m "feat(solid): RichTextEditor export 추가"
```

---

## Task 5: 에디터 CSS 스타일 보완

**Files:**

- Create: `packages/solid/src/components/form-control/editor/editor.css`
- Modify: `packages/solid/src/components/form-control/editor/RichTextEditor.tsx` (import 추가)

**Step 1: Tiptap 에디터 기본 CSS 작성**

Tiptap은 헤드리스라서 에디터 콘텐츠 영역의 기본 스타일(테이블 테두리, 이미지 크기, 빈 placeholder 등)을 직접 제공해야 한다.

```css
/* 에디터 콘텐츠 영역 기본 스타일 */
[data-rich-text-editor] .tiptap {
  outline: none;
}

[data-rich-text-editor] .tiptap p.is-editor-empty:first-child::before {
  color: #9ca3af;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

/* 테이블 스타일 */
[data-rich-text-editor] .tiptap table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5rem 0;
}

[data-rich-text-editor] .tiptap table td,
[data-rich-text-editor] .tiptap table th {
  border: 1px solid #d1d5db;
  padding: 0.375rem 0.5rem;
  min-width: 4rem;
  vertical-align: top;
}

.dark [data-rich-text-editor] .tiptap table td,
.dark [data-rich-text-editor] .tiptap table th {
  border-color: #4b5563;
}

[data-rich-text-editor] .tiptap table th {
  background-color: #f3f4f6;
  font-weight: 600;
}

.dark [data-rich-text-editor] .tiptap table th {
  background-color: #374151;
}

/* 이미지 스타일 */
[data-rich-text-editor] .tiptap img {
  max-width: 100%;
  height: auto;
}

[data-rich-text-editor] .tiptap img.ProseMirror-selectednode {
  outline: 2px solid #3b82f6;
}

/* 코드 블록 스타일 */
[data-rich-text-editor] .tiptap pre {
  background-color: #1e293b;
  color: #e2e8f0;
  border-radius: 0.375rem;
  padding: 0.75rem 1rem;
  margin: 0.5rem 0;
  overflow-x: auto;
}

[data-rich-text-editor] .tiptap pre code {
  background: none;
  color: inherit;
  font-size: 0.875em;
  padding: 0;
}

/* 인용 블록 */
[data-rich-text-editor] .tiptap blockquote {
  border-left: 3px solid #d1d5db;
  padding-left: 1rem;
  margin: 0.5rem 0;
  color: #6b7280;
}

.dark [data-rich-text-editor] .tiptap blockquote {
  border-left-color: #4b5563;
  color: #9ca3af;
}
```

**Step 2: RichTextEditor.tsx에서 CSS import**

파일 상단에 추가:

```typescript
import "./editor.css";
```

**Step 3: 타입체크 및 린트 실행**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/tiptap-editor-migration
pnpm typecheck packages/solid && pnpm lint packages/solid/src/components/form-control/editor
```

Expected: 에러 없음

**Step 4: 커밋**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/tiptap-editor-migration
git add packages/solid/src/components/form-control/editor/
git commit -m "feat(solid): RichTextEditor CSS 스타일 추가"
```

---

## Task 6: 데모 페이지에 에디터 추가

**Files:**

- Modify: 데모 앱의 적절한 페이지 (기존 데모 구조 확인 필요)

**Step 1: 기존 데모 구조 확인**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/tiptap-editor-migration
ls packages/solid-demo/src/
```

데모 앱의 라우트/페이지 구조를 확인하여 적절한 위치에 에디터 데모 페이지를 추가한다.

**Step 2: 데모 페이지 작성**

데모 앱의 기존 패턴을 따라 에디터 데모 페이지를 생성한다. 파일 경로는 Step 1에서 확인한 구조에 따라 결정.

```tsx
import { createSignal } from "solid-js";
import { RichTextEditor } from "@simplysm/solid";

export default function EditorDemo() {
  const [html, setHtml] = createSignal("<p>여기에 내용을 입력하세요...</p>");

  return (
    <div class="p-4 space-y-4">
      <h2 class="text-lg font-bold">RichTextEditor 데모</h2>

      <RichTextEditor value={html()} onValueChange={setHtml} />

      <div class="mt-4">
        <h3 class="text-sm font-semibold mb-1">HTML 출력:</h3>
        <pre class="text-xs bg-base-100 dark:bg-base-800 p-2 rounded overflow-auto max-h-40">{html()}</pre>
      </div>

      <div class="mt-4">
        <h3 class="text-sm font-semibold mb-1">Disabled 상태:</h3>
        <RichTextEditor value={html()} disabled />
      </div>

      <div class="mt-4">
        <h3 class="text-sm font-semibold mb-1">Readonly 상태:</h3>
        <RichTextEditor value={html()} readonly />
      </div>
    </div>
  );
}
```

**Step 3: dev 서버에서 확인**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/tiptap-editor-migration
pnpm dev
```

브라우저에서 데모 페이지를 열어 에디터가 정상 동작하는지 확인한다:

- 텍스트 입력/서식 적용
- 툴바 버튼 클릭 시 서식 토글
- 테이블 삽입
- 이미지 URL 삽입
- disabled/readonly 상태
- 마크다운 단축키 (# + Space → H1, \*\* → Bold 등 — StarterKit InputRules)

**Step 4: 커밋**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/tiptap-editor-migration
git add packages/solid-demo/
git commit -m "feat(solid-demo): RichTextEditor 데모 페이지 추가"
```

---

## Task 7: 검증 및 정리

**Step 1: 전체 타입체크**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/tiptap-editor-migration
pnpm typecheck packages/solid
```

Expected: 에러 없음

**Step 2: 전체 린트**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/tiptap-editor-migration
pnpm lint packages/solid
```

Expected: 에러 없음

**Step 3: Vite 빌드 확인**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/tiptap-editor-migration
pnpm build solid
```

Expected: 빌드 성공

---

## 주의사항

- **solid-tiptap과 Tiptap 3.0 호환성**: `solid-tiptap` 0.8.0이 Tiptap 3.x와 호환되는지 설치 후 확인 필요. 호환되지 않으면 Tiptap 2.x로 다운그레이드하거나, `solid-tiptap` 없이 `@tiptap/core`의 `Editor`를 직접 SolidJS에서 래핑 (onMount에서 new Editor() 생성 + createSignal로 인스턴스 관리)
- **@tabler/icons-solidjs 아이콘**: 실제 존재하지 않는 아이콘 이름이 있을 수 있음. 타입체크에서 에러가 나면 `@tabler/icons-solidjs` 패키지에서 사용 가능한 유사 아이콘으로 교체
- **ProseMirror 중복 인스턴스 에러**: Vite에서 `RangeError: Adding different instances of a keyed plugin` 에러 발생 시, `vite.config.ts`의 `optimizeDeps.include`에 prosemirror 관련 패키지를 추가해야 함
- **Chrome 84 CSS 제한**: `aspect-ratio`, `inset`, `:is()`, `:where()` 사용 금지. CSS 파일에서도 이 제한을 준수할 것
- **모든 경로는 worktree 기준**: `/home/kslhunter/projects/simplysm/.worktrees/tiptap-editor-migration/`
