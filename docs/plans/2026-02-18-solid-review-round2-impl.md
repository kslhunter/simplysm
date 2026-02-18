# Solid Review Round 2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Fix 2 bugs, improve 4 type definitions, and extract 4 shared utilities in the `packages/solid` package.

**Architecture:** All changes are internal to `packages/solid`. New utility files (`createPointerDrag`, `createItemTemplate`, `createSelectionGroup`, `FieldWrapper`) are internal and NOT exported from `index.ts`. Public API preserved except Kanban gains generic type params with `= unknown` defaults.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS, Vitest

---

### Task 1: Fix useSyncConfig race condition (#1)

**Files:**
- Modify: `packages/solid/src/hooks/useSyncConfig.ts:75`

**Step 1: Write the fix**

In `useSyncConfig.ts`, add a `ready()` guard to the save `createEffect` at line 75. This prevents the effect from writing `defaultValue` to storage before async `initializeFromStorage()` completes.

```typescript
// useSyncConfig.ts — replace lines 75-94
  // Save to storage whenever value changes
  createEffect(() => {
    if (!ready()) return; // Don't save until storage has been read
    const currentValue = value();
    const serialized = JSON.stringify(currentValue);

    if (!config.syncStorage) {
      // Use localStorage synchronously
      localStorage.setItem(prefixedKey, serialized);
      return;
    }

    // Use syncStorage asynchronously
    void (async () => {
      try {
        await config.syncStorage!.setItem(prefixedKey, serialized);
      } catch {
        // Fall back to localStorage on error
        localStorage.setItem(prefixedKey, serialized);
      }
    })();
  });
```

**Step 2: Run typecheck to verify**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: Run existing tests**

Run: `pnpm vitest packages/solid --run`
Expected: All tests pass (no behavior change for localStorage callers)

**Step 4: Commit**

```bash
git add packages/solid/src/hooks/useSyncConfig.ts
git commit -m "fix(solid): add ready guard to useSyncConfig save effect"
```

---

### Task 2: Fix uncontrolled mode validation bug (#2)

**Files:**
- Modify: `packages/solid/src/components/form-control/field/TextInput.tsx:241`
- Modify: `packages/solid/src/components/form-control/field/NumberInput.tsx:285`
- Modify: `packages/solid/src/components/form-control/field/Textarea.tsx:176`
- Modify: `packages/solid/src/components/form-control/field/DatePicker.tsx:207`
- Modify: `packages/solid/src/components/form-control/field/DateTimePicker.tsx:164`
- Modify: `packages/solid/src/components/form-control/field/TimePicker.tsx:164`

**Step 1: Fix all 6 field components**

In each component's `errorMsg` memo, replace `local.value` with `value()` to use the signal (which tracks user input in uncontrolled mode).

**TextInput.tsx** — change line 241:
```typescript
// Before: const v = local.value ?? "";
// After:
const v = value() ?? "";
```

**NumberInput.tsx** — change line 285:
```typescript
// Before: const v = local.value;
// After:
const v = value();
```

**Textarea.tsx** — change line 176:
```typescript
// Before: const v = local.value ?? "";
// After:
const v = value() ?? "";
```

**DatePicker.tsx** — change line 207:
```typescript
// Before: const v = local.value;
// After:
const v = value();
```

**DateTimePicker.tsx** — change line 164 (in errorMsg memo):
```typescript
// Before: const v = local.value;
// After:
const v = value();
```

**TimePicker.tsx** — change line 164:
```typescript
// Before: const v = local.value;
// After:
const v = value();
```

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: Run existing tests**

Run: `pnpm vitest packages/solid --run`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/solid/src/components/form-control/field/TextInput.tsx \
       packages/solid/src/components/form-control/field/NumberInput.tsx \
       packages/solid/src/components/form-control/field/Textarea.tsx \
       packages/solid/src/components/form-control/field/DatePicker.tsx \
       packages/solid/src/components/form-control/field/DateTimePicker.tsx \
       packages/solid/src/components/form-control/field/TimePicker.tsx
