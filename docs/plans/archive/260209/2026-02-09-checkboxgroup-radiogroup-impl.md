# CheckBoxGroup / RadioGroup 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** CheckBoxGroup(다중 선택)과 RadioGroup(단일 선택) compound component를 구현하고, 데모 페이지를 추가하여 수동 테스트한다.

**Architecture:** Context 기반 부모-자식 통신. 그룹 컨테이너가 `createContext`로 값/설정을 제공하고, Item이 `useContext`로 읽어 기존 `<CheckBox>` / `<Radio>`를 렌더링. Compound component 패턴(`Parent.Child`)으로 export.

**Tech Stack:** SolidJS, Tailwind CSS, clsx, tailwind-merge, createPropSignal

---

### Task 1: CheckBoxGroup 컴포넌트 구현

**Files:**

- Create: `packages/solid/src/components/form-control/checkbox/CheckBoxGroup.tsx`

**Step 1: CheckBoxGroup.tsx 작성**

```tsx
import { type JSX, type ParentComponent, createContext, splitProps, useContext } from "solid-js";
import { twMerge } from "tailwind-merge";
import { createPropSignal } from "../../../utils/createPropSignal";
import { CheckBox } from "./CheckBox";
import type { CheckBoxSize, CheckBoxTheme } from "./CheckBox.styles";

interface CheckBoxGroupContextValue<T> {
  value: () => T[];
  toggle: (item: T) => void;
  disabled: () => boolean;
  size: () => CheckBoxSize | undefined;
  theme: () => CheckBoxTheme | undefined;
  inline: () => boolean;
  inset: () => boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CheckBoxGroupContext = createContext<CheckBoxGroupContextValue<any>>();

// --- CheckBoxGroup.Item ---

interface CheckBoxGroupItemProps<T> {
  value: T;
  disabled?: boolean;
  children?: JSX.Element;
}

function CheckBoxGroupItemInner<T>(props: CheckBoxGroupItemProps<T>) {
  const ctx = useContext(CheckBoxGroupContext);
  if (!ctx) throw new Error("CheckBoxGroup.Item must be used inside CheckBoxGroup");

  const isSelected = () => ctx.value().includes(props.value);

  return (
    <CheckBox
      value={isSelected()}
      onValueChange={() => ctx.toggle(props.value)}
      disabled={props.disabled ?? ctx.disabled()}
      size={ctx.size()}
      theme={ctx.theme()}
      inline={ctx.inline()}
      inset={ctx.inset()}
    >
      {props.children}
    </CheckBox>
  );
}

// --- CheckBoxGroup ---

interface CheckBoxGroupProps<T> {
  value?: T[];
  onValueChange?: (value: T[]) => void;
  disabled?: boolean;
  size?: CheckBoxSize;
  theme?: CheckBoxTheme;
  inline?: boolean;
  inset?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

interface CheckBoxGroupComponent {
  <T = unknown>(props: CheckBoxGroupProps<T>): JSX.Element;
  Item: typeof CheckBoxGroupItemInner;
}

const CheckBoxGroupInner: ParentComponent<CheckBoxGroupProps<unknown>> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "disabled",
    "size",
    "theme",
    "inline",
    "inset",
    "class",
    "style",
    "children",
  ]);

  const [value, setValue] = createPropSignal({
    value: () => local.value ?? [],
    onChange: () => local.onValueChange,
  });

  const toggle = (item: unknown) => {
    setValue((prev) => {
      if (prev.includes(item)) {
        return prev.filter((v) => v !== item);
      }
      return [...prev, item];
    });
  };

  const contextValue: CheckBoxGroupContextValue<unknown> = {
    value,
    toggle,
    disabled: () => local.disabled ?? false,
    size: () => local.size,
    theme: () => local.theme,
    inline: () => local.inline ?? false,
    inset: () => local.inset ?? false,
  };

  return (
    <CheckBoxGroupContext.Provider value={contextValue}>
      <div {...rest} class={twMerge("inline-flex", local.class)} style={local.style}>
        {local.children}
      </div>
    </CheckBoxGroupContext.Provider>
  );
};

export const CheckBoxGroup = CheckBoxGroupInner as unknown as CheckBoxGroupComponent;
CheckBoxGroup.Item = CheckBoxGroupItemInner;
```

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS (에러 없음)

