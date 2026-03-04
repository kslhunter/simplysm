# FieldShell Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Extract the duplicated 3-mode branching JSX from 6 field components into a shared `FieldShell` component and fix Textarea inconsistencies.

**Architecture:** New `FieldShell` component handles `<Invalid>` wrapping, standalone/inset branching, and inset overlay pattern. Each field component provides content via `children` (input element) and `displayContent` (readonly/sizing display). Existing public APIs are preserved.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS, vitest

---

### Task 1: Create FieldShell component with test

**Files:**
- Create: `packages/solid/src/components/form-control/field/FieldShell.tsx`
- Create: `packages/solid/tests/components/form-control/field/FieldShell.spec.tsx`

**Step 1: Write failing test for FieldShell standalone and inset modes**

Test file covers: standalone-readonly renders `displayContent`, standalone-editable renders `children`, inset-readonly shows sizing content visible, inset-editable hides sizing and shows overlay with children.

`Invalid` — wraps children with form validation visual indicators (`packages/solid/src/components/form-control/Invalid.tsx`). Requires a parent `I18nProvider` and `ConfigProvider` in tests.

```tsx
// packages/solid/tests/components/form-control/field/FieldShell.spec.tsx
import { render } from "@solidjs/testing-library";
import { describe, it, expect, beforeEach } from "vitest";
import { FieldShell } from "../../../../src/components/form-control/field/FieldShell";
import { I18nProvider } from "../../../../src/providers/i18n/I18nContext";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

// Minimal wrapperClass stub — returns a predictable class string.
// The real getFieldWrapperClass (Field.styles.ts) generates Tailwind classes
// based on size/disabled/inset options.
const stubWrapperClass = (_includeCustom: boolean) => "wrapper-class";

function wrap(ui: () => import("solid-js").JSX.Element) {
  return render(() => <ConfigProvider clientName="test"><I18nProvider>{ui()}</I18nProvider></ConfigProvider>);
}

describe("FieldShell", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  it("renders displayContent when standalone-readonly", () => {
    const { container } = wrap(() => (
      <FieldShell
        errorMsg={undefined}
        invalidVariant="border"
        inset={false}
        isEditable={false}
        wrapperClass={stubWrapperClass}
        dataAttr="data-test-field"
        readonlyExtraClass="sd-test-field"
        displayContent={<span>readonly-text</span>}
      >
        <input type="text" />
      </FieldShell>
    ));
    const div = container.querySelector("[data-test-field]") as HTMLElement;
    expect(div).toBeTruthy();
    expect(div.classList.contains("sd-test-field")).toBe(true);
    expect(div.textContent).toContain("readonly-text");
    expect(container.querySelector("input:not([aria-hidden])")).toBeFalsy();
  });

  it("renders children when standalone-editable", () => {
    const { container } = wrap(() => (
      <FieldShell
        errorMsg={undefined}
        invalidVariant="border"
        inset={false}
        isEditable={true}
        wrapperClass={stubWrapperClass}
        dataAttr="data-test-field"
        displayContent={<span>readonly-text</span>}
      >
        <input type="text" data-testid="my-input" />
      </FieldShell>
    ));
    const input = container.querySelector("[data-testid='my-input']");
    expect(input).toBeTruthy();
    expect(container.textContent).not.toContain("readonly-text");
  });

  it("renders inset sizing + overlay when inset-editable", () => {
    const { container } = wrap(() => (
      <FieldShell
        errorMsg={undefined}
        invalidVariant="dot"
        inset={true}
        isEditable={true}
        wrapperClass={stubWrapperClass}
        dataAttr="data-test-field"
        displayContent={<span>sizing-text</span>}
      >
        <input type="text" data-testid="my-input" />
      </FieldShell>
    ));
    const outer = container.querySelector("[data-test-field]") as HTMLElement;
    expect(outer.classList.contains("relative")).toBe(true);

    const sizingDiv = outer.querySelector("[data-test-field-content]") as HTMLElement;
    expect(sizingDiv).toBeTruthy();
    expect(sizingDiv.style.visibility).toBe("hidden");

    const input = outer.querySelector("[data-testid='my-input']");
    expect(input).toBeTruthy();
  });

  it("renders inset sizing visible when inset-readonly", () => {
    const { container } = wrap(() => (
      <FieldShell
        errorMsg={undefined}
        invalidVariant="dot"
        inset={true}
        isEditable={false}
        wrapperClass={stubWrapperClass}
        dataAttr="data-test-field"
        displayContent={<span>visible-text</span>}
      >
        <input type="text" />
      </FieldShell>
    ));
    const sizingDiv = container.querySelector("[data-test-field-content]") as HTMLElement;
    expect(sizingDiv).toBeTruthy();
    expect(sizingDiv.style.visibility).toBe("");
    expect(sizingDiv.textContent).toContain("visible-text");
    expect(container.querySelector("input:not([aria-hidden])")).toBeFalsy();
  });

  it("uses renderSizing for sizing content when provided", () => {
    const { container } = wrap(() => (
      <FieldShell
        errorMsg={undefined}
        invalidVariant="dot"
        inset={true}
        isEditable={true}
        wrapperClass={stubWrapperClass}
        dataAttr="data-test-field"
        displayContent={<span>display</span>}
        renderSizing={() => <span>custom-sizing</span>}
      >
        <input type="text" />
      </FieldShell>
    ));
    const sizingDiv = container.querySelector("[data-test-field-content]") as HTMLElement;
    expect(sizingDiv.textContent).toContain("custom-sizing");
    expect(sizingDiv.textContent).not.toContain("display");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/components/form-control/field/FieldShell.spec.tsx --project=solid --run`
