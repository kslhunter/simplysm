# DataSheet Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Refactor DataSheet component to fix correctness bugs, improve type safety, and reduce complexity through hook extraction.

**Architecture:**
1. Create `createDefComponent` helper to centralize `as unknown as JSX.Element` casting pattern used across 10+ definition components
2. Extract 6 independent hooks from DataSheet.tsx to separate concerns (sorting, paging, selection, expansion, reorder, fixed columns)
3. Apply defensive fixes: page clamping, visited Set for circular tree protection, null-safe ConfigDialog
4. Apply CSS injection defense via semicolon stripping
5. Maintain backward compatibility — no API changes, existing tests pass unchanged

**Tech Stack:** SolidJS (createSignal, createMemo, createContext), TypeScript, Vitest

**Package Manager:** pnpm

---

## Task 1: Create `createDefComponent` helper

**Files:**
- Create: `packages/solid/src/helpers/createDefComponent.ts`
- Test: `packages/solid/src/helpers/createDefComponent.spec.ts`

**Step 1: Write failing test**

```typescript
import { createDefComponent } from "./createDefComponent";

describe("createDefComponent", () => {
  it("returns a component that casts definition object to JSX.Element", () => {
    interface TestDef {
      __type: "test";
      value: string;
    }

    const TestComponent = createDefComponent<TestDef>((props: { value: string }) => ({
      __type: "test" as const,
      value: props.value,
    }));

    const result = TestComponent({ value: "hello" });
    expect(result).toBeDefined();
    expect((result as any).__type).toBe("test");
    expect((result as any).value).toBe("hello");
  });

  it("preserves all properties in the returned definition object", () => {
    interface ComplexDef {
      __type: "complex";
      id: string;
      handler: () => void;
      optional?: string;
    }

    const handler = () => {};
    const ComplexComponent = createDefComponent<ComplexDef>((props: { id: string; handler: () => void; optional?: string }) => ({
      __type: "complex" as const,
      id: props.id,
      handler: props.handler,
      optional: props.optional,
    }));

    const result = ComplexComponent({ id: "123", handler });
    expect((result as any).id).toBe("123");
    expect((result as any).handler).toBe(handler);
    expect((result as any).optional).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm run vitest packages/solid/src/helpers/createDefComponent.spec.ts --run
```

Expected: FAIL - "createDefComponent is not a function"

**Step 3: Write minimal implementation**

```typescript
import type { JSX } from "solid-js";

/**
 * Factory function for creating definition components.
 *
 * Definition components return configuration objects marked with a `__type` property
 * and cast to JSX.Element. This centralizes the `as unknown as JSX.Element` casting
 * pattern used across definition components (DataSheetColumn, CrudSheetColumn, etc.).
 *
 * @param transformer - Function that converts component props to a definition object
 * @returns A component function that returns JSX.Element (actually a definition object)
 *
 * @example
 * ```typescript
 * interface MyDef {
 *   __type: "my-def";
 *   key: string;
 *   label: string;
 * }
 *
 * export const MyComponent = createDefComponent<MyDef>((props) => ({
 *   __type: "my-def",
 *   key: props.key,
 *   label: props.label,
 * }));
 * ```
 */
export function createDefComponent<TDef extends { __type: string }>(
  transformer: (props: Record<string, any>) => TDef,
): (props: Record<string, any>) => JSX.Element {
  return (props) => transformer(props) as unknown as JSX.Element;
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm run vitest packages/solid/src/helpers/createDefComponent.spec.ts --run
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/helpers/createDefComponent.ts packages/solid/src/helpers/createDefComponent.spec.ts
git commit -m "feat(solid): add createDefComponent helper for definition components"
```

---

## Task 2: Update DataSheetColumn to use `createDefComponent`

**Files:**
- Modify: `packages/solid/src/components/data/sheet/DataSheetColumn.tsx`

**Step 1: Review current code**

Current code casts definition object with `as unknown as JSX.Element`. We'll replace with `createDefComponent`.

**Step 2: Write updated implementation**

```typescript
import type { JSX } from "solid-js";
import type { DataSheetColumnDef, DataSheetColumnProps } from "./types";
import { normalizeHeader } from "./sheetUtils";
import { createDefComponent } from "../../../helpers/createDefComponent";

export function isDataSheetColumnDef(value: unknown): value is DataSheetColumnDef<unknown> {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "sheet-column"
  );
}

export const DataSheetColumn = createDefComponent<DataSheetColumnDef<any>>((props: DataSheetColumnProps<any>) => ({
  __type: "sheet-column",
  key: props.key,
  header: normalizeHeader(props.header),
  headerContent: props.headerContent,
  headerStyle: props.headerStyle,
  summary: props.summary,
  tooltip: props.tooltip,
  cell: props.children,
  class: props.class,
  fixed: props.fixed ?? false,
  hidden: props.hidden ?? false,
  collapse: props.collapse ?? false,
  width: props.width,
  sortable: props.sortable ?? true,
  resizable: props.resizable ?? true,
}));
```

