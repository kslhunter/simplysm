# TextAreaField 컴포넌트 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Angular 레거시 `SdTextareaControl`을 Solid 패키지의 `TextAreaField`로 마이그레이션한다.

**Architecture:** `TextField` 패턴을 따르되, hidden div 방식으로 자동 높이 조절을 구현한다. `Field.styles.ts`의 공통 스타일을 재사용하고, textarea 고유 override는 `twMerge`로 처리한다.

**Tech Stack:** SolidJS, Tailwind CSS, tailwind-merge, clsx, vitest, @solidjs/testing-library

**설계서:** `docs/plans/2026-02-06-textarea-field-design.md`

---

### Task 1: TextAreaField 테스트 작성

**Files:**

- Create: `packages/solid/tests/components/form-control/field/TextAreaField.spec.tsx`

**참조:** `packages/solid/tests/components/form-control/field/TextField.spec.tsx` (동일 패턴)

**Step 1: 테스트 파일 작성**

```tsx
import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { TextAreaField } from "../../../../src/components/form-control/field/TextAreaField";

describe("TextAreaField 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("textarea 요소가 렌더링된다", () => {
      const { container } = render(() => <TextAreaField />);
      const textarea = container.querySelector("textarea");
      expect(textarea).toBeTruthy();
    });

    it("placeholder가 textarea에 적용된다", () => {
      const { container } = render(() => <TextAreaField placeholder="내용을 입력하세요" />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea.placeholder).toBe("내용을 입력하세요");
    });

    it("title이 textarea에 적용된다", () => {
      const { container } = render(() => <TextAreaField title="Textarea title" />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea.title).toBe("Textarea title");
    });
  });

  describe("controlled 패턴", () => {
    it("value prop이 textarea의 값으로 표시된다", () => {
      const { container } = render(() => <TextAreaField value="Hello" />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(textarea.value).toBe("Hello");
    });

    it("onChange가 입력 시 호출된다", () => {
      const handleChange = vi.fn();
      const { container } = render(() => <TextAreaField value="" onChange={handleChange} />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

      fireEvent.input(textarea, { target: { value: "Test" } });

      expect(handleChange).toHaveBeenCalledWith("Test");
    });

    it("외부 상태 변경 시 textarea 값이 업데이트된다", () => {
      const [value, setValue] = createSignal("Initial");
      const { container } = render(() => <TextAreaField value={value()} onChange={setValue} />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

      expect(textarea.value).toBe("Initial");

      setValue("Updated");
      expect(textarea.value).toBe("Updated");
    });
  });

  describe("uncontrolled 패턴", () => {
    it("onChange 없이 내부 상태로 값이 관리된다", () => {
      const { container } = render(() => <TextAreaField value="Initial" />);
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

      expect(textarea.value).toBe("Initial");

      fireEvent.input(textarea, { target: { value: "Changed" } });
      expect(textarea.value).toBe("Changed");
    });
  });

  describe("disabled 상태", () => {
    it("disabled=true일 때 textarea가 렌더링되지 않는다", () => {
      const { container } = render(() => <TextAreaField disabled value="Disabled text" />);
      const textarea = container.querySelector("textarea");
      expect(textarea).toBeFalsy();
    });

    it("disabled 상태에서 value가 표시된다", () => {
      const { getByText } = render(() => <TextAreaField disabled value="Disabled text" />);
      expect(getByText("Disabled text")).toBeTruthy();
    });

    it("disabled 스타일이 적용된다", () => {
      const { container } = render(() => <TextAreaField disabled value="Text" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("bg-base-100")).toBe(true);
    });
  });

  describe("readonly 상태", () => {
    it("readonly=true일 때 textarea가 렌더링되지 않는다", () => {
      const { container } = render(() => <TextAreaField readonly value="Readonly text" />);
      const textarea = container.querySelector("textarea");
      expect(textarea).toBeFalsy();
    });

    it("readonly 상태에서 value가 표시된다", () => {
      const { getByText } = render(() => <TextAreaField readonly value="Readonly text" />);
      expect(getByText("Readonly text")).toBeTruthy();
    });
  });

  describe("error 스타일", () => {
    it("error=true일 때 에러 스타일이 적용된다", () => {
      const { container } = render(() => <TextAreaField error />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("border-red-500")).toBe(true);
    });
  });

  describe("size 옵션", () => {
    it("size=sm일 때 작은 padding이 적용된다", () => {
      const { container } = render(() => <TextAreaField size="sm" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-0.5")).toBe(true);
    });

    it("size=lg일 때 큰 padding이 적용된다", () => {
      const { container } = render(() => <TextAreaField size="lg" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("py-2")).toBe(true);
    });
  });

  describe("inset 스타일", () => {
    it("inset=true일 때 테두리가 없고 배경이 투명하다", () => {
      const { container } = render(() => <TextAreaField inset />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("border-none")).toBe(true);
      expect(wrapper.classList.contains("bg-transparent")).toBe(true);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 기존 스타일과 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <TextAreaField class="my-custom-class" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.classList.contains("my-custom-class")).toBe(true);
    });
  });

  describe("자동 높이 조절", () => {
    it("hidden div가 존재한다 (높이 측정용)", () => {
      const { container } = render(() => <TextAreaField value="Test" />);
      const wrapper = container.firstChild as HTMLElement;
      const hiddenDiv = wrapper.querySelector("[data-hidden-content]") as HTMLElement;
      expect(hiddenDiv).toBeTruthy();
      expect(hiddenDiv.style.visibility).toBe("hidden");
    });
  });
});
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `pnpm vitest packages/solid/tests/components/form-control/field/TextAreaField.spec.tsx --project=solid --run`
Expected: FAIL — `TextAreaField` 모듈을 찾을 수 없음

---

### Task 2: TextAreaField 컴포넌트 구현

**Files:**

- Create: `packages/solid/src/components/form-control/field/TextAreaField.tsx`

**참조:**

- `packages/solid/src/components/form-control/field/TextField.tsx` (동일 패턴)
- `packages/solid/src/components/form-control/field/Field.styles.ts` (공통 스타일)
- `packages/solid/src/utils/createPropSignal.ts` (controlled/uncontrolled)

**Step 1: TextAreaField 컴포넌트 작성**

```tsx
import clsx from "clsx";
import { type Component, type JSX, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import { createPropSignal } from "../../../utils/createPropSignal";
import {
  type FieldSize,
  fieldBaseClass,
  fieldSizeClasses,
  fieldErrorClass,
  fieldInsetClass,
  fieldDisabledClass,
  fieldReadonlyClass,
} from "./Field.styles";

export interface TextAreaFieldProps {
  /** 입력 값 */
  value?: string;

  /** 값 변경 콜백 */
  onChange?: (value: string) => void;

  /** 플레이스홀더 */
  placeholder?: string;

  /** 타이틀 (툴팁) */
  title?: string;

  /** 비활성화 */
  disabled?: boolean;

  /** 읽기 전용 */
  readonly?: boolean;

  /** 에러 상태 */
  error?: boolean;

  /** 사이즈 */
  size?: FieldSize;

  /** 테두리 없는 스타일 */
  inset?: boolean;

  /** 최소 줄 수 (기본값: 1) */
  minRows?: number;

  /** 커스텀 class */
  class?: string;

  /** 커스텀 style */
  style?: JSX.CSSProperties;
}

const textareaBaseClass = clsx(
  "absolute top-0 left-0",
  "w-full h-full",
  "resize-none",
  "overflow-hidden",
  "bg-transparent",
  "outline-none",
  "placeholder:text-base-400 dark:placeholder:text-base-500",
);

export const TextAreaField: Component<TextAreaFieldProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onChange",
    "placeholder",
    "title",
    "disabled",
    "readonly",
    "error",
    "size",
    "inset",
    "minRows",
    "class",
    "style",
  ]);

  const [value, setValue] = createPropSignal({
    value: () => local.value ?? "",
    onChange: () => local.onChange,
  });

  const handleInput: JSX.InputEventHandler<HTMLTextAreaElement, InputEvent> = (e) => {
    setValue(e.currentTarget.value);
  };

  const contentForHeight = () => {
    const rows = local.minRows ?? 1;
    const val = value();
    if (val !== "" && val.split("\n").length >= rows) {
      return val;
    }
    return "\n".repeat(rows - 1) + "\u00A0";
  };

  const getWrapperClass = () =>
    twMerge(
      fieldBaseClass,
      "block h-auto",
      local.size && fieldSizeClasses[local.size],
      local.error && fieldErrorClass,
      local.inset && fieldInsetClass,
      local.disabled && fieldDisabledClass,
      local.readonly && fieldReadonlyClass,
      local.class,
    );

  const isDisplayMode = () => local.disabled || local.readonly;

  return (
    <Show
      when={!isDisplayMode()}
      fallback={
        <div
          {...rest}
          data-textarea-field
          class={getWrapperClass()}
          style={{ "white-space": "pre-wrap", "word-break": "break-all", ...local.style }}
          title={local.title}
        >
          {value() || "\u00A0"}
        </div>
      }
    >
      <div {...rest} data-textarea-field class={getWrapperClass()} style={{ position: "relative", ...local.style }}>
        <div
          data-hidden-content
          style={{
            "visibility": "hidden",
            "white-space": "pre-wrap",
            "word-break": "break-all",
          }}
        >
          {contentForHeight()}
          {"\n "}
        </div>

        <textarea
          class={textareaBaseClass}
          value={value()}
          placeholder={local.placeholder}
          title={local.title}
          onInput={handleInput}
        />
      </div>
    </Show>
  );
};
```

**Step 2: 테스트 실행하여 통과 확인**

Run: `pnpm vitest packages/solid/tests/components/form-control/field/TextAreaField.spec.tsx --project=solid --run`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/src/components/form-control/field/TextAreaField.tsx packages/solid/tests/components/form-control/field/TextAreaField.spec.tsx
git commit -m "feat(solid): TextAreaField 컴포넌트 및 테스트 추가"
```