Expected: FAIL — `FieldShell` module not found

**Step 3: Implement FieldShell component**

`twMerge` — intelligently merges Tailwind CSS classes, resolving conflicts (`tailwind-merge`).
`clsx` — constructs className strings conditionally (`clsx`).
`Invalid` — wraps target element with form validation indicator. Applies `border-danger-500` or a red dot depending on `variant`. Uses a hidden `<input>` for native form validation (`packages/solid/src/components/form-control/Invalid.tsx`).

```tsx
// packages/solid/src/components/form-control/field/FieldShell.tsx
import clsx from "clsx";
import { type JSX, type ParentComponent, Show } from "solid-js";
import { twMerge } from "tailwind-merge";
import { Invalid } from "../Invalid";

export interface FieldShellProps {
  /** Validation error message */
  errorMsg: string | undefined;
  /** Invalid visual indicator variant */
  invalidVariant: "dot" | "border";
  /** Show error only after blur */
  touchMode?: boolean;

  /** Inset (borderless) mode */
  inset: boolean | undefined;
  /** Whether the field is editable (!disabled && !readonly) */
  isEditable: boolean;

  /** Wrapper class generator — receives includeCustomClass flag */
  wrapperClass: (includeCustomClass: boolean) => string;
  /** Data attribute name for the wrapper (e.g. "data-date-field") */
  dataAttr: string;
  /** Extra class for standalone-readonly wrapper (e.g. "sd-date-field") */
  readonlyExtraClass?: string;
  /** Extra class for inset outer div (e.g. "[text-decoration:inherit]") */
  insetExtraClass?: string;
  /** Extra class for sizing/overlay wrappers (e.g. "justify-end") */
  sizingExtraClass?: string;

  /** Custom style */
  style?: JSX.CSSProperties;
  /** Title (tooltip) */
  title?: string;
  /** Custom class — applied to inset outer div */
  class?: string;
  /** Rest props from splitProps — spread on wrapper divs */
  rest?: Record<string, unknown>;

  /** Content for readonly display and default sizing */
  displayContent: JSX.Element;
  /** Override sizing content (e.g. Textarea's contentForHeight) */
  renderSizing?: () => JSX.Element;
}

export const FieldShell: ParentComponent<FieldShellProps> = (props) => {
  // Dynamic data attribute object for JSX spreading
  const dataAttrObj = () => ({ [props.dataAttr]: true });
  const dataContentAttrObj = () => ({ [`${props.dataAttr}-content`]: true });

  return (
    <Invalid
      message={props.errorMsg}
      variant={props.invalidVariant}
      touchMode={props.touchMode}
    >
      <Show
        when={props.inset}
        fallback={
          <Show
            when={props.isEditable}
            fallback={
              <div
                {...(props.rest ?? {})}
                {...dataAttrObj()}
                class={twMerge(props.wrapperClass(true), props.readonlyExtraClass)}
                style={props.style}
                title={props.title}
              >
                {props.displayContent}
              </div>
            }
          >
            <div
              {...(props.rest ?? {})}
              {...dataAttrObj()}
              class={props.wrapperClass(true)}
              style={{ position: "relative", ...props.style }}
            >
              {props.children}
            </div>
          </Show>
        }
      >
        <div
          {...(props.rest ?? {})}
          {...dataAttrObj()}
          class={clsx("relative", props.insetExtraClass, props.class)}
          style={props.style}
        >
          <div
            {...dataContentAttrObj()}
            class={twMerge(props.wrapperClass(false), props.sizingExtraClass)}
            style={{ visibility: props.isEditable ? "hidden" : undefined }}
            title={props.title}
          >
            {props.renderSizing ? props.renderSizing() : props.displayContent}
          </div>

          <Show when={props.isEditable}>
            <div
              class={twMerge(
                props.wrapperClass(false),
                props.sizingExtraClass,
                "absolute left-0 top-0 size-full",
              )}
            >
              {props.children}
            </div>
          </Show>
        </div>
      </Show>
    </Invalid>
  );
};
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/components/form-control/field/FieldShell.spec.tsx --project=solid --run`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add packages/solid/src/components/form-control/field/FieldShell.tsx packages/solid/tests/components/form-control/field/FieldShell.spec.tsx
git commit -m "feat(solid): add FieldShell component for field layout deduplication"
```

---

### Task 2: Migrate DatePicker to FieldShell

**Files:**
- Modify: `packages/solid/src/components/form-control/field/DatePicker.tsx:206-274` (replace JSX return)
- Test: `packages/solid/tests/components/form-control/field/DatePicker.spec.tsx` (existing — no changes)

**Step 1: Replace DatePicker JSX return with FieldShell**

Replace the entire `return (...)` block (lines 206-274) with:

```tsx
  return (
    <FieldShell
      errorMsg={errorMsg()}
      invalidVariant={local.inset ? "dot" : "border"}
      touchMode={local.touchMode}
      inset={local.inset}
      isEditable={isEditable()}
      wrapperClass={getWrapperClass}
      dataAttr="data-date-field"
      readonlyExtraClass="sd-date-field"
      style={local.style}
      title={local.title}
      class={local.class}
      rest={rest}
      displayContent={displayValue() || "\u00A0"}
    >
      <input
        type={getInputType(fieldType())}
        class={fieldInputClass}
        value={displayValue()}
        title={local.title}
        min={formatDateValue(local.min, fieldType())}
        max={formatDateValue(local.max, fieldType())}
        autocomplete="one-time-code"
        onChange={handleChange}
      />
    </FieldShell>
  );