**Step 3: Verify no tests are broken**

```bash
pnpm run vitest packages/solid/tests/components/data/sheet/DataSheet.spec.ts --run
```

Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/data/sheet/DataSheetColumn.tsx
git commit -m "refactor(solid): use createDefComponent in DataSheetColumn"
```

---

## Task 3: Update CrudSheetColumn to use `createDefComponent`

**Files:**
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheetColumn.tsx`

**Step 1: Apply createDefComponent**

```typescript
import type { JSX } from "solid-js";
import type { CrudSheetColumnDef, CrudSheetColumnProps } from "./types";
import { normalizeHeader } from "../../data/sheet/sheetUtils";
import { createDefComponent } from "../../../helpers/createDefComponent";

export function isCrudSheetColumnDef(value: unknown): value is CrudSheetColumnDef<unknown> {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "crud-sheet-column"
  );
}

export const CrudSheetColumn = createDefComponent<CrudSheetColumnDef<any>>((props: CrudSheetColumnProps<any>) => ({
  __type: "crud-sheet-column",
  key: props.key,
  header: normalizeHeader(props.header),
  headerContent: props.headerContent,
  headerStyle: props.headerStyle,
  summary: props.summary,
  tooltip: props.tooltip,
  cell: props.children,
  class: props.class,
  fixed: props.fixed ?? false,
  hidden: props.hidden ?? false,
  collapse: props.collapse ?? false,
  width: props.width,
  sortable: props.sortable ?? true,
  resizable: props.resizable ?? true,
  editTrigger: props.editTrigger ?? false,
}));
```

**Step 2: Test**

```bash
pnpm run vitest packages/solid/tests/components/features/crud-sheet/ --run
```

**Step 3: Commit**

```bash
git add packages/solid/src/components/features/crud-sheet/CrudSheetColumn.tsx
git commit -m "refactor(solid): use createDefComponent in CrudSheetColumn"
```

---

## Task 4: Update remaining definition components (CrudSheetTools, CrudSheetHeader, CrudSheetFilter, CrudDetailAfter, CrudDetailBefore, CrudDetailTools, SharedDataSelect.ItemTemplate, SharedDataSelect.Action)

**Files:**
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheetTools.tsx`
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheetHeader.tsx`
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheetFilter.tsx`
- Modify: `packages/solid/src/components/features/crud-detail/CrudDetailAfter.tsx`
- Modify: `packages/solid/src/components/features/crud-detail/CrudDetailBefore.tsx`
- Modify: `packages/solid/src/components/features/crud-detail/CrudDetailTools.tsx`
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelect.tsx`

**Step 1: CrudSheetTools.tsx**

Replace:
```typescript
return {
  __type: "crud-sheet-tools",
  children: props.children,
} as unknown as JSX.Element;
```

With:
```typescript
import { createDefComponent } from "../../../../helpers/createDefComponent";

export const CrudSheetTools = createDefComponent<{ __type: "crud-sheet-tools"; children: JSX.Element }>((props: { children: JSX.Element }) => ({
  __type: "crud-sheet-tools",
  children: props.children,
}));
```

**Step 2: CrudSheetHeader.tsx**

```typescript
import { createDefComponent } from "../../../../helpers/createDefComponent";

export const CrudSheetHeader = createDefComponent<{ __type: "crud-sheet-header"; children: JSX.Element }>((props: { children: JSX.Element }) => ({
  __type: "crud-sheet-header",
  children: props.children,
}));
```

**Step 3: CrudSheetFilter.tsx**

```typescript
import { createDefComponent } from "../../../../helpers/createDefComponent";

export const CrudSheetFilter = createDefComponent<{ __type: "crud-sheet-filter"; children: any }>((props: { children: any }) => ({
  __type: "crud-sheet-filter",
  children: props.children,
}));
```

**Step 4: CrudDetailAfter.tsx, CrudDetailBefore.tsx, CrudDetailTools.tsx** (similar pattern)

```typescript
import { createDefComponent } from "../../../../helpers/createDefComponent";

export const CrudDetailAfter = createDefComponent<{ __type: "crud-detail-after"; children: JSX.Element }>((props: { children: JSX.Element }) => ({
  __type: "crud-detail-after",
  children: props.children,
}));

export const CrudDetailBefore = createDefComponent<{ __type: "crud-detail-before"; children: JSX.Element }>((props: { children: JSX.Element }) => ({
  __type: "crud-detail-before",
  children: props.children,
}));

export const CrudDetailTools = createDefComponent<{ __type: "crud-detail-tools"; children: JSX.Element }>((props: { children: JSX.Element }) => ({
  __type: "crud-detail-tools",
  children: props.children,
}));
```

**Step 5: SharedDataSelect.tsx** (ItemTemplate and Action)