---

### Task 3: Export 추가

**Files:**

- Modify: `packages/solid/src/index.ts:11` (TimeField export 다음 줄)

**Step 1: index.ts에 export 추가**

`export * from "./components/form-control/field/TimeField";` 다음 줄에 추가:

```typescript
export * from "./components/form-control/field/TextAreaField";
```

**Step 2: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: 린트**

Run: `pnpm lint packages/solid`
Expected: PASS

**Step 4: 커밋**

```bash
git add packages/solid/src/index.ts
git commit -m "feat(solid): TextAreaField export 추가"
```

---

### Task 4: 데모 페이지에 TextAreaField 섹션 추가

**Files:**

- Modify: `packages/solid-demo/src/pages/form-control/FieldPage.tsx`

**참조:** 같은 파일의 TextField 섹션 구조 (라인 26-85)

**Step 1: import에 TextAreaField 추가**

라인 3의 import 블록에 `TextAreaField` 추가:

```typescript
import {
  TextField,
  TextAreaField,
  NumberField,
  // ... 기존 import
} from "@simplysm/solid";
```

**Step 2: controlled 시그널 추가**

기존 시그널 선언 부분 (`controlledNumber` 다음)에 추가:

```typescript
const [controlledTextArea, setControlledTextArea] = createSignal<string | undefined>(
  "여러 줄의\n텍스트를\n입력할 수 있습니다",
);
```

