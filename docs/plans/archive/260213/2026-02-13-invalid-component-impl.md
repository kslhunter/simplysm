# Invalid Component Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Create `<Invalid>` wrapper component using native Constraint Validation API, and remove `error` prop from all form controls.

**Architecture:** `<Invalid>` wraps children in a `relative` div, inserts a hidden `<input>` with `setCustomValidity(message)`, and shows a red dot indicator when invalid. Focus on hidden input redirects to the actual focusable child via `findFirstFocusableChild()` from `@simplysm/core-browser`.

**Tech Stack:** SolidJS, Tailwind CSS, `@simplysm/core-browser` (element extensions)

---

### Task 1: Create `<Invalid>` component

**Files:**
- Create: `packages/solid/src/components/form-control/Invalid.tsx`

**Step 1: Create the Invalid component**

```typescript
import { type ParentComponent, createEffect, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import "@simplysm/core-browser";

export interface InvalidProps {
  /** Validation error message. Non-empty = invalid. */
  message?: string;
  /** Custom class */
  class?: string;
}

const indicatorClass = clsx(
  "absolute top-0.5 left-0.5",
  "size-1.5 rounded-full",
  "bg-danger-500",
  "pointer-events-none select-none",
);

const hiddenInputClass = clsx(
  "absolute left-0.5 bottom-0",
  "size-px opacity-0",
  "pointer-events-none -z-10",
  "select-none",
);

export const Invalid: ParentComponent<InvalidProps> = (props) => {
  const [local, rest] = splitProps(props, ["message", "class", "children"]);

  let hiddenInputEl!: HTMLInputElement;

  // message 변경 시 setCustomValidity 반응형 업데이트
  createEffect(() => {
    const msg = local.message ?? "";
    hiddenInputEl.setCustomValidity(msg);
  });

  const handleHiddenInputFocus = (e: FocusEvent) => {
    const container = (e.currentTarget as HTMLElement).parentElement;
    if (!container) return;
    const focusable = container.findFirstFocusableChild();
    if (focusable && focusable !== e.currentTarget) {
      focusable.focus();
    }
  };

  return (
    <div {...rest} class={twMerge("relative inline-block", local.class)}>
      {local.children}
      <div
        class={indicatorClass}
        style={{ display: (local.message ?? "") !== "" ? "block" : "none" }}
      />
      <input
        ref={hiddenInputEl}
        type="text"
        class={hiddenInputClass}
        tabIndex={-1}
        aria-hidden="true"
        onFocus={handleHiddenInputFocus}
      />
    </div>
  );
};
```

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/form-control/Invalid.tsx
git commit -m "feat(solid): add Invalid wrapper component"
```

---

### Task 2: Export `Invalid` from index.ts

**Files:**
- Modify: `packages/solid/src/index.ts`

**Step 1: Add export**

Add after line 24 (after `ThemeToggle` export):

```typescript
export * from "./components/form-control/Invalid";
```

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/index.ts
git commit -m "feat(solid): export Invalid component from index"
```

---

### Task 3: Remove `error` prop from TextInput

**Files:**
- Modify: `packages/solid/src/components/form-control/field/TextInput.tsx`

**Step 1: Remove error-related code**

1. Remove `error?: boolean;` from `TextInputProps` interface (line 47)
2. Remove `fieldErrorClass` from import (line 10)
3. Remove `"error"` from `splitProps` array (line 135 area)
4. Remove `local.error && fieldErrorClass,` from `getWrapperClass` (line 197 area)

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/form-control/field/TextInput.tsx
git commit -m "refactor(solid): remove error prop from TextInput"
```

---

### Task 4: Remove `error` prop from Textarea

**Files:**
- Modify: `packages/solid/src/components/form-control/field/Textarea.tsx`

**Step 1: Remove error-related code**

Same pattern as Task 3: remove `error` prop, `fieldErrorClass` import, splitProps entry, and class usage.

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/form-control/field/Textarea.tsx
git commit -m "refactor(solid): remove error prop from Textarea"
```

---

### Task 5: Remove `error` prop from NumberInput

**Files:**
- Modify: `packages/solid/src/components/form-control/field/NumberInput.tsx`

**Step 1: Remove error-related code**

Same pattern: remove `error` prop, `fieldErrorClass` import, splitProps entry, and class usage.

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/form-control/field/NumberInput.tsx
git commit -m "refactor(solid): remove error prop from NumberInput"
```

---

### Task 6: Remove `error` prop from DatePicker

**Files:**
- Modify: `packages/solid/src/components/form-control/field/DatePicker.tsx`

**Step 1: Remove error-related code**

Same pattern.

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/form-control/field/DatePicker.tsx
git commit -m "refactor(solid): remove error prop from DatePicker"
```

---

### Task 7: Remove `error` prop from DateTimePicker

**Files:**
- Modify: `packages/solid/src/components/form-control/field/DateTimePicker.tsx`

**Step 1: Remove error-related code**