```typescript
import { createDefComponent } from "../../../../helpers/createDefComponent";

const ITEM_TEMPLATE_BRAND = "shared-data-select-item-template";
const ACTION_BRAND = "shared-data-select-action";

export const ItemTemplate = createDefComponent<{ __type: typeof ITEM_TEMPLATE_BRAND; children: any }>((props: { children: any }) => ({
  __type: ITEM_TEMPLATE_BRAND,
  children: props.children,
}));

export const Action = createDefComponent<{ __type: typeof ACTION_BRAND; children?: JSX.Element; onClick?: (e: MouseEvent) => void }>((props: { children?: JSX.Element; onClick?: (e: MouseEvent) => void }) => ({
  __type: ACTION_BRAND,
  children: props.children,
  onClick: props.onClick,
}));
```

**Step 6: Run all tests**

```bash
pnpm run vitest packages/solid/tests/ --run
```

**Step 7: Commit**

```bash
git add packages/solid/src/components/features/crud-sheet/CrudSheetTools.tsx packages/solid/src/components/features/crud-sheet/CrudSheetHeader.tsx packages/solid/src/components/features/crud-sheet/CrudSheetFilter.tsx packages/solid/src/components/features/crud-detail/CrudDetailAfter.tsx packages/solid/src/components/features/crud-detail/CrudDetailBefore.tsx packages/solid/src/components/features/crud-detail/CrudDetailTools.tsx packages/solid/src/components/features/shared-data/SharedDataSelect.tsx
git commit -m "refactor(solid): apply createDefComponent to all definition components"
```

---

## Task 5: Add visited Set to `isDescendant` function (temporary fix in DataSheet.tsx)

**Files:**
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx:571-580`

**Step 1: Update isDescendant function**

Replace:
```typescript
function isDescendant(parent: T, child: T): boolean {
  if (!local.getChildren) return false;
  const childItems = local.getChildren(parent, 0);
  if (!childItems) return false;
  for (const c of childItems) {
    if (c === child) return true;
    if (isDescendant(c, child)) return true;
  }
  return false;
}
```

With:
```typescript
function isDescendant(parent: T, child: T, visited = new Set<T>()): boolean {
  if (visited.has(parent)) return false;
  visited.add(parent);
  if (!local.getChildren) return false;
  const childItems = local.getChildren(parent, 0);
  if (!childItems) return false;
  for (const c of childItems) {
    if (c === child) return true;
    if (isDescendant(c, child, visited)) return true;
  }
  return false;
}
```

**Step 2: Test with circular tree data**

```bash
pnpm run vitest packages/solid/tests/components/data/sheet/DataSheet.spec.ts --run
```

**Step 3: Commit**

```bash
git add packages/solid/src/components/data/sheet/DataSheet.tsx
git commit -m "fix(solid): add visited Set to isDescendant to prevent stack overflow"
```

---

## Task 6: Fix ConfigDialog non-null assertion

**Files:**
- Modify: `packages/solid/src/components/data/sheet/DataSheetConfigDialog.tsx:85-105`

**Step 1: Update handleOk function**

Replace:
```typescript
function handleOk(): void {
  const columnRecord: Record<string, DataSheetConfigColumn> = {};

  for (let i = 0; i < editItems.length; i++) {
    const item = editItems[i];
    const info = props.columnInfos.find((c) => c.key === item.key)!;

    const entry: DataSheetConfigColumn = {};

    if (item.fixed !== info.fixed) entry.fixed = item.fixed;
    if (item.hidden !== info.hidden) entry.hidden = item.hidden;
    if (item.width && item.width !== (info.width ?? "")) entry.width = item.width;
    entry.displayOrder = i;

    if (Object.keys(entry).length > 0) {
      columnRecord[item.key] = entry;
    }
  }

  props.close?.({ columnRecord });
}
```

With:
```typescript
function handleOk(): void {
  const columnRecord: Record<string, DataSheetConfigColumn> = {};

  for (let i = 0; i < editItems.length; i++) {
    const item = editItems[i];
    const info = props.columnInfos.find((c) => c.key === item.key);

    // Skip items that don't have matching column info (stale data)
    if (!info) continue;

    const entry: DataSheetConfigColumn = {};

    if (item.fixed !== info.fixed) entry.fixed = item.fixed;
    if (item.hidden !== info.hidden) entry.hidden = item.hidden;
    if (item.width && item.width !== (info.width ?? "")) entry.width = item.width;
    entry.displayOrder = i;

    if (Object.keys(entry).length > 0) {
      columnRecord[item.key] = entry;
    }
  }

  props.close?.({ columnRecord });
}
```

**Step 2: Test**

```bash
pnpm run vitest packages/solid/tests/components/data/sheet/DataSheet.spec.ts --run
```

**Step 3: Commit**

```bash
git add packages/solid/src/components/data/sheet/DataSheetConfigDialog.tsx
git commit -m "fix(solid): add null-safe check in DataSheetConfigDialog.handleOk"
```

---

## Task 7: Fix pagination negative index bug

**Files:**
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx:263-270`

