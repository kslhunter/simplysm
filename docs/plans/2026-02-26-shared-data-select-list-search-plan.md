# SharedDataSelectList 검색 기능 추가 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** SharedDataSelectList에 누락된 검색 기능을 추가하고, compound component 패턴(ItemTemplate, Filter)으로 전환한다.

**Architecture:** Context + slot signal 패턴으로 ItemTemplate과 Filter sub-component를 구현한다. 내장 검색은 getSearchText 기반 공백 분리 + 대소문자 무시 매칭이며, Filter compound가 있으면 내장 검색을 비활성화한다.

**Tech Stack:** SolidJS, Vitest, createSlotSignal, createSlotComponent, TextInput, i18n

**Design document:** `docs/plans/2026-02-26-shared-data-select-list-search-design.md`

**Worktree:** `D:\workspaces-13\simplysm-shared-data-select-list-search` (branch: `shared-data-select-list-search`)

---

### Task 1: Context 파일 생성

**Files:**
- Create: `packages/solid/src/components/features/shared-data/SharedDataSelectListContext.ts`

**Step 1: Create Context file**

```typescript
import { createContext, useContext, type Context, type JSX, type ParentComponent, onCleanup, createSignal } from "solid-js";
import { createSlotComponent } from "../../../helpers/createSlotComponent";
import type { SlotAccessor } from "../../../hooks/createSlotSignal";
import { createSlotSignal } from "../../../hooks/createSlotSignal";

// ─── Context ──────────────────────────────────────────────

export interface SharedDataSelectListContextValue {
  setItemTemplate: (fn: ((item: unknown, index: number) => JSX.Element) | undefined) => void;
  setFilter: (content: SlotAccessor) => void;
}

export const SharedDataSelectListContext = createContext<SharedDataSelectListContextValue>();

export function useSharedDataSelectListContext(): SharedDataSelectListContextValue {
  const context = useContext(SharedDataSelectListContext);
  if (!context) {
    throw new Error("useSharedDataSelectListContext can only be used inside SharedDataSelectList");
  }
  return context;
}

// ─── Sub-components ───────────────────────────────────────

/** ItemTemplate sub-component — registers item render function */
export const SharedDataSelectListItemTemplate = <TItem,>(props: {
  children: (item: TItem, index: number) => JSX.Element;
}) => {
  const ctx = useSharedDataSelectListContext();
  ctx.setItemTemplate(props.children as (item: unknown, index: number) => JSX.Element);
  onCleanup(() => ctx.setItemTemplate(undefined));
  return null;
};

/** Filter sub-component — registers custom filter UI slot */
export const SharedDataSelectListFilter: ParentComponent = createSlotComponent(
  SharedDataSelectListContext as Context<SharedDataSelectListContextValue | undefined>,
  (ctx) => ctx.setFilter,
);
```

**Step 2: Commit**

```bash
git add packages/solid/src/components/features/shared-data/SharedDataSelectListContext.ts
git commit -m "feat(solid): add SharedDataSelectList context and sub-components"
```

---

### Task 2: i18n 키 추가

**Files:**
- Modify: `packages/solid/src/providers/i18n/locales/en.ts:114` (after `sharedDataSelect` block)
- Modify: `packages/solid/src/providers/i18n/locales/ko.ts:114` (after `sharedDataSelect` block)

**Step 1: Add i18n keys**

In `en.ts`, after the `sharedDataSelect` block (line 114), add:

```typescript
  sharedDataSelectList: {
    searchPlaceholder: "Search...",
  },
```

In `ko.ts`, after the `sharedDataSelect` block (line 114), add:

```typescript
  sharedDataSelectList: {
    searchPlaceholder: "검색...",
  },
```

**Step 2: Commit**

```bash
git add packages/solid/src/providers/i18n/locales/en.ts packages/solid/src/providers/i18n/locales/ko.ts
git commit -m "feat(solid): add sharedDataSelectList i18n keys"
```

---

### Task 3: SharedDataSelectList 컴포넌트 수정

**Files:**
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelectList.tsx`
- Modify: `packages/solid/src/index.ts:183`

**Step 1: Rewrite SharedDataSelectList**

Replace the full content of `SharedDataSelectList.tsx`:

```tsx
import { createEffect, createMemo, createSignal, For, type JSX, Show, splitProps } from "solid-js";
import { IconExternalLink } from "@tabler/icons-solidjs";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { type SharedDataAccessor } from "../../../providers/shared-data/SharedDataContext";
import { List } from "../../data/list/List";
import { Pagination } from "../../data/Pagination";
import { Button } from "../../form-control/Button";
import { Icon } from "../../display/Icon";
import { TextInput } from "../../form-control/field/TextInput";
import { useDialog } from "../../disclosure/DialogContext";
import { useI18nOptional } from "../../../providers/i18n/I18nContext";
import { textMuted } from "../../../styles/tokens.styles";
import { createSlotSignal } from "../../../hooks/createSlotSignal";
import {
  SharedDataSelectListContext,
  type SharedDataSelectListContextValue,
  SharedDataSelectListItemTemplate,
  SharedDataSelectListFilter,
} from "./SharedDataSelectListContext";

