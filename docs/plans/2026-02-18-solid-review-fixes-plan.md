# Solid Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Fix 13 verified issues from the solid package code review — shared utilities, bug fix, inset pattern alignment, breaking API changes, DX improvements, and minor fixes.

**Architecture:** Extract shared field wrapper utilities into `Field.styles.ts`, apply them across 6 field components, fix the `removeFormat` overflow bug, align picker inset patterns to TextInput's dual-element overlay, and make 3 breaking API renames (createPwaUpdate, Pagination, Dialog).

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS, clsx, tailwind-merge

**Working directory:** `/home/kslhunter/projects/simplysm/.worktrees/solid-review-fixes`

---

### Task 1: Add shared field utilities to Field.styles.ts

**Files:**
- Modify: `packages/solid/src/components/form-control/field/Field.styles.ts`

**Step 1: Add imports and new exports**

Add `twMerge` import and the following new exports to Field.styles.ts:

```typescript
import { twMerge } from "tailwind-merge";
```

Then add after the existing exports:

```typescript
// prefixIcon gap 클래스 (nested ternary 대체)
export const fieldGapClasses: Record<FieldSize | "default", string> = {
  default: "gap-2",
  sm: "gap-1.5",
  lg: "gap-3",
  xl: "gap-4",
};

// 공유 wrapper 클래스 생성 함수
export function getFieldWrapperClass(options: {
  size?: FieldSize;
  disabled?: boolean;
  inset?: boolean;
  includeCustomClass?: string | false;
  extra?: string | false;
}): string {
  return twMerge(
    fieldBaseClass,
    options.extra,
    options.size && fieldSizeClasses[options.size],
    options.disabled && fieldDisabledClass,
    options.inset && fieldInsetClass,
    options.inset && (options.size ? fieldInsetSizeHeightClasses[options.size] : fieldInsetHeightClass),
    options.includeCustomClass,
  );
}

// Textarea 전용 wrapper 클래스 생성 함수
export function getTextareaWrapperClass(options: {
  size?: FieldSize;
  disabled?: boolean;
  inset?: boolean;
  includeCustomClass?: string | false;
}): string {
  return twMerge(
    textAreaBaseClass,
    options.size && textAreaSizeClasses[options.size],
    options.disabled && fieldDisabledClass,
    options.inset && fieldInsetClass,
    options.includeCustomClass,
  );
}
```

**Step 2: Add PlaceholderFallback component**

Add at the bottom of Field.styles.ts:

```typescript
import { type Component } from "solid-js";
import { textMuted } from "../../../styles/tokens.styles";

/** 값이 없을 때 placeholder 또는 NBSP를 표시하는 공유 컴포넌트 */
export const PlaceholderFallback: Component<{ value?: string; placeholder?: string }> = (props) => (
  <>
    {props.value ||
      (props.placeholder != null && props.placeholder !== ""
        ? <span class={textMuted}>{props.placeholder}</span>
        : "\u00A0")}
  </>
);
```

Note: The `textMuted` import needs to be added to Field.styles.ts. Currently it imports from `tokens.styles` but only padding constants. Add `textMuted` to that import.

**Step 3: Verify typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS (no errors)

**Step 4: Commit**

```bash
git add packages/solid/src/components/form-control/field/Field.styles.ts
git commit -m "refactor(solid): extract shared field wrapper utilities to Field.styles"
```

---

### Task 2: Apply shared utilities to TextInput + fix removeFormat

**Files:**
- Modify: `packages/solid/src/components/form-control/field/TextInput.tsx`
- Modify: `packages/solid/tests/components/form-control/field/TextInput.spec.tsx`

**Step 1: Write failing test for removeFormat overflow**

Add to `TextInput.spec.tsx` in a new describe block:

```tsx
describe("format overflow", () => {
  it("removeFormat이 format보다 긴 입력에서 문자를 보존한다", async () => {
    const [value, setValue] = createSignal("");
    render(() => (
      <TestWrapper>
        <TextInput format="XXX-XX" value={value()} onValueChange={setValue} />
      </TestWrapper>
    ));
    const input = screen.getByRole("textbox") as HTMLInputElement;
    // Simulate pasting a value longer than format allows
    fireEvent.input(input, { target: { value: "123-456789" } });
    // Should extract all digit characters, not just those covered by format
    expect(setValue).toHaveBeenCalledWith(/* raw value without format separators */);
  });
});
```

