# DataSheet CellContext Index Redesign

## Problem

`DataSheetCellContext.index` currently provides the flat sequential position from `flattenTree`, which does not correspond to the original `items[]` array index when pagination or sorting is applied. This prevents using `createStore` with path-based updates (e.g., `setItems(index, "name", v)`) for inline editing without focus loss.

## Design

### Type Changes

**`FlatItem<TItem>`:**
- `index: number` — position within the containing array
  - Root items: original `items[]` index
  - Child items: `parent.children[]` index
- `row: number` (new) — flat display position (sequential within current page)
- `depth`, `hasChildren`, `parent`, `item` — unchanged

**`DataSheetCellContext<TItem>`:**
- `index: number` — original array position (for store path updates)
- `row: number` (new) — display row number
- `depth: number` — unchanged
- `item: TItem` — unchanged

**`getChildren` callback:**
- `getChildren(item, index)` — `index` = position within containing array
  - Root: original `items[]` index
  - Child: `parent.children[]` index

### Implementation Strategy

**`DataSheet.tsx` — original index lookup:**
```typescript
const originalIndexMap = createMemo(() => {
  const map = new Map<T, number>();
  (local.items ?? []).forEach((item, i) => map.set(item, i));
  return map;
});
```

**`sheetUtils.ts` — `flattenTree` changes:**
- Add 4th parameter: `getOriginalIndex?: (item: TNode) => number`
- Root nodes: use `getOriginalIndex(item)` for `index`
- Child nodes: use `localIdx` (position within parent's children) for `index`
- Sequential counter renamed to `row`

**`DataSheet.tsx` — call site:**
```typescript
const flatItems = createMemo(() => {
  return flattenTree(
    pagedItems(),
    expandedItems(),
    local.getChildren,
    (item) => originalIndexMap().get(item) ?? -1,
  );
});
```

### Usage Example

```typescript
// Flat mode with createStore
const [items, setItems] = createStore<Item[]>([...]);

<DataSheet.Column key="name" header="Name">
  {({ item, index }) => (
    <TextInput
      inset
      value={item.name ?? ""}
      onValueChange={(v) => setItems(index, "name", v)}
    />
  )}
</DataSheet.Column>
```

### Files to Change

| File | Change |
|------|--------|
| `types.ts` | `FlatItem` — rename `index` semantics, add `row`. `DataSheetCellContext` — add `row` |
| `sheetUtils.ts` | `flattenTree` — add `getOriginalIndex` param, `row` field logic |
| `DataSheet.tsx` | Add `originalIndexMap` memo, pass lookup to `flattenTree`, update cell context, update internal `flat.index` → `flat.row` where needed |

### Breaking Change

`DataSheetCellContext.index` semantics change from display position to original array index. Existing code using `index` as display row must switch to `row`.
