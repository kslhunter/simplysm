# Solid 패키지 즉시 수정 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 코드 리뷰 토론에서 확정된 즉시 수정 5건을 구현한다.

**Architecture:** 각 수정은 독립적이며 순서대로 진행한다. #1(네이밍 통일)이 가장 파급 범위가 크므로 먼저 처리하고, 나머지는 비용이 낮은 순서로 진행한다.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS, Vitest

---

### Task 1: CheckBox `onChange` → `onValueChange` 네이밍 변경

**Files:**

- Modify: `packages/solid/src/components/form-control/checkbox/CheckBox.tsx:22-46`
- Modify: `packages/solid/tests/components/form-control/checkbox/CheckBox.spec.tsx:64-69`
- Modify: `packages/solid-demo/src/pages/form-control/CheckBoxRadioPage.tsx:158`

**Step 1: CheckBox.tsx의 props 인터페이스와 splitProps 수정**

```tsx
// CheckBox.tsx:24 — onChange → onValueChange
export interface CheckBoxProps {
  value?: boolean;
  onValueChange?: (value: boolean) => void; // 변경
  disabled?: boolean;
  size?: CheckBoxSize;
  theme?: CheckBoxTheme;
  inset?: boolean;
  inline?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}
```

```tsx
// CheckBox.tsx:38 — splitProps의 "onChange" → "onValueChange"
const [local, rest] = splitProps(props, [
  "value",
  "onValueChange", // 변경
  "disabled",
  "size",
  "theme",
  "inset",
  "inline",
  "class",
  "style",
  "children",
]);
```

```tsx
// CheckBox.tsx:49-52 — createPropSignal의 onChange 참조 수정
const [value, setValue] = createPropSignal({
  value: () => local.value ?? false,
  onChange: () => local.onValueChange, // 변경
});
```

**Step 2: CheckBox 테스트의 onChange 참조 수정**

```tsx
// CheckBox.spec.tsx:64-69 — onChange → onValueChange
it("onValueChange가 클릭 시 호출된다", () => {
  const handleChange = vi.fn();
  const { getByRole } = render(() => <CheckBox value={false} onValueChange={handleChange} />);

  fireEvent.click(getByRole("checkbox"));
  expect(handleChange).toHaveBeenCalledWith(true);
});

// CheckBox.spec.tsx:73-74 — onChange → onValueChange
const [value, setValue] = createSignal(false);
const { getByRole } = render(() => <CheckBox value={value()} onValueChange={setValue} />);
```

**Step 3: 데모 페이지 수정**

```tsx
// CheckBoxRadioPage.tsx:158 — onChange → onValueChange
<CheckBox value={controlledCheck()} onValueChange={setControlledCheck}>
```

**Step 4: 테스트 실행**

Run: `pnpm vitest packages/solid/tests/components/form-control/checkbox/CheckBox.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/solid/src/components/form-control/checkbox/CheckBox.tsx packages/solid/tests/components/form-control/checkbox/CheckBox.spec.tsx packages/solid-demo/src/pages/form-control/CheckBoxRadioPage.tsx
git commit -m "refactor(solid): CheckBox onChange → onValueChange로 네이밍 통일"
```

---

### Task 2: Radio `onChange` → `onValueChange` 네이밍 변경

**Files:**

- Modify: `packages/solid/src/components/form-control/checkbox/Radio.tsx:20-45`
- Modify: `packages/solid/tests/components/form-control/checkbox/Radio.spec.tsx:66-82`
- Modify: `packages/solid-demo/src/pages/form-control/CheckBoxRadioPage.tsx:177-183`

**Step 1: Radio.tsx의 props 인터페이스와 splitProps 수정**

```tsx
// Radio.tsx:22 — onChange → onValueChange
export interface RadioProps {
  value?: boolean;
  onValueChange?: (value: boolean) => void; // 변경
  disabled?: boolean;
  size?: CheckBoxSize;
  theme?: CheckBoxTheme;
  inset?: boolean;
  inline?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}
```

```tsx
// Radio.tsx:38 — splitProps의 "onChange" → "onValueChange"
const [local, rest] = splitProps(props, [
  "value",
  "onValueChange",  // 변경
  "disabled",
  ...
]);
```

```tsx
// Radio.tsx:49-52 — createPropSignal의 onChange 참조 수정
const [value, setValue] = createPropSignal({
  value: () => local.value ?? false,
  onChange: () => local.onValueChange, // 변경
});
```

**Step 2: Radio 테스트의 onChange 참조 수정**

```tsx
// Radio.spec.tsx:66-69 — onChange → onValueChange
it("onValueChange가 클릭 시 호출된다", () => {
  const handleChange = vi.fn();
  const { getByRole } = render(() => <Radio value={false} onValueChange={handleChange} />);

  fireEvent.click(getByRole("radio"));
  expect(handleChange).toHaveBeenCalledWith(true);
});

// Radio.spec.tsx:75-76 — onChange → onValueChange
const [value, setValue] = createSignal(false);
const { getByRole } = render(() => <Radio value={value()} onValueChange={setValue} />);
```