Note: The exact test approach depends on how the test harness is set up. Check existing tests for patterns. The key assertion is that `removeFormat("123-456789", "XXX-XX")` returns `"123456789"` (preserving overflow chars), not `"12345"`.

**Step 2: Fix removeFormat function**

In `TextInput.tsx`, change the `removeFormat` function (lines 115-129):

Replace:
```typescript
    if (formatChar === "X") {
      result += formattedValue[i];
    }
```

With:
```typescript
    if (formatChar === "X" || formatChar === undefined) {
      result += formattedValue[i];
    }
```

**Step 3: Replace local getWrapperClass with shared utility**

In `TextInput.tsx`:

1. Update imports from `Field.styles` — add `getFieldWrapperClass`, `fieldGapClasses`, `PlaceholderFallback`. Remove individual class constants that are no longer needed directly (keep only those still used).

2. Replace the local `getWrapperClass` function (lines 219-236) with:
```typescript
const getWrapperClass = (includeCustomClass: boolean) =>
  getFieldWrapperClass({
    size: local.size,
    disabled: local.disabled,
    inset: local.inset,
    includeCustomClass: includeCustomClass && local.class,
    extra: local.prefixIcon && fieldGapClasses[local.size ?? "default"],
  });
```

3. Replace all 2 placeholder JSX snippets (standalone readonly + inset content) with:
```tsx
<PlaceholderFallback value={displayValue()} placeholder={local.placeholder} />
```

**Step 4: Run tests**

Run: `pnpm vitest packages/solid/tests/components/form-control/field/TextInput.spec.tsx --run --project=solid`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/form-control/field/TextInput.tsx packages/solid/tests/components/form-control/field/TextInput.spec.tsx
git commit -m "fix(solid): fix removeFormat overflow + apply shared field utilities to TextInput"
```

---

### Task 3: Apply shared utilities to NumberInput

**Files:**
- Modify: `packages/solid/src/components/form-control/field/NumberInput.tsx`

**Step 1: Replace local getWrapperClass with shared utility**

Same pattern as TextInput:

1. Update imports — add `getFieldWrapperClass`, `fieldGapClasses`, `PlaceholderFallback` from `Field.styles`.
2. Replace local `getWrapperClass` (lines 270-287) with:
```typescript
const getWrapperClass = (includeCustomClass: boolean) =>
  getFieldWrapperClass({
    size: local.size,
    disabled: local.disabled,
    inset: local.inset,
    includeCustomClass: includeCustomClass && local.class,
    extra: local.prefixIcon && fieldGapClasses[local.size ?? "default"],
  });
```

3. Replace all placeholder JSX snippets (standalone readonly at ~lines 329-334, inset content at ~lines 364-369) with:
```tsx
<PlaceholderFallback value={formatNumber(value(), local.comma ?? true, local.minDigits)} placeholder={local.placeholder} />
```

Note: NumberInput uses `formatNumber(value(), ...)` instead of plain `displayValue()` for the readonly/content placeholder.

**Step 2: Verify typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/form-control/field/NumberInput.tsx
git commit -m "refactor(solid): apply shared field utilities to NumberInput"
```

---

### Task 4: Fix inset pattern in DatePicker, DateTimePicker, TimePicker

**Files:**
- Modify: `packages/solid/src/components/form-control/field/DatePicker.tsx`
- Modify: `packages/solid/src/components/form-control/field/DateTimePicker.tsx`
- Modify: `packages/solid/src/components/form-control/field/TimePicker.tsx`

For each of the 3 files, apply the same changes:

**Step 1: Replace getWrapperClass with shared utility**

Update imports — add `getFieldWrapperClass` from `./Field.styles`. Remove individual class constant imports that are no longer needed.

Replace local `getWrapperClass` with:
```typescript
const getWrapperClass = (includeCustomClass: boolean) =>
  getFieldWrapperClass({
    size: local.size,
    disabled: local.disabled,
    inset: local.inset,
    includeCustomClass: includeCustomClass && local.class,
  });
```

This also fixes C1 (string concatenation `fieldInsetClass + " block"`) because `getFieldWrapperClass` uses `fieldInsetClass` directly without the `" block"` hack.

**Step 2: Fix inset mode dual-element overlay pattern**