**Step 1: Update pagedItems memo**

Replace:
```typescript
const pagedItems = createMemo(() => {
  const ipp = local.itemsPerPage;
  if (ipp == null || ipp === 0) return sortedItems();
  if ((local.items ?? []).length <= 0) return sortedItems();

  const page = currentPage();
  return sortedItems().slice((page - 1) * ipp, page * ipp);
});
```

With:
```typescript
const pagedItems = createMemo(() => {
  const ipp = local.itemsPerPage;
  if (ipp == null || ipp === 0) return sortedItems();
  if ((local.items ?? []).length <= 0) return sortedItems();

  const page = Math.max(1, currentPage());
  return sortedItems().slice((page - 1) * ipp, page * ipp);
});
```

**Step 2: Test**

```bash
pnpm run vitest packages/solid/tests/components/data/sheet/DataSheet.spec.ts --run
```

**Step 3: Commit**

```bash
git add packages/solid/src/components/data/sheet/DataSheet.tsx
git commit -m "fix(solid): clamp pagination page to prevent negative array index"
```

---

## Task 8: Add CSS width semicolon stripping in DataSheet.tsx

**Files:**
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx` (style application locations)

**Step 1: Find and update style application for col.width**

Locations where `col.width` is used in inline styles:
- Line ~1243: `col.width != null ? \`max-width: ${col.width}\` : undefined`

Replace:
```typescript
col.width != null ? `max-width: ${col.width?.replace(/;/g, "")}` : undefined
```

Search for all occurrences with pattern: `col.width` and verify context.

**Step 2: Test with malicious width values**

```bash
pnpm run vitest packages/solid/tests/components/data/sheet/DataSheet.spec.ts --run
```

**Step 3: Commit**

```bash
git add packages/solid/src/components/data/sheet/DataSheet.tsx
git commit -m "fix(solid): strip semicolons from CSS width values"
```

---

## Task 9: Extract useDataSheetSorting hook

**Files:**
- Create: `packages/solid/src/components/data/sheet/hooks/useDataSheetSorting.ts`
- Test: `packages/solid/src/components/data/sheet/hooks/useDataSheetSorting.spec.ts`

**Step 1: Write failing test**

```typescript
import { createRoot } from "solid-js";
import { useDataSheetSorting } from "./useDataSheetSorting";
import type { DataSheetProps, SortingDef } from "../types";

describe("useDataSheetSorting", () => {
  it("returns initial sorts from props", () => {
    const result = createRoot(() => {
      const sorts: SortingDef[] = [{ key: "name", dir: "asc" }];
      const props = { sorts } as DataSheetProps<any>;
      const hook = useDataSheetSorting(props);
      return hook.sorts();
    });

    expect(result).toEqual([{ key: "name", dir: "asc" }]);
  });

  it("provides toggleSort function", () => {
    createRoot(() => {
      const props = { sorts: [] } as DataSheetProps<any>;
      const hook = useDataSheetSorting(props);

      hook.toggleSort("name");
      expect(hook.sorts()).toContainEqual({ key: "name", dir: "asc" });
    });
  });

  it("provides sortIndex to get sort order for a key", () => {
    const result = createRoot(() => {
      const sorts: SortingDef[] = [{ key: "name", dir: "asc" }, { key: "email", dir: "desc" }];
      const props = { sorts } as DataSheetProps<any>;
      const hook = useDataSheetSorting(props);

      return { name: hook.sortIndex("name"), email: hook.sortIndex("email"), unknown: hook.sortIndex("unknown") };
    });

    expect(result.name).toBe(1);
    expect(result.email).toBe(2);
    expect(result.unknown).toBeUndefined();
  });

  it("sorts items according to sorts array", () => {
    const result = createRoot(() => {
      const items = [
        { id: 1, name: "Charlie" },
        { id: 2, name: "Alice" },
        { id: 3, name: "Bob" },
      ];
      const sorts: SortingDef[] = [{ key: "name", dir: "asc" }];
      const props = { items, sorts, autoSort: true } as DataSheetProps<any>;
      const hook = useDataSheetSorting(props);

      return hook.sortedItems().map(item => (item as any).name);
    });

    expect(result).toEqual(["Alice", "Bob", "Charlie"]);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm run vitest packages/solid/src/components/data/sheet/hooks/useDataSheetSorting.spec.ts --run
```

**Step 3: Write minimal implementation**

