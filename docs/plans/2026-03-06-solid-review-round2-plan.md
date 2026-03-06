# Solid Review Round 2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Fix 7 review findings in `packages/solid`: SharedDataProvider wait() fix, Kanban generic naming, DataSheet renderHeaderCell extraction, CrudSheet withBusy helper, Barcode error logging, autoSelect boolean type, isItemSelectable JSDoc.

**Architecture:** Each finding is an independent, focused change. Changes range from simple type/JSDoc edits to small refactors (helper extraction, hook extraction). All changes are within `packages/solid`.

**Tech Stack:** SolidJS, TypeScript, Vitest

---

### Task 1: SharedDataProvider eager init on configure()

**Files:**
- Modify: `packages/solid/src/providers/shared-data/SharedDataProvider.tsx:155-300`
- Test: `packages/solid/tests/providers/shared-data/SharedDataProvider.spec.tsx`

**Step 1: Write the failing test**

Add a test to `packages/solid/tests/providers/shared-data/SharedDataProvider.spec.tsx` that verifies `wait()` resolves only after data is loaded when called immediately after `configure()` (before any `items()` access):

```typescript
it("wait() resolves after data is loaded even without items() access", async () => {
  const { serviceClientValue } = createMockServiceClient();

  let resolveUsers!: (value: TestUser[]) => void;
  const fetchPromise = new Promise<TestUser[]>((resolve) => {
    resolveUsers = resolve;
  });

  const fetchFn = vi.fn(() => fetchPromise);

  const definitions: { user: SharedDataDefinition<TestUser> } = {
    user: {
      fetch: fetchFn,
      getKey: (item) => item.id,
      orderBy: [[(item) => item.name, "asc"]],
    },
  };

  let sharedRef: any;
  let waitResolved = false;

  // Component that calls configure() + wait() but never accesses items()
  function ConfigureAndWait() {
    const shared = useTestSharedData();
    sharedRef = shared;
    shared.configure(() => definitions);

    // Call wait() immediately — should NOT resolve until fetch completes
    void shared.wait().then(() => {
      waitResolved = true;
    });

    return <div data-testid="ready">{String(waitResolved)}</div>;
  }

  const result = render(() => (
    <NotificationContext.Provider value={createMockNotification()}>
      <ServiceClientContext.Provider value={serviceClientValue}>
        <SharedDataProvider>
          <ConfigureAndWait />
        </SharedDataProvider>
      </ServiceClientContext.Provider>
    </NotificationContext.Provider>
  ));

  // fetch should have been called (eager init)
  await vi.waitFor(() => {
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  // wait() should NOT have resolved yet (fetch still pending)
  expect(waitResolved).toBe(false);

  // Resolve the fetch
  resolveUsers([{ id: 1, name: "Alice" }]);

  // wait() should now resolve
  await vi.waitFor(() => {
    expect(waitResolved).toBe(true);
  });

  result.unmount();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/providers/shared-data/SharedDataProvider.spec.tsx --run`
Expected: FAIL — currently `configure()` does not trigger `initialize()`, so `fetchFn` is never called without `items()` access, and `wait()` resolves immediately.

**Step 3: Write minimal implementation**

In `packages/solid/src/providers/shared-data/SharedDataProvider.tsx`:

1. Change `createSharedDataEntry` return type to include `initialize`:

```typescript
// Line 159: Add `initialize` to return type
): SharedDataAccessor<unknown> & { cleanup: () => void; initialize: () => Promise<void> } {
```

2. Add `initialize` to the return object (line ~272):

```typescript
    return {
      items: () => {
        void initialize();
        return items();
      },
      get: (key: string | number | undefined) => {
        void initialize();
        if (key === undefined) return undefined;
        return itemMap().get(key);
      },
      // ... existing fields ...
      cleanup,
      initialize,  // ADD THIS
    };
```

3. In `configure()`, add `void entry.initialize()` after each entry creation (line ~298):

```typescript
    for (const [name, def] of Object.entries(definitions)) {
      const client = serviceClient.get(def.serviceKey ?? "default");
      const entry = createSharedDataEntry(name, def, client);
      entries.set(name, entry);
      accessors[name] = entry;
      void entry.initialize();  // ADD THIS: eager init
    }
```

4. Update the existing test "does not fetch immediately after configure()" — this test expected lazy behavior. Now `configure()` triggers eager init, so update the test to expect fetch to be called:

