# DataSheet Virtual Scroll Design

**Date:** 2026-03-04
**Status:** Design Complete
**Target:** `packages/solid/src/components/data/sheet/DataSheet.tsx`

---

## Problem Statement

In production, the `DataSheet` component exhibits scroll jank when displaying 1000+ rows.
The root cause is that the current implementation renders all rows into the DOM at once via `<For each={displayItems()}>`.

---

## Requirements (Confirmed via Q&A)

| Item | Confirmed Value |
|------|-----------------|
| Data loading | Client holds entire dataset (up to 5000 rows), no pagination |
| Features in use | Row selection (single/multi) + inline cell editing + fixed columns |
| Tree expansion | Not used in large-data scenario |
| Row height | Variable (Textarea cells can vary per row) |
| Focus protection | Focused row must stay in DOM even when scrolled out of viewport |
| Keyboard nav | Enter/Shift+Enter must work — scroll to target row if out of viewport |
| Reorder drag | Not used in large-data scenario (`onItemsReorder` is excluded from scope) |
| External library | `@tanstack/solid-virtual` approved |
| Accessibility | Minimal — performance takes priority this iteration |
| Activation | Opt-in via `virtualScroll?: boolean` prop (non-breaking) |

---

## Approach: TanStack Virtual + Spacer Row Pattern (Selected)

### Why this approach

- Preserves existing `<table>` structure — sticky fixed columns and sticky header continue to work with zero CSS changes
- TanStack Virtual handles variable height measurement (`measureElement`) and scroll math internally
- `@tanstack/solid-virtual` provides official SolidJS bindings
- Feasible within the one-week deadline

### Alternatives considered

| Approach | Reason rejected |
|---|---|
| Direct implementation (IntersectionObserver) | Too much custom logic for one week; scroll math, height caching, focus tracking all manual |
| CSS `contain` + `will-change` only | Does not reduce DOM node count; symptom relief only, not a fix |

---

## Architecture

### Files changed

| File | Change |
|---|---|
| `types.ts` | Add `virtualScroll?: boolean` to `DataSheetProps<TItem>` |
| `DataSheet.tsx` | Add virtual scroll logic, conditional rendering |

### Files NOT changed

`DataSheetColumn.tsx`, `sheetUtils.ts`, `DataSheet.styles.ts`, `DataSheetConfigDialog.tsx` — untouched.

---

## Rendering Structure

### Current (all rows rendered)

```tsx
<tbody>
  <For each={displayItems()}>
    {(flat) => <tr>...</tr>}
  </For>
</tbody>
```

### After change (virtualScroll=true)

```tsx
<tbody>
  <tr style={{ height: `${topPadding()}px` }} />  {/* top spacer */}
  <For each={safeVirtualItems()}>
    {(vItem) => (
      <tr data-virtual-index={vItem.index} ...>
        {/* row content using displayItems()[vItem.index] */}
      </tr>
    )}
  </For>
  <tr style={{ height: `${bottomPadding()}px` }} />  {/* bottom spacer */}
</tbody>
```

When `virtualScroll=false` (default), the original `<For each={displayItems()}>` is used unchanged.
A `<Show>` branch separates the two paths inside a single component.

---

## TanStack Virtual Integration

```typescript
import { createVirtualizer } from "@tanstack/solid-virtual";

const [scrollEl, setScrollEl] = createSignal<HTMLElement | null>(null);

const virtualizer = createMemo(() => {
  if (!local.virtualScroll || !scrollEl()) return null;
  return createVirtualizer({
    count: displayItems().length,
    getScrollElement: () => scrollEl()!,
    estimateSize: () => 36,   // initial estimate in px
    overscan: 5,              // extra rows above and below viewport
    measureElement: (el) => el?.getBoundingClientRect().height ?? 36,
  });
});

const virtualItems = createMemo(() => virtualizer()?.getVirtualItems() ?? []);

const topPadding = createMemo(() => {
  const items = virtualItems();
  return items.length > 0 ? (items[0].start ?? 0) : 0;
});

const bottomPadding = createMemo(() => {
  const vz = virtualizer();
  const items = virtualItems();
  if (!vz || items.length === 0) return 0;
  return vz.getTotalSize() - (items[items.length - 1].end ?? 0);
});
```