**Step 3: TextField 섹션 다음에 TextAreaField 섹션 추가**

TextField `</section>` (라인 85) 바로 다음에:

```tsx
{
  /* TextAreaField */
}
<section>
  <h2 class="mb-6 text-2xl font-bold">TextAreaField</h2>
  <div class="space-y-6">
    {/* 기본 사용 */}
    <div>
      <h3 class="mb-3 text-lg font-semibold">기본 사용</h3>
      <TextAreaField placeholder="내용을 입력하세요" />
    </div>

    {/* minRows */}
    <div>
      <h3 class="mb-3 text-lg font-semibold">최소 줄 수 (minRows)</h3>
      <div class="flex flex-col items-start gap-3">
        <div>
          <p class="mb-1 text-sm text-base-500">minRows=1 (기본값)</p>
          <TextAreaField placeholder="1줄" />
        </div>
        <div>
          <p class="mb-1 text-sm text-base-500">minRows=3</p>
          <TextAreaField minRows={3} placeholder="최소 3줄" />
        </div>
        <div>
          <p class="mb-1 text-sm text-base-500">minRows=5</p>
          <TextAreaField minRows={5} placeholder="최소 5줄" />
        </div>
      </div>
    </div>

    {/* 사이즈 */}
    <div>
      <h3 class="mb-3 text-lg font-semibold">사이즈</h3>
      <div class="flex flex-col items-start gap-3">
        <TextAreaField size="sm" placeholder="Small" />
        <TextAreaField placeholder="Default" />
        <TextAreaField size="lg" placeholder="Large" />
      </div>
    </div>

    {/* 상태 */}
    <div>
      <h3 class="mb-3 text-lg font-semibold">상태</h3>
      <div class="flex flex-col items-start gap-3">
        <div>
          <p class="mb-1 text-sm text-base-500">Disabled</p>
          <TextAreaField disabled value="비활성화됨" />
        </div>
        <div>
          <p class="mb-1 text-sm text-base-500">Readonly</p>
          <TextAreaField readonly value="읽기 전용" />
        </div>
        <div>
          <p class="mb-1 text-sm text-base-500">Error</p>
          <TextAreaField error placeholder="에러 상태" />
        </div>
        <div>
          <p class="mb-1 text-sm text-base-500">Inset (테두리 없음)</p>
          <TextAreaField inset placeholder="인셋 스타일" />
        </div>
      </div>
    </div>
  </div>
</section>;
```