---

### Task 2: RadioGroup 컴포넌트 구현

**Files:**

- Create: `packages/solid/src/components/form-control/checkbox/RadioGroup.tsx`

**Step 1: RadioGroup.tsx 작성**

```tsx
import { type JSX, type ParentComponent, createContext, splitProps, useContext } from "solid-js";
import { twMerge } from "tailwind-merge";
import { createPropSignal } from "../../../utils/createPropSignal";
import { Radio } from "./Radio";
import type { CheckBoxSize, CheckBoxTheme } from "./CheckBox.styles";

interface RadioGroupContextValue<T> {
  value: () => T | undefined;
  select: (item: T) => void;
  disabled: () => boolean;
  size: () => CheckBoxSize | undefined;
  theme: () => CheckBoxTheme | undefined;
  inline: () => boolean;
  inset: () => boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RadioGroupContext = createContext<RadioGroupContextValue<any>>();

// --- RadioGroup.Item ---

interface RadioGroupItemProps<T> {
  value: T;
  disabled?: boolean;
  children?: JSX.Element;
}

function RadioGroupItemInner<T>(props: RadioGroupItemProps<T>) {
  const ctx = useContext(RadioGroupContext);
  if (!ctx) throw new Error("RadioGroup.Item must be used inside RadioGroup");

  const isSelected = () => ctx.value() === props.value;

  return (
    <Radio
      value={isSelected()}
      onValueChange={() => ctx.select(props.value)}
      disabled={props.disabled ?? ctx.disabled()}
      size={ctx.size()}
      theme={ctx.theme()}
      inline={ctx.inline()}
      inset={ctx.inset()}
    >
      {props.children}
    </Radio>
  );
}

// --- RadioGroup ---

interface RadioGroupProps<T> {
  value?: T;
  onValueChange?: (value: T) => void;
  disabled?: boolean;
  size?: CheckBoxSize;
  theme?: CheckBoxTheme;
  inline?: boolean;
  inset?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

interface RadioGroupComponent {
  <T = unknown>(props: RadioGroupProps<T>): JSX.Element;
  Item: typeof RadioGroupItemInner;
}

const RadioGroupInner: ParentComponent<RadioGroupProps<unknown>> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "disabled",
    "size",
    "theme",
    "inline",
    "inset",
    "class",
    "style",
    "children",
  ]);

  const [value, setValue] = createPropSignal({
    value: () => local.value as unknown,
    onChange: () => local.onValueChange as ((value: unknown) => void) | undefined,
  });

  const select = (item: unknown) => {
    setValue(item);
  };

  const contextValue: RadioGroupContextValue<unknown> = {
    value,
    select,
    disabled: () => local.disabled ?? false,
    size: () => local.size,
    theme: () => local.theme,
    inline: () => local.inline ?? false,
    inset: () => local.inset ?? false,
  };

  return (
    <RadioGroupContext.Provider value={contextValue}>
      <div {...rest} class={twMerge("inline-flex", local.class)} style={local.style}>
        {local.children}
      </div>
    </RadioGroupContext.Provider>
  );
};

export const RadioGroup = RadioGroupInner as unknown as RadioGroupComponent;
RadioGroup.Item = RadioGroupItemInner;
```

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS

---

### Task 3: index.ts에 export 추가

**Files:**

- Modify: `packages/solid/src/index.ts:15` (CheckBox/Radio export 근처)

**Step 1: export 추가**

기존 `export * from "./components/form-control/checkbox/Radio";` 라인 다음에 추가:

```typescript
export * from "./components/form-control/checkbox/CheckBoxGroup";
export * from "./components/form-control/checkbox/RadioGroup";
```

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS

---

### Task 4: 데모 페이지에 CheckBoxGroup / RadioGroup 섹션 추가

**Files:**