```typescript
it("fetches eagerly after configure()", async () => {
  const { serviceClientValue, mockClient } = createMockServiceClient();
  const mockUsers: TestUser[] = [{ id: 1, name: "Alice" }];

  const fetchFn = vi.fn(() => Promise.resolve(mockUsers));

  const definitions: { user: SharedDataDefinition<TestUser> } = {
    user: {
      fetch: fetchFn,
      getKey: (item) => item.id,
      orderBy: [[(item) => item.name, "asc"]],
    },
  };

  function ConfigureOnly() {
    const shared = useTestSharedData();
    shared.configure(() => definitions);
    return <div data-testid="configured">configured</div>;
  }

  const result = render(() => (
    <NotificationContext.Provider value={createMockNotification()}>
      <ServiceClientContext.Provider value={serviceClientValue}>
        <SharedDataProvider>
          <ConfigureOnly />
        </SharedDataProvider>
      </ServiceClientContext.Provider>
    </NotificationContext.Provider>
  ));

  await vi.waitFor(() => {
    expect(result.getByTestId("configured").textContent).toBe("configured");
  });

  // Now configure() triggers eager init
  await vi.waitFor(() => {
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(mockClient.addListener).toHaveBeenCalledTimes(1);
  });

  result.unmount();
});
```

Also update the JSDoc on `SharedDataProvider` (line 108) to reflect eager init:
```
 * - After configure(): registers definitions and immediately starts fetching data for all entries
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/providers/shared-data/SharedDataProvider.spec.tsx --run`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/solid/src/providers/shared-data/SharedDataProvider.tsx packages/solid/tests/providers/shared-data/SharedDataProvider.spec.tsx
git commit -m "fix(solid): SharedDataProvider eager init on configure() for correct wait()"
```

---

### Task 2: Kanban generic naming consistency

**Files:**
- Modify: `packages/solid/src/components/data/kanban/Kanban.tsx`
- Test: `packages/solid/tests/components/data/kanban/Kanban.selection.spec.tsx`

**Step 1: Rename generics in Kanban.tsx**

Replace all generic parameters:
- `<L = unknown, TCard = unknown>` → `<TLaneValue = unknown, TCardValue = unknown>`
- All usages of `L` as a type → `TLaneValue`
- All usages of `TCard` as a type (in interface generics only, not in variable names like `dragCard`) → `TCardValue`

Affected interfaces:
- `KanbanCardRef<L, TCard>` → `KanbanCardRef<TLaneValue, TCardValue>`
- `KanbanDropInfo<L, TCard>` → `KanbanDropInfo<TLaneValue, TCardValue>`
- `KanbanDropTarget<TCard>` → `KanbanDropTarget<TCardValue>`
- `KanbanContextValue<L, TCard>` → `KanbanContextValue<TLaneValue, TCardValue>`
- `KanbanLaneContextValue<L, TCard>` → `KanbanLaneContextValue<TLaneValue, TCardValue>`

Variable and field names like `dragCard`, `TCardValue` (in `KanbanCardProps`) stay unchanged — they already use the correct naming.

**Step 2: Verify existing tests pass**

Run: `pnpm vitest packages/solid/tests/components/data/kanban/ --run`
Expected: PASS (rename is type-only, no runtime change)

**Step 3: Commit**

```bash
git add packages/solid/src/components/data/kanban/Kanban.tsx
git commit -m "refactor(solid): consistent Kanban generic naming (L → TLaneValue, TCard → TCardValue)"
```

---

### Task 3: Barcode error logging

**Files:**
- Modify: `packages/solid/src/components/display/Barcode.tsx:38-40`
- Test: `packages/solid/tests/components/display/Barcode.spec.tsx`

**Step 1: Write the failing test**

Add a test to `packages/solid/tests/components/display/Barcode.spec.tsx`:

```typescript
it("logs warning on render failure", () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  // "code128" requires specific format; passing invalid chars triggers bwip-js error
  render(() => <Barcode type={"invalid-type" as any} value="test" />);

  expect(warnSpy).toHaveBeenCalledWith(
    "Barcode render failed:",
    expect.any(Error),
  );

  warnSpy.mockRestore();
});
```

Add the `vi` import at the top of the file (alongside existing `describe, it, expect` from vitest):

```typescript
import { describe, it, expect, vi } from "vitest";
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/components/display/Barcode.spec.tsx --run`
Expected: FAIL — current catch block silently swallows error, no `console.warn` call.

**Step 3: Write minimal implementation**

In `packages/solid/src/components/display/Barcode.tsx`, change line 38-40:

```typescript
    } catch (err) {
      console.warn("Barcode render failed:", err);
      containerRef.innerHTML = "";
    }
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/components/display/Barcode.spec.tsx --run`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/display/Barcode.tsx packages/solid/tests/components/display/Barcode.spec.tsx
git commit -m "fix(solid): log warning on Barcode render failure instead of silent catch"
```

