import {
  children,
  createEffect,
  createMemo,
  createSignal,
  For,
  type JSX,
  type ParentComponent,
  onCleanup,
  Show,
  splitProps,
} from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconChevronDown } from "@tabler/icons-solidjs";
import { Icon } from "../../display/Icon";
import { Dropdown } from "../../disclosure/Dropdown";
import { List } from "../../data/list/List";
import { SelectContext, type SelectContextValue } from "./SelectContext";
import { useSelectContext } from "./SelectContext";
import { SelectItem } from "./SelectItem";
import { ripple } from "../../../directives/ripple";
import {
  borderDefault,
  borderSubtle,
  type ComponentSize,
  textMuted,
} from "../../../styles/tokens.styles";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { createSlotSignal } from "../../../hooks/createSlotSignal";
import { chevronWrapperClass, getTriggerClass } from "../DropdownTrigger.styles";
import { Invalid } from "../Invalid";
import { TextInput } from "../field/TextInput";
import { useI18nOptional } from "../../../providers/i18n/I18nContext";

void ripple;

// Select-specific styles
const multiTagClass = clsx("rounded", "bg-base-200 px-1", "dark:bg-base-600");
const selectedValueClass = clsx("flex-1", "whitespace-nowrap");

// Search input styles (override TextInput wrapper)
const searchInputClass = clsx(
  "w-full",
  "rounded-none",
  "border-0 border-b",
  borderSubtle
);

// Select all/deselect all button area styles
const selectAllBarClass = clsx("flex gap-2", "border-b", borderSubtle, "px-2 py-1", "text-xs");

// Select all/deselect all button styles
const selectAllBtnClass = clsx(
  "text-primary-500",
  "hover:text-primary-600 dark:hover:text-primary-400",
  "cursor-pointer",
);

/**
 * Select right-side action sub-component
 */
interface SelectActionProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {}

const SelectAction: ParentComponent<SelectActionProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);
  const ctx = useSelectContext();

  ctx.setAction(() => (
    <button
      {...rest}
      type="button"
      data-select-action
      use:ripple
      class={twMerge(
        clsx(
          "border",
          borderDefault,
          "px-1.5",
          "font-bold text-primary-500",
          "hover:bg-base-100 dark:hover:bg-base-700",
          "group-focus-within:border-y-primary-400",
          "last:group-focus-within:border-r-primary-400",
          "dark:group-focus-within:border-y-primary-400",
          "dark:last:group-focus-within:border-r-primary-400",
          "focus:relative focus:z-10 focus:border-primary-400",
          "dark:focus:border-primary-400",
        ),
        local.class,
      )}
    >
      {local.children}
    </button>
  ));
  onCleanup(() => ctx.setAction(undefined));
  return null;
};

/**
 * Dropdown top custom area sub-component
 */
const SelectHeader: ParentComponent = (props) => {
  const ctx = useSelectContext();
  // eslint-disable-next-line solid/reactivity -- Save as slot accessor, called from JSX tracked scope
  ctx.setHeader(() => props.children);
  onCleanup(() => ctx.setHeader(undefined));
  return null;
};

const SelectItemTemplate = <TArgs extends unknown[]>(props: {
  children: (...args: TArgs) => JSX.Element;
}) => {
  const ctx = useSelectContext();
  // eslint-disable-next-line solid/reactivity -- Store render function in signal, called from JSX tracked scope
  ctx.setItemTemplate(props.children as (...args: unknown[]) => JSX.Element);
  onCleanup(() => ctx.setItemTemplate(undefined));
  return null;
};

// Props definition

// Common Props (except value, onValueChange, multiple)
interface SelectCommonProps<TValue = unknown> {
  /** Disabled state */
  disabled?: boolean;

  /** Required input */
  required?: boolean;

  /** Placeholder text when no value selected */
  placeholder?: string;

  /** Trigger size */
  size?: ComponentSize;

  /** Borderless style */
  inset?: boolean;

  /** Custom validation function */
  validate?: (value: unknown) => string | undefined;

  /** touchMode: Show error only after blur */
  touchMode?: boolean;

  /** Search text extraction function (shows search input when set) */
  getSearchText?: (item: TValue) => string;

  /** Function to determine if item is hidden */
  getIsHidden?: (item: TValue) => boolean;

  /** Custom class */
  class?: string;

  /** Custom style */
  style?: JSX.CSSProperties;
}