**Step 3: 데모 페이지 수정**

```tsx
// CheckBoxRadioPage.tsx:177-183 — onChange → onValueChange
<Radio value={selectedRadio() === "A"} onValueChange={() => setSelectedRadio("A")}>
  옵션 A
</Radio>
<Radio value={selectedRadio() === "B"} onValueChange={() => setSelectedRadio("B")}>
  옵션 B
</Radio>
<Radio value={selectedRadio() === "C"} onValueChange={() => setSelectedRadio("C")}>
  옵션 C
</Radio>
```

**Step 4: 테스트 실행**

Run: `pnpm vitest packages/solid/tests/components/form-control/checkbox/Radio.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/solid/src/components/form-control/checkbox/Radio.tsx packages/solid/tests/components/form-control/checkbox/Radio.spec.tsx packages/solid-demo/src/pages/form-control/CheckBoxRadioPage.tsx
git commit -m "refactor(solid): Radio onChange → onValueChange로 네이밍 통일"
```

---

### Task 3: TextAreaField `onChange` → `onValueChange` 네이밍 변경

**Files:**

- Modify: `packages/solid/src/components/form-control/field/TextAreaField.tsx:19-20,79,94`
- Modify: `packages/solid/tests/components/form-control/field/TextAreaField.spec.tsx:34-36,44-46,57`
- Modify: `packages/solid-demo/src/pages/form-control/FieldPage.tsx:412`

**Step 1: TextAreaField.tsx의 props 인터페이스와 splitProps 수정**

```tsx
// TextAreaField.tsx:19-20 — JSDoc과 prop명 변경
/** 값 변경 콜백 */
onValueChange?: (value: string) => void;
```

```tsx
// TextAreaField.tsx:79 — splitProps의 "onChange" → "onValueChange"
const [local, rest] = splitProps(props, [
  "value",
  "onValueChange",  // 변경
  ...
]);
```

```tsx
// TextAreaField.tsx:94 — createPropSignal의 onChange 참조 수정
const [value, setValue] = createPropSignal({
  value: () => local.value ?? "",
  onChange: () => local.onValueChange, // 변경
});
```

**Step 2: JSDoc 예제도 수정**

```tsx
// TextAreaField.tsx:70-71 — 예제 코드 수정
* <TextAreaField value={text()} onValueChange={setText} />
*
* // 최소 줄 수 지정
* <TextAreaField minRows={3} value={text()} onValueChange={setText} />
```

**Step 3: TextAreaField 테스트의 onChange 참조 수정**

```tsx
// TextAreaField.spec.tsx:34-36 — onChange → onValueChange
it("onValueChange가 입력 시 호출된다", () => {
  const handleChange = vi.fn();
  const { container } = render(() => <TextAreaField value="" onValueChange={handleChange} />);
  ...
  expect(handleChange).toHaveBeenCalledWith("Test");
});

// TextAreaField.spec.tsx:44-46 — onChange → onValueChange
const [value, setValue] = createSignal("Initial");
const { container } = render(() => <TextAreaField value={value()} onValueChange={setValue} />);
```

**Step 4: 데모 페이지 수정**

```tsx
// FieldPage.tsx:412 — onChange → onValueChange
<TextAreaField
  value={controlledTextArea()}
  onValueChange={setControlledTextArea}
  placeholder="내용을 입력하세요"
  minRows={3}
/>
```

**Step 5: 테스트 실행**

Run: `pnpm vitest packages/solid/tests/components/form-control/field/TextAreaField.spec.tsx --project=solid --run`
Expected: PASS

**Step 6: 커밋**

```bash
git add packages/solid/src/components/form-control/field/TextAreaField.tsx packages/solid/tests/components/form-control/field/TextAreaField.spec.tsx packages/solid-demo/src/pages/form-control/FieldPage.tsx
git commit -m "refactor(solid): TextAreaField onChange → onValueChange로 네이밍 통일"
```

---

### Task 4: 시맨틱 색상 적용 (red-500 → danger-500, blue-500 → primary-500)

**Files:**

- Modify: `packages/solid/src/components/form-control/field/Field.styles.ts:14,25,45`
- Modify: `packages/solid/src/components/feedback/notification/NotificationBell.tsx:38`
- Modify: `packages/solid/tests/components/form-control/field/TextAreaField.spec.tsx:104`

**Step 1: Field.styles.ts 수정**

```typescript
// Field.styles.ts:14 — focus-within:border-blue-500 → focus-within:border-primary-500
"focus-within:border-primary-500",

// Field.styles.ts:25 — border-red-500 → border-danger-500
export const fieldErrorClass = clsx`border-danger-500`;

// Field.styles.ts:45 — focus-within:border-blue-500 → focus-within:border-primary-500
"focus-within:border-primary-500",
```

