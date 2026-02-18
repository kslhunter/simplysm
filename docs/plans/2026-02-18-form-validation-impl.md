# Form Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Add built-in validation to all form control components with an enhanced Invalid component using Fragment rendering, variant-based visual display, and native form validation integration.

**Architecture:** Enhanced `Invalid` component renders as Fragment with `children()` helper for target detection. Each form control computes error messages internally and wraps output with `Invalid`. Native `<form>` + `setCustomValidity` + `reportValidity()` for form submit gating.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS, Vitest + @solidjs/testing-library

---

### Task 1: Rewrite Invalid Component

**Files:**
- Modify: `packages/solid/src/components/form-control/Invalid.tsx`

**Step 1: Write the failing test**

Create test file `packages/solid/tests/components/form-control/Invalid.spec.tsx`:

```tsx
import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { createSignal } from "solid-js";
import { Invalid } from "../../../src/components/form-control/Invalid";

describe("Invalid 컴포넌트", () => {
  describe("Fragment 렌더링", () => {
    it("래퍼 div 없이 children과 hidden input을 렌더링한다", () => {
      const { container } = render(() => (
        <Invalid message="에러">
          <div data-testid="child">내용</div>
        </Invalid>
      ));
      // Fragment render: container 직계 자식이 div와 input
      const child = container.querySelector("[data-testid='child']");
      const hiddenInput = container.querySelector("input[aria-hidden='true']");
      expect(child).toBeTruthy();
      expect(hiddenInput).toBeTruthy();
      // wrapper div가 없으므로 child가 container의 직계 자식이어야 함
      expect(child!.parentElement).toBe(container);
    });
  });

  describe("setCustomValidity", () => {
    it("message가 있으면 setCustomValidity가 설정된다", () => {
      const { container } = render(() => (
        <Invalid message="필수 입력 항목입니다">
          <div>내용</div>
        </Invalid>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("필수 입력 항목입니다");
    });

    it("message가 없으면 유효 상태이다", () => {
      const { container } = render(() => (
        <Invalid>
          <div>내용</div>
        </Invalid>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("message가 변경되면 setCustomValidity도 업데이트된다", () => {
      const [msg, setMsg] = createSignal<string | undefined>("에러");
      const { container } = render(() => (
        <Invalid message={msg()}>
          <div>내용</div>
        </Invalid>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("에러");

      setMsg(undefined);
      expect(hiddenInput.validity.valid).toBe(true);
    });
  });

  describe("variant='border'", () => {
    it("message가 있으면 target에 border-danger-500 클래스가 추가된다", () => {
      const { container } = render(() => (
        <Invalid variant="border" message="에러">
          <div data-testid="target" class="border">내용</div>
        </Invalid>
      ));
      const target = container.querySelector("[data-testid='target']") as HTMLElement;
      expect(target.classList.contains("border-danger-500")).toBe(true);
    });

    it("message가 없으면 border-danger-500 클래스가 없다", () => {
      const { container } = render(() => (
        <Invalid variant="border">
          <div data-testid="target" class="border">내용</div>
        </Invalid>
      ));
      const target = container.querySelector("[data-testid='target']") as HTMLElement;
      expect(target.classList.contains("border-danger-500")).toBe(false);
    });
  });

  describe("variant='dot' (기본값)", () => {
    it("message가 있으면 target 내부에 dot 요소가 삽입된다", () => {
      const { container } = render(() => (
        <Invalid message="에러">
          <div data-testid="target">내용</div>
        </Invalid>
      ));
      const target = container.querySelector("[data-testid='target']") as HTMLElement;
      const dot = target.querySelector("[data-invalid-dot]");
      expect(dot).toBeTruthy();
    });

    it("message가 없으면 dot 요소가 없다", () => {
      const { container } = render(() => (
        <Invalid>
          <div data-testid="target">내용</div>
        </Invalid>
      ));
      const target = container.querySelector("[data-testid='target']") as HTMLElement;
      const dot = target.querySelector("[data-invalid-dot]");
      expect(dot).toBeFalsy();
    });

    it("target이 position:static이면 relative로 변경된다", () => {
      const { container } = render(() => (
        <Invalid message="에러">
          <div data-testid="target" style={{ position: "static" }}>내용</div>
        </Invalid>
      ));
      const target = container.querySelector("[data-testid='target']") as HTMLElement;
      expect(getComputedStyle(target).position).toBe("relative");
    });
  });

  describe("touchMode", () => {
    it("touchMode일 때 초기에는 시각적 표시가 없다", () => {
      const { container } = render(() => (
        <Invalid variant="border" message="에러" touchMode>
          <div data-testid="target" class="border">내용</div>
        </Invalid>
      ));
      const target = container.querySelector("[data-testid='target']") as HTMLElement;
      expect(target.classList.contains("border-danger-500")).toBe(false);
    });

    it("touchMode일 때 setCustomValidity는 항상 설정된다", () => {
      const { container } = render(() => (
        <Invalid variant="border" message="에러" touchMode>
          <div>내용</div>
        </Invalid>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("에러");
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/components/form-control/Invalid.spec.tsx --project=solid --run`
Expected: FAIL (current Invalid has wrapper div, no variant/touchMode)