```typescript
import { createMemo, createSignal, type Accessor } from "solid-js";
import type { DataSheetProps, SortingDef } from "../types";
import { applySorting } from "../sheetUtils";

export interface UseDataSheetSortingResult<T> {
  sorts: Accessor<SortingDef[]>;
  setSorts: (sorts: SortingDef[]) => void;
  toggleSort: (key: string) => void;
  sortIndex: (key: string) => number | undefined;
  sortedItems: Accessor<T[]>;
}

/**
 * Hook for managing DataSheet sorting state.
 *
 * Manages multi-column sorting with controllable signal pattern (supports external state).
 *
 * @param props - DataSheetProps with sorts, onSortsChange, items, autoSort
 * @returns Sorting state and handlers
 */
export function useDataSheetSorting<T>(props: DataSheetProps<T>): UseDataSheetSortingResult<T> {
  const [sorts, setSorts] = createSignal<SortingDef[]>(props.sorts ?? []);

  // Sync external sorts changes
  const syncedSorts = createMemo(() => props.sorts ?? sorts());

  const toggleSort = (key: string) => {
    const current = syncedSorts();
    let newSorts: SortingDef[];

    const existingIndex = current.findIndex((s) => s.key === key);
    if (existingIndex >= 0) {
      const existing = current[existingIndex];
      if (existing.dir === "asc") {
        newSorts = [
          ...current.slice(0, existingIndex),
          { key, dir: "desc" },
          ...current.slice(existingIndex + 1),
        ];
      } else {
        newSorts = [...current.slice(0, existingIndex), ...current.slice(existingIndex + 1)];
      }
    } else {
      newSorts = [...current, { key, dir: "asc" }];
    }

    setSorts(newSorts);
    props.onSortsChange?.(newSorts);
  };

  const sortIndex = (key: string): number | undefined => {
    const idx = syncedSorts().findIndex((s) => s.key === key);
    return idx >= 0 ? idx + 1 : undefined;
  };

  const sortedItems = createMemo(() => {
    if (!props.autoSort) return props.items ?? [];
    return applySorting(props.items ?? [], syncedSorts());
  });

  return {
    sorts: syncedSorts,
    setSorts,
    toggleSort,
    sortIndex,
    sortedItems,
  };
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm run vitest packages/solid/src/components/data/sheet/hooks/useDataSheetSorting.spec.ts --run
```

**Step 5: Commit**

```bash
git add packages/solid/src/components/data/sheet/hooks/useDataSheetSorting.ts packages/solid/src/components/data/sheet/hooks/useDataSheetSorting.spec.ts
git commit -m "feat(solid): extract useDataSheetSorting hook"
```

---

## Task 10: Extract useDataSheetPaging hook

**Files:**
- Create: `packages/solid/src/components/data/sheet/hooks/useDataSheetPaging.ts`
- Test: `packages/solid/src/components/data/sheet/hooks/useDataSheetPaging.spec.ts`

**Step 1: Write failing test**

```typescript
import { createRoot, createSignal } from "solid-js";
import { useDataSheetPaging } from "./useDataSheetPaging";
import type { DataSheetProps } from "../types";

describe("useDataSheetPaging", () => {
  it("returns correct page count with itemsPerPage", () => {
    const result = createRoot(() => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: i }));
      const props = { items, itemsPerPage: 10 } as DataSheetProps<any>;
      const hook = useDataSheetPaging(props, () => items);

      return hook.pageCount();
    });

    expect(result).toBe(5);
  });

  it("clamps currentPage to valid range", () => {
    const result = createRoot(() => {
      const props = { page: -5, itemsPerPage: 10 } as DataSheetProps<any>;
      const hook = useDataSheetPaging(props, () => Array(50).fill(null));

      return hook.currentPage();
    });

    expect(result).toBeGreaterThanOrEqual(1);
  });

  it("returns pagedItems slice correctly", () => {
    const result = createRoot(() => {
      const items = Array.from({ length: 25 }, (_, i) => ({ id: i }));
      const props = { page: 2, itemsPerPage: 10 } as DataSheetProps<any>;
      const hook = useDataSheetPaging(props, () => items);

      return hook.pagedItems().map(item => (item as any).id);
    });

    expect(result).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  });

  it("uses totalPageCount when provided (server-side pagination)", () => {
    const result = createRoot(() => {
      const props = { totalPageCount: 100 } as DataSheetProps<any>;
      const hook = useDataSheetPaging(props, () => []);

      return hook.pageCount();
    });

    expect(result).toBe(100);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm run vitest packages/solid/src/components/data/sheet/hooks/useDataSheetPaging.spec.ts --run
```

**Step 3: Write minimal implementation**

