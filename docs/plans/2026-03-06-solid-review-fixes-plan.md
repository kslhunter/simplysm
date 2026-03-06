# Solid Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Fix 16 findings from the solid package code review (correctness, API, conventions, structure).

**Architecture:** Direct fixes to existing files. No new components or APIs. Changes are grouped by file to avoid conflicts. Most changes are mechanical (type fixes, `as unknown as` removal) with a few logic fixes (version counter, error handling) and structural refactors (EditorToolbar, DataSheet, Invalid).

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS

**Note:** The solid package has no test infrastructure. All tasks use `pnpm run typecheck` as primary verification. Logic changes include manual verification steps.

---

### Task 1: CrudDetail — setReady fix + toolbar conditions + `as unknown as` removal

**Files:**
- Modify: `packages/solid/src/components/features/crud-detail/CrudDetail.tsx`

**Step 1: Fix doLoad() setReady placement**

In `doLoad()` (~line 90), move `setReady(true)` inside the try block and `setBusyCount` decrement to finally:

```typescript
async function doLoad() {
  setBusyCount((c) => c + 1);
  try {
    const result = await local.load();
    setData(reconcile(result.data) as any);
    originalData = obj.clone(result.data);
    setInfo(result.info);
    setReady(true);
  } catch (err) {
    noti.error(err, i18n.t("crudDetail.lookupFailed"));
  } finally {
    setBusyCount((c) => c - 1);
  }
}
```

**Step 2: Extract toolbar conditions**

Before the `// -- Topbar Actions --` section (~line 201), add condition variables:

```typescript
const showSave = () => canEdit() && local.submit;
const showDelete = () =>
  canEdit() && local.toggleDelete && info() && !info()!.isNew && (local.deletable ?? true);
```

Replace all 3 inline condition expressions (topbar ~line 205/217, inline ~line 275/287, dialog ~line 338/342) with `showSave()` and `showDelete()`.

**Step 3: Remove `CrudDetailComponent` interface and `as unknown as`**

Remove the `interface CrudDetailComponent` block (~line 41-46). Change the export (~line 376):

```typescript
// Before:
}) as unknown as CrudDetailComponent;

// After — just use Object.assign directly:
export const CrudDetail = Object.assign(CrudDetailBase, {
  Tools: CrudDetailTools,
  Before: CrudDetailBefore,
  After: CrudDetailAfter,
});
```

Note: `CrudDetailBase` is the inner component function. Check if the inner function is named differently (e.g. it may be a generic function `<TData extends object>(props: ...) => ...` assigned to a const). If so, the `Object.assign` result preserves the generic call signature.

**Step 4: Verify**

Run: `pnpm run sd-cli typecheck --packages solid`
Expected: PASS with no type errors in CrudDetail.tsx

**Step 5: Commit**

```bash
git add packages/solid/src/components/features/crud-detail/CrudDetail.tsx
git commit -m "fix(solid): CrudDetail setReady placement, toolbar conditions, remove as-unknown-as"
```

---

### Task 2: CrudSheet — version counter + excel upload + `as unknown as` + Record

**Files:**
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx`
- Modify: `packages/solid/src/components/features/crud-sheet/types.ts`

**Step 1: Add version counter to doRefresh**

Add a `let refreshVersion = 0` before the `createEffect` that calls `doRefresh()` (~line 135). Modify `doRefresh`:

```typescript
let refreshVersion = 0;

createEffect(() => {
  void doRefresh();
});

async function doRefresh() {
  const version = ++refreshVersion;
  setBusyCount((c) => c + 1);
  try {
    await refresh();
    if (version !== refreshVersion) return; // stale — discard
    setReady(true);
  } catch (err) {
    if (version !== refreshVersion) return;
    noti.error(err, i18n.t("crudSheet.lookupFailed"));
  } finally {
    setBusyCount((c) => c - 1);
  }
}
```

**Step 2: Fix handleExcelUpload — persistent input**

Replace the `handleExcelUpload` function (~line 314). Move `document.createElement("input")` to component level (before the function):

```typescript
const excelInput = document.createElement("input");
excelInput.type = "file";
excelInput.accept = ".xlsx";