git commit -m "fix(solid): use value() signal instead of local.value in field validation"
```

---

### Task 3: Add Kanban generic type parameters (#4)

**Files:**
- Modify: `packages/solid/src/components/data/kanban/Kanban.tsx:50-54,229-236,485-503,505,557,575`

KanbanContext.ts already has generic defaults (`<L = unknown, T = unknown>`). The issue is that `Kanban.tsx` component props don't propagate these generics.

**Step 1: Add generics to KanbanCardProps**

```typescript
// Kanban.tsx line 50-59 — replace:
export interface KanbanCardProps<TCardValue = unknown> extends Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  "children" | "draggable"
> {
  value?: TCardValue;
  draggable?: boolean;
  selectable?: boolean;
  contentClass?: string;
  children?: JSX.Element;
}
```

**Step 2: Add generics to KanbanLaneProps**

```typescript
// Kanban.tsx line 229-236 — replace:
export interface KanbanLaneProps<TLaneValue = unknown> extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  value?: TLaneValue;
  busy?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  children?: JSX.Element;
}
```

**Step 3: Add generics to KanbanProps**

```typescript
// Kanban.tsx line 485-493 — replace:
export interface KanbanProps<TCardValue = unknown, TLaneValue = unknown> extends Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  "children" | "onDrop"
> {
  onDrop?: (info: KanbanDropInfo<TLaneValue, TCardValue>) => void;
  selectedValues?: TCardValue[];
  onSelectedValuesChange?: (values: TCardValue[]) => void;
  children?: JSX.Element;
}
```

**Step 4: Update KanbanComponent interface**

```typescript
// Kanban.tsx line 497-503 — replace:
interface KanbanComponent {
  <TCardValue = unknown, TLaneValue = unknown>(props: KanbanProps<TCardValue, TLaneValue>): JSX.Element;
  Lane: typeof KanbanLane;
  Card: typeof KanbanCard;
  LaneTitle: typeof KanbanLaneTitle;
  LaneTools: typeof KanbanLaneTools;
}
```

Internal component functions (`KanbanCard`, `KanbanLane`, `KanbanBase`) continue using `unknown` internally since they access context which is typed with `any` (same pattern as CheckboxGroup/RadioGroup).

**Step 5: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/solid/src/components/data/kanban/Kanban.tsx
git commit -m "feat(solid): add generic type parameters to Kanban component props"
```

---

### Task 4: Add sync support to Combobox loadItems (#6)

**Files:**
- Modify: `packages/solid/src/components/form-control/combobox/Combobox.tsx:67,223`

**Step 1: Update loadItems type**

```typescript
// Combobox.tsx line 67 — change:
// Before: loadItems: (query: string) => Promise<TValue[]>;
// After:
  loadItems: (query: string) => TValue[] | Promise<TValue[]>;
```

**Step 2: Update call site to wrap with Promise.resolve**

```typescript
// Combobox.tsx line 220-228 — replace performSearch body:
  const performSearch = (searchQuery: string) => {
    const loadItemsFn = local.loadItems;
    debounceQueue.run(async () => {
      setBusyCount((c) => c + 1);
      try {
        const result = await Promise.resolve(loadItemsFn(searchQuery));
        setItems(result);
      } finally {
        setBusyCount((c) => c - 1);
      }
    });
  };
```

**Step 3: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/form-control/combobox/Combobox.tsx
git commit -m "feat(solid): allow sync return from Combobox loadItems"
```

---

### Task 5: Consolidate size type aliases (#13)

**Files:**
- Modify: `packages/solid/src/styles/tokens.styles.ts:17`
- Modify: `packages/solid/src/components/data/Pagination.tsx:13`
- Modify: `packages/solid/src/components/feedback/Progress.tsx:7`
- Modify: `packages/solid/src/components/form-control/color-picker/ColorPicker.tsx:7`

**Step 1: Add ComponentSizeCompact to tokens.styles.ts**

```typescript
// tokens.styles.ts — after line 17 (after ComponentSize)
export type ComponentSize = "sm" | "lg" | "xl";
export type ComponentSizeCompact = "sm" | "lg";
```

**Step 2: Replace PaginationSize**

In `Pagination.tsx`, remove the local `type PaginationSize = "sm" | "lg"` (line 13) and import `ComponentSizeCompact` from tokens:

```typescript
// Add to imports from tokens.styles:
import { type ComponentSizeCompact } from "../../styles/tokens.styles";

// Remove: type PaginationSize = "sm" | "lg";
// Replace all PaginationSize usages with ComponentSizeCompact
```

**Step 3: Replace ProgressSize**

In `Progress.tsx`, remove the local `export type ProgressSize = "sm" | "lg"` (line 7) and import `ComponentSizeCompact`:

```typescript
import { type ComponentSizeCompact } from "../../styles/tokens.styles";

// Remove: export type ProgressSize = "sm" | "lg";
// Replace all ProgressSize usages with ComponentSizeCompact
```

Note: `ProgressSize` is exported. Check if it's used elsewhere. If it is, keep it as a re-export: `export type ProgressSize = ComponentSizeCompact;`. If not used externally, just remove it.

**Step 4: Replace ColorPickerSize**

In `ColorPicker.tsx`, remove the local `type ColorPickerSize = "sm" | "lg"` (line 7) and import `ComponentSizeCompact`:

```typescript
import { type ComponentSizeCompact } from "../../../styles/tokens.styles";

// Remove: type ColorPickerSize = "sm" | "lg";
// Replace all ColorPickerSize usages with ComponentSizeCompact
```

**Step 5: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/solid/src/styles/tokens.styles.ts \
       packages/solid/src/components/data/Pagination.tsx \
       packages/solid/src/components/feedback/Progress.tsx \
       packages/solid/src/components/form-control/color-picker/ColorPicker.tsx
git commit -m "refactor(solid): consolidate size type aliases to ComponentSizeCompact"
```