/** SharedDataSelectList Props */
export interface SharedDataSelectListProps<TItem> {
  /** Shared data accessor */
  data: SharedDataAccessor<TItem>;

  /** Currently selected value */
  value?: TItem;
  /** Value change callback */
  onValueChange?: (value: TItem | undefined) => void;
  /** Required input */
  required?: boolean;
  /** Disabled */
  disabled?: boolean;

  /** Item filter function */
  filterFn?: (item: TItem, index: number) => boolean;
  /** Value change guard (blocks change if returns false) */
  canChange?: (item: TItem | undefined) => boolean | Promise<boolean>;
  /** Page size (shows Pagination if provided) */
  pageSize?: number;
  /** Header text */
  header?: string;
  /** Management modal component factory */
  modal?: () => JSX.Element;

  /** Compound sub-components (ItemTemplate, Filter) */
  children?: JSX.Element;

  /** Custom class */
  class?: string;
  /** Custom style */
  style?: JSX.CSSProperties;
}

// ─── Styles ──────────────────────────────────────────────

const containerClass = clsx("flex-col gap-1");

const headerClass = clsx("flex items-center gap-1 px-2 py-1 text-sm font-semibold");

// ─── Component ───────────────────────────────────────────

export interface SharedDataSelectListComponent {
  <TItem>(props: SharedDataSelectListProps<TItem>): JSX.Element;
  ItemTemplate: typeof SharedDataSelectListItemTemplate;
  Filter: typeof SharedDataSelectListFilter;
}

export const SharedDataSelectList: SharedDataSelectListComponent = (<TItem,>(
  props: SharedDataSelectListProps<TItem>,
): JSX.Element => {
  const [local, rest] = splitProps(props, [
    "data",
    "children",
    "class",
    "style",
    "value",
    "onValueChange",
    "required",
    "disabled",
    "filterFn",
    "canChange",
    "pageSize",
    "header",
    "modal",
  ]);

  const dialog = useDialog();
  const i18n = useI18nOptional();

  // ─── Slot signals ──────────────────────────────────────

  const [filter, setFilter] = createSlotSignal();
  const [itemTemplate, _setItemTemplate] = createSignal<
    ((item: TItem, index: number) => JSX.Element) | undefined
  >();
  const setItemTemplate = (fn: ((item: unknown, index: number) => JSX.Element) | undefined) =>
    _setItemTemplate(() => fn as ((item: TItem, index: number) => JSX.Element) | undefined);

  const contextValue: SharedDataSelectListContextValue = {
    setItemTemplate,
    setFilter,
  };

  // ─── Search state ──────────────────────────────────────

  const [searchText, setSearchText] = createSignal("");

  // ─── Pagination state ─────────────────────────────────

  const [page, setPage] = createSignal(1);

  // ─── Filtering pipeline ─────────────────────────────────

  const filteredItems = createMemo(() => {
    let result = local.data.items();

    // getIsHidden filter
    const isHidden = local.data.getIsHidden;
    if (isHidden) {
      result = result.filter((item) => !isHidden(item));
    }

    // Search filter (only when Filter compound is absent and getSearchText exists)
    const getSearchText = local.data.getSearchText;
    if (!filter() && getSearchText && searchText()) {
      const terms = searchText().trim().split(" ").filter(Boolean);
      if (terms.length > 0) {
        result = result.filter((item) => {
          const text = getSearchText(item).toLowerCase();
          return terms.every((t) => text.includes(t.toLowerCase()));
        });
      }
    }

    // filterFn
    if (local.filterFn) {
      const fn = local.filterFn;
      result = result.filter((item, index) => fn(item, index));
    }

    return result;
  });

  // ─── Page calculation ───────────────────────────────────────

  const totalPageCount = createMemo(() => {
    if (local.pageSize == null) return 1;
    return Math.max(1, Math.ceil(filteredItems().length / local.pageSize));
  });

  // Reset page when filter changes
  createEffect(() => {
    void filteredItems();
    setPage(1);
  });

  // Page slice
  const displayItems = createMemo(() => {
    const items = filteredItems();
    if (local.pageSize == null) return items;

    const start = (page() - 1) * local.pageSize;
    const end = start + local.pageSize;
    return items.slice(start, end);
  });

  // ─── Select/toggle handler ─────────────────────────────

  const handleSelect = async (item: TItem | undefined) => {
    if (local.disabled) return;

    // canChange guard
    if (local.canChange) {
      const allowed = await local.canChange(item);
      if (!allowed) return;
    }

    // Toggle: click already selected value to deselect (only if not required)
    if (item !== undefined && item === local.value && !local.required) {
      local.onValueChange?.(undefined);
    } else {
      local.onValueChange?.(item);
    }
  };

  // ─── Open modal ────────────────────────────────────────

  const handleOpenModal = async () => {
    if (!local.modal) return;
    await dialog.show(local.modal, {});
  };

  // ─── Render ────────────────────────────────────────────

  return (
    <SharedDataSelectListContext.Provider value={contextValue}>
      {/* Render children to register slots */}
      <span class="hidden">{local.children}</span>

      <div
        {...rest}
        data-shared-data-select-list
        class={twMerge(containerClass, local.class)}
        style={local.style}
      >
        {/* Header */}
        <Show when={local.header != null || local.modal != null}>
          <div class={headerClass}>
            <Show when={local.header != null}>{local.header}</Show>
            <Show when={local.modal != null}>
              <Button size="sm" onClick={() => void handleOpenModal()}>
                <Icon icon={IconExternalLink} />
              </Button>
            </Show>
          </div>
        </Show>

        {/* Search input: when Filter compound is absent and getSearchText exists */}
        <Show when={!filter() && local.data.getSearchText}>
          <TextInput
            value={searchText()}
            onValueChange={setSearchText}
            placeholder={i18n?.t("sharedDataSelectList.searchPlaceholder") ?? "Search..."}
            size="sm"
            inset
          />
        </Show>

        {/* Custom Filter */}
        <Show when={filter()}>{filter()!()}</Show>

        {/* Pagination */}
        <Show when={local.pageSize != null && totalPageCount() > 1}>
          <Pagination
            page={page()}
            onPageChange={setPage}
            totalPageCount={totalPageCount()}
            size="sm"
          />
        </Show>

        {/* List */}
        <List inset>
          {/* Unspecified item (when not required) */}
          <Show when={!local.required}>
            <List.Item
              selected={local.value === undefined}
              disabled={local.disabled}
              onClick={() => handleSelect(undefined)}
            >
              <span class={textMuted}>Unspecified</span>
            </List.Item>
          </Show>

          {/* Item list */}
          <For each={displayItems()}>
            {(item, index) => (
              <List.Item
                selected={item === local.value}
                disabled={local.disabled}
                onClick={() => handleSelect(item)}
              >
                {itemTemplate()?.(item, index())}
              </List.Item>
            )}
          </For>
        </List>
      </div>
    </SharedDataSelectListContext.Provider>
  );
}) as SharedDataSelectListComponent;