function handleExcelUpload() {
  if (!local.excel?.upload) return;

  excelInput.value = ""; // reset so same file can be re-selected
  excelInput.onchange = async () => {
    const file = excelInput.files?.[0];
    if (!file) return;
    // ... existing upload logic ...
  };
  excelInput.click();
}
```

**Step 3: Remove `CrudSheetComponent` interface and `as unknown as`**

Remove `interface CrudSheetComponent` (~line 58-65). Change the export (~line 766) to direct `Object.assign` without cast. Also remove all other `as unknown as` in this file (items casts at ~lines 141, 340, 440) — fix via proper generic propagation or `as TItem[]` where the source is already the right type from `reconcile`.

**Step 4: Change `Record<string, any>` to `Record<string, unknown>` in types.ts**

In `packages/solid/src/components/features/crud-sheet/types.ts`, change all `Record<string, any>` to `Record<string, unknown>` (~lines 67, 77). Also in `CrudSheet.tsx` (~lines 59, 66).

**Step 5: Verify**

Run: `pnpm run sd-cli typecheck --packages solid`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/solid/src/components/features/crud-sheet/
git commit -m "fix(solid): CrudSheet version counter, excel upload leak, remove as-unknown-as, Record<string, unknown>"
```

---

### Task 3: NotificationProvider — error handling + barrel removal

**Files:**
- Modify: `packages/solid/src/components/feedback/notification/NotificationProvider.tsx`
- Delete: `packages/solid/src/components/feedback/notification/index.ts`

**Step 1: Fix error() function**

Replace the `error` function (~line 170-177):

```typescript
const error = (err?: any, header?: string): void => {
  if (err instanceof Error) {
    danger(header ?? err.message, header != null ? err.message : undefined);
    logger.error(err.stack ?? err.message);
    return;
  }
  if (typeof err === "string") {
    danger(header ?? err, header != null ? err : undefined);
    logger.error(err);
    return;
  }
  danger(header ?? "Unknown error");
  if (err != null) {
    logger.error(String(err));
  }
};
```

**Step 2: Delete barrel file**

Delete `packages/solid/src/components/feedback/notification/index.ts`. Verify `src/index.ts` already re-exports individual files directly (lines 87-89 — it does).

**Step 3: Verify**

Run: `pnpm run sd-cli typecheck --packages solid`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/feedback/notification/
git commit -m "fix(solid): NotificationProvider handles non-Error values, remove barrel file"
```

---

### Task 4: SharedDataProvider — catch rejection + `as unknown as`

**Files:**
- Modify: `packages/solid/src/providers/shared-data/SharedDataProvider.tsx`

**Step 1: Add .catch() to addEventListener**

In `ensureInitialized()` (~line 234), add a `.catch()` handler:

```typescript
void client
  .addEventListener(
    SharedDataChangeEvent,
    { name, filter: def.filter },
    async (changeKeys) => {
      await loadData(name, def, changeKeys);
    },
  )
  .then((key) => {
    if (disposed) {
      void client.removeEventListener(key);
    } else {
      listenerKeyMap.set(name, key);
    }
  })
  .catch(() => {
    initialized = false;
  });
```

**Step 2: Remove `as unknown as` on context return**

At ~line 95, `return context as unknown as SharedDataValue<TSharedData>` — fix by properly typing the context lookup. If the context is created with `createContext<SharedDataValue<TSharedData>>()`, the return type should already match. If a generic mismatch exists, investigate the generic chain and fix the root cause.

**Step 3: Verify**

Run: `pnpm run sd-cli typecheck --packages solid`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/providers/shared-data/SharedDataProvider.tsx
git commit -m "fix(solid): SharedDataProvider handles addEventListener rejection, remove as-unknown-as"
```

---

### Task 5: Type safety — isItemSelectable + Select onValueChange

**Files:**
- Modify: `packages/solid/src/components/data/sheet/types.ts`
- Modify: `packages/solid/src/components/form-control/select/Select.tsx`

**Step 1: Change isItemSelectable return type**