Same pattern.

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/form-control/field/DateTimePicker.tsx
git commit -m "refactor(solid): remove error prop from DateTimePicker"
```

---

### Task 8: Remove `error` prop from TimePicker

**Files:**
- Modify: `packages/solid/src/components/form-control/field/TimePicker.tsx`

**Step 1: Remove error-related code**

Same pattern.

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/form-control/field/TimePicker.tsx
git commit -m "refactor(solid): remove error prop from TimePicker"
```

---

### Task 9: Remove `error` prop from RichTextEditor

**Files:**
- Modify: `packages/solid/src/components/form-control/editor/RichTextEditor.tsx`

**Step 1: Remove error-related code**

1. Remove `error?: boolean;` from props interface (line 31)
2. Remove `editorErrorClass` constant (line 54)
3. Remove `"error"` from splitProps array
4. Remove `local.error && editorErrorClass,` from class usage (line 157)

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/form-control/editor/RichTextEditor.tsx
git commit -m "refactor(solid): remove error prop from RichTextEditor"
```

---

### Task 10: Remove `fieldErrorClass` from Field.styles.ts

**Files:**
- Modify: `packages/solid/src/components/form-control/field/Field.styles.ts`

**Step 1: Remove fieldErrorClass**

Remove line 17: `export const fieldErrorClass = "border-danger-500";`
Remove line 16 comment: `// 에러 스타일`

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/form-control/field/Field.styles.ts
git commit -m "refactor(solid): remove fieldErrorClass from Field.styles"
```

---

### Task 11: Update LoginPage to use `<form>` + `<Invalid>`

**Files:**
- Modify: `packages/solid-demo/src/pages/LoginPage.tsx`

**Step 1: Update LoginPage**

1. Add `createSignal` import from `solid-js`
2. Add `Invalid` to the `@simplysm/solid` import
3. Add signals for `id` and `pw`
4. Wrap the FormGroup + Button in a `<form>` with `onSubmit` handler
5. Wrap each TextInput in `<Invalid>`
6. Change Button to `type="submit"` and remove `onClick`

```tsx
import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { TextInput, Button, ThemeToggle, FormGroup, Invalid } from "@simplysm/solid";
import clsx from "clsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const [id, setId] = createSignal("");
  const [pw, setPw] = createSignal("");

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    navigate("/home");
  };

  return (
    <div
      class={clsx(
        "flex h-full items-center justify-center",
        "bg-gradient-to-br from-primary-50 to-primary-100",
        "dark:from-base-900 dark:to-base-800",
      )}
    >
      {/* Card */}
      <div
        class={clsx(
          "w-full max-w-sm rounded-2xl p-8",
          "bg-white shadow-lg",
          "dark:bg-base-800 dark:shadow-base-900/50",
        )}
      >
        {/* Logo */}
        <div class="mb-10 flex justify-center">
          <img src="../../../../packages/solid-demo/public/logo-landscape.png" alt="SIMPLYSM" class="h-12 w-auto" />
        </div>

        <form onSubmit={handleSubmit}>
          {/* Form */}
          <FormGroup class="w-full">
            <FormGroup.Item label="아이디">
              <Invalid message={id() ? "" : "아이디를 입력하세요"}>
                <TextInput
                  class="w-full"
                  placeholder="아이디를 입력하세요"
                  size="lg"
                  value={id()}
                  onValueChange={setId}
                />
              </Invalid>
            </FormGroup.Item>
            <FormGroup.Item label="비밀번호">
              <Invalid message={pw() ? "" : "비밀번호를 입력하세요"}>
                <TextInput
                  class="w-full"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  size="lg"
                  value={pw()}
                  onValueChange={setPw}
                />
              </Invalid>
            </FormGroup.Item>
          </FormGroup>

          {/* Login Button */}
          <div class="mt-5">
            <Button theme="primary" variant="solid" class="w-full" type="submit" size="lg">
              로그인
            </Button>
          </div>
        </form>

        {/* Links */}
        <div class={clsx("mt-4 flex items-center justify-center gap-3", "text-sm text-base-500 dark:text-base-400")}>
          <span class="cursor-pointer hover:text-primary-500" onClick={() => alert("비밀번호 변경")}>
            비밀번호 변경
          </span>
          <span class="text-base-300 dark:text-base-600">|</span>
          <span class="cursor-pointer hover:text-primary-500" onClick={() => alert("회원가입")}>
            회원가입
          </span>
        </div>
      </div>

      {/* Theme Toggle */}
      <div class="fixed bottom-4 right-4">
        <ThemeToggle size="sm" />
      </div>
    </div>
  );
}
```

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/solid-demo`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid-demo/src/pages/LoginPage.tsx
git commit -m "feat(solid-demo): use Invalid + form in LoginPage"
```

---

### Task 12: Verify with dev server

**Step 1: Start dev server and manually test**

Run: `pnpm dev`

1. Open the login page
2. Press Enter with empty fields → browser should show validation tooltip on ID field
3. Fill ID, press Enter → browser should show validation tooltip on password field
4. Fill both, press Enter → should navigate to /home
5. Verify red dot indicators appear on empty fields