**Step 3: Implement Invalid rewrite**

Rewrite `packages/solid/src/components/form-control/Invalid.tsx`:

- Remove wrapper `<div>`, render as Fragment: `<>{children}<input hidden .../></>`
- Add `variant` prop: `"border" | "dot"` (default `"dot"`)
- Add `touchMode` prop: boolean
- Use `children()` helper to detect first child element as target
- `variant="border"`: add/remove `border-danger-500` on target via `createEffect`
- `variant="dot"`: inject/remove dot element inside target, set position relative if static
- `setCustomValidity(message)` always set regardless of touchMode
- Visual display gated by touchMode + touched state (focusout on target)
- Focus redirect from hidden input to first focusable child

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/components/form-control/Invalid.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/form-control/Invalid.tsx packages/solid/tests/components/form-control/Invalid.spec.tsx
git commit -m "feat(solid): rewrite Invalid with Fragment render, variant, touchMode"
```

---

### Task 2: Remove Checkbox/Radio theme prop

**Files:**
- Modify: `packages/solid/src/components/form-control/checkbox/Checkbox.styles.ts`
- Modify: `packages/solid/src/components/form-control/checkbox/Checkbox.tsx`
- Modify: `packages/solid/src/components/form-control/checkbox/Radio.tsx`
- Modify: `packages/solid/src/components/form-control/checkbox/CheckboxGroup.tsx`
- Modify: `packages/solid/src/components/form-control/checkbox/RadioGroup.tsx`
- Modify: `packages/solid/tests/components/form-control/checkbox/Checkbox.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/checkbox/Radio.spec.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/CheckBoxRadioPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/CheckBoxRadioGroupPage.tsx`
- Modify: `packages/solid/src/index.ts` (remove CheckboxTheme export if exported)

**Step 1: Update tests — remove theme-related tests**

In `Checkbox.spec.tsx`: Remove the test `"theme prop에 따라 스타일이 달라진다"` (line 84-91).
In `Radio.spec.tsx`: Remove any theme-related tests if they exist.

**Step 2: Update Checkbox.styles.ts**

- Remove `CheckboxTheme` type
- Remove `themeCheckedClasses` object
- Add a single `checkedClass` constant using primary theme:
  ```typescript
  export const checkedClass = clsx("border-primary-500 bg-primary-500", "text-white");
  ```

**Step 3: Update Checkbox.tsx**

- Remove `theme` from props interface and splitProps
- Replace `themeCheckedClasses[theme]` with `checkedClass`

**Step 4: Update Radio.tsx**

- Remove `theme` from props interface and splitProps
- Replace `themeCheckedClasses[theme]` with `checkedClass`

**Step 5: Update CheckboxGroup.tsx and RadioGroup.tsx**

- Remove `theme` from props, context, and splitProps
- Remove `theme` pass-through to child Checkbox/Radio

**Step 6: Update demo pages**

In `CheckBoxRadioPage.tsx`:
- Remove the `themes` array and theme imports
- Remove the entire "테마" section for both Checkbox and Radio

In `CheckBoxRadioGroupPage.tsx`:
- Remove any `theme` usage

**Step 7: Run tests**

Run: `pnpm vitest packages/solid/tests/components/form-control/checkbox/ --project=solid --run`
Expected: PASS

**Step 8: Commit**

```bash
git add packages/solid/src/components/form-control/checkbox/ packages/solid/tests/components/form-control/checkbox/ packages/solid-demo/src/pages/form-control/CheckBoxRadioPage.tsx packages/solid-demo/src/pages/form-control/CheckBoxRadioGroupPage.tsx packages/solid/src/index.ts
git commit -m "refactor(solid): remove theme prop from Checkbox/Radio, fix to primary"
```

---

### Task 3: Add validation to TextInput

**Files:**
- Modify: `packages/solid/src/components/form-control/field/TextInput.tsx`
- Modify: `packages/solid/tests/components/form-control/field/TextInput.spec.tsx`

**Step 1: Add validation tests**

Append to `TextInput.spec.tsx`:

```tsx
import { Invalid } from "../../../../src/components/form-control/Invalid";