In `types.ts` line 29:
```typescript
// Before:
isItemSelectable?: (item: TItem) => boolean | string;

// After:
isItemSelectable?: (item: TItem) => true | string;
```

Also update the same type in `packages/solid/src/components/features/crud-sheet/types.ts` if it has a matching prop.

**Step 2: Change Select onValueChange type**

In `Select.tsx` `SelectSingleBaseProps` (~line 285):
```typescript
// Before:
onValueChange?: (value: TValue) => void;

// After:
onValueChange?: (value: TValue | undefined) => void;
```

**Step 3: Verify**

Run: `pnpm run sd-cli typecheck --packages solid`
Expected: PASS (or known downstream errors in consumer code for isItemSelectable — these are expected breaking changes)

**Step 4: Commit**

```bash
git add packages/solid/src/components/data/sheet/types.ts packages/solid/src/components/form-control/select/Select.tsx packages/solid/src/components/features/crud-sheet/types.ts
git commit -m "fix(solid): isItemSelectable returns true|string, Select onValueChange accepts undefined"
```

---

### Task 6: Mechanical `as unknown as` removal — compound components

**Files:**
- Modify: `packages/solid/src/components/layout/sidebar/Sidebar.tsx`
- Modify: `packages/solid/src/components/disclosure/Tabs.tsx`
- Modify: `packages/solid/src/components/disclosure/Dropdown.tsx`
- Modify: `packages/solid/src/components/feedback/print/Print.tsx`
- Modify: `packages/solid/src/components/form-control/field/TextInput.tsx`
- Modify: `packages/solid/src/components/features/data-select-button/DataSelectButton.tsx`
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelect.tsx`
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelectButton.tsx`
- Modify: `packages/solid/src/components/disclosure/Dialog.tsx`

**Step 1: For each compound component file (Sidebar, Tabs, Dropdown, Print, TextInput)**

Remove the `XxxComponent` interface. Change the export from:
```typescript
export const Xxx = Object.assign(XxxInner, { Sub1, Sub2 }) as unknown as XxxComponent;
```
to:
```typescript
export const Xxx = Object.assign(XxxInner, { Sub1, Sub2 });
```

TypeScript's `Object.assign` overload preserves the function signature of the first argument, including generics.

**Step 2: Fix DataSelectButton, SharedDataSelect, SharedDataSelectButton**

These files have `as unknown as` on `splitProps` results. Fix by properly typing the splitProps call — the generic type parameters of `splitProps` should match the actual props type. If the props are generic (e.g., `DataSelectButtonProps<TKey>`), ensure the `splitProps` call uses the correct type parameter.

**Step 3: Fix Dialog.tsx Record<string, any> → Record<string, unknown>**

Change all `Record<string, any>` occurrences in Dialog.tsx (~lines 83, 635, 670, 672) to `Record<string, unknown>`.

**Step 4: Verify**

Run: `pnpm run sd-cli typecheck --packages solid`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/layout/sidebar/ packages/solid/src/components/disclosure/ packages/solid/src/components/feedback/print/ packages/solid/src/components/form-control/field/TextInput.tsx packages/solid/src/components/features/data-select-button/ packages/solid/src/components/features/shared-data/
git commit -m "refactor(solid): remove as-unknown-as from compound components, Record<string, unknown>"
```

---

### Task 7: Generic rename — Select, Combobox, DataSheet, Kanban

**Files:**
- Modify: `packages/solid/src/components/form-control/select/Select.tsx`
- Modify: `packages/solid/src/components/form-control/combobox/Combobox.tsx`
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx`
- Modify: `packages/solid/src/components/data/kanban/Kanban.tsx`

**Step 1: Rename generics**

In each file, rename the single-letter generic `<T>` to a descriptive name. Use find-and-replace within the file scope:

- **Select.tsx**: `<T,>` → `<TValue,>`, all `T` references in type positions → `TValue`
- **Combobox.tsx**: `<T,>` → `<TValue,>`, all `T` references → `TValue`
- **DataSheet.tsx**: `<T,>` → `<TItem,>`, all `T` references → `TItem`
- **Kanban.tsx**: `<T>` → `<TCard>`, all `T` references → `TCard`