---

### Task 6: Consolidate formatDateValue functions (#14)

**Files:**
- Modify: `packages/solid/src/components/form-control/field/DatePicker.tsx:61-72,116-127`
- Modify: `packages/solid/src/components/form-control/field/DateTimePicker.tsx:61-70,111-120`

**Step 1: Merge DatePicker format functions**

In `DatePicker.tsx`, replace `formatValue` (lines 61-72) and `formatMinMax` (lines 116-127) with a single function:

```typescript
/**
 * DateOnly 값을 타입에 맞는 문자열로 변환
 */
function formatDateValue(value: DateOnly | undefined, type: DatePickerUnit): string | undefined {
  if (value == null) return undefined;

  switch (type) {
    case "year":
      return value.toFormatString("yyyy");
    case "month":
      return value.toFormatString("yyyy-MM");
    case "date":
      return value.toFormatString("yyyy-MM-dd");
  }
}
```

Update call sites:
- Where `formatValue(v, type)` was used (returns `""` for null): `formatDateValue(v, type) ?? ""`
- Where `formatMinMax(v, type)` was used (returns `undefined` for null): `formatDateValue(v, type)`

Specifically in DatePicker.tsx:
- `displayValue()` uses `formatValue` → change to `formatDateValue(value(), fieldType()) ?? ""`
- `min={formatMinMax(...)}` → `min={formatDateValue(local.min, fieldType())}`
- `max={formatMinMax(...)}` → `max={formatDateValue(local.max, fieldType())}`

**Step 2: Merge DateTimePicker format functions**

Same pattern for `DateTimePicker.tsx`. Replace `formatValue` (lines 61-70) and `formatMinMax` (lines 111-120):

```typescript
/**
 * DateTime 값을 타입에 맞는 문자열로 변환
 */
function formatDateTimeValue(value: DateTime | undefined, unit: DateTimePickerUnit): string | undefined {
  if (value == null) return undefined;

  switch (unit) {
    case "minute":
      return value.toFormatString("yyyy-MM-ddTHH:mm");
    case "second":
      return value.toFormatString("yyyy-MM-ddTHH:mm:ss");
  }
}
```

Update call sites:
- `formatValue(v, unit)` → `formatDateTimeValue(v, unit) ?? ""`
- `formatMinMax(v, unit)` → `formatDateTimeValue(v, unit)`

**Step 3: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/form-control/field/DatePicker.tsx \
       packages/solid/src/components/form-control/field/DateTimePicker.tsx
git commit -m "refactor(solid): merge formatValue and formatMinMax in date pickers"
```

---

### Task 7: Extract createPointerDrag helper (#9)

**Files:**
- Create: `packages/solid/src/hooks/createPointerDrag.ts`
- Modify: `packages/solid/src/components/disclosure/Dialog.tsx:251-305,308-365`
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx:367-414,567-686`

**Step 1: Create createPointerDrag utility**

```typescript
// packages/solid/src/hooks/createPointerDrag.ts

/**
 * Sets up pointer capture and manages pointermove/pointerup lifecycle on a target element.
 *
 * @param target - Element to capture pointer on
 * @param pointerId - Pointer ID from the initiating PointerEvent
 * @param options.onMove - Called on each pointermove
 * @param options.onEnd - Called on pointerup (after listener cleanup)
 */
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

**Step 2: Refactor Dialog.tsx handleHeaderPointerDown (lines 251-305)**

Replace the manual setPointerCapture + addEventListener pattern with `createPointerDrag`:

```typescript
import { createPointerDrag } from "../../../hooks/createPointerDrag";

  // 드래그 이동
  const handleHeaderPointerDown = (event: PointerEvent) => {
    if (local.movable === false) return;
    if (!dialogRef || !wrapperRef) return;
    if ((event.target as HTMLElement).closest("button")) return;

    const target = event.currentTarget as HTMLElement;
    const dialogEl = dialogRef;
    const wrapperEl = wrapperRef;

    const startX = event.clientX;
    const startY = event.clientY;
    const startTop = dialogEl.offsetTop;
    const startLeft = dialogEl.offsetLeft;

    createPointerDrag(target, event.pointerId, {
      onMove(e) {
        e.stopPropagation();
        e.preventDefault();

        dialogEl.style.position = "absolute";
        dialogEl.style.left = `${startLeft + e.clientX - startX}px`;
        dialogEl.style.top = `${startTop + e.clientY - startY}px`;
        dialogEl.style.right = "auto";
        dialogEl.style.bottom = "auto";
        dialogEl.style.margin = "0";

        // 화면 밖 방지
        if (dialogEl.offsetLeft > wrapperEl.offsetWidth - 100) {
          dialogEl.style.left = wrapperEl.offsetWidth - 100 + "px";
        }
        if (dialogEl.offsetTop > wrapperEl.offsetHeight - 100) {
          dialogEl.style.top = wrapperEl.offsetHeight - 100 + "px";
        }
        if (dialogEl.offsetTop < 0) {
          dialogEl.style.top = "0";
        }
        if (dialogEl.offsetLeft < -dialogEl.offsetWidth + 100) {
          dialogEl.style.left = -dialogEl.offsetWidth + 100 + "px";
        }
      },
      onEnd(e) {
        e.stopPropagation();
        e.preventDefault();
      },
    });
  };