**Step 2: NotificationBell.tsx 수정**

```typescript
// NotificationBell.tsx:38 — bg-red-500 → bg-danger-500
"bg-danger-500",
```

**Step 3: TextAreaField 테스트의 에러 클래스 검증 수정**

```tsx
// TextAreaField.spec.tsx:104 — border-red-500 → border-danger-500
expect(wrapper.classList.contains("border-danger-500")).toBe(true);
```

**Step 4: 테스트 실행**

Run: `pnpm vitest packages/solid/tests --project=solid --run`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/solid/src/components/form-control/field/Field.styles.ts packages/solid/src/components/feedback/notification/NotificationBell.tsx packages/solid/tests/components/form-control/field/TextAreaField.spec.tsx
git commit -m "fix(solid): 원시 Tailwind 색상을 시맨틱 색상으로 변경 (red→danger, blue→primary)"
```

---

### Task 5: CheckBox/Radio disabled 시 tabIndex 수정

**Files:**

- Modify: `packages/solid/src/components/form-control/checkbox/CheckBox.tsx:92`
- Modify: `packages/solid/src/components/form-control/checkbox/Radio.tsx:90`

**Step 1: CheckBox.tsx tabIndex 수정**

```tsx
// CheckBox.tsx:92 — tabIndex={0} → tabIndex={local.disabled ? -1 : 0}
tabIndex={local.disabled ? -1 : 0}
```

**Step 2: Radio.tsx tabIndex 수정**

```tsx
// Radio.tsx:90 — tabIndex={0} → tabIndex={local.disabled ? -1 : 0}
tabIndex={local.disabled ? -1 : 0}
```

**Step 3: 테스트 실행**

Run: `pnpm vitest packages/solid/tests/components/form-control/checkbox --project=solid --run`
Expected: PASS

**Step 4: 커밋**

```bash
git add packages/solid/src/components/form-control/checkbox/CheckBox.tsx packages/solid/src/components/form-control/checkbox/Radio.tsx
git commit -m "fix(solid): CheckBox/Radio disabled 시 tabIndex를 -1로 설정하여 키보드 포커스 방지"
```

---

### Task 6: Dropdown transitionend fallback 추가

**Files:**

- Modify: `packages/solid/src/components/disclosure/Dropdown.tsx:132-136`

**Step 1: 닫힘 분기에 setTimeout fallback 추가**

`Dropdown.tsx:132-136` — `else if (mounted())` 분기에 fallback 추가:

```tsx
} else if (mounted()) {
  // 닫힘: 애니메이션 시작 (transitionend에서 마운트 해제)
  setAnimating(false);
  // prefers-reduced-motion 등으로 transitionend가 발생하지 않는 경우를 위한 fallback
  const fallbackTimer = setTimeout(() => {
    if (!open()) setMounted(false);
  }, 200);
  onCleanup(() => clearTimeout(fallbackTimer));
}
```

**Step 2: 테스트 실행**

Run: `pnpm vitest packages/solid/tests --project=solid --run`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/src/components/disclosure/Dropdown.tsx
git commit -m "fix(solid): Dropdown 닫힘 시 transitionend 미발생 대비 setTimeout fallback 추가"
```

---

### Task 7: DateField/TimeField fallback에 rest props 전달

**Files:**

- Modify: `packages/solid/src/components/form-control/field/DateField.tsx:211`
- Modify: `packages/solid/src/components/form-control/field/TimeField.tsx:160-167`

**Step 1: DateField.tsx fallback에 `{...rest}` 추가**

```tsx
// DateField.tsx:211 — rest props 추가
<div
  {...rest}
  data-date-field
  class={twMerge(getWrapperClass(), "sd-date-field")}
  style={local.style}
  title={local.title}
>
  {displayValue() || "\u00A0"}
</div>
```

**Step 2: TimeField.tsx fallback에 `{...rest}` 추가**

```tsx
// TimeField.tsx:160-167 — rest props 추가
<div
  {...rest}
  data-time-field
  class={twMerge(getWrapperClass(), "sd-time-field")}
  style={local.style}
  title={local.title}
>
  {displayValue() || "\u00A0"}
</div>
```

**Step 3: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS (에러 없음)

**Step 4: 커밋**

```bash
git add packages/solid/src/components/form-control/field/DateField.tsx packages/solid/src/components/form-control/field/TimeField.tsx
git commit -m "fix(solid): DateField/TimeField fallback div에 rest props 전달 추가"
```

---

## 전체 검증

모든 Task 완료 후:

```bash
pnpm vitest packages/solid/tests --project=solid --run
pnpm typecheck packages/solid
pnpm lint packages/solid
```

Expected: 모두 PASS