---

### Task 4: DataSheet autoSelect boolean type + isItemSelectable JSDoc

**Files:**
- Modify: `packages/solid/src/components/data/sheet/DataSheet.types.ts:28-29`
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx:964,968`
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx:627`
- Test: manual verification (type-only change, no runtime behavior change)

**Step 1: Change autoSelect type**

In `packages/solid/src/components/data/sheet/DataSheet.types.ts`, line 28:

```typescript
  autoSelect?: boolean;
```

Add JSDoc for `isItemSelectable` on line 29:

```typescript
  /**
   * Determines if an item can be selected.
   * - `true` → selectable
   * - `false` → not selectable
   * - `string` → not selectable, string shown as tooltip explaining why
   */
  isItemSelectable?: (item: TItem) => boolean | string;
```

**Step 2: Update DataSheet.tsx usage**

In `packages/solid/src/components/data/sheet/DataSheet.tsx`:

Line 964: Change `local.autoSelect === "click"` → `local.autoSelect`:
```typescript
                    if (local.autoSelect) {
```

Line 968: Change `local.autoSelect === "click"` → `local.autoSelect`:
```typescript
                  class={clsx(trRowClass, local.autoSelect && "cursor-pointer")}
```

**Step 3: Update CrudSheet.tsx usage**

In `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx`, line 627:

```typescript
            autoSelect={isSelectMode() && local.selectionMode === "single" ? true : undefined}
```

**Step 4: Verify typecheck passes**

Run: `pnpm vitest packages/solid/tests/components/data/sheet/ --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/data/sheet/DataSheet.types.ts packages/solid/src/components/data/sheet/DataSheet.tsx packages/solid/src/components/features/crud-sheet/CrudSheet.tsx
git commit -m "refactor(solid): DataSheet autoSelect boolean type + isItemSelectable JSDoc"
```

---

### Task 5: CrudSheet withBusy helper

**Files:**
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx`
- Test: `packages/solid/tests/components/features/crud-sheet/CrudSheet.spec.tsx`

**Step 1: Extract withBusy helper and refactor handlers**

In `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx`, add a local `withBusy` helper after the `setBusyCount` declaration (around line 114), then refactor the 6 handlers that use the busyCount pattern.

Add the helper:

```typescript
  async function withBusy<T>(fn: () => Promise<T>, errorMessage?: string): Promise<T | undefined> {
    setBusyCount((c) => c + 1);
    try {
      return await fn();
    } catch (err) {
      noti.error(err, errorMessage);
      return undefined;
    } finally {
      setBusyCount((c) => c - 1);
    }
  }
```

Refactor these handlers to use `withBusy`:

**`handleEditItem`** (line ~258):
```typescript
  async function handleEditItem(item?: TItem) {
    if (!local.dialogEdit) return;
    const result = await local.dialogEdit.editItem(item);
    if (!result) return;

    await withBusy(() => refresh(), i18n.t("crudSheet.lookupFailed"));
  }
```

**`handleDeleteItems`** (line ~272):
```typescript
  async function handleDeleteItems() {
    if (!local.dialogEdit?.deleteItems) return;
    const result = await local.dialogEdit.deleteItems(selection());
    if (!result) return;

    await withBusy(async () => {
      await refresh();
      noti.success(i18n.t("crudSheet.deleteCompleted"), i18n.t("crudSheet.deleteSuccess"));
    }, i18n.t("crudSheet.deleteFailed"));
  }
```

**`handleRestoreItems`** (line ~287):
```typescript
  async function handleRestoreItems() {
    if (!local.dialogEdit?.restoreItems) return;
    const result = await local.dialogEdit.restoreItems(selection());
    if (!result) return;

    await withBusy(async () => {
      await refresh();
      noti.success(i18n.t("crudSheet.restoreCompleted"), i18n.t("crudSheet.restoreSuccess"));
    }, i18n.t("crudSheet.restoreFailed"));
  }
```

**`handleExcelDownload`** (line ~303):
```typescript
  async function handleExcelDownload() {
    if (!local.excel) return;

    await withBusy(async () => {
      const result = await local.search(lastFilter(), undefined, sorts());
      await local.excel!.download(result.items);
    }, i18n.t("crudSheet.excelDownloadFailed"));
  }
```

**`handleExcelUpload`** (line ~316):
```typescript
  async function handleExcelUpload() {
    if (!local.excel?.upload) return;

    const files = await openFileDialog({ accept: ".xlsx" });
    const file = files?.[0];
    if (file == null) return;

    await withBusy(async () => {
      await local.excel!.upload!(file);
      noti.success(i18n.t("crudSheet.excelCompleted"), i18n.t("crudSheet.excelUploadSuccess"));
      await refresh();
    }, i18n.t("crudSheet.excelUploadFailed"));
  }