```

Add import at top of file:
```tsx
import { FieldShell } from "./FieldShell";
```

Remove unused imports: `clsx`, `Show`, `twMerge` (no longer used in this file).

**Step 2: Run existing tests to verify no regression**

Run: `pnpm vitest packages/solid/tests/components/form-control/field/DatePicker.spec.tsx --project=solid --run`
Expected: PASS (all 17 existing tests)

**Step 3: Commit**

```bash
git add packages/solid/src/components/form-control/field/DatePicker.tsx
git commit -m "refactor(solid): migrate DatePicker to FieldShell"
```

---

### Task 3: Migrate DateTimePicker to FieldShell

**Files:**
- Modify: `packages/solid/src/components/form-control/field/DateTimePicker.tsx:204-279` (replace JSX return)
- Test: `packages/solid/tests/components/form-control/field/DateTimePicker.spec.tsx` (existing — no changes)

**Step 1: Replace DateTimePicker JSX return with FieldShell**

Replace `return (...)` block with:

```tsx
  return (
    <FieldShell
      errorMsg={errorMsg()}
      invalidVariant={local.inset ? "dot" : "border"}
      touchMode={local.touchMode}
      inset={local.inset}
      isEditable={isEditable()}
      wrapperClass={getWrapperClass}
      dataAttr="data-datetime-field"
      readonlyExtraClass="sd-datetime-field"
      style={local.style}
      title={local.title}
      class={local.class}
      rest={rest}
      displayContent={displayValue() || "\u00A0"}
    >
      <input
        type="datetime-local"
        class={fieldInputClass}
        value={displayValue()}
        title={local.title}
        min={formatDateTimeValue(local.min, fieldType())}
        max={formatDateTimeValue(local.max, fieldType())}
        step={getStep()}
        autocomplete="one-time-code"
        onChange={handleChange}
      />
    </FieldShell>
  );
