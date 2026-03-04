# Slot Pattern Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Replace `__type` discriminator pattern with unified Context-based `createSlot`/`createSlots` API across all structural components.

**Architecture:** Two factory functions (`createSlot`, `createSlots`) create child slot components + parent hooks. Each hook returns a per-instance signal + Provider component. Child components register props into parent Context on mount, deregister on cleanup.

**Tech Stack:** SolidJS, TypeScript, Vitest

---

## Phase 1: Core Helpers (Slot System Foundation)

### Task 1: Create `createSlots` helper

**Files:**
- Create: `packages/solid/src/helpers/createSlots.ts`
- Test: `packages/solid/src/helpers/createSlots.spec.ts`

**Step 1: Write the failing test**

```typescript
import { createSlots } from "./createSlots";
import { useContext } from "solid-js";

describe("createSlots", () => {
  it("returns SlotComponent and useSlots hook", () => {
    const [SlotComponent, useSlots] = createSlots<{ id: string }>();

    expect(typeof SlotComponent).toBe("function");
    expect(typeof useSlots).toBe("function");
  });

  it("useSlots returns accessor and Provider", () => {
    const [SlotComponent, useSlots] = createSlots<{ id: string }>();

    let accessor: any;
    let Provider: any;

    const TestWrapper = () => {
      [accessor, Provider] = useSlots();
      return null;
    };

    const Root = () => <TestWrapper />;

    let mounted = false;
    const dispose = createRoot(() => {
      mounted = true;
      return () => (mounted = false);
    });

    expect(typeof accessor).toBe("function");
    expect(typeof Provider).toBe("function");

    dispose();
  });

  it("accessor returns empty array initially", () => {
    const [SlotComponent, useSlots] = createSlots<{ id: string }>();

    let items: any;

    const TestWrapper = () => {
      const [itemsAccessor, Provider] = useSlots();
      items = itemsAccessor();
      return null;
    };

    createRoot(() => {
      createEffect(() => {
        const test = <TestWrapper />;
      });
    });

    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm run vitest packages/solid/src/helpers/createSlots.spec.ts --run`

Expected: FAIL with "createSlots is not exported"

**Step 3: Write minimal implementation**

```typescript
import { createContext, type Context, type ParentComponent } from "solid-js";
import { createSignal, type Accessor } from "solid-js";

export interface SlotRegistrar<T> {
  add: (item: T) => void;
  remove: (item: T) => void;
}

/**
 * Creates a multi-slot component with registration pattern.
 *
 * @returns [SlotComponent, useSlots hook]
 */
export function createSlots<T>() {
  const Ctx = createContext<SlotRegistrar<T>>();

  const SlotComponent = (props: T) => {
    const ctx = useContext(Ctx)!;
    ctx.add(props);
    onCleanup(() => ctx.remove(props));
    return null;
  };

  function useSlots(): [Accessor<T[]>, ParentComponent] {
    const [items, setItems] = createSignal<T[]>([]);

    const Provider: ParentComponent = (providerProps) => (
      <Ctx.Provider
        value={{
          add: (item) => setItems((prev) => [...prev, item]),
          remove: (item) => setItems((prev) => prev.filter((i) => i !== item)),
        }}
      >
        {providerProps.children}
      </Ctx.Provider>
    );

    return [items, Provider];
  }

  return [SlotComponent, useSlots] as const;
}
```

Add imports at top:
```typescript
import { createContext, onCleanup, type Context, type ParentComponent, useContext } from "solid-js";
```

**Step 4: Run test to verify it passes**

Run: `pnpm run vitest packages/solid/src/helpers/createSlots.spec.ts --run`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/helpers/createSlots.ts packages/solid/src/helpers/createSlots.spec.ts
git commit -m "feat(solid): add createSlots helper for multi-item slot registration"
```

---

### Task 2: Create `createSlot` helper

**Files:**
- Create: `packages/solid/src/helpers/createSlot.ts`
- Test: `packages/solid/src/helpers/createSlot.spec.ts`

**Step 1: Write the failing test**

```typescript
import { createSlot } from "./createSlot";
import { createRoot } from "solid-js";