SharedDataSelectList.ItemTemplate = SharedDataSelectListItemTemplate;
SharedDataSelectList.Filter = SharedDataSelectListFilter;
```

**Step 2: Update index.ts export**

At `packages/solid/src/index.ts:183`, the existing export `export * from "./components/features/shared-data/SharedDataSelectList"` stays as-is. Add after it:

```typescript
export * from "./components/features/shared-data/SharedDataSelectListContext";
```

**Step 3: Commit**

```bash
git add packages/solid/src/components/features/shared-data/SharedDataSelectList.tsx packages/solid/src/index.ts
git commit -m "feat(solid): add search and compound pattern to SharedDataSelectList"
```

---

### Task 4: 기존 테스트를 ItemTemplate 패턴으로 업데이트

**Files:**
- Modify: `packages/solid/tests/components/features/shared-data/SharedDataSelectList.spec.tsx`

**Step 1: Update existing tests**

All existing tests use `children` render function pattern:
```tsx
<SharedDataSelectList data={accessor}>{(item) => <>{item}</>}</SharedDataSelectList>
```

These must be converted to ItemTemplate pattern:
```tsx
<SharedDataSelectList data={accessor}>
  <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
</SharedDataSelectList>
```

Also update `createMockAccessor` to include optional `getSearchText`:

```typescript
function createMockAccessor<T>(
  items: T[],
  options?: {
    getIsHidden?: (item: T) => boolean;
    getSearchText?: (item: T) => string;
  },
) {
  const [itemsSignal] = createSignal(items);
  return {
    items: itemsSignal,
    get: (key: string | number | undefined) => items.find((_, i) => i === Number(key)),
    emit: vi.fn(),
    getKey: (item: T) => items.indexOf(item),
    getIsHidden: options?.getIsHidden,
    getSearchText: options?.getSearchText,
  };
}
```

Every test must be updated. Apply the `{(item) => ...}` → `<SharedDataSelectList.ItemTemplate>{(item) => ...}</SharedDataSelectList.ItemTemplate>` pattern consistently across all tests. For `{(item, index) => ...}` same pattern.

**Step 2: Run tests to verify existing tests still pass**

Run: `pnpm vitest packages/solid/tests/components/features/shared-data/SharedDataSelectList.spec.tsx --run`
Expected: All existing tests PASS

**Step 3: Commit**

```bash
git add packages/solid/tests/components/features/shared-data/SharedDataSelectList.spec.tsx
git commit -m "test(solid): update SharedDataSelectList tests to ItemTemplate pattern"
```

---

### Task 5: 검색 기능 테스트 추가

**Files:**
- Modify: `packages/solid/tests/components/features/shared-data/SharedDataSelectList.spec.tsx`

**Step 1: Write search tests**

Add a new `describe("search", ...)` block after the existing `filtering` block:

```tsx
  // ─── Search ────────────────────────────────────────────

  describe("search", () => {
    it("search input is shown when getSearchText is provided", () => {
      const accessor = createMockAccessor(["Apple", "Banana"], {
        getSearchText: (item) => item,
      });

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} required>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      expect(document.querySelector("[data-shared-data-select-list] input")).toBeTruthy();
    });

    it("search input is hidden when getSearchText is not provided", () => {
      const accessor = createMockAccessor(["Apple", "Banana"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} required>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      expect(document.querySelector("[data-shared-data-select-list] input")).toBeNull();
    });

    it("typing in search input filters items by getSearchText", async () => {
      const accessor = createMockAccessor(["Apple", "Banana", "Cherry"], {
        getSearchText: (item) => item,
      });

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} required>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      const input = document.querySelector("[data-shared-data-select-list] input")!;
      fireEvent.input(input, { target: { value: "ban" } });

      await vi.waitFor(() => {
        expect(screen.getByText("Banana")).toBeTruthy();
        expect(screen.queryByText("Apple")).toBeNull();
        expect(screen.queryByText("Cherry")).toBeNull();
      });
    });

    it("search is case-insensitive", async () => {
      const accessor = createMockAccessor(["Apple", "Banana"], {
        getSearchText: (item) => item,
      });

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} required>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      const input = document.querySelector("[data-shared-data-select-list] input")!;
      fireEvent.input(input, { target: { value: "APPLE" } });

      await vi.waitFor(() => {
        expect(screen.getByText("Apple")).toBeTruthy();
        expect(screen.queryByText("Banana")).toBeNull();
      });
    });

    it("multiple space-separated terms must all match", async () => {
      const accessor = createMockAccessor(["Red Apple", "Green Apple", "Red Banana"], {
        getSearchText: (item) => item,
      });

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} required>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      const input = document.querySelector("[data-shared-data-select-list] input")!;
      fireEvent.input(input, { target: { value: "red apple" } });

      await vi.waitFor(() => {
        expect(screen.getByText("Red Apple")).toBeTruthy();
        expect(screen.queryByText("Green Apple")).toBeNull();
        expect(screen.queryByText("Red Banana")).toBeNull();
      });
    });
  });