- Modify: `packages/solid-demo/src/pages/form-control/CheckBoxRadioPage.tsx`

**Step 1: 데모 페이지 수정**

기존 `CheckBoxRadioPage.tsx`의 import와 내용에 CheckBoxGroup/RadioGroup 데모 섹션을 추가한다.

import에 추가:

```tsx
import { CheckBox, CheckBoxGroup, Radio, RadioGroup, Topbar } from "@simplysm/solid";
```

기존 `{/* Controlled */}` 섹션 **앞에** 다음 두 섹션을 추가:

```tsx
{
  /* CheckBoxGroup */
}
<section>
  <h2 class="mb-6 text-2xl font-bold">CheckBoxGroup</h2>
  <div class="space-y-6">
    {/* 기본 사용 */}
    <div>
      <h3 class="mb-3 text-lg font-semibold">기본 사용</h3>
      <CheckBoxGroup value={selectedFruits()} onValueChange={setSelectedFruits} class="flex-col gap-1">
        <CheckBoxGroup.Item value="apple">사과</CheckBoxGroup.Item>
        <CheckBoxGroup.Item value="banana">바나나</CheckBoxGroup.Item>
        <CheckBoxGroup.Item value="cherry">체리</CheckBoxGroup.Item>
      </CheckBoxGroup>
      <p class="mt-2 text-sm text-base-600 dark:text-base-400">
        선택: <code class="rounded bg-base-200 px-1 dark:bg-base-700">{JSON.stringify(selectedFruits())}</code>
      </p>
    </div>

    {/* disabled 아이템 */}
    <div>
      <h3 class="mb-3 text-lg font-semibold">Disabled</h3>
      <CheckBoxGroup class="flex-col gap-1">
        <CheckBoxGroup.Item value="a">활성</CheckBoxGroup.Item>
        <CheckBoxGroup.Item value="b" disabled>
          비활성
        </CheckBoxGroup.Item>
      </CheckBoxGroup>
    </div>

    {/* 전체 disabled */}
    <div>
      <h3 class="mb-3 text-lg font-semibold">전체 Disabled</h3>
      <CheckBoxGroup disabled value={["a"]} class="flex-col gap-1">
        <CheckBoxGroup.Item value="a">옵션 A</CheckBoxGroup.Item>
        <CheckBoxGroup.Item value="b">옵션 B</CheckBoxGroup.Item>
      </CheckBoxGroup>
    </div>

    {/* 테마/사이즈 */}
    <div>
      <h3 class="mb-3 text-lg font-semibold">테마 & 사이즈</h3>
      <CheckBoxGroup theme="success" size="sm" value={["x"]} class="gap-3">
        <CheckBoxGroup.Item value="x">Small Success A</CheckBoxGroup.Item>
        <CheckBoxGroup.Item value="y">Small Success B</CheckBoxGroup.Item>
      </CheckBoxGroup>
    </div>

    {/* inset */}
    <div>
      <h3 class="mb-3 text-lg font-semibold">Inset</h3>
      <CheckBoxGroup inset value={["a"]} class="flex-col">
        <CheckBoxGroup.Item value="a">Inset A</CheckBoxGroup.Item>
        <CheckBoxGroup.Item value="b">Inset B</CheckBoxGroup.Item>
      </CheckBoxGroup>
    </div>
  </div>
</section>;

{
  /* RadioGroup */
}
<section>
  <h2 class="mb-6 text-2xl font-bold">RadioGroup</h2>
  <div class="space-y-6">
    {/* 기본 사용 */}
    <div>
      <h3 class="mb-3 text-lg font-semibold">기본 사용</h3>
      <RadioGroup value={selectedOption()} onValueChange={setSelectedOption} class="flex-col gap-1">
        <RadioGroup.Item value="A">옵션 A</RadioGroup.Item>
        <RadioGroup.Item value="B">옵션 B</RadioGroup.Item>
        <RadioGroup.Item value="C">옵션 C</RadioGroup.Item>
      </RadioGroup>
      <p class="mt-2 text-sm text-base-600 dark:text-base-400">
        선택: <code class="rounded bg-base-200 px-1 dark:bg-base-700">{selectedOption()}</code>
      </p>
    </div>

    {/* disabled 아이템 */}
    <div>
      <h3 class="mb-3 text-lg font-semibold">Disabled</h3>
      <RadioGroup class="flex-col gap-1">
        <RadioGroup.Item value="a">활성</RadioGroup.Item>
        <RadioGroup.Item value="b" disabled>
          비활성
        </RadioGroup.Item>
      </RadioGroup>
    </div>

    {/* 전체 disabled */}
    <div>
      <h3 class="mb-3 text-lg font-semibold">전체 Disabled</h3>
      <RadioGroup disabled value="a" class="flex-col gap-1">
        <RadioGroup.Item value="a">옵션 A</RadioGroup.Item>
        <RadioGroup.Item value="b">옵션 B</RadioGroup.Item>
      </RadioGroup>
    </div>

    {/* 테마/사이즈 */}
    <div>
      <h3 class="mb-3 text-lg font-semibold">테마 & 사이즈</h3>
      <RadioGroup theme="danger" size="lg" value="x" class="gap-3">
        <RadioGroup.Item value="x">Large Danger A</RadioGroup.Item>
        <RadioGroup.Item value="y">Large Danger B</RadioGroup.Item>
      </RadioGroup>
    </div>

    {/* inset */}
    <div>
      <h3 class="mb-3 text-lg font-semibold">Inset</h3>
      <RadioGroup inset value="a" class="flex-col">
        <RadioGroup.Item value="a">Inset A</RadioGroup.Item>
        <RadioGroup.Item value="b">Inset B</RadioGroup.Item>
      </RadioGroup>
    </div>
  </div>
</section>;
```