```

**Step 3: Refactor Dialog.tsx handleResizeBarPointerDown (lines 308-365)**

Same pattern — replace manual lifecycle with `createPointerDrag`:

```typescript
  const handleResizeBarPointerDown = (event: PointerEvent, direction: ResizeDirection) => {
    if (!local.resizable) return;
    if (!dialogRef) return;

    const target = event.currentTarget as HTMLElement;
    const dialogEl = dialogRef;

    const startX = event.clientX;
    const startY = event.clientY;
    const startHeight = dialogEl.clientHeight;
    const startWidth = dialogEl.clientWidth;
    const startTop = dialogEl.offsetTop;
    const startLeft = dialogEl.offsetLeft;

    createPointerDrag(target, event.pointerId, {
      onMove(e) {
        e.stopPropagation();
        e.preventDefault();

        // ... existing resize logic unchanged ...
        if (direction === "top" || direction === "top-right" || direction === "top-left") {
          if (dialogEl.style.position === "absolute") {
            dialogEl.style.top = startTop + (e.clientY - startY) + "px";
            dialogEl.style.bottom = "auto";
          }
          dialogEl.style.height = `${Math.max(startHeight - (e.clientY - startY), local.minHeight ?? 0)}px`;
        }
        if (direction === "bottom" || direction === "bottom-right" || direction === "bottom-left") {
          dialogEl.style.height = `${Math.max(startHeight + e.clientY - startY, local.minHeight ?? 0)}px`;
        }
        if (direction === "right" || direction === "bottom-right" || direction === "top-right") {
          dialogEl.style.width = `${Math.max(
            startWidth + (e.clientX - startX) * (dialogEl.style.position === "absolute" ? 1 : 2),
            local.minWidth ?? 0,
          )}px`;
        }
        if (direction === "left" || direction === "bottom-left" || direction === "top-left") {
          if (dialogEl.style.position === "absolute") {
            dialogEl.style.left = startLeft + (e.clientX - startX) + "px";
          }
          dialogEl.style.width = `${Math.max(
            startWidth - (e.clientX - startX) * (dialogEl.style.position === "absolute" ? 1 : 2),
            local.minWidth ?? 0,
          )}px`;
        }
      },
      onEnd(e) {
        e.stopPropagation();
        e.preventDefault();
      },
    });
  };
```

**Step 4: Refactor DataSheet.tsx onResizerPointerdown (lines 367-414)**

```typescript
import { createPointerDrag } from "../../../hooks/createPointerDrag";

  function onResizerPointerdown(event: PointerEvent, colKey: string): void {
    event.preventDefault();
    const target = event.target as HTMLElement;

    const th = target.closest("th")!;
    const container = th
      .closest("[data-sheet]")!
      .querySelector("[data-sheet-scroll]") as HTMLElement;
    const startX = event.clientX;
    const startWidth = th.offsetWidth;

    // 리사이즈 인디케이터 표시
    const containerRect = container.getBoundingClientRect();
    setResizeIndicatorStyle({
      display: "block",
      left: `${th.getBoundingClientRect().right - containerRect.left + container.scrollLeft}px`,
      top: "0",
      height: `${container.scrollHeight}px`,
    });

    createPointerDrag(target, event.pointerId, {
      onMove(e) {
        const delta = e.clientX - startX;
        const newWidth = Math.max(30, startWidth + delta);
        const currentRect = container.getBoundingClientRect();
        setResizeIndicatorStyle({
          display: "block",
          left: `${th.getBoundingClientRect().left - currentRect.left + container.scrollLeft + newWidth}px`,
          top: "0",
          height: `${container.scrollHeight}px`,
        });
      },
      onEnd(e) {
        const delta = e.clientX - startX;
        if (delta !== 0) {
          const newWidth = Math.max(30, startWidth + delta);
          saveColumnWidth(colKey, `${newWidth}px`);
        }
        setResizeIndicatorStyle({ display: "none" });
      },
    });
  }