```

**`handleSave`** — keep separate because it has early returns and `onSubmitComplete` call:
```typescript
  async function handleSave() {
    if (busyCount() > 0) return;
    if (!canEdit()) return;
    if (!local.inlineEdit) return;

    const diffs = getItemDiffs();

    if (diffs.length === 0) {
      noti.info(i18n.t("crudSheet.notice"), i18n.t("crudSheet.noChanges"));
      return;
    }

    await withBusy(async () => {
      await local.inlineEdit!.submit(diffs);
      noti.success(i18n.t("crudSheet.saveCompleted"), i18n.t("crudSheet.saveSuccess"));
      await refresh();
      local.onSubmitComplete?.();
    }, i18n.t("crudSheet.saveFailed"));
  }
```

Note: `doRefresh` (line 150-163) does NOT use `withBusy` because it has version-based staleness checking (`if (version !== refreshVersion) return`). Leave it as-is.

**Step 2: Run existing tests**

Run: `pnpm vitest packages/solid/tests/components/features/crud-sheet/CrudSheet.spec.tsx --run`
Expected: PASS (behavior unchanged, only structural refactor)

**Step 3: Commit**

```bash
git add packages/solid/src/components/features/crud-sheet/CrudSheet.tsx
git commit -m "refactor(solid): extract CrudSheet withBusy helper to reduce busyCount boilerplate"
```

---

### Task 6: DataSheet renderHeaderCell hook extraction

**Files:**
- Create: `packages/solid/src/components/data/sheet/hooks/useDataSheetHeaderCell.ts`
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx`
- Test: manual verification (extract-only refactor, existing DataSheet tests should pass)

**Step 1: Create the hook file**

Create `packages/solid/src/components/data/sheet/hooks/useDataSheetHeaderCell.ts`.

This hook extracts the `renderHeaderCell` function from DataSheet. It receives the dependencies it needs as props and returns the render function.