```

Add import `FieldShell`. Remove unused imports: `clsx`, `Show`, `twMerge`.

**Step 2: Run existing tests**

Run: `pnpm vitest packages/solid/tests/components/form-control/field/DateTimePicker.spec.tsx --project=solid --run`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/form-control/field/DateTimePicker.tsx
git commit -m "refactor(solid): migrate DateTimePicker to FieldShell"
```

---

### Task 4: Migrate TimePicker to FieldShell

**Files:**
- Modify: `packages/solid/src/components/form-control/field/TimePicker.tsx:179-245` (replace JSX return)
- Test: `packages/solid/tests/components/form-control/field/TimePicker.spec.tsx` (existing — no changes)

**Step 1: Replace TimePicker JSX return with FieldShell**

Replace `return (...)` block with:

```tsx
  return (
    <FieldShell
      errorMsg={errorMsg()}
      invalidVariant={local.inset ? "dot" : "border"}
      touchMode={local.touchMode}
      inset={local.inset}
      isEditable={isEditable()}
      wrapperClass={getWrapperClass}
      dataAttr="data-time-field"
      readonlyExtraClass="sd-time-field"
      style={local.style}
      title={local.title}
      class={local.class}
      rest={rest}
      displayContent={displayValue() || "\u00A0"}
    >
      <input
        type="time"
        class={fieldInputClass}
        value={displayValue()}
        title={local.title}
        step={getStep()}
        autocomplete="one-time-code"
        onChange={handleChange}
      />
    </FieldShell>
  );
```

Add import `FieldShell`. Remove unused imports: `clsx`, `Show`, `twMerge`.

**Step 2: Run existing tests**