**Step 4: Controlled 섹션에 TextAreaField 추가**

기존 Controlled 섹션 내 NumberField `</div>` 다음에:

```tsx
{
  /* TextAreaField Controlled */
}
<div>
  <h3 class="mb-3 text-lg font-semibold">TextAreaField</h3>
  <div class="flex flex-col items-start gap-3">
    <TextAreaField
      value={controlledTextArea()}
      onChange={setControlledTextArea}
      placeholder="내용을 입력하세요"
      minRows={3}
    />
    <p class="text-sm text-base-600 dark:text-base-400">
      현재 값: <code class="rounded bg-base-200 px-1 dark:bg-base-700">{controlledTextArea() ?? "(없음)"}</code>
    </p>
    <button
      class="w-fit rounded bg-primary-500 px-3 py-1 text-sm text-white hover:bg-primary-600"
      onClick={() => setControlledTextArea("프로그래밍으로\n값을 변경했습니다")}
    >
      값 변경
    </button>
  </div>
</div>;
```

**Step 5: dev 서버로 시각적 확인**

Run: `pnpm dev`
URL: `http://localhost:40081/solid-demo/`
확인: FieldPage에서 TextAreaField 섹션이 올바르게 렌더링되는지, 자동 높이 조절이 동작하는지

**Step 6: 커밋**

```bash
git add packages/solid-demo/src/pages/form-control/FieldPage.tsx
git commit -m "feat(solid-demo): TextAreaField 데모 섹션 추가"
```

---

### Task 5: 최종 검증

**Step 1: 전체 테스트**

Run: `pnpm vitest --project=solid --run`
Expected: PASS

**Step 2: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: 린트**

Run: `pnpm lint packages/solid packages/solid-demo`
Expected: PASS
