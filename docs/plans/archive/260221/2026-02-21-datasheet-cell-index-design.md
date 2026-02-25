# DataSheet CellContext Index Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Make `DataSheetCellContext.index` return the original `items[]` array index so `createStore` path-based updates work naturally for inline editing.

**Architecture:** `flattenTree` gains a `getOriginalIndex` callback to resolve original indices. DataSheet precomputes an item→index Map and passes it. A new `row` field provides the display position that `index` used to provide.

**Tech Stack:** SolidJS, TypeScript

---

### Task 1: Update types

**Files:**
- Modify: `packages/solid/src/components/data/sheet/types.ts:65-69` (`DataSheetCellContext`)
- Modify: `packages/solid/src/components/data/sheet/types.ts:117-123` (`FlatItem`)

**What to implement:**

`FlatItem` — add `row` field:
```typescript
export interface FlatItem<TItem> {
  item: TItem;
  /** Position within the containing array (root: items[], child: parent.children[]) */
  index: number;
  /** Flat display row position (sequential within current page) */
  row: number;
  depth: number;
  hasChildren: boolean;
  parent?: TItem;
}
```

`DataSheetCellContext` — add `row` field:
```typescript
export interface DataSheetCellContext<TItem> {
  item: TItem;
  /** Position within the containing array (root: items[], child: parent.children[]) */
  index: number;
  /** Flat display row position (sequential within current page) */
  row: number;
  depth: number;
}
```

---

### Task 2: Update `flattenTree` and `collectAllExpandable`

**Files:**
- Modify: `packages/solid/src/components/data/sheet/sheetUtils.ts:102-134` (`flattenTree`)
- Modify: `packages/solid/src/components/data/sheet/sheetUtils.ts:136-156` (`collectAllExpandable`)

**What to implement:**

`flattenTree` — add `getOriginalIndex` param, use `row` for sequential counter, `index` for containing-array position:
```typescript
export function flattenTree<TNode>(
  items: TNode[],
  expandedItems: TNode[],
  getChildren?: (item: TNode, index: number) => TNode[] | undefined,
  getOriginalIndex?: (item: TNode) => number,
): FlatItem<TNode>[] {
  if (!getChildren) {
    return items.map((item, i) => ({
      item,
      index: getOriginalIndex ? getOriginalIndex(item) : i,
      row: i,
      depth: 0,
      hasChildren: false,
    }));
  }

  const result: FlatItem<TNode>[] = [];
  let row = 0;

  function walk(list: TNode[], depth: number, parent?: TNode): void {
    for (let localIdx = 0; localIdx < list.length; localIdx++) {
      const item = list[localIdx];
      const index = depth === 0 && getOriginalIndex
        ? getOriginalIndex(item)
        : localIdx;
      const children = getChildren!(item, index);
      const hasChildren = children != null && children.length > 0;
      result.push({ item, index, row, depth, hasChildren, parent });
      row++;

      if (hasChildren && expandedItems.includes(item)) {
        walk(children, depth + 1, item);
      }
    }
  }

  walk(items, 0);
  return result;
}
```

`collectAllExpandable` — same index semantics change:
```typescript
export function collectAllExpandable<TItem>(
  items: TItem[],
  getChildren: (item: TItem, index: number) => TItem[] | undefined,
  getOriginalIndex?: (item: TItem) => number,
): TItem[] {
  const result: TItem[] = [];

  function walk(list: TItem[], depth: number): void {
    for (let localIdx = 0; localIdx < list.length; localIdx++) {
      const item = list[localIdx];
      const index = depth === 0 && getOriginalIndex
        ? getOriginalIndex(item)
        : localIdx;
      const children = getChildren(item, index);
      if (children != null && children.length > 0) {
        result.push(item);
        walk(children, depth + 1);
      }
    }
  }

  walk(items, 0);
  return result;
}
```

---

### Task 3: Update DataSheet component

**Files:**
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx`

**What to implement:**

**3a.** Add `originalIndexMap` memo (after `pagedItems`, around line 268):
```typescript
const originalIndexMap = createMemo(() => {
  const map = new Map<T, number>();
  (local.items ?? []).forEach((item, i) => map.set(item, i));
  return map;
});
```

**3b.** Update `flatItems` call site (line 470-472):
```typescript
const flatItems = createMemo((): FlatItem<T>[] => {
  return flattenTree(
    pagedItems(),
    expandedItems(),
    local.getChildren,
    (item) => originalIndexMap().get(item) ?? -1,
  );
});
```

**3c.** Update `collectAllExpandable` call sites (lines 465, 735) — pass `getOriginalIndex`:
```typescript
// line 465
const allExpandable = collectAllExpandable(
  pagedItems(),
  local.getChildren,
  (item) => originalIndexMap().get(item) ?? -1,
);

// line 735
const allExpandable = collectAllExpandable(
  pagedItems(),
  local.getChildren,
  (item) => originalIndexMap().get(item) ?? -1,
);
```

**3d.** Update cell rendering (line 1244-1248) — add `row`:
```typescript
{col.cell({
  item: flat.item,
  index: flat.index,
  row: flat.row,
  depth: flat.depth,
})}
```

**3e.** Update selection `rowIndex` usage (line 1130) — `flat.row` for display position:
```typescript
const rowIndex = () => flat.row;
```

---

### Task 4: Update tests

**Files:**
- Modify: `packages/solid/tests/components/data/sheet/DataSheet.spec.tsx`

**What to implement:**

**4a.** Update `flattenTree` index test (line 437-440):
```typescript
it("row는 순서대로 증가한다", () => {
  const result = flattenTree(tree, [tree[0]], getChildren);
  expect(result.map((r) => r.row)).toEqual([0, 1, 2, 3]);
});
```

**4b.** Add new test for `index` = containing array position:
```typescript
it("index는 포함 배열 내 위치를 반환한다", () => {
  const result = flattenTree(tree, [tree[0]], getChildren);
  // tree[0]="a" → index 0 (root items[0])
  // tree[0].children[0]="a1" → index 0 (children[0])
  // tree[0].children[1]="a2" → index 1 (children[1])
  // tree[1]="b" → index 1 (root items[1])
  expect(result.map((r) => r.index)).toEqual([0, 0, 1, 1]);
});
```

**4c.** Add test for `getOriginalIndex` lookup:
```typescript
it("getOriginalIndex가 주어지면 root의 index에 원본 인덱스를 사용한다", () => {
  const items = [tree[1], tree[0]]; // reversed
  const originalMap = new Map<TreeNode, number>();
  tree.forEach((item, i) => originalMap.set(item, i));

  const result = flattenTree(
    items,
    [tree[0]],
    getChildren,
    (item) => originalMap.get(item) ?? -1,
  );
  // items[0]=tree[1]="b" → originalIndex 1
  // items[1]=tree[0]="a" → originalIndex 0
  // "a".children[0]="a1" → localIdx 0
  // "a".children[1]="a2" → localIdx 1
  expect(result.map((r) => r.index)).toEqual([1, 0, 0, 1]);
  expect(result.map((r) => r.row)).toEqual([0, 1, 2, 3]);
});
```

---

### Task 5: Verify

Run typecheck and tests:
```bash
pnpm typecheck packages/solid
pnpm vitest packages/solid/tests/components/data/sheet/DataSheet.spec.tsx --project=solid --run
```