Run: `pnpm vitest packages/solid/tests/components/form-control/field/TimePicker.spec.tsx --project=solid --run`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/form-control/field/TimePicker.tsx
git commit -m "refactor(solid): migrate TimePicker to FieldShell"
```

---

### Task 5: Migrate TextInput to FieldShell

**Files:**
- Modify: `packages/solid/src/components/form-control/field/TextInput.tsx:262-351` (replace JSX return)
- Test: `packages/solid/tests/components/form-control/field/TextInput.spec.tsx` (existing — no changes)

**Step 1: Replace TextInput JSX return with FieldShell**

TextInput has a `PrefixProvider` wrapping and Prefix slot. The PrefixProvider wraps FieldShell externally. Both `displayContent` and `children` include the prefix element.

`createSlot` — creates a slot component + accessor pair for the compound component pattern. The accessor collects slot children rendered inside a provider (`packages/solid/src/helpers/createSlot.ts`).

`PlaceholderFallback` — displays value text, or placeholder in muted style, or NBSP if both are empty (`packages/solid/src/components/form-control/field/FieldPlaceholder.tsx`).

`createIMEHandler` — delays `onValueChange` during IME composition (e.g., Korean input) to prevent DOM recreation that would break in-progress composition (`packages/solid/src/hooks/createIMEHandler.ts`).

Replace `return (...)` block with:

```tsx
  return (
    <PrefixProvider>
      {local.children}
      <FieldShell
        errorMsg={errorMsg()}
        invalidVariant={local.inset ? "dot" : "border"}
        touchMode={local.touchMode}
        inset={local.inset}
        isEditable={isEditable()}
        wrapperClass={getWrapperClass}
        dataAttr="data-text-field"
        readonlyExtraClass="sd-text-field"
        insetExtraClass="[text-decoration:inherit]"
        style={local.style}
        title={local.title}
        class={local.class}
        rest={rest}
        displayContent={
          <>
            <Show when={prefix()}>
              <span class="shrink-0">{prefix()!.children}</span>
            </Show>
            <PlaceholderFallback value={displayValue()} placeholder={local.placeholder} />
          </>
        }
      >
        <Show when={prefix()}>
          <span class="shrink-0">{prefix()!.children}</span>
        </Show>
        <input
          type={local.type ?? "text"}
          class={fieldInputClass}
          value={inputValue()}
          placeholder={local.placeholder}
          title={local.title}
          autocomplete={local.autocomplete ?? "one-time-code"}
          onInput={handleInput}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
        />
      </FieldShell>
    </PrefixProvider>
  );
```

Add import `FieldShell`. Remove unused imports: `clsx`, `twMerge` (keep `Show` — still used for prefix).

**Step 2: Run existing tests**

Run: `pnpm vitest packages/solid/tests/components/form-control/field/TextInput.spec.tsx --project=solid --run`
Expected: PASS (all 18 existing tests)

**Step 3: Commit**

```bash
git add packages/solid/src/components/form-control/field/TextInput.tsx
git commit -m "refactor(solid): migrate TextInput to FieldShell"
```

---

### Task 6: Migrate NumberInput to FieldShell

**Files:**
- Modify: `packages/solid/src/components/form-control/field/NumberInput.tsx:305-402` (replace JSX return)
- Test: `packages/solid/tests/components/form-control/field/NumberInput.spec.tsx` (existing — no changes)

**Step 1: Replace NumberInput JSX return with FieldShell**

NumberInput is similar to TextInput: has PrefixProvider wrapping, prefix in both display and input. Also uses `sizingExtraClass="justify-end"` for right-aligned display.

Replace `return (...)` block with:

```tsx
  return (
    <PrefixProvider>
      {local.children}
      <FieldShell
        errorMsg={errorMsg()}
        invalidVariant={local.inset ? "dot" : "border"}
        touchMode={local.touchMode}
        inset={local.inset}
        isEditable={isEditable()}
        wrapperClass={getWrapperClass}
        dataAttr="data-number-field"
        readonlyExtraClass="sd-number-field justify-end"
        sizingExtraClass="justify-end"
        style={local.style}
        title={local.title}
        class={local.class}
        rest={rest}
        displayContent={
          <>
            <Show when={prefix()}>
              <span class="shrink-0">{prefix()!.children}</span>
            </Show>
            <PlaceholderFallback
              value={formatNumber(value(), local.comma ?? true, local.minDigits)}
              placeholder={local.placeholder}
            />
          </>
        }
      >
        <Show when={prefix()}>
          <span class="shrink-0">{prefix()!.children}</span>
        </Show>
        <input
          type="text"
          inputmode="numeric"
          class={numberInputClass}
          value={displayValue()}
          placeholder={local.placeholder}
          title={local.title}
          autocomplete="one-time-code"
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </FieldShell>
    </PrefixProvider>
  );