```

**Step 5: Refactor DataSheet.tsx onReorderPointerDown (lines 567-686)**

```typescript
  function onReorderPointerDown(e: PointerEvent, item: T): void {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;

    const tableEl = target.closest("table")!;
    const tbody = tableEl.querySelector("tbody")!;
    const rows = Array.from(tbody.rows);

    setDragState({ draggingItem: item, targetItem: null, position: null });

    createPointerDrag(target, e.pointerId, {
      onMove(ev) {
        // ... existing move logic unchanged (lines 579-655) ...
        let foundTarget: T | null = null;
        let foundPosition: "before" | "after" | "inside" | null = null;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rect = row.getBoundingClientRect();
          if (ev.clientY < rect.top || ev.clientY > rect.bottom) continue;

          if (i >= displayItems().length) break;
          const flat = displayItems()[i];
          if (flat.item === item) break;

          if (isDescendant(item, flat.item)) break;

          const relY = ev.clientY - rect.top;
          const third = rect.height / 3;

          if (relY < third) {
            foundPosition = "before";
          } else if (relY > third * 2) {
            foundPosition = "after";
          } else {
            foundPosition = local.getChildren
              ? "inside"
              : relY < rect.height / 2
                ? "before"
                : "after";
          }
          foundTarget = flat.item;
          break;
        }

        setDragState({ draggingItem: item, targetItem: foundTarget, position: foundPosition });

        for (let i = 0; i < rows.length; i++) {
          rows[i].removeAttribute("data-dragging");
          rows[i].removeAttribute("data-drag-over");

          if (i < displayItems().length) {
            const flat = displayItems()[i];
            if (flat.item === item) {
              rows[i].setAttribute("data-dragging", "");
            }
            if (flat.item === foundTarget && foundPosition === "inside") {
              rows[i].setAttribute("data-drag-over", "inside");
            }
          }
        }

        const indicatorEl = tableEl
          .closest("[data-sheet-scroll]")
          ?.querySelector("[data-reorder-indicator]") as HTMLElement | null;
        if (indicatorEl) {
          if (foundTarget != null && foundPosition != null && foundPosition !== "inside") {
            const targetIdx = displayItems().findIndex((f) => f.item === foundTarget);
            if (targetIdx >= 0) {
              const targetRow = rows[targetIdx];
              const containerRect = tableEl.closest("[data-sheet-scroll]")!.getBoundingClientRect();
              const rowRect = targetRow.getBoundingClientRect();
              const scrollEl = tableEl.closest("[data-sheet-scroll]") as HTMLElement;

              const top =
                foundPosition === "before"
                  ? rowRect.top - containerRect.top + scrollEl.scrollTop
                  : rowRect.bottom - containerRect.top + scrollEl.scrollTop;

              indicatorEl.style.display = "block";
              indicatorEl.style.top = `${top}px`;
            }
          } else {
            indicatorEl.style.display = "none";
          }
        }
      },
      onEnd() {
        const state = dragState();
        if (state?.targetItem != null && state.position != null) {
          local.onItemsReorder?.({
            item: state.draggingItem,
            targetItem: state.targetItem,
            position: state.position,
          } as DataSheetReorderEvent<T>);
        }

        for (const row of rows) {
          row.removeAttribute("data-dragging");
          row.removeAttribute("data-drag-over");
        }
        const indicatorEl = tableEl
          .closest("[data-sheet-scroll]")
          ?.querySelector("[data-reorder-indicator]") as HTMLElement | null;
        if (indicatorEl) {
          indicatorEl.style.display = "none";
        }

        setDragState(null);
      },
    });
  }
```

**Step 6: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 7: Run tests**

Run: `pnpm vitest packages/solid --run`
Expected: All tests pass (Dialog drag/resize tests validate behavior)

**Step 8: Commit**

```bash
git add packages/solid/src/hooks/createPointerDrag.ts \
       packages/solid/src/components/disclosure/Dialog.tsx \
       packages/solid/src/components/data/sheet/DataSheet.tsx
git commit -m "refactor(solid): extract createPointerDrag helper for pointer capture lifecycle"
```

---

### Task 8: Extract createItemTemplate helper (#11)

**Files:**
- Create: `packages/solid/src/hooks/createItemTemplate.ts`
- Modify: `packages/solid/src/components/form-control/select/Select.tsx:78-99,326-343`
- Modify: `packages/solid/src/components/form-control/combobox/Combobox.tsx:41-56,303-314`

**Step 1: Create createItemTemplate utility**

```typescript
// packages/solid/src/hooks/createItemTemplate.ts
import type { JSX } from "solid-js";

/**
 * Creates a WeakMap-based template slot pattern for passing render functions through SolidJS children.
 *
 * Used by Select and Combobox to support the ItemTemplate sub-component pattern.
 * The TemplateSlot renders a hidden span with a ref that stores the render function in a WeakMap.
 * getTemplate retrieves the render function from resolved slot elements.
 *
 * @param dataAttr - data attribute name for the hidden span (e.g., "data-select-item-template")
 */