```typescript
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { Icon } from "../../../display/Icon";
import { IconArrowsSort, IconSortAscending, IconSortDescending } from "@tabler/icons-solidjs";
import type { HeaderDef, DataSheetColumnDef } from "../DataSheet.types";

export interface UseDataSheetHeaderCellProps<TItem> {
  effectiveColumns: () => DataSheetColumnDef<TItem>[];
  headerRowTops: () => number[];
  getFixedStyle: (colIndex: number) => string | undefined;
  isLastFixed: (colIndex: number) => boolean;
  registerColumnRef: (colIndex: number, el: HTMLElement) => void;
  toggleSort: (key: string, multi: boolean) => void;
  getSortDef: (key: string) => { desc: boolean } | undefined;
  sortIndex: (key: string) => number | undefined;
  onResizerPointerdown: (e: PointerEvent, key: string) => void;
  onResizerDoubleClick: (key: string) => void;
  thClass: string;
  fixedClass: string;
  sortableThClass: string;
  fixedLastClass: string;
  thContentClass: string;
  resizerClass: string;
  sortIconClass: string;
}

export function useDataSheetHeaderCell<TItem>(props: UseDataSheetHeaderCellProps<TItem>) {
  function renderHeaderCell(header: HeaderDef, colIndex: number, rowIndex: number): JSX.Element {
    const isSortable = () =>
      header.isLastRow &&
      header.colIndex != null &&
      props.effectiveColumns()[header.colIndex].sortable;
    const colKey = () =>
      header.colIndex != null
        ? props.effectiveColumns()[header.colIndex].key
        : undefined;

    const isGroupFixed = (): boolean => {
      if (header.isLastRow) return false;
      const start = colIndex;
      const span = header.colspan;
      const cols = props.effectiveColumns();
      for (let i = start; i < start + span && i < cols.length; i++) {
        if (!cols[i].fixed) return false;
      }
      return true;
    };

    const isCellFixed = () =>
      (header.isLastRow &&
        header.colIndex != null &&
        props.effectiveColumns()[header.colIndex].fixed) ||
      isGroupFixed();

    const isCellLastFixed = () => {
      if (header.isLastRow && header.colIndex != null)
        return props.isLastFixed(header.colIndex);
      if (isGroupFixed()) {
        const lastCol = colIndex + header.colspan - 1;
        return props.isLastFixed(lastCol);
      }
      return false;
    };

    const cellStyle = (): string | undefined => {
      const parts: string[] = [];
      const top = props.headerRowTops()[rowIndex];
      parts.push(`top: ${top}px`);
      if (header.isLastRow && header.colIndex != null) {
        const left = props.getFixedStyle(header.colIndex);
        if (left != null) parts.push(left);
        const col = props.effectiveColumns()[header.colIndex];
        if (col.width != null) parts.push(`max-width: ${col.width.replace(/;/g, "")}`);
      } else if (isGroupFixed()) {
        const left = props.getFixedStyle(colIndex);
        if (left != null) parts.push(left);
      }
      return parts.length > 0 ? parts.join("; ") : undefined;
    };

    return (
      <th
        class={twMerge(
          props.thClass,
          props.fixedClass,
          isSortable() ? props.sortableThClass : undefined,
          isCellFixed() ? "z-[5]" : "z-[3]",
          isCellLastFixed() ? props.fixedLastClass : undefined,
        )}
        colspan={header.colspan > 1 ? header.colspan : undefined}
        rowspan={header.rowspan > 1 ? header.rowspan : undefined}
        style={cellStyle()}
        title={
          header.isLastRow && header.colIndex != null
            ? (props.effectiveColumns()[header.colIndex].tooltip ?? header.text)
            : header.text
        }
        ref={(el: HTMLElement) => {
          if (
            header.isLastRow &&
            header.colIndex != null &&
            props.effectiveColumns()[header.colIndex].fixed
          ) {
            props.registerColumnRef(header.colIndex, el);
          }
        }}
        onClick={(e) => {
          if (!isSortable()) return;
          const key = colKey();
          if (key == null) return;
          props.toggleSort(key, e.shiftKey || e.ctrlKey);
        }}
      >
        <div class={clsx("flex items-center gap-2", props.thContentClass)}>
          <div class="flex-1">{header.headerContent?.() ?? header.text}</div>
          <Show when={isSortable() && colKey()}>
            {(key) => {
              const sortDef = () => props.getSortDef(key());
              const sortIdx = () => props.sortIndex(key());
              return (
                <div class={props.sortIconClass}>
                  <Show when={sortDef()?.desc === false}>
                    <Icon icon={IconSortAscending} />
                  </Show>
                  <Show when={sortDef()?.desc === true}>
                    <Icon icon={IconSortDescending} />
                  </Show>
                  <Show when={sortDef() == null}>
                    <Icon
                      icon={IconArrowsSort}
                      class="opacity-30"
                    />
                  </Show>
                  <Show when={sortIdx()}>
                    {(idx) => <sub>{idx()}</sub>}
                  </Show>
                </div>
              );
            }}
          </Show>
        </div>
        <Show
          when={
            header.isLastRow &&
            header.colIndex != null &&
            props.effectiveColumns()[header.colIndex].resizable
          }
        >
          <div
            class={props.resizerClass}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) =>
              props.onResizerPointerdown(e, props.effectiveColumns()[header.colIndex!].key)
            }
            onDblClick={(e) => {
              e.stopPropagation();
              props.onResizerDoubleClick(props.effectiveColumns()[header.colIndex!].key);
            }}
          />
        </Show>
      </th>
    );
  }

  return { renderHeaderCell };
}
```

**Step 2: Wire up the hook in DataSheet.tsx**

In `packages/solid/src/components/data/sheet/DataSheet.tsx`:

1. Add import:
```typescript
import { useDataSheetHeaderCell } from "./hooks/useDataSheetHeaderCell";
```

2. Before the `renderHeaderCell` function (around line 470), call the hook:
```typescript
  const { renderHeaderCell } = useDataSheetHeaderCell({
    effectiveColumns,
    headerRowTops,
    getFixedStyle,
    isLastFixed,
    registerColumnRef,
    toggleSort,
    getSortDef,
    sortIndex,
    onResizerPointerdown,
    onResizerDoubleClick,
    thClass,
    fixedClass,
    sortableThClass,
    fixedLastClass,
    thContentClass,
    resizerClass,
    sortIconClass,
  });
```

3. Delete the old `renderHeaderCell` function (lines 472-614).

4. Remove the now-unused imports from the top of DataSheet.tsx that were only used in `renderHeaderCell` (if any — likely `IconArrowsSort`, `IconSortAscending`, `IconSortDescending` are still used elsewhere, so check before removing).

**Step 3: Run existing DataSheet tests**

Run: `pnpm vitest packages/solid/tests/components/data/sheet/ --run`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/data/sheet/hooks/useDataSheetHeaderCell.ts packages/solid/src/components/data/sheet/DataSheet.tsx
git commit -m "refactor(solid): extract DataSheet renderHeaderCell to useDataSheetHeaderCell hook"
```