```

Add import `FieldShell`. Remove unused imports: `clsx`, `twMerge` (keep `Show` — still used for prefix).

**Step 2: Run existing tests**

Run: `pnpm vitest packages/solid/tests/components/form-control/field/NumberInput.spec.tsx --project=solid --run`
Expected: PASS (all 19 existing tests)

**Step 3: Commit**

```bash
git add packages/solid/src/components/form-control/field/NumberInput.tsx
git commit -m "refactor(solid): migrate NumberInput to FieldShell"
```

---

### Task 7: Migrate Textarea to FieldShell + fix inconsistencies

**Files:**
- Modify: `packages/solid/src/components/form-control/field/Textarea.tsx:190-286` (replace JSX return + fix inconsistencies)
- Test: `packages/solid/tests/components/form-control/field/Textarea.spec.tsx` (existing — no changes expected)

**Step 1: Replace Textarea JSX return with FieldShell and fix inconsistencies**

Textarea differences from other fields:
- Uses `getTextareaWrapperClass` instead of `getFieldWrapperClass` (Field.styles.ts)
- Has `contentForHeight()` for auto-height sizing in editable mode
- Standalone-editable has hidden sizing div + absolute textarea inside wrapper
- **Fix**: Invalid variant was always `"border"` → now `inset ? "dot" : "border"`
- **Fix**: Add `readonlyExtraClass="sd-textarea-field"` for consistency

Replace `return (...)` block with:

```tsx
  return (
    <FieldShell
      errorMsg={errorMsg()}
      invalidVariant={local.inset ? "dot" : "border"}
      touchMode={local.touchMode}
      inset={local.inset}
      isEditable={isEditable()}
      wrapperClass={getWrapperClass}
      dataAttr="data-textarea-field"
      readonlyExtraClass="sd-textarea-field"
      style={local.style}
      title={local.title}
      class={local.class}
      rest={rest}
      displayContent={
        <PlaceholderFallback value={displayValue()} placeholder={local.placeholder} />
      }
      renderSizing={() => (
        isEditable() ? (
          <span style={{ "white-space": "pre-wrap", "word-break": "break-all" }}>
            {contentForHeight()}
          </span>
        ) : (
          <PlaceholderFallback value={displayValue()} placeholder={local.placeholder} />
        )
      )}
    >
      <div
        data-hidden-content
        style={{
          "visibility": "hidden",
          "white-space": "pre-wrap",
          "word-break": "break-all",
        }}
      >
        {contentForHeight()}
      </div>
      <textarea
        class={getTextareaClass()}
        value={value()}
        placeholder={local.placeholder}
        title={local.title}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
      />
    </FieldShell>
  );
```

Also update `getWrapperClass` to include `white-space` and `word-break` styles for readonly — add a wrapper style to the sizing content. The `getTextareaWrapperClass` is passed to FieldShell via the `wrapperClass` prop (already defined at line 156).

Add import `FieldShell`. Remove unused imports: `clsx`, `Show`, `twMerge` (if no longer used).

Note: The `displayValue()` function should use the composing-aware value like TextInput. Currently Textarea uses `ime.composingValue() ?? value()` for `displayValue`. This stays in the component logic (not in FieldShell).

**Step 2: Run existing tests**

Run: `pnpm vitest packages/solid/tests/components/form-control/field/Textarea.spec.tsx --project=solid --run`
Expected: PASS (all 14 existing tests)

**Step 3: Commit**

```bash
git add packages/solid/src/components/form-control/field/Textarea.tsx
git commit -m "refactor(solid): migrate Textarea to FieldShell and fix inconsistencies"
```

---

### Task 8: Run full field test suite

**Files:**
- Test: All 7 test files in `packages/solid/tests/components/form-control/field/`

**Step 1: Run all field tests together**

Run: `pnpm vitest packages/solid/tests/components/form-control/field/ --project=solid --run`
Expected: PASS (all tests across 7 spec files: FieldShell + 6 field components)

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: No type errors

**Step 3: Final commit (if any fixes needed)**

Only commit if Step 1 or 2 revealed issues that required fixes. Otherwise skip this step.