```typescript
import { createMemo, createSignal, type Accessor } from "solid-js";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import type { DataSheetProps } from "../types";

export interface UseDataSheetPagingResult<T> {
  currentPage: Accessor<number>;
  setCurrentPage: (page: number) => void;
  pageCount: Accessor<number>;
  pagedItems: Accessor<T[]>;
}

/**
 * Hook for managing DataSheet pagination.
 *
 * Supports both client-side (itemsPerPage) and server-side (totalPageCount) pagination.
 * Clamps page to valid range (>= 1).
 *
 * @param props - DataSheetProps with page, onPageChange, itemsPerPage, totalPageCount
 * @param sortedItems - Memo of sorted items (before pagination)
 * @returns Pagination state and computed values
 */
export function useDataSheetPaging<T>(
  props: DataSheetProps<T>,
  sortedItems: Accessor<T[]>,
): UseDataSheetPagingResult<T> {
  const [currentPage, setCurrentPage] = createControllableSignal({
    value: () => props.page ?? 1,
    onChange: () => props.onPageChange,
  });

  const pageCount = createMemo(() => {
    const ipp = props.itemsPerPage;
    if (ipp != null && ipp !== 0 && (props.items ?? []).length > 0) {
      return Math.ceil((props.items ?? []).length / ipp);
    }
    return props.totalPageCount ?? 0;
  });

  const pagedItems = createMemo(() => {
    const ipp = props.itemsPerPage;
    if (ipp == null || ipp === 0) return sortedItems();
    if ((props.items ?? []).length <= 0) return sortedItems();

    const page = Math.max(1, currentPage());
    return sortedItems().slice((page - 1) * ipp, page * ipp);
  });

  return {
    currentPage,
    setCurrentPage,
    pageCount,
    pagedItems,
  };
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm run vitest packages/solid/src/components/data/sheet/hooks/useDataSheetPaging.spec.ts --run
```

**Step 5: Commit**

```bash
git add packages/solid/src/components/data/sheet/hooks/useDataSheetPaging.ts packages/solid/src/components/data/sheet/hooks/useDataSheetPaging.spec.ts
git commit -m "feat(solid): extract useDataSheetPaging hook with pagination clamping"
```

---

## Task 11: Extract useDataSheetExpansion hook

**Files:**
- Create: `packages/solid/src/components/data/sheet/hooks/useDataSheetExpansion.ts`
- Test: `packages/solid/src/components/data/sheet/hooks/useDataSheetExpansion.spec.ts`

**Step 1: Write failing test**

```typescript
import { createRoot } from "solid-js";
import { useDataSheetExpansion } from "./useDataSheetExpansion";
import type { DataSheetProps } from "../types";

describe("useDataSheetExpansion", () => {
  it("initializes expandedItems from props", () => {
    const result = createRoot(() => {
      const items = [{ id: 1, children: [] }];
      const props = { expandedItems: items } as DataSheetProps<any>;
      const hook = useDataSheetExpansion(props, () => items);

      return hook.expandedItems();
    });

    expect(result).toEqual([{ id: 1, children: [] }]);
  });

  it("provides toggleExpand function", () => {
    createRoot(() => {
      const item = { id: 1, children: [{ id: 2 }] };
      const props = { expandedItems: [] } as DataSheetProps<any>;
      const hook = useDataSheetExpansion(props, () => [item]);

      hook.toggleExpand(item);
      expect(hook.expandedItems()).toContain(item);
    });
  });

  it("toggleExpand removes item when already expanded", () => {
    const result = createRoot(() => {
      const item = { id: 1 };
      const props = { expandedItems: [item] } as DataSheetProps<any>;
      const hook = useDataSheetExpansion(props, () => [item]);

      hook.toggleExpand(item);
      return hook.expandedItems().includes(item);
    });

    expect(result).toBe(false);
  });

  it("flattens tree with expanded items", () => {
    const result = createRoot(() => {
      const root = {
        id: 1,
        children: [
          { id: 2, children: [] },
          { id: 3, children: [] },
        ],
      };
      const props = { expandedItems: [root], getChildren: (item: any) => item.children } as DataSheetProps<any>;
      const hook = useDataSheetExpansion(props, () => [root]);

      return hook.flatItems().map((item: any) => item.item.id);
    });

    expect(result).toContain(1);
    expect(result).toContain(2);
    expect(result).toContain(3);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm run vitest packages/solid/src/components/data/sheet/hooks/useDataSheetExpansion.spec.ts --run
```

**Step 3: Write minimal implementation**

```typescript
import { createMemo, type Accessor } from "solid-js";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import type { DataSheetProps, FlatItem } from "../types";
import { flattenTree, collectAllExpandable } from "../sheetUtils";

export interface UseDataSheetExpansionResult<T> {
  expandedItems: Accessor<T[]>;
  setExpandedItems: (items: T[]) => void;
  flatItems: Accessor<FlatItem<T>[]>;
  toggleExpand: (item: T) => void;
  isAllExpanded: Accessor<boolean>;
}

/**
 * Hook for managing DataSheet tree expansion state.
 *
 * Manages which items are expanded, flattens tree structure accordingly.
 *
 * @param props - DataSheetProps with expandedItems, onExpandedItemsChange, getChildren
 * @param pagedItems - Memo of paged items (before expansion)
 * @returns Expansion state and handlers
 */
export function useDataSheetExpansion<T>(
  props: DataSheetProps<T>,
  pagedItems: Accessor<T[]>,
): UseDataSheetExpansionResult<T> {
  const [expandedItems, setExpandedItems] = createControllableSignal({
    value: () => props.expandedItems ?? [],
    onChange: () => props.onExpandedItemsChange,
  });

  const toggleExpand = (item: T) => {
    const expanded = expandedItems();
    const idx = expanded.indexOf(item);
    const newExpanded = idx >= 0 ? [...expanded.slice(0, idx), ...expanded.slice(idx + 1)] : [...expanded, item];
    setExpandedItems(newExpanded);
  };

  const flatItems = createMemo(() => flattenTree(pagedItems(), expandedItems(), props.getChildren));

  const isAllExpanded = createMemo(() => {
    const expandable = collectAllExpandable(pagedItems(), props.getChildren);
    const expanded = expandedItems();
    return expandable.length > 0 && expandable.every((item) => expanded.includes(item));
  });

  return {
    expandedItems,
    setExpandedItems,
    flatItems,
    toggleExpand,
    isAllExpanded,
  };
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm run vitest packages/solid/src/components/data/sheet/hooks/useDataSheetExpansion.spec.ts --run
```

