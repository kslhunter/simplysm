# Select Modal API Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Redesign DataSelectButton/SharedDataSelect modal API to use declarative object config with auto-injected selection props.

**Architecture:** Define `InjectedSelectProps` and `ModalConfig` types. DataSelectButton wraps modal component in a factory that injects `selectMode/selectedKeys/onSelect`. SharedDataSelect switches to compound children and reuses the same modal pattern. SharedDataSelectButton inherits from DataSelectButton.

**Tech Stack:** SolidJS, TypeScript, Vitest, @solidjs/testing-library

---

### Task 1: Add InjectedSelectProps and ModalConfig types

**Files:**
- Modify: `packages/solid/src/components/features/data-select-button/DataSelectButton.tsx:29-31`

**Step 1: Add types after DataSelectModalResult**

Add these types right after the existing `DataSelectModalResult` interface (line 31):

```typescript
/** Props automatically injected into modal component by DataSelectButton/SharedDataSelect */
export interface InjectedSelectProps {
  /** Selection mode */
  selectMode: "single" | "multiple";
  /** Currently selected keys */
  selectedKeys: (string | number)[];
  /** Selection callback — automatically closes dialog with result */
  onSelect: (result: { keys: (string | number)[] }) => void;
}

/** Declarative modal configuration */
export interface ModalConfig<TUserProps = Record<string, any>> {
  /** Modal component (must accept InjectedSelectProps) */
  component: Component<TUserProps & InjectedSelectProps>;
  /** User-defined props for the component */
  props?: TUserProps;
  /** Dialog options (header, size, etc.) */
  option?: DialogShowOptions;
}
```