For each picker, change the inset mode JSX from old pattern:
```tsx
{/* OLD: wrapper class on outer div */}
<div class={twMerge(getWrapperClass(false), "relative", local.class)} style={local.style}>
  <div data-*-content style={{ visibility: ... }}>
    {displayValue() || "\u00A0"}
  </div>
  <Show when={isEditable()}>
    <input class={clsx(fieldInputClass, "absolute left-0 top-0 size-full", "px-2 py-1")} ... />
  </Show>
</div>
```

To new pattern (matching TextInput):
```tsx
{/* NEW: outer div has positioning only, inner divs have wrapper class */}
<div {...rest} data-*-field class={clsx("relative", local.class)} style={local.style}>
  <div
    data-*-content
    class={getWrapperClass(false)}
    style={{ visibility: isEditable() ? "hidden" : undefined }}
    title={local.title}
  >
    {displayValue() || "\u00A0"}
  </div>
  <Show when={isEditable()}>
    <div class={twMerge(getWrapperClass(false), "absolute left-0 top-0 size-full")}>
      <input
        type={...}
        class={fieldInputClass}
        ...
      />
    </div>
  </Show>
</div>
```

Key changes per picker:
- **DatePicker** (`data-date-field`): lines ~269-293
- **DateTimePicker** (`data-datetime-field`): lines ~263-290
- **TimePicker** (`data-time-field`): lines ~225-249

**Step 3: Verify typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/form-control/field/DatePicker.tsx packages/solid/src/components/form-control/field/DateTimePicker.tsx packages/solid/src/components/form-control/field/TimePicker.tsx
git commit -m "refactor(solid): fix inset pattern + apply shared utilities to DatePicker/DateTimePicker/TimePicker"
```

---

### Task 5: Apply shared utilities to Textarea + fix inset pattern

**Files:**
- Modify: `packages/solid/src/components/form-control/field/Textarea.tsx`

**Step 1: Replace getWrapperClass with shared utility**

Update imports — add `getTextareaWrapperClass`, `PlaceholderFallback` from `./Field.styles`. Remove individual class constant imports no longer needed.

Replace local `getWrapperClass` (lines 159-167) with:
```typescript
const getWrapperClass = (includeCustomClass: boolean) =>
  getTextareaWrapperClass({
    size: local.size,
    disabled: local.disabled,
    inset: local.inset,
    includeCustomClass: includeCustomClass && local.class,
  });
```

**Step 2: Replace placeholder JSX**

Replace the 2 placeholder JSX snippets in standalone readonly mode (~lines 211-216) and inset content div (~lines 269-274) with `<PlaceholderFallback>`. Note that the Textarea's inset content uses a conditional: `isEditable() ? contentForHeight() : value() || placeholder...`. Only replace the non-editable branch with PlaceholderFallback:

```tsx
{isEditable() ? contentForHeight() : <PlaceholderFallback value={value()} placeholder={local.placeholder} />}
```

**Step 3: Fix inset pattern (outer div)**

Textarea inset mode (lines ~252-255) currently has `class={twMerge(getWrapperClass(false), "relative", local.class)}` on the outer div. Change to:
```tsx
<div {...rest} data-textarea-field class={clsx("relative", local.class)} style={local.style}>
  <div data-textarea-field-content class={getWrapperClass(false)} style={{ ... }}>
    ...
  </div>
  <Show when={isEditable()}>
    <div class={twMerge(getWrapperClass(false), "absolute left-0 top-0 size-full")} style={{ position: "relative" }}>
      ...
    </div>
  </Show>
</div>
```

**Step 4: Verify typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/form-control/field/Textarea.tsx
git commit -m "refactor(solid): apply shared utilities + fix inset pattern in Textarea"
```

---

### Task 6: Rename createPwaUpdate → usePwaUpdate

**Files:**
- Rename: `packages/solid/src/hooks/createPwaUpdate.ts` → `packages/solid/src/hooks/usePwaUpdate.ts`
- Modify: `packages/solid/src/hooks/usePwaUpdate.ts` (rename function)
- Modify: `packages/solid/src/providers/InitializeProvider.tsx` (update import + usage)
- Modify: `packages/solid/src/index.ts` (update export)

**Step 1: Rename file and function**

```bash
git mv packages/solid/src/hooks/createPwaUpdate.ts packages/solid/src/hooks/usePwaUpdate.ts
```

In `usePwaUpdate.ts`, rename:
- `export function createPwaUpdate()` → `export function usePwaUpdate()`

**Step 2: Update InitializeProvider.tsx**

Line 10: `import { createPwaUpdate } from "../hooks/createPwaUpdate";`
→ `import { usePwaUpdate } from "../hooks/usePwaUpdate";`