// Single select Props
interface SelectSingleBaseProps<TValue> extends SelectCommonProps<TValue> {
  /** Single select mode */
  multiple?: false;

  /** Currently selected value */
  value?: TValue;

  /** Value change callback */
  onValueChange?: (value: TValue) => void;

  /** Display direction for multiple select (not used in single select) */
  multiDisplayDirection?: never;

  /** Hide select all button (not used in single select) */
  hideSelectAll?: never;
}

// Multiple select Props
interface SelectMultipleBaseProps<TValue> extends SelectCommonProps<TValue> {
  /** Multiple select mode */
  multiple: true;

  /** Currently selected values */
  value?: TValue[];

  /** Value change callback */
  onValueChange?: (value: TValue[]) => void;

  /** Display direction for multiple select */
  multiDisplayDirection?: "horizontal" | "vertical";

  /** Hide select all button */
  hideSelectAll?: boolean;
}

// items mode
interface SelectWithItemsPropsBase<TValue> {
  items: TValue[];
  getChildren?: (item: TValue, index: number, depth: number) => TValue[] | undefined;
  renderValue?: (value: TValue) => JSX.Element;
  children?: JSX.Element;
}

// children mode
interface SelectWithChildrenPropsBase<TValue> {
  items?: never;
  getChildren?: never;
  renderValue: (value: TValue) => JSX.Element;
  children: JSX.Element;
}

export type SelectProps<TValue = unknown> =
  | (SelectSingleBaseProps<TValue> & SelectWithItemsPropsBase<TValue>)
  | (SelectSingleBaseProps<TValue> & SelectWithChildrenPropsBase<TValue>)
  | (SelectMultipleBaseProps<TValue> & SelectWithItemsPropsBase<TValue>)
  | (SelectMultipleBaseProps<TValue> & SelectWithChildrenPropsBase<TValue>);

interface SelectComponent {
  <TValue = unknown>(props: SelectProps<TValue>): JSX.Element;
  Item: typeof SelectItem;
  Action: typeof SelectAction;
  Header: typeof SelectHeader;
  ItemTemplate: typeof SelectItemTemplate;
}

/**
 * Select component
 *
 * @example
 * ```tsx
 * // children mode
 * <Select value={selected()} onValueChange={setSelected} renderValue={(v) => v.name}>
 *   <Select.Item value={item1}>{item1.name}</Select.Item>
 *   <Select.Item value={item2}>{item2.name}</Select.Item>
 * </Select>
 *
 * // items prop mode
 * <Select items={data} value={selected()} onValueChange={setSelected}>
 *   <Select.ItemTemplate>
 *     {(item) => <>{item.name}</>}
 *   </Select.ItemTemplate>
 * </Select>
 * ```
 */