export function createItemTemplate<TArgs extends unknown[]>(dataAttr: string) {
  const templateFnMap = new WeakMap<HTMLElement, (...args: TArgs) => JSX.Element>();

  function TemplateSlot(props: { children: (...args: TArgs) => JSX.Element }): JSX.Element {
    return (
      <span
        ref={(el) => {
          templateFnMap.set(el, props.children);
        }}
        {...{ [dataAttr]: true }}
        style={{ display: "none" }}
      />
    );
  }

  function getTemplate(
    slotElements: Element[],
  ): ((...args: TArgs) => JSX.Element) | undefined {
    if (slotElements.length === 0) return undefined;
    const el = slotElements[0];
    if (el instanceof HTMLElement) {
      return templateFnMap.get(el);
    }
    return undefined;
  }

  return { TemplateSlot, getTemplate };
}
```

**Step 2: Refactor Select.tsx**

Remove the inline `templateFnMap` WeakMap and `SelectItemTemplate` (lines 78-99). Replace with `createItemTemplate`:

```typescript
import { createItemTemplate } from "../../../hooks/createItemTemplate";

// Replace lines 78-99 with:
const {
  TemplateSlot: SelectItemTemplate,
  getTemplate: getSelectItemTemplate,
} = createItemTemplate<[item: unknown, index: number, depth: number]>("data-select-item-template");
```

In `SelectInner`, replace `getItemTemplate()` function (lines 333-342):

```typescript
    // Replace the getItemTemplate function with:
    const getItemTemplate = ():
      | ((item: T, index: number, depth: number) => JSX.Element)
      | undefined => {
      return getSelectItemTemplate(slots().selectItemTemplate) as
        | ((item: T, index: number, depth: number) => JSX.Element)
        | undefined;
    };
```

**Step 3: Refactor Combobox.tsx**

Remove the inline `templateFnMap` WeakMap and `ComboboxItemTemplate` (lines 41-56). Replace with `createItemTemplate`:

```typescript
import { createItemTemplate } from "../../../hooks/createItemTemplate";

// Replace lines 41-56 with:
const {
  TemplateSlot: ComboboxItemTemplate,
  getTemplate: getComboboxItemTemplate,
} = createItemTemplate<[item: unknown, index: number]>("data-combobox-item-template");
```

In `ComboboxInner`, replace `getItemTemplate()` function (lines 308-314):

```typescript
    const getItemTemplate = (): ((item: T, index: number) => JSX.Element) | undefined => {
      return getComboboxItemTemplate(slots().comboboxItemTemplate) as
        | ((item: T, index: number) => JSX.Element)
        | undefined;
    };
```

Also remove the now-unused `ComboboxItemTemplateProps` interface (lines 41-43).

**Step 4: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 5: Run tests**

Run: `pnpm vitest packages/solid --run`
Expected: All tests pass

**Step 6: Commit**

```bash
git add packages/solid/src/hooks/createItemTemplate.ts \
       packages/solid/src/components/form-control/select/Select.tsx \
       packages/solid/src/components/form-control/combobox/Combobox.tsx
git commit -m "refactor(solid): extract createItemTemplate helper from Select and Combobox"
```

---

### Task 9: Extract createSelectionGroup helper (#12)

**Files:**
- Create: `packages/solid/src/hooks/createSelectionGroup.ts`
- Modify: `packages/solid/src/components/form-control/checkbox/CheckboxGroup.tsx`
- Modify: `packages/solid/src/components/form-control/checkbox/RadioGroup.tsx`

**Step 1: Create createSelectionGroup utility**

Analyze the shared structure between CheckboxGroup and RadioGroup. Both have:
- Context creation (createContext, useContext)
- Item sub-component (reads context, renders inner component)
- Inner component (splitProps, createControllableSignal, context provider)
- Validation (errorMsg memo)
- Invalid wrapper

Key differences:
- CheckboxGroup: value is `TValue[]`, toggle adds/removes from array
- RadioGroup: value is `TValue | undefined`, select sets directly
- CheckboxGroup uses Checkbox, RadioGroup uses Radio
- Error messages differ slightly

```typescript
// packages/solid/src/hooks/createSelectionGroup.ts
import {
  type Component,
  type JSX,
  type ParentComponent,
  createContext,
  createMemo,
  splitProps,
  useContext,
} from "solid-js";
import { twMerge } from "tailwind-merge";
import { createControllableSignal } from "./createControllableSignal";
import { Invalid } from "../components/form-control/Invalid";
import type { CheckboxSize } from "../components/form-control/checkbox/Checkbox.styles";

interface SelectionGroupItemProps<TValue> {
  value: TValue;
  disabled?: boolean;
  children?: JSX.Element;
}

interface SelectionGroupContextBase {
  disabled: () => boolean;
  size: () => CheckboxSize | undefined;
  inline: () => boolean;
  inset: () => boolean;
}

interface MultiSelectContext<TValue> extends SelectionGroupContextBase {
  value: () => TValue[];
  toggle: (item: TValue) => void;
}

interface SingleSelectContext<TValue> extends SelectionGroupContextBase {
  value: () => TValue | undefined;
  select: (item: TValue) => void;
}