Line 15: `createPwaUpdate();` → `usePwaUpdate();`

**Step 3: Update index.ts**

Line 135: `export { createPwaUpdate } from "./hooks/createPwaUpdate";`
→ `export { usePwaUpdate } from "./hooks/usePwaUpdate";`

**Step 4: Verify typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/hooks/usePwaUpdate.ts packages/solid/src/providers/InitializeProvider.tsx packages/solid/src/index.ts
git commit -m "refactor(solid): rename createPwaUpdate to usePwaUpdate (context dependency)"
```

---

### Task 7: Pagination pageIndex → page (1-based)

**Files:**
- Modify: `packages/solid/src/components/data/Pagination.tsx`
- Modify: `packages/solid-demo/src/pages/data/PaginationPage.tsx`
- Modify: `packages/solid-demo/src/pages/data/SheetFullPage.tsx`
- Modify: `packages/solid-demo/src/pages/data/SheetPage.tsx`

**Step 1: Update Pagination component**

In `Pagination.tsx`:

1. Rename props interface:
   - `pageIndex: number` → `page: number`
   - `onPageIndexChange?: (pageIndex: number) => void` → `onPageChange?: (page: number) => void`

2. Update `splitProps`:
   - `"pageIndex"` → `"page"`
   - `"onPageIndexChange"` → `"onPageChange"`

3. Update internal logic to work with 1-based page:
   - `pages()`: Use `Math.floor((local.page - 1) / visibleCount()) * visibleCount()` and generate 1-based pages:
     ```typescript
     const pages = () => {
       const from = Math.floor((local.page - 1) / visibleCount()) * visibleCount() + 1;
       const to = Math.min(from + visibleCount() - 1, local.totalPageCount);
       const result: number[] = [];
       for (let i = from; i <= to; i++) {
         result.push(i);
       }
       return result;
     };
     ```
   - `hasPrev()`: `(pages()[0] ?? 1) > 1`
   - `hasNext()`: `(pages()[pages().length - 1] ?? 1) < local.totalPageCount`
   - First page button: `local.onPageChange?.(1)`
   - Prev button: `local.onPageChange?.((pages()[0] ?? 2) - 1)`
   - Page button: `local.onPageChange?.(p)` with display `{p}` (no +1 needed)
   - Next button: `local.onPageChange?.((pages()[pages().length - 1] ?? 0) + 1)`
   - Last page button: `local.onPageChange?.(local.totalPageCount)`
   - Active check: `p === local.page`

**Step 2: Update demo pages**

In all 3 demo files, replace:
- `pageIndex={page()}` → `page={page() + 1}` or adjust signal to be 1-based
- `onPageIndexChange={setPage}` → `onPageChange={setPage}`

The simplest approach: change signal initial values from `0` to `1`:
- `const [page, setPage] = createSignal(0);` → `const [page, setPage] = createSignal(1);`
- Then use `page={page()}` and `onPageChange={setPage}` directly.

Also update DataSheet page files (`SheetFullPage.tsx`, `SheetPage.tsx`) if they use Pagination with pageIndex.

**Step 3: Verify typecheck**

Run: `pnpm typecheck packages/solid && pnpm typecheck packages/solid-demo`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/data/Pagination.tsx packages/solid-demo/src/pages/data/PaginationPage.tsx packages/solid-demo/src/pages/data/SheetFullPage.tsx packages/solid-demo/src/pages/data/SheetPage.tsx
git commit -m "refactor(solid)!: rename Pagination pageIndex to page (1-based)"
```

---

### Task 8: Dialog dimension props — remove Px suffix

**Files:**
- Modify: `packages/solid/src/components/disclosure/Dialog.tsx`
- Modify: `packages/solid-demo/src/pages/disclosure/DialogPage.tsx`

**Step 1: Rename props in Dialog.tsx**

Use find-and-replace across the file:
- `widthPx` → `width` (props interface, splitProps, usage at ~line 375-376)
- `heightPx` → `height` (props interface, splitProps, usage at ~line 378-379)
- `minWidthPx` → `minWidth` (props interface, splitProps, usage at ~lines 333, 341, 350, 383-384)
- `minHeightPx` → `minHeight` (props interface, splitProps, usage at ~lines 333, 336, 386-387)

Update JSDoc comments to remove "(px)" since it's the conventional default.

**Step 2: Update demo page**