export const Select: SelectComponent = <T,>(props: SelectProps<T>) => {
  const [local, rest] = splitProps(props as SelectProps<T> & { children?: JSX.Element }, [
    "children",
    "class",
    "style",
    "value",
    "onValueChange",
    "multiple",
    "disabled",
    "required",
    "placeholder",
    "size",
    "inset",
    "multiDisplayDirection",
    "hideSelectAll",
    "items",
    "getChildren",
    "renderValue",
    "validate",
    "touchMode",
    "getSearchText",
    "getIsHidden",
  ]);

  const i18n = useI18nOptional();
  const [open, setOpen] = createSignal(false);

  // Search text signal
  const [searchText, setSearchText] = createSignal("");

  // Reset searchText when open becomes false
  createEffect(() => {
    if (!open()) {
      setSearchText("");
    }
  });

  // Manage selected value (controlled/uncontrolled pattern)
  type ValueType = T | T[] | undefined;
  const [value, setValue] = createControllableSignal<ValueType>({
    value: () => local.value,
    onChange: () => local.onValueChange as ((v: ValueType) => void) | undefined,
  } as Parameters<typeof createControllableSignal<ValueType>>[0]);

  // Check if value is selected
  const isSelected = (itemValue: T): boolean => {
    const current = value();
    if (current === undefined) return false;

    if (local.multiple) {
      return Array.isArray(current) && current.includes(itemValue);
    }
    return current === itemValue;
  };

  // Toggle value
  const toggleValue = (itemValue: T) => {
    if (local.multiple) {
      const current = (value() as T[] | undefined) ?? [];
      const idx = current.indexOf(itemValue);
      if (idx >= 0) {
        setValue([...current.slice(0, idx), ...current.slice(idx + 1)] as T[]);
      } else {
        setValue([...current, itemValue] as T[]);
      }
    } else {
      setValue(itemValue);
    }
  };

  // Close dropdown
  const closeDropdown = () => {
    setOpen(false);
  };

  // Slot signals
  const [header, setHeader] = createSlotSignal();
  const [action, setAction] = createSlotSignal();
  const [itemTemplate, _setItemTemplate] = createSignal<
    ((...args: unknown[]) => JSX.Element) | undefined
  >();
  const setItemTemplate = (fn: ((...args: unknown[]) => JSX.Element) | undefined) =>
    _setItemTemplate(() => fn);

  // Context value
  const contextValue: SelectContextValue<T> = {
    multiple: () => local.multiple ?? false,
    isSelected,
    toggleValue,
    closeDropdown,
    setHeader,
    setAction,
    setItemTemplate,
  };

  // Trigger keyboard handling (only Enter/Space, ArrowUp/Down handled by Dropdown)
  const handleTriggerKeyDown = (e: KeyboardEvent) => {
    if (local.disabled) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  };

  // Validation error message
  const errorMsg = createMemo(() => {
    const v = value();
    if (local.required && (v === undefined || v === null || v === ""))
      return "This is a required field";
    return local.validate?.(v);
  });

  // Trigger class
  const getTriggerClassName = () =>
    getTriggerClass({
      size: local.size,
      disabled: local.disabled,
      inset: local.inset,
      class: local.class,
    });

  // Search filtering (supports hierarchical structure)
  const filteredItems = createMemo((): T[] | undefined => {
    if (!local.items) return undefined;
    if (!local.getSearchText || !searchText()) return local.items;

    const terms = searchText().trim().split(" ").filter(Boolean);
    if (terms.length === 0) return local.items;

    // Include parent when child matches in hierarchical structure
    const matchesSearch = (item: T): boolean => {
      const text = local.getSearchText!(item).toLowerCase();
      if (terms.every((t) => text.includes(t.toLowerCase()))) return true;

      // Show parent if any child matches
      if (local.getChildren) {
        const itemChildren = local.getChildren(item, 0, 0);
        if (itemChildren?.some((child) => matchesSearch(child))) return true;
      }

      return false;
    };

    return local.items.filter((item) => matchesSearch(item));
  });

  // Items with hidden filter applied
  const visibleItems = createMemo((): T[] | undefined => {
    const items = filteredItems();
    if (!items || !local.getIsHidden) return items;

    return items.filter((item) => {
      // Show hidden item if selected (with strikethrough)
      if (local.getIsHidden!(item)) {
        return isSelected(item);
      }
      return true;
    });
  });

  // Select all
  const handleSelectAll = () => {
    const items = visibleItems();
    if (!items) return;
    setValue(items);
  };

  // Deselect all
  const handleDeselectAll = () => {
    setValue([] as unknown as T[]);
  };

  // Inner component: resolve children inside Provider to trigger slot registration
  const SelectInner: ParentComponent = (innerProps) => {
    // Resolve children() to trigger sub-component registration (Header, Action, ItemTemplate return null)
    const resolved = children(() => innerProps.children);

    // Extract itemTemplate function
    const getItemTemplate = ():
      | ((item: T, index: number, depth: number) => JSX.Element)
      | undefined => {
      return itemTemplate() as ((item: T, index: number, depth: number) => JSX.Element) | undefined;
    };

    // Render items recursively
    const renderItems = (itemList: T[], depth: number): JSX.Element => {
      const tpl = getItemTemplate();
      return (
        <For each={itemList}>
          {(item, index) => {
            const hidden = () => local.getIsHidden?.(item) ?? false;
            return (
              <SelectItem value={item} class={hidden() ? "line-through opacity-60" : undefined}>
                {tpl ? tpl(item, index(), depth) : String(item)}
                <Show when={local.getChildren?.(item, index(), depth)} keyed>
                  {(itemChildren) => {
                    // Apply hidden filter to child list
                    const visibleChildren = () => {
                      if (!local.getIsHidden) return itemChildren;
                      return itemChildren.filter((child) => {
                        if (local.getIsHidden!(child)) return isSelected(child);
                        return true;
                      });
                    };
                    return (
                      <Show when={visibleChildren().length > 0}>
                        <SelectItem.Children>
                          {renderItems(visibleChildren(), depth + 1)}
                        </SelectItem.Children>
                      </Show>
                    );
                  }}
                </Show>
              </SelectItem>
            );
          }}
        </For>
      );
    };

    // Render selected value (reuse itemTemplate when in items mode)
    const renderValue = (renderVal: T): JSX.Element => {
      if (local.renderValue) {
        return local.renderValue(renderVal);
      }
      const tpl = getItemTemplate();
      if (tpl) {
        return tpl(renderVal, 0, 0);
      }
      return <>{String(renderVal)}</>;
    };

    // Display selected value
    const renderSelectedValue = (): JSX.Element => {
      const current = value();

      if (current === undefined || (Array.isArray(current) && current.length === 0)) {
        return <span class={textMuted}>{local.placeholder ?? ""}</span>;
      }

      if (local.multiple && Array.isArray(current)) {
        const direction = local.multiDisplayDirection ?? "horizontal";
        return (
          <div class={clsx("flex gap-1", direction === "vertical" ? "flex-col" : "flex-wrap")}>
            <For each={current}>{(v) => <span class={multiTagClass}>{renderValue(v)}</span>}</For>
          </div>
        );
      }

      return renderValue(current as T);
    };

    // Show unset item: single select + not required + items mode
    const showUnsetItem = () => !local.multiple && !local.required && local.items !== undefined;

    // Show select all/deselect bar: multiple + not hideSelectAll + items mode
    const showSelectAllBar = () =>
      local.multiple === true && !local.hideSelectAll && local.items !== undefined;

    return (
      <div {...rest} data-select class={clsx("group", local.inset ? "flex" : "inline-flex")}>
        <Dropdown disabled={local.disabled} open={open()} onOpenChange={setOpen} keyboardNav>
          <Dropdown.Trigger>
            <div
              use:ripple={!local.disabled}
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={open()}
              aria-disabled={local.disabled || undefined}
              aria-required={local.required || undefined}
              tabIndex={local.disabled ? -1 : 0}
              class={twMerge(
                getTriggerClassName(),
                action() !== undefined &&
                  clsx(
                    "rounded-r-none border-r-0",
                    "group-focus-within:border-primary-400 dark:group-focus-within:border-primary-400",
                  ),
              )}
              style={local.style}
              onKeyDown={handleTriggerKeyDown}
            >
              <div class={selectedValueClass}>{renderSelectedValue()}</div>
              <div class={chevronWrapperClass}>
                <Icon icon={IconChevronDown} size="1em" />
              </div>
            </div>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <Show when={header()}>{header()!()}</Show>
            {/* Search input */}
            <Show when={local.getSearchText && local.items}>
              <TextInput
                value={searchText()}
                onValueChange={setSearchText}
                placeholder={i18n?.t("select.searchPlaceholder") ?? "Search..."}
                class={searchInputClass}
              />
            </Show>
            {/* Select all/deselect buttons */}
            <Show when={showSelectAllBar()}>
              <div class={selectAllBarClass}>
                <button
                  type="button"
                  data-select-all
                  class={selectAllBtnClass}
                  onClick={handleSelectAll}
                >
                  {i18n?.t("select.selectAll") ?? "Select all"}
                </button>
                <button
                  type="button"
                  data-deselect-all
                  class={selectAllBtnClass}
                  onClick={handleDeselectAll}
                >
                  {i18n?.t("select.deselectAll") ?? "Deselect all"}
                </button>
              </div>
            </Show>
            <List inset role="listbox">
              <Show when={local.items} fallback={resolved()}>
                {/* Unset item */}
                <Show when={showUnsetItem()}>
                  <SelectItem value={undefined as T}>
                    <span class={textMuted}>{i18n?.t("select.unset") ?? "Unset"}</span>
                  </SelectItem>
                </Show>
                {renderItems(visibleItems() ?? [], 0)}
              </Show>
            </List>
          </Dropdown.Content>
        </Dropdown>
        <Show when={action()}>
          <div
            class={clsx(
              "contents",
              "[&>[data-select-action]:last-child]:rounded-r",
              "[&>[data-select-action]+[data-select-action]]:-ml-px",
            )}
          >
            {action()!()}
          </div>
        </Show>
      </div>
    );
  };

  return (
    <Invalid message={errorMsg()} variant="border" touchMode={local.touchMode}>
      <SelectContext.Provider value={contextValue as SelectContextValue}>
        <SelectInner>{local.children}</SelectInner>
      </SelectContext.Provider>
    </Invalid>
  );
};

Select.Item = SelectItem;
Select.Action = SelectAction;
Select.Header = SelectHeader;
Select.ItemTemplate = SelectItemTemplate;