interface SelectionGroupConfig<TValue> {
  mode: "single" | "multiple";
  contextName: string;
  ItemComponent: Component<{
    value: boolean;
    onValueChange: () => void;
    disabled: boolean;
    size: CheckboxSize | undefined;
    inline: boolean;
    inset: boolean;
    children?: JSX.Element;
  }>;
  emptyErrorMsg: string;
}

// Props for multiple mode
interface MultiGroupProps<TValue> {
  value?: TValue[];
  onValueChange?: (value: TValue[]) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  inline?: boolean;
  inset?: boolean;
  required?: boolean;
  validate?: (value: TValue[]) => string | undefined;
  touchMode?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

// Props for single mode
interface SingleGroupProps<TValue> {
  value?: TValue;
  onValueChange?: (value: TValue) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  inline?: boolean;
  inset?: boolean;
  required?: boolean;
  validate?: (value: TValue | undefined) => string | undefined;
  touchMode?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

export function createSelectionGroup<TValue>(config: SelectionGroupConfig<TValue> & { mode: "multiple" }): {
  Group: { <T = unknown>(props: MultiGroupProps<T>): JSX.Element; Item: <T>(props: SelectionGroupItemProps<T>) => JSX.Element };
};
export function createSelectionGroup<TValue>(config: SelectionGroupConfig<TValue> & { mode: "single" }): {
  Group: { <T = unknown>(props: SingleGroupProps<T>): JSX.Element; Item: <T>(props: SelectionGroupItemProps<T>) => JSX.Element };
};
export function createSelectionGroup<TValue>(config: SelectionGroupConfig<TValue>) {
  const Context = createContext<MultiSelectContext<any> | SingleSelectContext<any>>();

  function ItemInner<T>(props: SelectionGroupItemProps<T>) {
    const ctx = useContext(Context);
    if (!ctx) throw new Error(`${config.contextName}.Item은 ${config.contextName} 내부에서만 사용할 수 있습니다`);

    const isSelected = () =>
      config.mode === "multiple"
        ? (ctx as MultiSelectContext<T>).value().includes(props.value)
        : (ctx as SingleSelectContext<T>).value() === props.value;

    const handleChange = () => {
      if (config.mode === "multiple") {
        (ctx as MultiSelectContext<T>).toggle(props.value);
      } else {
        (ctx as SingleSelectContext<T>).select(props.value);
      }
    };

    return (
      <config.ItemComponent
        value={isSelected()}
        onValueChange={handleChange}
        disabled={props.disabled ?? ctx.disabled()}
        size={ctx.size()}
        inline={ctx.inline()}
        inset={ctx.inset()}
      >
        {props.children}
      </config.ItemComponent>
    );
  }

  const GroupInner: ParentComponent<MultiGroupProps<unknown> | SingleGroupProps<unknown>> = (props) => {
    const [local, rest] = splitProps(props, [
      "value",
      "onValueChange",
      "disabled",
      "size",
      "inline",
      "inset",
      "required",
      "validate",
      "touchMode",
      "class",
      "style",
      "children",
    ]);

    const contextValue = (() => {
      if (config.mode === "multiple") {
        const [value, setValue] = createControllableSignal({
          value: () => (local as MultiGroupProps<unknown>).value ?? [],
          onChange: () => (local as MultiGroupProps<unknown>).onValueChange,
        });
        const toggle = (item: unknown) => {
          setValue((prev) => {
            if (prev.includes(item)) return prev.filter((v) => v !== item);
            return [...prev, item];
          });
        };
        return {
          value,
          toggle,
          disabled: () => local.disabled ?? false,
          size: () => local.size,
          inline: () => local.inline ?? false,
          inset: () => local.inset ?? false,
        } as MultiSelectContext<unknown>;
      } else {
        const [value, setValue] = createControllableSignal({
          value: () => (local as SingleGroupProps<unknown>).value,
          onChange: () => (local as SingleGroupProps<unknown>).onValueChange,
        });
        const select = (item: unknown) => {
          setValue(item);
        };
        return {
          value,
          select,
          disabled: () => local.disabled ?? false,
          size: () => local.size,
          inline: () => local.inline ?? false,
          inset: () => local.inset ?? false,
        } as SingleSelectContext<unknown>;
      }
    })();

    const errorMsg = createMemo(() => {
      if (config.mode === "multiple") {
        const v = (local as MultiGroupProps<unknown>).value ?? [];
        if (local.required && v.length === 0) return config.emptyErrorMsg;
        return (local as MultiGroupProps<unknown>).validate?.(v);
      } else {
        const v = (local as SingleGroupProps<unknown>).value;
        if (local.required && (v === undefined || v === null)) return config.emptyErrorMsg;
        return (local as SingleGroupProps<unknown>).validate?.(v);
      }
    });

    return (
      <Invalid message={errorMsg()} variant="dot" touchMode={local.touchMode}>
        <Context.Provider value={contextValue}>
          <div {...rest} class={twMerge("inline-flex", local.class)} style={local.style}>
            {local.children}
          </div>
        </Context.Provider>
      </Invalid>
    );
  };

  const Group = GroupInner as any;
  Group.Item = ItemInner;

  return { Group };
}
```

**Important:** This helper is complex. If the implementation becomes unwieldy with too many type casts, **fall back to a simpler approach**: just extract the shared context shape and keep CheckboxGroup/RadioGroup as separate files with reduced duplication via shared helper functions (e.g., `createGroupContext` for the context+provider pattern only). The goal is to reduce duplication, not to create a harder-to-understand abstraction.

**Step 2: Refactor CheckboxGroup.tsx**

```typescript
import { Checkbox } from "./Checkbox";
import { createSelectionGroup } from "../../../hooks/createSelectionGroup";

const { Group } = createSelectionGroup({
  mode: "multiple",
  contextName: "CheckboxGroup",
  ItemComponent: Checkbox,
  emptyErrorMsg: "항목을 선택해 주세요",
});

export const CheckboxGroup = Group;
```

**Step 3: Refactor RadioGroup.tsx**

```typescript
import { Radio } from "./Radio";
import { createSelectionGroup } from "../../../hooks/createSelectionGroup";

const { Group } = createSelectionGroup({
  mode: "single",
  contextName: "RadioGroup",
  ItemComponent: Radio,
  emptyErrorMsg: "항목을 선택해 주세요",
});

export const RadioGroup = Group;
```

**Step 4: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS — if type issues arise, simplify the helper (see the Important note in Step 1)

**Step 5: Run tests**

Run: `pnpm vitest packages/solid --run`
Expected: All tests pass

**Step 6: Commit**

```bash
git add packages/solid/src/hooks/createSelectionGroup.ts \
       packages/solid/src/components/form-control/checkbox/CheckboxGroup.tsx \
       packages/solid/src/components/form-control/checkbox/RadioGroup.tsx
git commit -m "refactor(solid): extract createSelectionGroup from CheckboxGroup and RadioGroup"
```

---

### Task 10: Use useSyncConfig ready signal in ThemeContext (#7)

**Files:**
- Modify: `packages/solid/src/providers/ThemeContext.tsx:88,111-114`

**Step 1: Destructure ready from useSyncConfig**

```typescript
// ThemeContext.tsx line 88 — change:
// Before: const [mode, setMode] = useSyncConfig<ThemeMode>("theme", "system");
// After:
const [mode, setMode, ready] = useSyncConfig<ThemeMode>("theme", "system");
```

**Step 2: Guard the theme application effect**

The existing `createEffect` at line 111 toggles the `dark` class on `<html>`. Guard it with `ready()` to prevent a flash of wrong theme while async storage loads:

```typescript
// ThemeContext.tsx lines 111-114 — replace:
  // <html>에 dark 클래스 토글
  createEffect(() => {
    if (!ready()) return; // Don't apply theme until storage has been read
    const isDark = resolvedTheme() === "dark";
    document.documentElement.classList.toggle("dark", isDark);
  });
```

**Step 3: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/providers/ThemeContext.tsx
git commit -m "fix(solid): guard ThemeContext effect with useSyncConfig ready signal"
```

---

### Task 11: Final verification

**Step 1: Run full typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS with 0 errors

**Step 2: Run full lint**

Run: `pnpm lint packages/solid`
Expected: PASS

**Step 3: Run all solid tests**

Run: `pnpm vitest --project=solid --run`
Expected: All tests pass

**Step 4: Fix any issues found in Steps 1-3**

If any failures, diagnose and fix before proceeding.

---

## Dependency Graph

```
Batch 1 (all independent — no file overlaps):
  Task 1: useSyncConfig race condition    → useSyncConfig.ts
  Task 2: Validation bug fix              → 6 field components
  Task 3: Kanban generic types            → KanbanContext.ts, Kanban.tsx
  Task 4: Combobox loadItems sync         → Combobox.tsx
  Task 5: Size type consolidation         → tokens.styles.ts, Pagination, Progress, ColorPicker
  Task 7: createPointerDrag               → createPointerDrag.ts (new), Dialog.tsx, DataSheet.tsx
  Task 9: createSelectionGroup            → createSelectionGroup.ts (new), CheckboxGroup.tsx, RadioGroup.tsx

Batch 2 (depends on Batch 1 files):
  Task 6:  formatDateValue consolidation  → DatePicker.tsx, DateTimePicker.tsx (overlap w/ Task 2)
  Task 8:  createItemTemplate             → createItemTemplate.ts (new), Select.tsx, Combobox.tsx (overlap w/ Task 4)
  Task 10: useSyncConfig ready signal     → ThemeContext.tsx (logical dep on Task 1)

Batch 3 (final):
  Task 11: Final verification             → full typecheck + lint + tests
```
