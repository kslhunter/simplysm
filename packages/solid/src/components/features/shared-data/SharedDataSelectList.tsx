import { createContext, createEffect, createMemo, createSignal, For, onCleanup, type JSX, Show, splitProps, useContext, type ParentComponent } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { type SharedDataAccessor } from "../../../providers/shared-data/SharedDataProvider";
import { List } from "../../data/list/List";
import { Pagination } from "../../data/Pagination";
import { TextInput } from "../../form-control/field/TextInput";
import { useI18n } from "../../../providers/i18n/I18nContext";
import { text } from "../../../styles/base.styles";
import { gap } from "../../../styles/control.styles";
import { createSlotSignal, type SlotAccessor } from "../../../hooks/createSlotSignal";
import { createSlotComponent } from "../../../helpers/createSlotComponent";

// ─── Context ──────────────────────────────────────────────

export interface SharedDataSelectListContextValue {
  setItemTemplate: (fn: ((...args: unknown[]) => JSX.Element) | undefined) => void;
  setFilter: (content: SlotAccessor) => void;
}

const SharedDataSelectListContext = createContext<SharedDataSelectListContextValue>();

function useSharedDataSelectListContext(): SharedDataSelectListContextValue {
  const context = useContext(SharedDataSelectListContext);
  if (!context) {
    throw new Error("useSharedDataSelectListContext can only be used inside SharedDataSelectList");
  }
  return context;
}

// ─── Sub-components ───────────────────────────────────────

/** ItemTemplate sub-component — registers item render function */
const SharedDataSelectListItemTemplate = <TItem,>(props: {
  children: (item: TItem, index: number) => JSX.Element;
}) => {
  const ctx = useSharedDataSelectListContext();
  ctx.setItemTemplate(props.children as (...args: unknown[]) => JSX.Element);
  onCleanup(() => ctx.setItemTemplate(undefined));
  return null;
};

/** Filter sub-component — registers custom filter UI slot */
const SharedDataSelectListFilter: ParentComponent = createSlotComponent(
  SharedDataSelectListContext,
  (ctx) => ctx.setFilter,
);

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
  /** Header content */
  header?: JSX.Element;

  /** Compound sub-components (ItemTemplate, Filter) */
  children?: JSX.Element;

  /** Custom class */
  class?: string;
  /** Custom style */
  style?: JSX.CSSProperties;
}

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
  ]);

  const i18n = useI18n();

  // ─── Slot signals ──────────────────────────────────────

  const [filter, setFilter] = createSlotSignal();
  const [itemTemplate, _setItemTemplate] = createSignal<
    ((item: TItem, index: number) => JSX.Element) | undefined
  >();
  const setItemTemplate = (fn: ((...args: unknown[]) => JSX.Element) | undefined) =>
    _setItemTemplate(() => fn as ((item: TItem, index: number) => JSX.Element) | undefined);

  const contextValue: SharedDataSelectListContextValue = {
    setItemTemplate,
    setFilter,
  };

  // ─── Search state ──────────────────────────────────────

  const [searchText, setSearchText] = createSignal("");

  // Reset search text when filter slot changes
  createEffect(() => {
    if (filter()) {
      setSearchText("");
    }
  });

  // ─── Pagination state ─────────────────────────────────

  const [page, setPage] = createSignal(1);

  // ─── Filtering pipeline ─────────────────────────────────

  const filteredItems = createMemo(() => {
    let result = local.data.items();

    // getIsHidden filter
    const isHidden = local.data.getIsHidden;
    if (isHidden) {
      result = result.filter((item: TItem) => !isHidden(item));
    }

    // Search filter (only when Filter compound is absent and getSearchText exists)
    const getSearchText = local.data.getSearchText;
    if (!filter() && getSearchText && searchText()) {
      const terms = searchText().trim().split(" ").filter(Boolean);
      if (terms.length > 0) {
        result = result.filter((item: TItem) => {
          const itemText = getSearchText(item).toLowerCase();
          return terms.every((t) => itemText.includes(t.toLowerCase()));
        });
      }
    }

    // filterFn
    if (local.filterFn) {
      const fn = local.filterFn;
      result = result.filter((item: TItem, index: number) => fn(item, index));
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

  // ─── Render ────────────────────────────────────────────

  return (
    <SharedDataSelectListContext.Provider value={contextValue}>
      {/* Render children inside Provider so sub-components (ItemTemplate, Filter) can access context */}
      {local.children}
      <div
        {...rest}
        data-shared-data-select-list
        class={twMerge(clsx("flex-col", gap.default), local.class)}
        style={local.style}
      >
        {/* Header */}
        <Show when={local.header != null}>{local.header}</Show>

        {/* Search input: when Filter compound is absent and getSearchText exists */}
        <Show when={!filter() && local.data.getSearchText}>
          <div class={"p-1"}>
            <TextInput
              value={searchText()}
              onValueChange={setSearchText}
              placeholder={i18n.t("sharedDataSelectList.searchPlaceholder")}
              class={"w-full"}
            />
          </div>
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
              <span class={text.muted}>{i18n.t("sharedDataSelectList.unspecified")}</span>
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