In `DialogPage.tsx`, replace all `widthPx=`, `heightPx=`, `minWidthPx=`, `minHeightPx=` with the new names.

**Step 3: Verify typecheck**

Run: `pnpm typecheck packages/solid && pnpm typecheck packages/solid-demo`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/disclosure/Dialog.tsx packages/solid-demo/src/pages/disclosure/DialogPage.tsx
git commit -m "refactor(solid)!: remove Px suffix from Dialog dimension props"
```

---

### Task 9: Progress value clamping

**Files:**
- Modify: `packages/solid/src/components/feedback/Progress.tsx`

**Step 1: Add clamping and JSDoc**

In `Progress.tsx`:

1. Update the `value` prop JSDoc:
```typescript
/** 진행률 (0~1 범위, 0 = 0%, 1 = 100%) */
value: number;
```

2. Change `getPercentText` (line 49):
```typescript
const getPercentText = () => (Math.max(0, Math.min(1, local.value)) * 100).toFixed(2) + "%";
```

**Step 2: Verify typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/feedback/Progress.tsx
git commit -m "fix(solid): add value clamping to Progress component"
```

---

### Task 10: Remove internal context exports + minor fixes

**Files:**
- Modify: `packages/solid/src/index.ts`
- Modify: `packages/solid/src/hooks/useSyncConfig.ts`
- Modify: `packages/solid/src/hooks/useLocalStorage.ts`

**Step 1: Remove SelectContext and ComboboxContext exports from index.ts**

Remove these 2 lines:
- Line 8: `export * from "./components/form-control/select/SelectContext";`
- Line 12: `export * from "./components/form-control/combobox/ComboboxContext";`

Internal sub-components (`Select.Item`, `Combobox.Item`, etc.) already import these via relative paths, so removing public exports has no internal impact.

**Step 2: Remove empty onCleanup in useSyncConfig.ts**

Remove lines 96-99:
```typescript
  // Clean up (optional, for consistency)
  onCleanup(() => {
    // No cleanup needed for storage operations
  });
```

Also remove `onCleanup` from the import if it's no longer used elsewhere in the file.

**Step 3: Fix useLocalStorage Setter type cast**

In `useLocalStorage.ts`, change the return type and remove the cast:

1. Change function signature return type:
```typescript
export function useLocalStorage<TValue>(
  key: string,
  initialValue?: TValue,
): [Accessor<TValue | undefined>, (value: TValue | undefined | ((prev: TValue | undefined) => TValue | undefined)) => TValue | undefined] {
```

2. Remove the `as Setter<>` cast on line 72:
```typescript
  return [value, setAndStore];
```

Alternatively, define a type alias for readability:
```typescript
type StorageSetter<TValue> = (value: TValue | undefined | ((prev: TValue | undefined) => TValue | undefined)) => TValue | undefined;
```

Then: `): [Accessor<TValue | undefined>, StorageSetter<TValue>]`

**Step 4: Check if removing onCleanup import is needed in useSyncConfig.ts**

Read the file to verify `onCleanup` is used elsewhere. If not, remove it from the import statement.

**Step 5: Verify typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/solid/src/index.ts packages/solid/src/hooks/useSyncConfig.ts packages/solid/src/hooks/useLocalStorage.ts
git commit -m "refactor(solid): remove internal context exports, dead code, and unsafe type cast"
```

---

### Task 11: Run full typecheck + lint + tests

**Step 1: Typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 2: Lint**

Run: `pnpm lint packages/solid`
Expected: PASS (0 errors, 0 warnings)

**Step 3: Run solid tests**

Run: `pnpm vitest packages/solid --run --project=solid`
Expected: ALL PASS

**Step 4: Fix any failures**

If any step fails, fix the issue and re-run.

---

## Task Dependency Graph

```
Task 1 (Field.styles.ts utilities)
  ├── Task 2 (TextInput + removeFormat) ─┐
  ├── Task 3 (NumberInput)               │
  ├── Task 4 (DatePicker/DTP/TP inset)   ├── Task 11 (verification)
  └── Task 5 (Textarea)                  │
Task 6 (createPwaUpdate rename) ─────────┤
Task 7 (Pagination 1-based) ─────────────┤
Task 8 (Dialog Px removal) ──────────────┤
Task 9 (Progress clamping) ──────────────┤
Task 10 (context exports + minor) ───────┘
```

Tasks 2-5 depend on Task 1. Tasks 6-10 are independent. Task 11 depends on all.