describe("createSlot", () => {
  it("returns SlotComponent and useSlot hook", () => {
    const [SlotComponent, useSlot] = createSlot<{ children: () => string }>();

    expect(typeof SlotComponent).toBe("function");
    expect(typeof useSlot).toBe("function");
  });

  it("accessor returns undefined initially", () => {
    const [SlotComponent, useSlot] = createSlot<{ children: () => string }>();

    let value: any;

    createRoot(() => {
      const [accessor, Provider] = useSlot();
      value = accessor();
    });

    expect(value).toBeUndefined();
  });

  it("throws error when two items are registered", () => {
    const [SlotComponent, useSlot] = createSlot<{ id: string }>();

    expect(() => {
      createRoot(() => {
        const [accessor, Provider] = useSlot();
        // Simulate mounting two SlotComponents
        const registrar = { add: () => {}, remove: () => {} };
        registrar.add({ id: "1" });
        registrar.add({ id: "2" }); // Should throw
      });
    }).toThrow("Slot already occupied");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm run vitest packages/solid/src/helpers/createSlot.spec.ts --run`

Expected: FAIL with "createSlot is not exported"

**Step 3: Write minimal implementation**

```typescript
import { createContext, onCleanup, type Context, type ParentComponent, useContext } from "solid-js";
import { createSignal, type Accessor } from "solid-js";

export interface SingleSlotRegistrar<T> {
  add: (item: T) => void;
  remove: () => void;
}

/**
 * Creates a single-slot component with registration pattern.
 * Throws error if more than one item is registered.
 *
 * @returns [SlotComponent, useSlot hook]
 */
export function createSlot<T>() {
  const Ctx = createContext<SingleSlotRegistrar<T>>();

  const SlotComponent = (props: T) => {
    const ctx = useContext(Ctx)!;
    ctx.add(props);
    onCleanup(() => ctx.remove());
    return null;
  };

  function useSlot(): [Accessor<T | undefined>, ParentComponent] {
    const [item, setItem] = createSignal<T | undefined>();

    const Provider: ParentComponent = (providerProps) => (
      <Ctx.Provider
        value={{
          add: (newItem) => {
            if (item() !== undefined) {
              throw new Error("Slot already occupied");
            }
            setItem(() => newItem);
          },
          remove: () => setItem(undefined),
        }}
      >
        {providerProps.children}
      </Ctx.Provider>
    );

    return [item, Provider];
  }

  return [SlotComponent, useSlot] as const;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm run vitest packages/solid/src/helpers/createSlot.spec.ts --run`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/helpers/createSlot.ts packages/solid/src/helpers/createSlot.spec.ts
git commit -m "feat(solid): add createSlot helper for single-item slot registration"
```

---

### Task 3: Export new helpers from index

**Files:**
- Modify: `packages/solid/src/index.ts`

**Step 1: Add exports**

Find the line with `export * from "./helpers/createSlotComponent";` and replace it with:

```typescript
export * from "./helpers/createSlot";
export * from "./helpers/createSlots";
```

Keep `createSlotSignal` export for now (will be removed in Phase 3).

**Step 2: Verify compilation**

Run: `pnpm run build -F solid 2>&1 | head -20`

Expected: No errors

**Step 3: Commit**

```bash
git add packages/solid/src/index.ts
git commit -m "feat(solid): export createSlot and createSlots helpers"
```

---

## Phase 2: Convert Existing Slot Consumers

### Task 4: Migrate Dialog slots to new API

**Files:**
- Modify: `packages/solid/src/components/disclosure/Dialog.tsx:21-260` (entire Dialog component)
- Test: Existing Dialog tests remain valid

**Step 1: Update imports and type definitions**

In `Dialog.tsx`, replace:

```typescript
import { createSlotSignal, type SlotAccessor } from "../../hooks/createSlotSignal";
```

with:

```typescript
import { createSlot } from "../../helpers/createSlot";
```

Remove `SlotAccessor` type usage.

**Step 2: Create slot components**

Replace:

```typescript
const [header, setHeader] = createSlotSignal();
const [action, setAction] = createSlotSignal();
```

with:

```typescript
const [DialogHeader, useHeaderSlot] = createSlot<{ children: JSX.Element }>();
const [DialogAction, useActionSlot] = createSlot<{ children: JSX.Element }>();
```

Export the components:
```typescript
export const Dialog = ... (main component below)
export { DialogHeader, DialogAction };
```

**Step 3: Update Dialog component body**

Replace the Dialog function to use `useHeaderSlot()` and `useActionSlot()`:

```typescript
function Dialog(props: DialogProps) {
  const [header, HeaderProvider] = useHeaderSlot();
  const [action, ActionProvider] = useActionSlot();

  return (
    <HeaderProvider>
      <ActionProvider>
        {/* existing Dialog JSX, replace header()?.() with header()?.children */}
      </ActionProvider>
    </HeaderProvider>
  );
}
```

Update all `header()?.()` to `header()?.children` and `action()?.()` to `action()?.children`.

**Step 4: Run tests**

Run: `pnpm run vitest Dialog.spec.ts --run`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/disclosure/Dialog.tsx
git commit -m "refactor(solid): migrate Dialog to new slot API"
```

---

### Task 5: Migrate Dropdown slots to new API

**Files:**
- Modify: `packages/solid/src/components/disclosure/Dropdown.tsx:13-200`

**Step 1: Update imports**

Replace:

```typescript
import { createSlotSignal, type SlotAccessor } from "../../hooks/createSlotSignal";
```

with:

```typescript
import { createSlot } from "../../helpers/createSlot";
```

**Step 2: Create slot components and update Dropdown**

Replace:

```typescript
const [triggerSlot, setTrigger] = createSlotSignal();
const [contentSlot, setContent] = createSlotSignal();
```

with:

```typescript
const [DropdownTrigger, useTriggerSlot] = createSlot<{ children: JSX.Element }>();
const [DropdownContent, useContentSlot] = createSlot<{ children: JSX.Element }>();
```

Export:
```typescript
export { DropdownTrigger, DropdownContent };
```

**Step 3: Update Dropdown component**

Wrap children with Providers:

```typescript
function Dropdown(props: DropdownProps) {
  const [trigger, TriggerProvider] = useTriggerSlot();
  const [content, ContentProvider] = useContentSlot();

  return (
    <TriggerProvider>
      <ContentProvider>
        {/* Update triggerSlot()?.() to trigger()?.children */}
        {/* Update contentSlot()?.() to content()?.children */}
      </ContentProvider>
    </TriggerProvider>
  );
}
```

**Step 4: Run tests**

Run: `pnpm run vitest Dropdown.spec.ts --run`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/disclosure/Dropdown.tsx
git commit -m "refactor(solid): migrate Dropdown to new slot API"
```

---

### Task 6: Migrate Select header/action slots to new API

**Files:**
- Modify: `packages/solid/src/components/form-control/select/Select.tsx:28-500`

**Step 1: Update imports**

Replace:

```typescript
import { createSlotSignal, type SlotAccessor } from "../../../hooks/createSlotSignal";
```

with:

```typescript
import { createSlot } from "../../../helpers/createSlot";
```

**Step 2: Create slot components**

Replace:

```typescript
const [header, setHeader] = createSlotSignal();
const [action, setAction] = createSlotSignal();
```

with:

```typescript
const [SelectHeader, useHeaderSlot] = createSlot<{ children: JSX.Element }>();
const [SelectAction, useActionSlot] = createSlot<{ children: JSX.Element }>();
```

Export both components.

**Step 3: Update Select component**

Wrap children with Providers and update all `header()?.()` to `header()?.children`.

**Step 4: Run tests**

Run: `pnpm run vitest Select.spec.ts --run`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/form-control/select/Select.tsx
git commit -m "refactor(solid): migrate Select header/action slots to new API"
```

---

### Task 7: Migrate Select item children slot to new API

**Files:**
- Modify: `packages/solid/src/components/form-control/select/Select.tsx:140-160` (SelectItemChildren)

**Step 1: Create SelectItemChildren slot**

Add near other slot definitions:

```typescript
const [SelectItemChildren, useItemChildrenSlot] = createSlot<{ children: JSX.Element }>();
```

Export it.

**Step 2: Update usage in Select**

Find where `SelectItemTemplate` is used (line ~141) and replace with new slot registration pattern.

**Step 3: Run tests**

Run: `pnpm run vitest Select.spec.ts --run`

Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/form-control/select/Select.tsx
git commit -m "refactor(solid): migrate SelectItemChildren slot to new API"
```

---

### Task 8: Migrate remaining input prefix slots (NumberInput, TextInput)

**Files:**
- Modify: `packages/solid/src/components/form-control/field/NumberInput.tsx:14-235`
- Modify: `packages/solid/src/components/form-control/field/TextInput.tsx:6-235`

**Step 1: Update NumberInput imports and create slots**

Replace `createSlotSignal` import with `createSlot`.

Create:
```typescript
const [NumberInputPrefix, usePrefixSlot] = createSlot<{ children: JSX.Element }>();
```

Export it.

**Step 2: Update NumberInput component**

Wrap with Provider and replace prefix signal usage.

**Step 3: Update TextInput similarly**

Repeat steps 1-2 for TextInput.

**Step 4: Run tests**

Run: `pnpm run vitest NumberInput.spec.ts TextInput.spec.ts --run`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/form-control/field/NumberInput.tsx packages/solid/src/components/form-control/field/TextInput.tsx
git commit -m "refactor(solid): migrate NumberInput/TextInput prefix slots to new API"
```

---

### Task 9: Migrate ListItem and Kanban slots to new API

**Files:**
- Modify: `packages/solid/src/components/data/list/ListItem.tsx:17-140`
- Modify: `packages/solid/src/components/data/kanban/Kanban.tsx:27-420`

**Step 1: Update ListItem**

Replace `createSlotSignal` with `createSlot`.

Create:
```typescript
const [ListItemChildren, useChildrenSlot] = createSlot<{ children: JSX.Element }>();
```

Export it.

**Step 2: Update Kanban**

Create:
```typescript
const [KanbanTitle, useTitleSlot] = createSlot<{ children: JSX.Element }>();
const [KanbanTools, useToolsSlot] = createSlot<{ children: JSX.Element }>();
```

Export both.

**Step 3: Run tests**

Run: `pnpm run vitest ListItem.spec.ts Kanban.spec.ts --run`

Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/data/list/ListItem.tsx packages/solid/src/components/data/kanban/Kanban.tsx
git commit -m "refactor(solid): migrate ListItem and Kanban slots to new API"
```

---

### Task 10: Migrate SharedDataSelectList filter slot to new API

**Files:**
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelectList.tsx:11-120`

**Step 1: Update imports and create slot**

Replace `createSlotSignal` with `createSlot`.

Create:
```typescript
const [SharedDataSelectListFilter, useFilterSlot] = createSlot<{ children: (filter: any, setFilter: any) => JSX.Element }>();
```

Export it.

**Step 2: Update component**

Wrap with Provider and update filter signal usage.

**Step 3: Run tests**

Run: `pnpm run vitest SharedDataSelectList.spec.ts --run`

Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/features/shared-data/SharedDataSelectList.tsx
git commit -m "refactor(solid): migrate SharedDataSelectList filter slot to new API"
```

---

## Phase 3: Convert __type Pattern Components

### Task 11: Migrate CrudDetailTools to slot pattern

**Files:**
- Modify: `packages/solid/src/components/features/crud-detail/CrudDetailTools.tsx`
- Modify: `packages/solid/src/components/features/crud-detail/CrudDetail.tsx:34-260`

**Step 1: Rewrite CrudDetailTools**

Replace:

```typescript
import { createDefComponent } from "../../../helpers/createDefComponent";

export function isCrudDetailToolsDef(value: unknown): value is CrudDetailToolsDef {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "crud-detail-tools"
  );
}

export const CrudDetailTools = createDefComponent<CrudDetailToolsDef>(
  (props: { children: JSX.Element }) => ({
    __type: "crud-detail-tools",
    children: props.children,
  }),
);
```

with:

```typescript
import { createSlot } from "../../../helpers/createSlot";

const [CrudDetailTools, useCrudDetailToolsSlot] = createSlot<{ children: JSX.Element }>();

export { CrudDetailTools };
```

**Step 2: Update CrudDetail to use new slot**

In `CrudDetail.tsx`, replace the import:

```typescript
import { CrudDetailTools, isCrudDetailToolsDef } from "./CrudDetailTools";
```

with:

```typescript
import { CrudDetailTools, useCrudDetailToolsSlot } from "./CrudDetailTools";
```

Remove `isCrudDetailToolsDef` usage. Update CrudDetail component to:

```typescript
function CrudDetail(props: CrudDetailProps) {
  const [tools, ToolsProvider] = useCrudDetailToolsSlot();

  // Wrap other providers with ToolsProvider
  return (
    <ToolsProvider>
      {/* existing content, replace tools()?.children access */}
    </ToolsProvider>
  );
}
```

Replace `defs.tools().children` with `tools()?.children`.

**Step 3: Run tests**

Run: `pnpm run vitest CrudDetail.spec.ts --run`

Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/features/crud-detail/CrudDetailTools.tsx packages/solid/src/components/features/crud-detail/CrudDetail.tsx
git commit -m "refactor(solid): migrate CrudDetailTools to new slot API"
```

---

### Task 12: Migrate CrudDetailBefore and CrudDetailAfter to slot pattern

**Files:**
- Modify: `packages/solid/src/components/features/crud-detail/CrudDetailBefore.tsx`
- Modify: `packages/solid/src/components/features/crud-detail/CrudDetailAfter.tsx`
- Modify: `packages/solid/src/components/features/crud-detail/CrudDetail.tsx:35,36-260`

**Step 1: Rewrite CrudDetailBefore**

Replace `__type` pattern with:

```typescript
import { createSlot } from "../../../helpers/createSlot";

const [CrudDetailBefore, useCrudDetailBeforeSlot] = createSlot<{ children: JSX.Element }>();

export { CrudDetailBefore };
```

**Step 2: Rewrite CrudDetailAfter similarly**

**Step 3: Update CrudDetail**

Add:
```typescript
const [before, BeforeProvider] = useCrudDetailBeforeSlot();
const [after, AfterProvider] = useCrudDetailAfterSlot();
```

Nest all Providers and replace `defs.before().children` / `defs.after().children` with `before()?.children` / `after()?.children`.

**Step 4: Run tests**

Run: `pnpm run vitest CrudDetail.spec.ts --run`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/features/crud-detail/CrudDetailBefore.tsx packages/solid/src/components/features/crud-detail/CrudDetailAfter.tsx packages/solid/src/components/features/crud-detail/CrudDetail.tsx
git commit -m "refactor(solid): migrate CrudDetailBefore/After to new slot API"
```

---

### Task 13: Migrate CrudSheetHeader to slot pattern

**Files:**
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheetHeader.tsx`
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx:51-115`

**Step 1: Rewrite CrudSheetHeader**

Replace `createDefComponent` pattern with:

```typescript
import { createSlot } from "../../../helpers/createSlot";

const [CrudSheetHeader, useCrudSheetHeaderSlot] = createSlot<{ children: JSX.Element }>();

export { CrudSheetHeader };
```

**Step 2: Update CrudSheet**

Add:
```typescript
const [header, HeaderProvider] = useCrudSheetHeaderSlot();
```

Wrap children and replace header definition access.

**Step 3: Run tests**

Run: `pnpm run vitest CrudSheet.spec.ts --run`

Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/features/crud-sheet/CrudSheetHeader.tsx packages/solid/src/components/features/crud-sheet/CrudSheet.tsx
git commit -m "refactor(solid): migrate CrudSheetHeader to new slot API"
```

---

### Task 14: Migrate CrudSheetFilter to slot pattern

**Files:**
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheetFilter.tsx`
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx:110-530`

**Step 1: Rewrite CrudSheetFilter**

Replace manual `__type` pattern with:

```typescript
import { createSlot } from "../../../helpers/createSlot";

const [CrudSheetFilter, useCrudSheetFilterSlot] = createSlot<{
  children: (filter: TFilter, setFilter: (f: TFilter) => void) => JSX.Element;
}>();

export { CrudSheetFilter };
```

**Step 2: Update CrudSheet**

Add:
```typescript
const [filter, FilterProvider] = useCrudSheetFilterSlot();
```

Update filter usage: `filter()?.children(currentFilter, setFilter)`.

**Step 3: Run tests**

Run: `pnpm run vitest CrudSheet.spec.ts --run`

Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/features/crud-sheet/CrudSheetFilter.tsx packages/solid/src/components/features/crud-sheet/CrudSheet.tsx
git commit -m "refactor(solid): migrate CrudSheetFilter to new slot API"
```

---

### Task 15: Migrate CrudSheetTools to slot pattern

**Files:**
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheetTools.tsx`
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx:110-530`

**Step 1: Rewrite CrudSheetTools**

Replace manual `__type` with:

```typescript
import { createSlot } from "../../../helpers/createSlot";

const [CrudSheetTools, useCrudSheetToolsSlot] = createSlot<{
  children: (ctx: CrudSheetContext) => JSX.Element;
}>();

export { CrudSheetTools };
```

**Step 2: Update CrudSheet**

Add:
```typescript
const [tools, ToolsProvider] = useCrudSheetToolsSlot();
```

Update: `tools()?.children(crudSheetContext)`.

**Step 3: Run tests**

Run: `pnpm run vitest CrudSheet.spec.ts --run`

Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/features/crud-sheet/CrudSheetTools.tsx packages/solid/src/components/features/crud-sheet/CrudSheet.tsx
git commit -m "refactor(solid): migrate CrudSheetTools to new slot API"
```

---

## Phase 4: Convert Column/Data Slot Components

### Task 16: Migrate DataSheetColumn to slot pattern

**Files:**
- Modify: `packages/solid/src/components/data/sheet/DataSheetColumn.tsx`
- Modify: `packages/solid/src/components/data/sheet/types.ts` (remove `DataSheetColumnDef` interface)
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx:30-175`

**Step 1: Rewrite DataSheetColumn**

Replace:

```typescript
import type { JSX } from "solid-js";
import type { DataSheetColumnDef, DataSheetColumnProps } from "./types";
import { normalizeHeader } from "./sheetUtils";

export function isDataSheetColumnDef(value: unknown): value is DataSheetColumnDef<unknown> {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "sheet-column"
  );
}

export function DataSheetColumn<TItem>(props: DataSheetColumnProps<TItem>): JSX.Element {
  return {
    __type: "sheet-column",
    key: props.key,
    // ... properties ...
  } as unknown as JSX.Element;
}
```

with:

```typescript
import { createSlots } from "../../../helpers/createSlots";
import type { DataSheetColumnProps } from "./types";

const [DataSheetColumn, useColumnSlots] = createSlots<DataSheetColumnProps<any>>();

export { DataSheetColumn, useColumnSlots };
```

**Step 2: Update types.ts**

Remove `DataSheetColumnDef<T>` interface (keep `DataSheetColumnProps<T>`).

**Step 3: Update DataSheet**

Replace:

```typescript
import { isDataSheetColumnDef, DataSheetColumn } from "./DataSheetColumn";
const columnDefs = createMemo(
  () => resolved.toArray().filter(isDataSheetColumnDef) as unknown as DataSheetColumnDef<T>[],
);
```

with:

```typescript
import { DataSheetColumn, useColumnSlots } from "./DataSheetColumn";

function DataSheet<T>(props: DataSheetProps<T>) {
  const [columns, ColumnsProvider] = useColumnSlots();

  return (
    <ColumnsProvider>
      {/* existing DataSheet JSX, use columns() directly */}
    </ColumnsProvider>
  );
}
```

Replace all `columnDefs()` with `columns()`.

**Step 4: Run tests**

Run: `pnpm run vitest DataSheet.spec.ts --run`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/data/sheet/DataSheetColumn.tsx packages/solid/src/components/data/sheet/types.ts packages/solid/src/components/data/sheet/DataSheet.tsx
git commit -m "refactor(solid): migrate DataSheetColumn to new slot API"
```

---

### Task 17: Migrate CrudSheetColumn to slot pattern

**Files:**
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheetColumn.tsx`
- Modify: `packages/solid/src/components/features/crud-sheet/types.ts` (remove `CrudSheetColumnDef`)
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx:51-720`

**Step 1: Rewrite CrudSheetColumn**

Replace manual `__type` pattern with:

```typescript
import { createSlots } from "../../../helpers/createSlots";
import type { CrudSheetColumnProps } from "./types";

const [CrudSheetColumn, useCrudSheetColumnSlots] = createSlots<CrudSheetColumnProps<any>>();

export { CrudSheetColumn, useCrudSheetColumnSlots };
```

**Step 2: Update CrudSheet**

Add:
```typescript
const [columns, ColumnsProvider] = useCrudSheetColumnSlots();
```

Wrap children and replace column definition filtering.

**Step 3: Handle CrudSheet → DataSheet integration**

CrudSheet receives `CrudSheetColumn` props in its `columns()` accessor. It needs to pass them to DataSheet's column slot. Add to CrudSheet:

```typescript
// Register CrudSheetColumns into DataSheet's column context
createEffect(() => {
  columns().forEach(col => {
    dataSheetColumnRegistrar.add(transformCrudColumnToDataSheetColumn(col));
  });
});
```

Or simpler: CrudSheet directly accesses DataSheet's column context (same package, acceptable coupling).

**Step 4: Run tests**

Run: `pnpm run vitest CrudSheet.spec.ts --run`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/features/crud-sheet/CrudSheetColumn.tsx packages/solid/src/components/features/crud-sheet/CrudSheet.tsx packages/solid/src/components/features/crud-sheet/types.ts
git commit -m "refactor(solid): migrate CrudSheetColumn to new slot API"
```

---

## Phase 5: Cleanup

### Task 18: Remove __type pattern files and utilities

**Files:**
- Delete: `packages/solid/src/helpers/createDefComponent.ts`
- Delete: `packages/solid/src/helpers/createSlotComponent.ts`
- Modify: `packages/solid/src/index.ts` (remove old exports)
- Delete: `packages/solid/src/hooks/createSlotSignal.ts`

**Step 1: Remove createDefComponent**

```bash
rm packages/solid/src/helpers/createDefComponent.ts
```

**Step 2: Remove createSlotComponent and createSlotSignal**

```bash
rm packages/solid/src/helpers/createSlotComponent.ts packages/solid/src/hooks/createSlotSignal.ts
```

**Step 3: Update index.ts exports**

Remove:
```typescript
export * from "./helpers/createDefComponent";
export * from "./helpers/createSlotComponent";
export * from "./hooks/createSlotSignal";
```

Keep only:
```typescript
export * from "./helpers/createSlot";
export * from "./helpers/createSlots";
```

**Step 4: Run type check**

Run: `pnpm run typecheck`

Expected: No errors

**Step 5: Commit**

```bash
git add -A packages/solid/src/helpers packages/solid/src/hooks packages/solid/src/index.ts
git commit -m "refactor(solid): remove deprecated __type pattern and old slot helpers"
```

---

### Task 19: Remove all isXxxDef and __type references from type definitions

**Files:**
- Modify: `packages/solid/src/components/data/sheet/types.ts` (remove DataSheetColumnDef)
- Modify: `packages/solid/src/components/features/crud-sheet/types.ts` (remove all Def interfaces)
- Modify: `packages/solid/src/components/features/crud-detail/types.ts` (remove all Def interfaces)

**Step 1: Update each types.ts file**

Remove all interfaces matching pattern `XXXDef`:
- `DataSheetColumnDef`
- `CrudSheetColumnDef`, `CrudSheetFilterDef`, `CrudSheetToolsDef`, `CrudSheetHeaderDef`
- `CrudDetailToolsDef`, `CrudDetailBeforeDef`, `CrudDetailAfterDef`

These are no longer needed since components register props directly.

**Step 2: Run type check**

Run: `pnpm run typecheck`

Expected: No errors

**Step 3: Commit**

```bash
git add packages/solid/src/components/data/sheet/types.ts packages/solid/src/components/features/crud-sheet/types.ts packages/solid/src/components/features/crud-detail/types.ts
git commit -m "refactor(solid): remove Def interface types and __type discriminators"
```

---

### Task 20: Final verification and testing

**Files:**
- Test: All affected components

**Step 1: Run all component tests**

Run: `pnpm run vitest packages/solid/src/components --run`

Expected: All tests PASS

**Step 2: Run full build**

Run: `pnpm run build -F solid`

Expected: No errors or warnings

**Step 3: Run lint**

Run: `pnpm run lint packages/solid`

Expected: No errors

**Step 4: Commit verification**

Run: `git log --oneline -20`

Verify all 20 tasks are committed.

**Step 5: Final commit message**

```bash
git commit --allow-empty -m "chore(solid): slot pattern unification complete"
```

---

## Implementation Notes

- **Reactivity:** SolidJS props are reactive proxies. When props change (e.g., `column.hidden` prop), the registered object automatically reflects changes. No need for transform functions or manual updates.
- **Import structure:** Each slot component is created at module level (not inside parent), then parent imports and uses `useXxxSlot()` hook.
- **Provider nesting:** Multiple Providers can be nested without issue. Order doesn't matter for this pattern.
- **Testing strategy:** TDD for helpers, then integration tests for each component migration verify existing behavior is preserved.
- **Cleanup safety:** All `isXxxDef` type guards and `__type` checks can be safely removed once all usages are converted.