Import `Component` from `solid-js` (already imported as it's used in JSX context — verify and add if missing).

**Step 2: Run typecheck to verify types compile**

Run: `pnpm typecheck packages/solid/src/components/features/data-select-button/DataSelectButton.tsx`
Expected: PASS (types added, nothing changed)

---

### Task 2: Update DataSelectButton tests for new modal API

**Files:**
- Modify: `packages/solid/tests/components/features/data-select-button/DataSelectButton.spec.tsx`

**Step 1: Replace TestModal with TestModalComponent**

Replace the current `TestModal` function (lines 32-49) with:

```typescript
import { type InjectedSelectProps } from "@simplysm/solid";

// Modal component for tests — receives InjectedSelectProps automatically
function TestModalComponent(props: { confirmKeys: number[] } & InjectedSelectProps) {
  return (
    <div data-testid="modal-content">
      <div data-testid="select-mode">{props.selectMode}</div>
      <div data-testid="selected-keys">{JSON.stringify([...props.selectedKeys])}</div>
      <button data-testid="modal-confirm" onClick={() => props.onSelect({ keys: props.confirmKeys })}>
        confirm
      </button>
    </div>
  );
}
```

Remove unused imports: `useDialogInstance`, `Dialog`.

**Step 2: Update all test usages**

Replace every occurrence of `modal={TestModal([...])}` with the new object config pattern:

```typescript
// Before
modal={TestModal([2])}

// After
modal={{ component: TestModalComponent, props: { confirmKeys: [2] } }}
```

Also replace `modal={TestModal([])}` with:

```typescript
modal={{ component: TestModalComponent, props: { confirmKeys: [] } }}
```

Remove `dialogOptions` from any test that uses it.

**Step 3: Update the cancel test**

The "does not change value when modal is cancelled" test (line 312) — change to close via ESC key instead of a cancel button:

```typescript
it("does not change value when modal is cancelled", async () => {
  const load = createTestLoad();
  const onValueChange = vi.fn();

  const { container } = renderWithDialog(() => (
    <DataSelectButton
      value={1}
      onValueChange={onValueChange}
      load={load}
      modal={{ component: TestModalComponent, props: { confirmKeys: [2] } }}
      renderItem={(item: TestItem) => <span>{item.name}</span>}
    />
  ));

  const searchBtn = container.querySelector("[data-search-button]") as HTMLButtonElement;
  searchBtn.click();

  await vi.waitFor(() => {
    const modalContent = document.querySelector("[data-testid='modal-content']");
    expect(modalContent).not.toBeNull();
  });

  // Close via ESC key
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

  await new Promise((r) => setTimeout(r, 300));
  expect(onValueChange).not.toHaveBeenCalled();
});
```

**Step 4: Add test for injected props**

Add a new test to verify injected props are passed correctly:

```typescript
it("injects selectMode and selectedKeys into modal component", async () => {
  const load = createTestLoad();

  const { container } = renderWithDialog(() => (
    <DataSelectButton
      value={1}
      multiple
      load={load}
      modal={{ component: TestModalComponent, props: { confirmKeys: [] } }}
      renderItem={(item: TestItem) => <span>{item.name}</span>}
    />
  ));

  const searchBtn = container.querySelector("[data-search-button]") as HTMLButtonElement;
  searchBtn.click();

  await vi.waitFor(() => {
    const selectMode = document.querySelector("[data-testid='select-mode']");
    expect(selectMode?.textContent).toBe("multiple");

    const selectedKeys = document.querySelector("[data-testid='selected-keys']");
    expect(selectedKeys?.textContent).toBe("[1]");
  });
});
```

**Step 5: Run tests to verify they FAIL**

Run: `pnpm vitest packages/solid/tests/components/features/data-select-button/DataSelectButton.spec.tsx --project=solid --run`
Expected: FAIL (implementation not updated yet)

---

### Task 3: Update DataSelectButton implementation

**Files:**
- Modify: `packages/solid/src/components/features/data-select-button/DataSelectButton.tsx`

**Step 1: Update imports**

Add `Component` to the solid-js import if not present:

```typescript
import { ..., type Component } from "solid-js";
```

Add `useDialogInstance` import:

```typescript
import { useDialogInstance } from "../../disclosure/DialogInstanceContext";
```

**Step 2: Update DataSelectButtonProps**

Change the `modal` and `dialogOptions` props:

```typescript
// Before
  modal: () => JSX.Element;
  dialogOptions?: DialogShowOptions;

// After
  modal: ModalConfig;
```

Remove `dialogOptions` from the interface entirely.

**Step 3: Update splitProps**

Remove `"dialogOptions"` from the splitProps array.

**Step 4: Update handleOpenModal**

Replace the current handleOpenModal (lines 173-189) with:

```typescript
const handleOpenModal = async () => {
  if (local.disabled) return;

  const result = await dialog.show<DataSelectModalResult<TKey>>(
    () => {
      const instance = useDialogInstance<DataSelectModalResult<TKey>>();
      return (
        <local.modal.component
          {...(local.modal.props ?? {})}
          selectMode={local.multiple ? "multiple" : "single"}
          selectedKeys={normalizeKeys(getValue()) as (string | number)[]}
          onSelect={(r: { keys: (string | number)[] }) =>
            instance?.close({ selectedKeys: r.keys as TKey[] })
          }
        />
      );
    },
    local.modal.option ?? {},
  );

  if (result) {
    const newKeys = result.selectedKeys;
    if (local.multiple) {
      setValue(newKeys);
    } else {
      setValue(newKeys.length > 0 ? newKeys[0] : undefined);
    }
  }
};
```

**Step 5: Run tests to verify they PASS**

Run: `pnpm vitest packages/solid/tests/components/features/data-select-button/DataSelectButton.spec.tsx --project=solid --run`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/solid/src/components/features/data-select-button/DataSelectButton.tsx packages/solid/tests/components/features/data-select-button/DataSelectButton.spec.tsx
git commit -m "refactor(solid): redesign DataSelectButton modal API to ModalConfig object pattern"
```

---

### Task 4: Update SharedDataSelectButton

**Files:**
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelectButton.tsx`

**Step 1: Update imports**

```typescript
import {
  DataSelectButton,
  type DataSelectButtonProps,
  type ModalConfig,
} from "../data-select-button/DataSelectButton";
```

**Step 2: Update props interface**

```typescript
// Before
  modal: () => JSX.Element;

// After
  modal: ModalConfig;
```

**Step 3: Run typecheck**

Run: `pnpm typecheck packages/solid/src/components/features/shared-data/SharedDataSelectButton.tsx`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/features/shared-data/SharedDataSelectButton.tsx
git commit -m "refactor(solid): update SharedDataSelectButton modal prop to ModalConfig"
```

---

### Task 5: Write SharedDataSelect tests

**Files:**
- Create: `packages/solid/tests/components/features/shared-data/SharedDataSelect.spec.tsx`

**Step 1: Write test file**

```tsx
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { createSignal, type Accessor } from "solid-js";
import {
  SharedDataSelect,
  type InjectedSelectProps,
} from "@simplysm/solid";
import { type SharedDataAccessor } from "../../../../src/providers/shared-data/SharedDataContext";
import { DialogProvider } from "../../../../src/components/disclosure/DialogProvider";
import { I18nProvider } from "../../../../src/providers/i18n/I18nContext";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

interface TestItem {
  id: number;
  name: string;
}

const testItems: TestItem[] = [
  { id: 1, name: "Apple" },
  { id: 2, name: "Banana" },
  { id: 3, name: "Cherry" },
];

function createMockAccessor(itemsSignal: Accessor<TestItem[]>): SharedDataAccessor<TestItem> {
  return {
    items: itemsSignal,
    get: (key) => itemsSignal().find((item) => item.id === key),
    emit: vi.fn(async () => {}),
    getKey: (item) => item.id,
    getSearchText: (item) => item.name,
  };
}

function TestModalComponent(props: { confirmKeys: number[] } & InjectedSelectProps) {
  return (
    <div data-testid="modal-content">
      <div data-testid="select-mode">{props.selectMode}</div>
      <div data-testid="selected-keys">{JSON.stringify([...props.selectedKeys])}</div>
      <button
        data-testid="modal-confirm"
        onClick={() => props.onSelect({ keys: props.confirmKeys })}
      >
        confirm
      </button>
    </div>
  );
}

function renderWithDialog(ui: () => import("solid-js").JSX.Element) {
  return render(() => (
    <ConfigProvider clientName="test"><I18nProvider>
      <DialogProvider>{ui()}</DialogProvider>
    </I18nProvider></ConfigProvider>
  ));
}

describe("SharedDataSelect", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  afterEach(() => {
    cleanup();
  });

  it("renders items via ItemTemplate", () => {
    const [items] = createSignal(testItems);
    const accessor = createMockAccessor(items);

    const { getByText } = renderWithDialog(() => (
      <SharedDataSelect data={accessor} value={1} onValueChange={() => {}}>
        <SharedDataSelect.ItemTemplate>
          {(item: TestItem) => <span>{item.name}</span>}
        </SharedDataSelect.ItemTemplate>
      </SharedDataSelect>
    ));

    // Select should render with items from accessor
    expect(getByText("Apple")).toBeTruthy();
  });

  it("renders custom Action button", () => {
    const [items] = createSignal(testItems);
    const accessor = createMockAccessor(items);
    const onClick = vi.fn();

    const { container } = renderWithDialog(() => (
      <SharedDataSelect data={accessor} value={1} onValueChange={() => {}}>
        <SharedDataSelect.ItemTemplate>
          {(item: TestItem) => <span>{item.name}</span>}
        </SharedDataSelect.ItemTemplate>
        <SharedDataSelect.Action onClick={onClick}>
          <span data-testid="custom-action">Edit</span>
        </SharedDataSelect.Action>
      </SharedDataSelect>
    ));

    const actionBtn = container.querySelector("[data-testid='custom-action']");
    expect(actionBtn).not.toBeNull();
  });

  it("opens modal and applies selection result", async () => {
    const [items] = createSignal(testItems);
    const accessor = createMockAccessor(items);
    const onValueChange = vi.fn();

    const { container } = renderWithDialog(() => (
      <SharedDataSelect
        data={accessor}
        value={1}
        onValueChange={onValueChange}
        modal={{
          component: TestModalComponent,
          props: { confirmKeys: [2] },
          option: { header: "Select Item" },
        }}
      >
        <SharedDataSelect.ItemTemplate>
          {(item: TestItem) => <span>{item.name}</span>}
        </SharedDataSelect.ItemTemplate>
      </SharedDataSelect>
    ));

    // Click search action button to open modal
    const searchBtn = container.querySelector("[data-select-action]") as HTMLButtonElement;
    expect(searchBtn).not.toBeNull();
    searchBtn.click();

    // Confirm in modal
    await vi.waitFor(() => {
      const confirmBtn = document.querySelector("[data-testid='modal-confirm']") as HTMLButtonElement;
      expect(confirmBtn).not.toBeNull();
      confirmBtn.click();
    });

    await vi.waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith(2);
    });
  });

  it("passes selectedKeys to modal component", async () => {
    const [items] = createSignal(testItems);
    const accessor = createMockAccessor(items);

    const { container } = renderWithDialog(() => (
      <SharedDataSelect
        data={accessor}
        value={3}
        onValueChange={() => {}}
        modal={{
          component: TestModalComponent,
          props: { confirmKeys: [] },
        }}
      >
        <SharedDataSelect.ItemTemplate>
          {(item: TestItem) => <span>{item.name}</span>}
        </SharedDataSelect.ItemTemplate>
      </SharedDataSelect>
    ));

    const searchBtn = container.querySelector("[data-select-action]") as HTMLButtonElement;
    searchBtn.click();

    await vi.waitFor(() => {
      const selectedKeys = document.querySelector("[data-testid='selected-keys']");
      expect(selectedKeys?.textContent).toBe("[3]");

      const selectMode = document.querySelector("[data-testid='select-mode']");
      expect(selectMode?.textContent).toBe("single");
    });
  });
});
```

**Step 2: Run tests to verify they FAIL**

Run: `pnpm vitest packages/solid/tests/components/features/shared-data/SharedDataSelect.spec.tsx --project=solid --run`
Expected: FAIL (SharedDataSelect doesn't have compound children yet)

---

### Task 6: Update SharedDataSelect implementation

**Files:**
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelect.tsx`