**Step 5: Commit**

```bash
git add packages/solid/src/components/data/sheet/hooks/useDataSheetExpansion.ts packages/solid/src/components/data/sheet/hooks/useDataSheetExpansion.spec.ts
git commit -m "feat(solid): extract useDataSheetExpansion hook"
```

---

## Task 12: Extract useDataSheetSelection hook

**Files:**
- Create: `packages/solid/src/components/data/sheet/hooks/useDataSheetSelection.ts`
- Test: `packages/solid/src/components/data/sheet/hooks/useDataSheetSelection.spec.ts`

**Step 1: Write failing test**

```typescript
import { createRoot } from "solid-js";
import { useDataSheetSelection } from "./useDataSheetSelection";
import type { DataSheetProps } from "../types";

describe("useDataSheetSelection", () => {
  it("initializes selectedItems from props", () => {
    const result = createRoot(() => {
      const items = [{ id: 1 }, { id: 2 }];
      const props = { selectedItems: [items[0]] } as DataSheetProps<any>;
      const hook = useDataSheetSelection(props, () => items.map((item, i) => ({ item, index: i, row: 0, depth: 0 })));

      return hook.selectedItems();
    });

    expect(result[0]).toEqual({ id: 1 });
  });

  it("toggleSelect adds item to selection", () => {
    createRoot(() => {
      const item = { id: 1 };
      const props = { selectMode: "multiple", selectedItems: [] } as DataSheetProps<any>;
      const hook = useDataSheetSelection(props, () => [{ item, index: 0, row: 0, depth: 0 }]);

      hook.toggleSelect(item);
      expect(hook.selectedItems()).toContain(item);
    });
  });

  it("toggleSelectAll selects all selectable items", () => {
    const result = createRoot(() => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const props = { selectMode: "multiple", selectedItems: [] } as DataSheetProps<any>;
      const hook = useDataSheetSelection(props, () =>
        items.map((item, i) => ({ item, index: i, row: i, depth: 0 }))
      );

      hook.toggleSelectAll();
      return hook.selectedItems().length;
    });

    expect(result).toBe(3);
  });

  it("respects isItemSelectable filter", () => {
    const result = createRoot(() => {
      const items = [{ id: 1 }, { id: 2, disabled: true }];
      const props = {
        selectMode: "multiple",
        selectedItems: [],
        isItemSelectable: (item: any) => !item.disabled,
      } as DataSheetProps<any>;
      const hook = useDataSheetSelection(props, () =>
        items.map((item, i) => ({ item, index: i, row: i, depth: 0 }))
      );

      hook.toggleSelectAll();
      return hook.selectedItems().length;
    });

    expect(result).toBe(1);
  });

  it("provides rangeSelect for selecting range of items", () => {
    const result = createRoot(() => {
      const items = Array.from({ length: 5 }, (_, i) => ({ id: i }));
      const props = { selectMode: "multiple", selectedItems: [] } as DataSheetProps<any>;
      const hook = useDataSheetSelection(props, () =>
        items.map((item, i) => ({ item, index: i, row: i, depth: 0 }))
      );

      hook.rangeSelect(0, 2);
      return hook.selectedItems().map((item: any) => item.id);
    });

    expect(result).toEqual([0, 1, 2]);
  });
});
```

**Step 2-5: Implement useDataSheetSelection** (similar pattern as previous hooks)

Following the structure from DataSheet.tsx lines 493-550, extract selection logic.