signal 추가 (기존 signal들 옆에):

```tsx
const [selectedFruits, setSelectedFruits] = createSignal<string[]>(["apple"]);
const [selectedOption, setSelectedOption] = createSignal<string>("A");
```

기존의 `selectedRadio` signal은 `selectedOption`으로 대체되므로, 기존 "Radio (그룹)" Controlled 섹션에서 `RadioGroup`을 사용하도록 업데이트한다.

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/solid-demo`
Expected: PASS

---

### Task 5: dev 서버 시작 및 수동 테스트

**Step 1: dev 서버를 background에서 시작**

Run (background): `pnpm dev`

출력에서 URL을 확인한다 (기본 `http://localhost:40081`이지만 포트가 다를 수 있음).

**Step 2: 브라우저로 데모 페이지 확인**

Playwright를 사용하여 데모 페이지에 접속:

1. `{URL}/#/home/form-control/checkbox-radio`로 이동
2. 페이지 스냅샷을 캡처하여 CheckBoxGroup / RadioGroup 섹션이 올바르게 렌더링되는지 확인

**Step 3: CheckBoxGroup 인터랙션 테스트**

1. CheckBoxGroup "기본 사용"에서 체크박스를 클릭하여 선택/해제 동작 확인
2. 선택된 값 배열이 올바르게 표시되는지 확인

**Step 4: RadioGroup 인터랙션 테스트**

1. RadioGroup "기본 사용"에서 라디오를 클릭하여 단일 선택 동작 확인
2. 선택된 값이 올바르게 표시되는지 확인

**Step 5: 린트 실행**

Run: `pnpm lint packages/solid packages/solid-demo`
Expected: PASS

---

### Task 6: 커밋

**Step 1: 커밋**

```bash
git add packages/solid/src/components/form-control/checkbox/CheckBoxGroup.tsx \
       packages/solid/src/components/form-control/checkbox/RadioGroup.tsx \
       packages/solid/src/index.ts \
       packages/solid-demo/src/pages/form-control/CheckBoxRadioPage.tsx
git commit -m "feat(solid): add CheckBoxGroup and RadioGroup compound components

Context-based parent-child communication pattern.
CheckBoxGroup manages T[] for multi-select, RadioGroup manages T for single-select.
Both reuse existing CheckBox/Radio components internally.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