**Step 1: Rewrite the component**

Replace the entire file content:

```tsx
import {
  children as resolveChildren,
  createContext,
  createMemo,
  type JSX,
  mergeProps,
  type ParentComponent,
  splitProps,
  useContext,
} from "solid-js";
import { IconSearch } from "@tabler/icons-solidjs";
import { type SharedDataAccessor } from "../../../providers/shared-data/SharedDataContext";
import { Select, type SelectProps } from "../../form-control/select/Select";
import { Icon } from "../../display/Icon";
import { useDialog } from "../../disclosure/DialogContext";
import { useDialogInstance } from "../../disclosure/DialogInstanceContext";
import { useI18n } from "../../../providers/i18n/I18nContext";
import { type ComponentSize } from "../../../styles/tokens.styles";
import {
  type DataSelectModalResult,
  type ModalConfig,
} from "../data-select-button/DataSelectButton";

// -- Slot detection --
const ITEM_TEMPLATE_BRAND = Symbol("SharedDataSelect.ItemTemplate");
const ACTION_BRAND = Symbol("SharedDataSelect.Action");

interface ItemTemplateDef {
  __brand: typeof ITEM_TEMPLATE_BRAND;
  children: (item: any, index: number, depth: number) => JSX.Element;
}

interface ActionDef {
  __brand: typeof ACTION_BRAND;
  children: JSX.Element;
  onClick?: (e: MouseEvent) => void;
}

function isItemTemplateDef(v: unknown): v is ItemTemplateDef {
  return v != null && typeof v === "object" && "__brand" in v && (v as any).__brand === ITEM_TEMPLATE_BRAND;
}

function isActionDef(v: unknown): v is ActionDef {
  return v != null && typeof v === "object" && "__brand" in v && (v as any).__brand === ACTION_BRAND;
}

// -- Compound components --
const ItemTemplate: ParentComponent<{
  children: (item: any, index: number, depth: number) => JSX.Element;
}> = (props) => {
  return (() => ({
    __brand: ITEM_TEMPLATE_BRAND,
    children: props.children,
  })) as unknown as JSX.Element;
};

const Action: ParentComponent<{
  onClick?: (e: MouseEvent) => void;
}> = (props) => {
  return (() => ({
    __brand: ACTION_BRAND,
    children: props.children,
    onClick: props.onClick,
  })) as unknown as JSX.Element;
};

/** SharedDataSelect Props */
export interface SharedDataSelectProps<TItem> {
  /** Shared data accessor */
  data: SharedDataAccessor<TItem>;

  /** Currently selected value */
  value?: unknown;
  /** Value change callback */
  onValueChange?: (value: unknown) => void;
  /** Multiple selection mode */
  multiple?: boolean;
  /** Required input */
  required?: boolean;
  /** Disabled */
  disabled?: boolean;
  /** Trigger size */
  size?: ComponentSize;
  /** Borderless style */
  inset?: boolean;

  /** Item filter function */
  filterFn?: (item: TItem, index: number) => boolean;
  /** Selection modal configuration */
  modal?: ModalConfig;

  /** Compound children: ItemTemplate, Action */
  children: JSX.Element;
}

interface SharedDataSelectComponent {
  <TItem>(props: SharedDataSelectProps<TItem>): JSX.Element;
  ItemTemplate: typeof ItemTemplate;
  Action: typeof Action;
}

const SharedDataSelectBase = <TItem,>(props: SharedDataSelectProps<TItem>): JSX.Element => {
  const [local, rest] = splitProps(props, [
    "data", "filterFn", "modal", "children",
  ]);

  const i18n = useI18n();
  const dialog = useDialog();

  // Resolve compound children
  const resolved = resolveChildren(() => local.children);
  const defs = createMemo(() => {
    const arr = resolved.toArray();
    return {
      itemTemplate: arr.find(isItemTemplateDef) as ItemTemplateDef | undefined,
      actions: arr.filter(isActionDef) as ActionDef[],
    };
  });

  // Items with filterFn applied
  const items = createMemo(() => {
    const allItems = local.data.items();
    if (!local.filterFn) return allItems;
    return allItems.filter(local.filterFn);
  });

  // Normalize value to keys array
  const normalizeKeys = (value: unknown): (string | number)[] => {
    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) return value;
    return [value as string | number];
  };

  // Open modal and handle selection result
  const handleOpenModal = async () => {
    if (!local.modal) return;

    const modalConfig = local.modal;
    const result = await dialog.show<DataSelectModalResult<string | number>>(
      () => {
        const instance = useDialogInstance<DataSelectModalResult<string | number>>();
        return (
          <modalConfig.component
            {...(modalConfig.props ?? {})}
            selectMode={rest.multiple ? "multiple" : "single"}
            selectedKeys={normalizeKeys(rest.value)}
            onSelect={(r: { keys: (string | number)[] }) =>
              instance?.close({ selectedKeys: r.keys })
            }
          />
        );
      },
      modalConfig.option ?? {},
    );

    if (result) {
      const newKeys = result.selectedKeys;
      if (rest.multiple) {
        rest.onValueChange?.(newKeys);
      } else {
        rest.onValueChange?.(newKeys.length > 0 ? newKeys[0] : undefined);
      }
    }
  };

  const selectProps = mergeProps(rest, {
    get items() {
      return items();
    },
    get getChildren() {
      if (!local.data.getParentKey) return undefined;
      // eslint-disable-next-line solid/reactivity -- return function is called within Select's internal JSX tracked scope
      return (item: TItem) => {
        const key = local.data.getKey(item);
        return items().filter((child) => local.data.getParentKey!(child) === key);
      };
    },
    get getSearchText() {
      return local.data.getSearchText;
    },
    get getIsHidden() {
      return local.data.getIsHidden;
    },
  }) as unknown as SelectProps;

  return (
    <Select {...selectProps}>
      {defs().itemTemplate && (
        <Select.ItemTemplate>{defs().itemTemplate!.children}</Select.ItemTemplate>
      )}
      {local.modal && (
        <Select.Action onClick={() => void handleOpenModal()} aria-label={i18n.t("sharedDataSelect.search")}>
          <Icon icon={IconSearch} />
        </Select.Action>
      )}
      {defs().actions.map((action) => (
        <Select.Action onClick={action.onClick}>
          {action.children}
        </Select.Action>
      ))}
    </Select>
  );
};

export const SharedDataSelect: SharedDataSelectComponent = SharedDataSelectBase as any;
SharedDataSelect.ItemTemplate = ItemTemplate;
SharedDataSelect.Action = Action;
```