```typescript
import { createMemo, type Accessor } from "solid-js";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import type { DataSheetProps, FlatItem } from "../types";

export interface UseDataSheetSelectionResult<T> {
  selectedItems: Accessor<T[]>;
  setSelectedItems: (items: T[]) => void;
  toggleSelect: (item: T) => void;
  toggleSelectAll: () => void;
  rangeSelect: (startRow: number, endRow: number) => void;
  lastClickedRow: Accessor<number | null>;
  setLastClickedRow: (row: number | null) => void;
  lastClickAction: Accessor<"select" | "deselect">;
  setLastClickAction: (action: "select" | "deselect") => void;
}

export function useDataSheetSelection<T>(
  props: DataSheetProps<T>,
  displayItems: Accessor<FlatItem<T>[]>,
): UseDataSheetSelectionResult<T> {
  const [selectedItems, setSelectedItems] = createControllableSignal({
    value: () => props.selectedItems ?? [],
    onChange: () => props.onSelectedItemsChange,
  });

  const [lastClickedRow, setLastClickedRow] = createSignal<number | null>(null);
  const [lastClickAction, setLastClickAction] = createSignal<"select" | "deselect">("select");

  const getItemSelectable = (item: T): boolean | string => {
    if (!props.isItemSelectable) return true;
    return props.isItemSelectable(item);
  };

  const toggleSelect = (item: T) => {
    if (getItemSelectable(item) !== true) return;

    if (props.selectMode === "single") {
      setSelectedItems([item]);
    } else {
      const current = selectedItems();
      const idx = current.indexOf(item);
      if (idx >= 0) {
        setSelectedItems([...current.slice(0, idx), ...current.slice(idx + 1)]);
      } else {
        setSelectedItems([...current, item]);
      }
    }
  };

  const toggleSelectAll = () => {
    if (!props.selectMode) return;

    const selectableItems = displayItems()
      .map((flat) => flat.item)
      .filter((item) => getItemSelectable(item) === true);

    const current = selectedItems();
    const allSelected = selectableItems.every((item) => current.includes(item));

    if (allSelected) {
      const toDeselect = new Set(selectableItems);
      setSelectedItems(current.filter((item) => !toDeselect.has(item)));
    } else {
      const toAdd = selectableItems.filter((item) => !current.includes(item));
      setSelectedItems([...current, ...toAdd]);
    }
  };

  const rangeSelect = (startRow: number, endRow: number) => {
    const start = Math.min(startRow, endRow);
    const end = Math.max(startRow, endRow);

    const rangeItems = displayItems()
      .slice(start, end + 1)
      .map((flat) => flat.item)
      .filter((item) => getItemSelectable(item) === true);

    if (lastClickAction() === "select") {
      const newItems = [...selectedItems()];
      for (const item of rangeItems) {
        if (!newItems.includes(item)) newItems.push(item);
      }
      setSelectedItems(newItems);
    } else {
      setSelectedItems(selectedItems().filter((item) => !rangeItems.includes(item)));
    }
  };

  return {
    selectedItems,
    setSelectedItems,
    toggleSelect,
    toggleSelectAll,
    rangeSelect,
    lastClickedRow,
    setLastClickedRow,
    lastClickAction,
    setLastClickAction,
  };
}
```

**Step 5: Commit**

```bash
git add packages/solid/src/components/data/sheet/hooks/useDataSheetSelection.ts packages/solid/src/components/data/sheet/hooks/useDataSheetSelection.spec.ts
git commit -m "feat(solid): extract useDataSheetSelection hook"
```

---

## Task 13: Extract useDataSheetReorder hook

**Files:**
- Create: `packages/solid/src/components/data/sheet/hooks/useDataSheetReorder.ts`
- Test: `packages/solid/src/components/data/sheet/hooks/useDataSheetReorder.spec.ts`

Extract reorder logic from DataSheet.tsx lines 564-696 into hook with `isDescendant` helper included.

---

## Task 14: Extract useDataSheetFixedColumns hook

**Files:**
- Create: `packages/solid/src/components/data/sheet/hooks/useDataSheetFixedColumns.ts`
- Test: `packages/solid/src/components/data/sheet/hooks/useDataSheetFixedColumns.spec.ts`

Extract fixed column logic from DataSheet.tsx lines 308-369 into hook.

---

## Task 15: Update DataSheet.tsx to use all 6 hooks

**Files:**
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx`

Replace the individual signal/memo definitions and functions with hook calls. Main component becomes 2-3x smaller and more readable.

---

## Task 16: Verify all tests pass

**Files:**
- Test: All existing tests

```bash
pnpm run vitest packages/solid/tests/components/data/sheet/ --run
pnpm run vitest packages/solid/tests/components/features/crud-sheet/ --run
pnpm run vitest packages/solid/tests/components/features/crud-detail/ --run
pnpm run vitest packages/solid/tests/components/features/shared-data/ --run
```

Expected: All PASS

**Commit:**

```bash
git add packages/solid/src/components/data/sheet/DataSheet.tsx
git commit -m "refactor(solid): integrate all 6 hooks into DataSheet component"
```

---

## Summary

- **7 direct fixes** (pagination, visited Set, null-safe, CSS injection, createDefComponent)
- **6 hook extractions** (sorting, paging, expansion, selection, reorder, fixed columns)
- **10+ definition component updates** using createDefComponent
- **Backward compatible** — all existing tests pass unchanged
- **~500 lines removed** from DataSheet.tsx
- **~1000 lines of reusable hooks added**
