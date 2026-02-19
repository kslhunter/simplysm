# Solid Package Review Round 2 — Design

## Overview

Address 11 issues from the comprehensive `packages/solid` code review. Excludes i18n (#3, #5) and DataSheet splitting (#10).

## Scope

| # | Priority | Category | Issue |
|---|----------|----------|-------|
| 1 | P0 | Bug | useSyncConfig race condition — save effect overwrites stored value for async storage |
| 2 | P0 | Bug | Uncontrolled mode validation uses `local.value` (props) instead of `value()` (signal) |
| 4 | P1 | Type | Kanban missing generic types — all values typed as `unknown` |
| 6 | P2 | Type | Combobox `loadItems` forces `Promise` return, no sync support |
| 7 | P2 | DX | useSyncConfig `ready` signal not used by callers (ThemeContext, DataSheet) |
| 8 | P3 | Refactor | Inset mode dual-element pattern duplicated across 6 field components |
| 9 | P3 | Refactor | Pointer drag boilerplate duplicated 4 times (DataSheet x2, Dialog x2) |
| 11 | P3 | Refactor | WeakMap ItemTemplate pattern duplicated in Select and Combobox |
| 12 | P3 | Refactor | CheckboxGroup and RadioGroup ~90% identical structure |
| 13 | P4 | Convention | Multiple local size type aliases all resolving to `"sm" \| "lg"` |
| 14 | P4 | Convention | DatePicker/DateTimePicker `formatValue`/`formatMinMax` duplication |

**Excluded:**
- #3 (hardcoded Korean validation messages / i18n) — deferred
- #5 (Korean-only runtime error messages) — deferred
- #10 (DataSheet 1274-line splitting) — kept as-is, already managed with #region and sheetUtils.ts

---

## Section 1: Bug Fixes (#1, #2)

### #1. useSyncConfig Race Condition

**File:** `packages/solid/src/hooks/useSyncConfig.ts`

**Problem:** The save `createEffect` (line 75) runs synchronously on mount before `initializeFromStorage()` completes for async `syncStorage`. This writes `defaultValue` to storage, potentially overwriting the actual stored value.

**Fix:** Add `ready()` guard to the save effect:

```typescript
// useSyncConfig.ts, line 75
createEffect(() => {
  if (!ready()) return;  // Don't save until storage has been read
  const currentValue = value();
  const serialized = JSON.stringify(currentValue);
  // ... rest of save logic unchanged
});
```

**Impact:** No behavior change for localStorage (synchronous, `ready()` is set before effect runs). Only affects async `syncStorage` callers.

### #2. Uncontrolled Mode Validation

**Files:** `NumberInput.tsx`, `TextInput.tsx`, `Textarea.tsx`, `DatePicker.tsx`, `DateTimePicker.tsx`, `TimePicker.tsx`

**Problem:** All field components validate against `local.value` (props) instead of `value()` (the controlled signal). In uncontrolled mode, `local.value` stays at the initial prop value while `value()` tracks user input.

**Fix:** In each component's `errorMsg` memo, replace `local.value` with `value()`:

```typescript
// Before
const errorMsg = createMemo(() => {
  const v = local.value;
  // ...
});

// After
const errorMsg = createMemo(() => {
  const v = value();
  // ...
});
```

**Impact:** In controlled mode, `local.value === value()`, so no behavior change. Only fixes uncontrolled mode where validation was non-functional.

---

## Section 2: Type Improvements (#4, #6, #7, #13)

### #4. Kanban Generic Types

**Files:** `KanbanContext.ts`, `Kanban.tsx`, `KanbanLane.tsx`, `KanbanCard.tsx`

Add generic type parameters with `= unknown` defaults for backward compatibility:

```typescript
// KanbanContext.ts
export interface KanbanDropInfo<TCardValue = unknown, TLaneValue = unknown> {
  sourceValue: TCardValue;
  targetLaneValue: TLaneValue;
  targetCardValue: TCardValue;
  position: "before" | "after" | undefined;
}

// Kanban.tsx
export interface KanbanProps<TCardValue = unknown, TLaneValue = unknown> {
  selectedValues?: TCardValue[];
  onSelectedValuesChange?: (values: TCardValue[]) => void;
  onDrop?: (info: KanbanDropInfo<TCardValue, TLaneValue>) => void;
  children?: JSX.Element;
}
```

Propagate generics to KanbanLane (`TLaneValue`) and KanbanCard (`TCardValue`). Internal contexts use `any` (same pattern as CheckboxGroup/RadioGroup).

### #6. Combobox loadItems Sync Support

**File:** `packages/solid/src/components/form-control/combobox/Combobox.tsx`

```typescript
// Before
loadItems: (query: string) => Promise<TValue[]>;

// After
loadItems: (query: string) => TValue[] | Promise<TValue[]>;
```

Internal call site wraps with `Promise.resolve()`:

```typescript
const result = await Promise.resolve(local.loadItems(query));
```

### #7. useSyncConfig `ready` Signal Usage

**Files:** `ThemeContext.tsx`, `DataSheet.tsx`

ThemeContext: Destructure `ready` and defer theme application until ready:

```typescript
const [mode, setMode, ready] = useSyncConfig<ThemeMode>("theme", "system");

// In resolvedTheme memo or theme application effect:
// Add ready() check to prevent flash of wrong theme
```

DataSheet: Destructure `ready` for completeness. Since `{ columnRecord: {} }` is a reasonable default, the visual impact is minimal.

### #13. Size Type Consolidation

**File:** `packages/solid/src/styles/tokens.styles.ts`

Export shared size types:

```typescript
export type ComponentSize = "sm" | "lg" | "xl";
export type ComponentSizeCompact = "sm" | "lg";
```

Replace local aliases:
- `CheckboxSize` → `ComponentSizeCompact`
- `ColorPickerSize` → `ComponentSizeCompact`
- `PaginationSize` → `ComponentSizeCompact`
- `ProgressSize` → `ComponentSizeCompact`
- `FieldSize` remains (already alias of `ComponentSize`)

---

## Section 3: FieldWrapper Extraction (#8)

### New Component: FieldWrapper

**New file:** `packages/solid/src/components/form-control/field/FieldWrapper.tsx`

Extracts the repeated Invalid + inset/standalone + dual-element overlay pattern:

```typescript
interface FieldWrapperProps {
  // Validation
  errorMessage?: string;
  touchMode?: boolean;

  // Mode
  inset?: boolean;
  disabled?: boolean;
  readonly?: boolean;

  // Styling
  class?: string;
  wrapperClass: (includeCustomClass: boolean) => string;

  // Content
  displayValue: JSX.Element;  // Inset mode: sizes the cell; Standalone readonly: shows value
  children: JSX.Element;      // The actual input element
}
```

**Responsibilities:**
1. Wrap with `<Invalid>` (variant: inset → `"dot"`, standalone → `"border"`)
2. Compute `isEditable` from `disabled`/`readonly`
3. Inset mode: dual-element overlay (visibility:hidden content + absolute input overlay)
4. Standalone mode: editable vs readonly display branch

**What stays in each field component:**
- `errorMsg` memo (validation logic is field-specific)
- `getWrapperClass` function (styling depends on field type)
- Input element rendering (IME, formatting, parsing)
- `displayValue` computation

**Modified files:** `TextInput.tsx`, `NumberInput.tsx`, `DatePicker.tsx`, `DateTimePicker.tsx`, `TimePicker.tsx`, `Textarea.tsx` — each reduces ~30 lines of JSX to ~10 lines.

**Not exported** from `index.ts` — internal utility only.

---

## Section 4: Remaining Refactoring (#9, #11, #12, #14)

### #9. createPointerDrag Helper

**New file:** `packages/solid/src/hooks/createPointerDrag.ts`

```typescript
export function createPointerDrag(
  target: HTMLElement,
  pointerId: number,
  options: {
    onMove: (e: PointerEvent) => void;
    onEnd: (e: PointerEvent) => void;
  },
): void {
  target.setPointerCapture(pointerId);
  const onPointerMove = (e: PointerEvent) => options.onMove(e);
  const onPointerUp = (e: PointerEvent) => {
    target.removeEventListener("pointermove", onPointerMove);
    target.removeEventListener("pointerup", onPointerUp);
    options.onEnd(e);
  };
  target.addEventListener("pointermove", onPointerMove);
  target.addEventListener("pointerup", onPointerUp);
}
```

**Modified files:**
- `DataSheet.tsx` — `onResizerPointerdown` (line 367) and `onReorderPointerDown` (line 567)
- `Dialog.tsx` — `handleHeaderPointerDown` (line 251) and `handleResizeBarPointerDown` (line 308)

Internal utility, not exported from `index.ts`.

### #11. createItemTemplate Helper

**New file:** `packages/solid/src/hooks/createItemTemplate.ts`

Extracts the shared WeakMap + hidden span + ref pattern from Select and Combobox:

```typescript
export function createItemTemplate<TArgs extends unknown[]>(dataAttr: string) {
  const templateFnMap = new WeakMap<HTMLElement, (...args: TArgs) => JSX.Element>();

  const TemplateSlot = (props: { children: (...args: TArgs) => JSX.Element }) => (
    <span
      ref={(el) => { templateFnMap.set(el, props.children); }}
      data-*={dataAttr}
      style={{ display: "none" }}
    />
  );

  const getTemplate = (
    slotElements: Element[],
  ): ((...args: TArgs) => JSX.Element) | undefined => {
    for (const el of slotElements) {
      if (el instanceof HTMLElement) {
        const fn = templateFnMap.get(el);
        if (fn) return fn;
      }
    }
    return undefined;
  };

  return { TemplateSlot, getTemplate };
}
```

**Modified files:** `Select.tsx`, `Combobox.tsx` — replace inline WeakMap patterns with `createItemTemplate` calls.

Internal utility, not exported from `index.ts`.

### #12. createSelectionGroup Helper

**New file:** `packages/solid/src/hooks/createSelectionGroup.ts`

Extracts the ~90% identical structure from CheckboxGroup and RadioGroup:

```typescript
interface SelectionGroupConfig<TValue> {
  mode: "single" | "multiple";
  contextName: string;
  ItemComponent: Component<{ value: TValue; ... }>;
}

export function createSelectionGroup<TValue>(config: SelectionGroupConfig<TValue>) {
  // Creates: Context, useContext hook, Inner component (with createControllableSignal),
  // Item wrapper, compound component assembly
  // Returns: { Group, Item }
}
```

**Modified files:** `CheckboxGroup.tsx`, `RadioGroup.tsx` — reduce to thin wrappers that call `createSelectionGroup` with their specific config.

Internal utility, not exported from `index.ts`.

### #14. formatDateValue Consolidation

**Files:** `DatePicker.tsx`, `DateTimePicker.tsx`

Merge `formatValue` and `formatMinMax` into single function:

```typescript
function formatDateValue(
  value: DateOnly | undefined,
  type: DatePickerUnit,
): string | undefined {
  if (value == null) return undefined;
  switch (type) {
    case "year": return value.toFormatString("yyyy");
    case "month": return value.toFormatString("yyyy-MM");
    case "date": return value.toFormatString("yyyy-MM-dd");
  }
}
```

Call sites:
- `formatValue(v, type)` → `formatDateValue(v, type) ?? ""`
- `formatMinMax(v, type)` → `formatDateValue(v, type)`

Same consolidation for DateTimePicker's DateTime-based variants.

---

## Files Changed Summary

### New Files (5)
| File | Purpose |
|------|---------|
| `hooks/createPointerDrag.ts` | Pointer drag lifecycle helper |
| `hooks/createItemTemplate.ts` | WeakMap ItemTemplate pattern helper |
| `hooks/createSelectionGroup.ts` | Checkbox/Radio group shared base |
| `form-control/field/FieldWrapper.tsx` | Inset/standalone field layout wrapper |
| (this design doc) | Design documentation |

### Modified Files (~20)
| File | Changes |
|------|---------|
| `hooks/useSyncConfig.ts` | Add `ready()` guard to save effect |
| `form-control/field/TextInput.tsx` | Use `value()` in validation; use FieldWrapper |
| `form-control/field/NumberInput.tsx` | Use `value()` in validation; use FieldWrapper |
| `form-control/field/Textarea.tsx` | Use `value()` in validation; use FieldWrapper |
| `form-control/field/DatePicker.tsx` | Use `value()` in validation; use FieldWrapper; merge format functions |
| `form-control/field/DateTimePicker.tsx` | Use `value()` in validation; use FieldWrapper; merge format functions |
| `form-control/field/TimePicker.tsx` | Use `value()` in validation; use FieldWrapper |
| `form-control/select/Select.tsx` | Use createItemTemplate |
| `form-control/combobox/Combobox.tsx` | Use createItemTemplate; accept sync loadItems |
| `form-control/checkbox/CheckboxGroup.tsx` | Use createSelectionGroup |
| `form-control/checkbox/RadioGroup.tsx` | Use createSelectionGroup |
| `data/kanban/KanbanContext.ts` | Add generic types |
| `data/kanban/Kanban.tsx` | Add generic types |
| `data/kanban/KanbanLane.tsx` | Add generic types |
| `data/kanban/KanbanCard.tsx` | Add generic types |
| `data/sheet/DataSheet.tsx` | Use createPointerDrag; use ready signal |
| `disclosure/Dialog.tsx` | Use createPointerDrag |
| `providers/ThemeContext.tsx` | Use ready signal |
| `styles/tokens.styles.ts` | Add ComponentSizeCompact type |
| `data/Pagination.tsx` | Use ComponentSizeCompact |
| `feedback/Progress.tsx` | Use ComponentSizeCompact |
| Various checkbox/color-picker files | Use ComponentSizeCompact |

## Testing Strategy

- Run existing tests: `pnpm vitest --project=solid`
- All changes are internal refactoring — public API is preserved (except Kanban gets generic types with `= unknown` defaults)
- FieldWrapper: existing field component tests cover the rendering paths
- createPointerDrag: existing Dialog drag/resize tests validate behavior
- Validation fix: may need new test cases for uncontrolled mode validation