**Be careful**: Only rename the generic parameter `T` in type positions, NOT occurrences of `T` in variable names or strings. Use the pattern: replace `<T>`, `<T,>`, `: T`, `T[]`, `T |`, `| T`, `T>`, `extends T`, `T extends` etc.

**Step 2: Also remove `as unknown as` in Select.tsx and DataSheet.tsx**

If these files still have `XxxComponent` interfaces and `as unknown as` casts (from finding 8), remove them in this same task. `DataSheet.tsx` has `DataSheetComponent` interface (~line 82-86). `Select.tsx` has `SelectComponent` interface. Remove both and export `Object.assign` directly.

**Step 3: Verify**

Run: `pnpm run sd-cli typecheck --packages solid`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/form-control/select/ packages/solid/src/components/form-control/combobox/ packages/solid/src/components/data/sheet/DataSheet.tsx packages/solid/src/components/data/kanban/
git commit -m "refactor(solid): rename single-letter generics to descriptive names"
```

---

### Task 8: Invalid — createMemo for target element

**Files:**
- Modify: `packages/solid/src/components/form-control/Invalid.tsx`

**Step 1: Add createMemo import and target memo**

Add `createMemo` to the solid-js import. After the `resolved` children call (~line 28), add:

```typescript
const targetEl = createMemo(() =>
  resolved.toArray().find((el): el is HTMLElement => el instanceof HTMLElement),
);
```

**Step 2: Replace 4 target lookups with memo**

In each of the 4 `createEffect` blocks and the focus event handler, replace:
```typescript
const targetEl = resolved.toArray().find((el): el is HTMLElement => el instanceof HTMLElement);
```
with just using `targetEl()` (the memo accessor).

For the `createEffect` blocks (~lines 37, 62, 109), change `const targetEl = resolved...` to `const el = targetEl();` and use `el` in the effect body.

For the focus handler (~line 126), change to `const el = targetEl();`.

**Step 3: Verify**

Run: `pnpm run sd-cli typecheck --packages solid`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/form-control/Invalid.tsx
git commit -m "refactor(solid): Invalid uses createMemo for target element resolution"
```

---

### Task 9: EditorToolbar — descriptor array refactor

**Files:**
- Modify: `packages/solid/src/components/form-control/editor/EditorToolbar.tsx`

**Step 1: Define toolbar item types and descriptor array**

After the style constants (~line 61), define:

```typescript
interface ToolbarButtonItem {
  icon: Component;
  i18nKey: string;
  /** Tiptap editor command — receives editor.chain().focus() */
  command: (chain: ReturnType<ReturnType<Editor["chain"]>["focus"]>) => void;
  /** Active state check — receives editor instance */
  isActive?: (editor: Editor) => boolean;
}

type ToolbarItem = ToolbarButtonItem | "separator";
```

Then define the items array with all 18 buttons grouped with separators. Each button is an object like:
```typescript
{ icon: IconH1, i18nKey: "editorToolbar.heading1", command: (c) => c.toggleHeading({ level: 1 }).run(), isActive: (e) => e.isActive("heading", { level: 1 }) }
```

For the textAlign items, use the proper `isActive` check without `as unknown as string`:
```typescript
isActive: (e) => e.isActive({ textAlign: "left" })
```
Note: Check if Tiptap's `isActive` actually accepts an object. If the types don't match, use a properly typed helper.

Special items (color pickers, image insert, table insert, clear formatting, indent) that don't follow the simple toggle pattern should remain as inline JSX. Only the simple toggle buttons go into the descriptor array.

**Step 2: Render with For loop**

Replace the repetitive button JSX with:
```tsx
<For each={toolbarItems}>
  {(item) =>
    item === "separator" ? (
      <div class={separatorClass} />
    ) : (
      <Button
        variant="ghost"
        size="xs"
        class={item.isActive ? btnClass(() => activeStates.get(item)?.() ?? false) : toolbarBtnExtra}
        title={i18n.t(item.i18nKey)}
        onClick={() => item.command(props.editor.chain().focus())}
      >
        <Icon icon={item.icon} size="1em" />
      </Button>
    )
  }
</For>
```