**Step 2: Run SharedDataSelect tests**

Run: `pnpm vitest packages/solid/tests/components/features/shared-data/SharedDataSelect.spec.tsx --project=solid --run`
Expected: PASS

**Step 3: Run DataSelectButton tests too (regression check)**

Run: `pnpm vitest packages/solid/tests/components/features/data-select-button/DataSelectButton.spec.tsx --project=solid --run`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/features/shared-data/SharedDataSelect.tsx packages/solid/tests/components/features/shared-data/SharedDataSelect.spec.tsx
git commit -m "refactor(solid): redesign SharedDataSelect to compound children + ModalConfig pattern"
```

---

### Task 7: Verify exports and typecheck

**Files:**
- Check: `packages/solid/src/index.ts`

**Step 1: Verify InjectedSelectProps and ModalConfig are exported**

Check that `packages/solid/src/index.ts` has:

```typescript
export * from "./components/features/data-select-button/DataSelectButton";
```

This already exists and will pick up the new `InjectedSelectProps` and `ModalConfig` exports.

**Step 2: Run full typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: Run full lint**

Run: `pnpm lint packages/solid --fix`
Expected: PASS (or fix any issues)

**Step 4: Run all solid tests**

Run: `pnpm vitest --project=solid --run`
Expected: PASS

**Step 5: Commit if any lint fixes**

```bash
git add -A
git commit -m "chore(solid): fix lint issues from select modal API redesign"
```
