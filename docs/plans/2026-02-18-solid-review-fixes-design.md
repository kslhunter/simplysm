# Solid Package Review Fixes Design

Date: 2026-02-18
Scope: `packages/solid` — 13 issues from comprehensive code review

## Decisions

- **Breaking changes**: Immediate (no deprecation) — next major version
- **Korean validation messages**: Keep as-is (i18n deferred to separate task)
- **Code duplication**: Extract shared utilities to Field.styles.ts

## Work Groups

### Group A: Shared Field Utilities (S1, S2, S3, S4, C1)

**Files:** `Field.styles.ts`, `TextInput.tsx`, `NumberInput.tsx`, `DatePicker.tsx`, `DateTimePicker.tsx`, `TimePicker.tsx`, `Textarea.tsx`

1. **`getFieldWrapperClass()` function** in `Field.styles.ts`
   - Accepts options: `{ size?, disabled?, inset?, includeCustomClass?, extra? }`
   - Replaces 6 duplicated local `getWrapperClass` functions
   - Separate `getTextareaWrapperClass()` for Textarea (uses `textAreaBaseClass`)

2. **`fieldGapClasses` object** in `Field.styles.ts`
   - `Record<FieldSize | "default", string>` — `{ default: "gap-2", sm: "gap-1.5", lg: "gap-3", xl: "gap-4" }`
   - Replaces nested ternary in TextInput/NumberInput

3. **`PlaceholderFallback` component** in `Field.styles.ts`
   - `<PlaceholderFallback value={displayValue()} placeholder={local.placeholder} />`
   - Replaces 6 identical JSX snippets across 3 files

4. **`isEditable`** stays as local arrow function in each component (extracting would require passing props — more complex, not simpler)

5. **C1** (string concatenation → clsx) resolved naturally when pickers adopt `getFieldWrapperClass()`

### Group B: removeFormat Bug Fix (Q1)

**File:** `TextInput.tsx`

When `formattedValue` is longer than `format`, characters at overflow positions are silently dropped because `format[i]` is `undefined`.

Fix: treat `undefined` formatChar as user data (same as `"X"`):
```typescript
if (formatChar === "X" || formatChar === undefined) {
  result += formattedValue[i];
}
```

### Group C: Inset Pattern Alignment (Q2)

**Files:** `DatePicker.tsx`, `DateTimePicker.tsx`, `TimePicker.tsx`

Align inset mode to TextInput/NumberInput pattern:
- Outer div: `clsx("relative", local.class)` — positioning only
- Inner content div: `getFieldWrapperClass({...})` — styled, `visibility: hidden` when editable
- Inner input overlay: `getFieldWrapperClass({...})` + `"absolute left-0 top-0 size-full"`

### Group D: Breaking API Changes (D1, D2, D4)

**D1: `createPwaUpdate` → `usePwaUpdate`**
- Rename file: `createPwaUpdate.ts` → `usePwaUpdate.ts`
- Rename function: `createPwaUpdate` → `usePwaUpdate`
- Update `index.ts` export
- Update solid-demo usages

**D2: Pagination `pageIndex` → `page` (1-based)**
- Props: `pageIndex` → `page`, `onPageIndexChange` → `onPageChange`
- Internal: convert to 0-based internally (`page - 1`)
- Display: `{p}` instead of `{p + 1}`
- Update solid-demo usages

**D4: Dialog dimension props — remove `Px` suffix**
- `widthPx` → `width`, `heightPx` → `height`
- `minWidthPx` → `minWidth`, `minHeightPx` → `minHeight`
- Type stays `number` (px is conventional default)
- Update solid-demo usages

### Group E: DX Improvements (D3, D6)

**D3: Progress value clamping**
- Add `Math.max(0, Math.min(1, value))` before `* 100`
- Add JSDoc: `@param value - 0 to 1 (0 = 0%, 1 = 100%)`

**D6: Remove internal context exports**
- Remove from `index.ts`: `SelectContext`, `ComboboxContext` exports
- Internal sub-components already use relative imports

### Group F: Minor Fixes (S5, C2)

**S5:** Remove empty `onCleanup` in `useSyncConfig.ts` (lines 96-99)

**C2:** Replace `as Setter<TValue | undefined>` cast in `useLocalStorage.ts` with explicit function type

## Execution Order

A → B → C → D → E → F

Group A first because C depends on the shared utilities. Others are independent.

## Test & Demo Updates

- TextInput tests: add removeFormat overflow test case
- Pagination: update test/demo for 1-based page
- Dialog: update demo for renamed props
- createPwaUpdate → usePwaUpdate: update demo imports
- Progress: add clamping behavior test