The `scrollEl` ref is attached to the existing `data-sheet-scroll` div.

---

## Focus Row Protection

When the user is editing a cell (TextInput, NumberInput, etc.) and scrolls, the row must stay in DOM.

```typescript
const [focusedIndex, setFocusedIndex] = createSignal<number | null>(null);

// Each virtualScroll <tr> gets:
<tr
  onFocusIn={() => setFocusedIndex(vItem.index)}
  onFocusOut={() => setFocusedIndex(null)}
  data-virtual-index={vItem.index}
>

// safeVirtualItems includes the focused row even if out of viewport:
const safeVirtualItems = createMemo(() => {
  const items = virtualItems();
  const focused = focusedIndex();
  if (focused == null) return items;
  if (items.some((v) => v.index === focused)) return items;
  const vz = virtualizer();
  if (!vz) return items;
  // Force-include the focused row's virtual item descriptor
  const focusedItem = vz.getVirtualItemForOffset(focused);
  return focusedItem ? [...items, focusedItem] : items;
});
```

---

## Enter Keyboard Navigation

### Problem with current implementation

`onTableKeyDown` uses `tbody.rows` directly. In virtual scroll mode, `tbody.rows` only contains currently rendered rows, so cross-viewport navigation fails.

### Solution

Use `data-virtual-index` attribute to track row index in DOM.
Use `virtualizer.scrollToIndex()` to scroll to target before focusing.

```typescript
function onTableKeyDownVirtual(e: KeyboardEvent): void {
  if (e.key !== "Enter" || e.altKey || e.ctrlKey || e.metaKey) return;

  const td = (document.activeElement as HTMLElement)?.closest("td");
  const tr = td?.closest("tr") as HTMLTableRowElement | null;
  if (!tr || !td) return;

  const currentIndex = Number(tr.dataset.virtualIndex);
  if (isNaN(currentIndex)) return;

  const cellIndex = Array.from(tr.cells).indexOf(td as HTMLTableCellElement);
  const targetIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= displayItems().length) return;

  e.preventDefault();

  const vz = virtualizer();
  if (!vz) return;

  vz.scrollToIndex(targetIndex, { align: "auto" });

  queueMicrotask(() => {
    const targetTr = document.querySelector(
      `[data-virtual-index="${targetIndex}"]`
    ) as HTMLTableRowElement | null;
    const focusable = targetTr?.cells[cellIndex]?.findFirstFocusableChild();
    focusable?.focus();
  });
}
```

The `onKeyDown` handler on `<table>` conditionally calls the virtual version when `virtualScroll=true`.

---

## Scroll Position Reset on Data Change

When `displayItems()` changes (sort, filter), reset scroll to top to avoid stale position.

```typescript
createEffect(() => {
  displayItems(); // register as dependency
  if (local.virtualScroll) {
    virtualizer()?.scrollToOffset(0);
  }
});
```

---

## prop Addition

```typescript
// types.ts — DataSheetProps<TItem>
virtualScroll?: boolean;
```

No other props change. Existing usages without this prop are unaffected.

---

## Testing Strategy

### Existing tests

`DataSheet.spec.tsx` must pass without modification — the default path (`virtualScroll` absent) is unchanged.

### New test cases

```typescript
describe("DataSheet — virtualScroll", () => {
  it("renders fewer <tr> elements than total row count for 1000 items", () => {
    // mount with virtualScroll=true, 1000 items
    // tbody tr count < 1000
  });

  it("mounts new rows on scroll", () => {
    // change scrollTop → new data-virtual-index values appear
  });

  it("keeps focused row in DOM when scrolled out of viewport", () => {
    // focus a cell → scroll away → row still in DOM
  });

  it("renders all rows when virtualScroll is not set (regression guard)", () => {
    // default behavior: tbody tr count === items.length
  });
});
```

---

## Definition of Done

1. `virtualScroll` prop absent — existing behavior identical (no regression)
2. `virtualScroll=true` + 1000 rows — DOM `<tr>` count stays near `overscan*2 + viewport rows`
3. Row selection, inline cell editing, and fixed columns all work correctly
4. Enter/Shift+Enter keyboard navigation scrolls to out-of-viewport rows then focuses the correct cell
5. All existing `DataSheet.spec.tsx` tests pass