describe("validation", () => {
  it("required일 때 빈 값이면 hidden input에 에러 메시지가 설정된다", () => {
    const { container } = render(() => <TextInput required value="" />);
    const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
    expect(hiddenInput.validationMessage).toBe("필수 입력 항목입니다");
  });

  it("required일 때 값이 있으면 유효하다", () => {
    const { container } = render(() => <TextInput required value="hello" />);
    const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
    expect(hiddenInput.validity.valid).toBe(true);
  });

  it("minLength 위반 시 에러 메시지가 설정된다", () => {
    const { container } = render(() => <TextInput minLength={3} value="ab" />);
    const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
    expect(hiddenInput.validationMessage).toBe("최소 3자 이상 입력하세요");
  });

  it("maxLength 위반 시 에러 메시지가 설정된다", () => {
    const { container } = render(() => <TextInput maxLength={5} value="abcdef" />);
    const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
    expect(hiddenInput.validationMessage).toBe("최대 5자까지 입력 가능합니다");
  });

  it("pattern 위반 시 에러 메시지가 설정된다", () => {
    const { container } = render(() => <TextInput pattern="^[0-9]+$" value="abc" />);
    const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
    expect(hiddenInput.validationMessage).toBe("입력 형식이 올바르지 않습니다");
  });

  it("validate 함수가 에러를 반환하면 해당 메시지가 설정된다", () => {
    const { container } = render(() => (
      <TextInput
        validate={(v) => (v.includes("@") ? undefined : "이메일 형식이 아닙니다")}
        value="hello"
      />
    ));
    const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
    expect(hiddenInput.validationMessage).toBe("이메일 형식이 아닙니다");
  });

  it("기본 validator 통과 후 validate 함수가 실행된다", () => {
    const { container } = render(() => (
      <TextInput
        required
        validate={(v) => (v.includes("@") ? undefined : "이메일 형식이 아닙니다")}
        value=""
      />
    ));
    const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
    // required가 먼저 실패하므로 required 메시지가 표시됨
    expect(hiddenInput.validationMessage).toBe("필수 입력 항목입니다");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/components/form-control/field/TextInput.spec.tsx --project=solid --run`
Expected: FAIL (required/minLength/validate props don't exist yet)

**Step 3: Implement validation in TextInput**

- Add props: `required`, `minLength`, `maxLength`, `pattern`, `validate`, `touchMode`
- Add `errorMsg` createMemo that runs validators in order
- Wrap return JSX with `<Invalid variant={inset ? "dot" : "border"} message={errorMsg()} touchMode={touchMode}>`
- Import Invalid

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/components/form-control/field/TextInput.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/form-control/field/TextInput.tsx packages/solid/tests/components/form-control/field/TextInput.spec.tsx
git commit -m "feat(solid): add validation props to TextInput"
```

---

### Task 4: Add validation to Textarea

**Files:**
- Modify: `packages/solid/src/components/form-control/field/Textarea.tsx`
- Modify: `packages/solid/tests/components/form-control/field/Textarea.spec.tsx`

**Step 1: Add validation tests**

Append tests for `required`, `minLength`, `maxLength`, `validate`, `touchMode` following the same pattern as TextInput tests.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/components/form-control/field/Textarea.spec.tsx --project=solid --run`

**Step 3: Implement validation in Textarea**

Same pattern as TextInput: add props, errorMsg memo, wrap with Invalid.

**Step 4: Run test to verify it passes**

**Step 5: Commit**

```bash
git add packages/solid/src/components/form-control/field/Textarea.tsx packages/solid/tests/components/form-control/field/Textarea.spec.tsx
git commit -m "feat(solid): add validation props to Textarea"
```

---

### Task 5: Add validation to NumberInput

**Files:**
- Modify: `packages/solid/src/components/form-control/field/NumberInput.tsx`
- Modify: `packages/solid/tests/components/form-control/field/NumberInput.spec.tsx`

**Step 1: Add validation tests**

Tests for `required` (value is undefined), `min`, `max`, `validate`.

**Step 2-5: Same TDD cycle as above**

```bash
git commit -m "feat(solid): add validation props to NumberInput"
```

---

### Task 6: Add validation to DatePicker, DateTimePicker, TimePicker

**Files:**
- Modify: `packages/solid/src/components/form-control/field/DatePicker.tsx`
- Modify: `packages/solid/src/components/form-control/field/DateTimePicker.tsx`
- Modify: `packages/solid/src/components/form-control/field/TimePicker.tsx`
- Modify: `packages/solid/tests/components/form-control/field/DatePicker.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/field/DateTimePicker.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/field/TimePicker.spec.tsx`

**Step 1: Add validation tests**

Tests for `required` (value is undefined), `min`, `max`, `validate`. For DatePicker, min/max compare DateOnly values. For DateTimePicker, compare DateTime. For TimePicker, compare Time.

Note: DatePicker/DateTimePicker already have `min`/`max` props for the native HTML `<input>` element, but they don't currently set `setCustomValidity`. The new validation adds error messages when values violate these constraints.

**Step 2-5: Same TDD cycle**

```bash
git commit -m "feat(solid): add validation props to DatePicker, DateTimePicker, TimePicker"
```

---

### Task 7: Add validation to Select and Combobox

**Files:**
- Modify: `packages/solid/src/components/form-control/select/Select.tsx`
- Modify: `packages/solid/src/components/form-control/combobox/Combobox.tsx`
- Modify: `packages/solid/tests/components/form-control/select/Select.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/combobox/Combobox.spec.tsx`

**Step 1: Add validation tests**

Tests for `required` (value is undefined), `validate`, `touchMode`.

Note: Select already has a `required` prop but only uses it for `aria-required`. Now also set `setCustomValidity`. Combobox also already has `required`.

**Step 2-5: Same TDD cycle**

```bash
git commit -m "feat(solid): add validation props to Select and Combobox"
```

---

### Task 8: Add validation to Checkbox, CheckboxGroup, RadioGroup

**Files:**
- Modify: `packages/solid/src/components/form-control/checkbox/Checkbox.tsx`
- Modify: `packages/solid/src/components/form-control/checkbox/Radio.tsx`
- Modify: `packages/solid/src/components/form-control/checkbox/CheckboxGroup.tsx`
- Modify: `packages/solid/src/components/form-control/checkbox/RadioGroup.tsx`
- Modify: `packages/solid/tests/components/form-control/checkbox/Checkbox.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/checkbox/Radio.spec.tsx`

**Step 1: Add validation tests**

For Checkbox: `required` (value must be true to pass), `validate`, `touchMode`.
For CheckboxGroup: `required` (at least one selected), `validate`, `touchMode`.
For RadioGroup: `required` (value must not be undefined), `validate`, `touchMode`.

Checkbox/Radio use `variant="border"` since they have visible borders. In inset mode, use `variant="dot"`.

**Step 2-5: Same TDD cycle**

```bash
git commit -m "feat(solid): add validation props to Checkbox, CheckboxGroup, RadioGroup"
```

---

### Task 9: Add validation to ColorPicker

**Files:**
- Modify: `packages/solid/src/components/form-control/color-picker/ColorPicker.tsx`
- Modify: `packages/solid/tests/components/form-control/color-picker/ColorPicker.spec.tsx`

**Step 1: Add validation tests**

Tests for `required`, `validate`, `touchMode`.

Note: ColorPicker renders as `<input type="color">` directly. Wrapping with Invalid will change its structure — the input will be wrapped. Consider using `variant="border"` since it has a border.

**Step 2-5: Same TDD cycle**

```bash
git commit -m "feat(solid): add validation props to ColorPicker"
```

---

### Task 10: Update demo pages — validation showcase

**Files:**
- Modify: `packages/solid-demo/src/pages/form-control/FieldPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/CheckBoxRadioPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/CheckBoxRadioGroupPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/SelectPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/ComboboxPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/ColorPickerPage.tsx`

**Step 1: Update FieldPage.tsx**

Replace the current Invalid wrapping examples with built-in validation props. Add a "Validation" section per component:

```tsx
{/* Validation */}
<div>
  <h3 class="mb-3 text-lg font-semibold">Validation</h3>
  <form onSubmit={(e) => { e.preventDefault(); e.currentTarget.reportValidity(); }}>
    <div class="flex flex-col items-start gap-3">
      <TextInput required placeholder="필수 입력" />
      <TextInput required minLength={3} placeholder="최소 3자" />
      <TextInput pattern="^[0-9]+$" placeholder="숫자만 입력" />
      <TextInput
        validate={(v) => (v.includes("@") ? undefined : "@ 문자가 필요합니다")}
        placeholder="커스텀 검증"
      />
      <TextInput required touchMode placeholder="touchMode (blur 후 표시)" />
      <NumberInput required min={0} max={100} placeholder="0~100" />
      <Button type="submit" theme="primary" variant="solid">Submit</Button>
    </div>
  </form>
</div>
```

**Step 2: Update CheckBoxRadioPage.tsx and CheckBoxRadioGroupPage.tsx**

Add validation examples (`required`). Remove theme references.

**Step 3: Update SelectPage.tsx, ComboboxPage.tsx, ColorPickerPage.tsx**

Add validation examples (`required`, `validate`).

**Step 4: Typecheck**

Run: `pnpm typecheck packages/solid-demo`

**Step 5: Commit**

```bash
git add packages/solid-demo/
git commit -m "feat(solid-demo): update demo pages with validation examples"
```

---

### Task 11: Update LoginPage with touchMode example

**Files:**
- Modify: `packages/solid-demo/src/pages/LoginPage.tsx`

**Step 1: Update LoginPage**

If it exists, add `touchMode` to the login form fields as a real-world example.

**Step 2: Commit**

```bash
git add packages/solid-demo/src/pages/LoginPage.tsx
git commit -m "feat(solid-demo): add touchMode validation to LoginPage"
```

---

### Task 12: Typecheck and lint

**Step 1: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 2: Run lint**

Run: `pnpm lint packages/solid`
Fix any issues.

**Step 3: Run all solid tests**

Run: `pnpm vitest packages/solid --project=solid --run`
Expected: PASS

**Step 4: Commit fixes if needed**

```bash
git commit -m "fix(solid): fix typecheck and lint issues"
```

---

### Task 13: Update README.md

**Files:**
- Modify: `packages/solid/README.md`

**Step 1: Update Invalid section**

Document new props: `variant`, `touchMode`, Fragment rendering behavior.

**Step 2: Update form control sections**

Document validation props for each component: `required`, `minLength`, `maxLength`, `min`, `max`, `pattern`, `validate`, `touchMode`.

**Step 3: Add Form Validation section**

Document native `<form>` + `reportValidity()` integration pattern.

**Step 4: Note Checkbox/Radio theme removal**

Document that `theme` prop was removed, checked state now uses primary color only.

**Step 5: Commit**

```bash
git add packages/solid/README.md
git commit -m "docs(solid): update README with validation documentation"
```
