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
  const setItemTemplate = (fn: ((...args: unknown[]) => JSX.Element) | undefined) =>
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