For active states, create them from the descriptor array using `createEditorTransaction`:
```typescript
const activeStates = new Map<ToolbarButtonItem, () => boolean>();
for (const item of toolbarItems) {
  if (item !== "separator" && item.isActive) {
    const check = item.isActive;
    activeStates.set(item, createEditorTransaction(e, (editor) => check(editor)));
  }
}
```

Keep color pickers, image insert, and clear formatting as inline JSX after the For loop since they have unique rendering.

**Step 3: Verify**

Run: `pnpm run sd-cli typecheck --packages solid`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/form-control/editor/EditorToolbar.tsx
git commit -m "refactor(solid): EditorToolbar uses descriptor array instead of repetitive JSX"
```

---

### Task 10: DataSheet — sub-render functions

**Files:**
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx`

**Step 1: Extract header cell renderer**

Within `DataSheetInner`, before the return statement, create a function:
```typescript
function renderHeaderCell(header: HeaderDef, colIndex: number, rowIndex: number): JSX.Element {
  // Move the header cell JSX from the return block here
}
```

Extract the header cell rendering logic from the nested `<For>` inside the `<thead>` section.

**Step 2: Extract feature column cells**

Create functions for the feature columns used in body rows:
```typescript
function renderExpandCell(flatItem: FlatItem<TItem>): JSX.Element { ... }
function renderSelectCell(flatItem: FlatItem<TItem>): JSX.Element { ... }
function renderReorderCell(flatItem: FlatItem<TItem>): JSX.Element { ... }
```

Move the corresponding `<Show>` + `<td>` blocks from the body row rendering into these functions.

**Step 3: Extract summary row**

Create a function:
```typescript
function renderSummaryRow(): JSX.Element { ... }
```

Move the summary `<tfoot>` section into this function.

**Step 4: Use extracted functions in the return JSX**

Replace the inline JSX with calls to the extracted functions. The return statement should now be much shorter and show the overall table structure clearly.

**Step 5: Verify**

Run: `pnpm run sd-cli typecheck --packages solid`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/solid/src/components/data/sheet/DataSheet.tsx
git commit -m "refactor(solid): DataSheet extracts sub-render functions for header, feature columns, summary"
```

---

### Task 11: Barcode — type extraction

**Files:**
- Create: `packages/solid/src/components/display/Barcode.types.ts`
- Modify: `packages/solid/src/components/display/Barcode.tsx`
- Modify: `packages/solid/src/index.ts`

**Step 1: Create Barcode.types.ts**

Move the `BarcodeType` union type (~lines 5-115) from `Barcode.tsx` to a new file `Barcode.types.ts`:

```typescript
export type BarcodeType = "auspost" | "azteccode" | ... | "upcecomposite";
```

**Step 2: Update Barcode.tsx**

Add import at top:
```typescript
import type { BarcodeType } from "./Barcode.types";
```

Remove the inline `BarcodeType` definition.

**Step 3: Update index.ts**

Add re-export after the Barcode line (~line 65):
```typescript
export * from "./components/display/Barcode";
export * from "./components/display/Barcode.types";
```

**Step 4: Verify**

Run: `pnpm run sd-cli typecheck --packages solid`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/display/Barcode.types.ts packages/solid/src/components/display/Barcode.tsx packages/solid/src/index.ts
git commit -m "refactor(solid): extract BarcodeType to Barcode.types.ts"
```

---

### Task 12: Final typecheck

**Step 1: Run full typecheck**

Run: `pnpm run sd-cli typecheck --packages solid`
Expected: PASS with no errors

If errors exist, fix them in the affected files.

**Step 2: Verify no stale exports**

Grep for any remaining `as unknown as` in the solid package:
```bash
grep -r "as unknown as" packages/solid/src/ --include="*.ts" --include="*.tsx"
```
Expected: No matches (or only justified ones in non-compound-component code).

**Step 3: Verify no single-letter generics**

Grep for `<T>` or `<T,>` patterns in the 4 target files.
Expected: No matches.