```

**Step 2: Run tests**

Run: `pnpm vitest packages/solid/tests/components/features/shared-data/SharedDataSelectList.spec.tsx --run`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add packages/solid/tests/components/features/shared-data/SharedDataSelectList.spec.tsx
git commit -m "test(solid): add SharedDataSelectList search tests"
```

---

### Task 6: Filter compound 테스트 추가

**Files:**
- Modify: `packages/solid/tests/components/features/shared-data/SharedDataSelectList.spec.tsx`

**Step 1: Write Filter compound tests**

Add a new `describe("custom filter", ...)` block:

```tsx
  // ─── Custom Filter ─────────────────────────────────────

  describe("custom filter", () => {
    it("search input is hidden when Filter compound is provided", () => {
      const accessor = createMockAccessor(["Apple", "Banana"], {
        getSearchText: (item) => item,
      });

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} required>
          <SharedDataSelectList.Filter>
            <div data-custom-filter>Custom</div>
          </SharedDataSelectList.Filter>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      // Built-in search input should be hidden
      expect(document.querySelector("[data-shared-data-select-list] input")).toBeNull();
      // Custom filter should be visible
      expect(screen.getByText("Custom")).toBeTruthy();
    });

    it("filterFn works with custom Filter compound", () => {
      const accessor = createMockAccessor(["Apple", "Banana", "Cherry"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} filterFn={(item) => item !== "Banana"} required>
          <SharedDataSelectList.Filter>
            <div>My Filter</div>
          </SharedDataSelectList.Filter>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      expect(screen.getByText("Apple")).toBeTruthy();
      expect(screen.queryByText("Banana")).toBeNull();
      expect(screen.getByText("Cherry")).toBeTruthy();
    });
  });
```

**Step 2: Run tests**

Run: `pnpm vitest packages/solid/tests/components/features/shared-data/SharedDataSelectList.spec.tsx --run`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add packages/solid/tests/components/features/shared-data/SharedDataSelectList.spec.tsx
git commit -m "test(solid): add SharedDataSelectList custom filter tests"
```
