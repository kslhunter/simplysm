import {
  children,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  For,
  type Accessor,
  type JSX,
  type ParentComponent,
  onCleanup,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconChevronDown, IconCheck } from "@tabler/icons-solidjs";
import { Icon } from "../../display/Icon";
import { Dropdown } from "../../disclosure/Dropdown";
import { List } from "../../data/list/List";
import { Collapse } from "../../disclosure/Collapse";
import { ripple } from "../../../directives/ripple";
import { bg, border, text } from "../../../styles/base.styles";
import { type ComponentSize, pad } from "../../../styles/control.styles";
import { themeTokens } from "../../../styles/theme.styles";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { createSlot } from "../../../helpers/createSlot";
import { chevronWrapperClass, getTriggerClass } from "../DropdownTrigger.styles";
import { Invalid } from "../Invalid";
import { TextInput } from "../field/TextInput";
import { useI18n } from "../../../providers/i18n/I18nProvider";
import {
  listItemBaseClass,
  listItemSelectedClass,
  listItemDisabledClass,
  listItemIndentGuideClass,
  listItemContentClass,
  getListItemSelectedIconClass,
} from "../../data/list/ListItem.styles";

void ripple;

//#region Module-level slots

const [SelectHeader, createHeaderSlotAccessor] = createSlot<{ children: JSX.Element }>();
const [SelectItemChildren, createItemChildrenSlotAccessor] = createSlot<{ children: JSX.Element }>();

//#endregion

//#region SelectContext

export interface SelectContextValue<TValue = unknown> {
  /** Whether multiple select mode is enabled */
  multiple: Accessor<boolean>;

  /** Check if value is selected */
  isSelected: (value: TValue) => boolean;

  /** Toggle value selection/deselection */
  toggleValue: (value: TValue) => void;

  /** Close dropdown */
  closeDropdown: () => void;

  /** Register item template */
  setItemTemplate: (fn: ((...args: unknown[]) => JSX.Element) | undefined) => void;
}

export const SelectContext = createContext<SelectContextValue>();
const SelectCtx = SelectContext;

function useSelectContext<TValue = unknown>(): SelectContextValue<TValue> {
  const context = useContext(SelectCtx);
  if (!context) {
    throw new Error("useSelectContext can only be used inside Select component");
  }
  return context as SelectContextValue<TValue>;
}

//#endregion

//#region SelectAction

interface SelectActionProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  children?: JSX.Element;
}

const [SelectActionSlot, createActionSlotAccessor] = createSlot<{ children: JSX.Element }>();

const SelectAction = (props: SelectActionProps) => {
  const [local, rest] = splitProps(props, ["children", "class"]);

  const handleClick: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent> = (e) => {
    if (typeof rest.onClick === "function") {
      rest.onClick(e);
    } else if (rest.onClick && typeof rest.onClick === "object") {
      rest.onClick[0](rest.onClick[1], e);
    }
  };

  return (
    <SelectActionSlot>
      <button
        {...rest}
        type="button"
        onClick={handleClick}
        class={twMerge("p-2", themeTokens.base.hoverBg, local.class)}
        data-select-action
      >
        {local.children}
      </button>
    </SelectActionSlot>
  );
};

//#endregion

const selectAllBtnClass = clsx(
  "text-primary-500",
  "hover:text-primary-600 dark:hover:text-primary-400",
  "cursor-pointer",
);

const SelectItemTemplate = <TArgs extends unknown[]>(props: {
  children: (...args: TArgs) => JSX.Element;
}) => {
  const ctx = useSelectContext();
  ctx.setItemTemplate(props.children as (...args: unknown[]) => JSX.Element);
  onCleanup(() => ctx.setItemTemplate(undefined));
  return null;
};

//#region SelectItem

export interface SelectItemProps<TValue = unknown> extends Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  "value" | "onClick"
> {
  /** Item value */
  value: TValue;

  /** Disabled state */
  disabled?: boolean;
}

/**
 * Selectable item within Select dropdown
 *
 * @example
 * ```tsx
 * <Select.Item value={item}>{item.name}</Select.Item>
 *
 * // Nested items
 * <Select.Item value={parent}>
 *   {parent.name}
 *   <Select.Item.Children>
 *     <Select.Item value={child}>{child.name}</Select.Item>
 *   </Select.Item.Children>
 * </Select.Item>
 * ```
 */
const SelectItemInner = <TValue,>(
  props: SelectItemProps<TValue> & { children?: JSX.Element },
) => {
  const [local, rest] = splitProps(props, ["children", "class", "value", "disabled"]);

  const context = useSelectContext<TValue>();

  const [childrenSlot, ItemChildrenProvider] = createItemChildrenSlotAccessor();
  const hasChildren = () => childrenSlot() !== undefined;
  const isSelected = () => context.isSelected(local.value);
  const useRipple = () => !local.disabled;

  const handleClick = () => {
    if (local.disabled) return;

    context.toggleValue(local.value);

    // Close dropdown only in single select mode
    if (!context.multiple()) {
      context.closeDropdown();
    }
  };

  const getClassName = () =>
    twMerge(
      listItemBaseClass,
      isSelected() && listItemSelectedClass,
      local.disabled && listItemDisabledClass,
      local.class,
    );

  const getCheckIconClass = () => getListItemSelectedIconClass(isSelected());

  return (
    <ItemChildrenProvider>
      <button
        {...rest}
        type="button"
        use:ripple={useRipple()}
        class={getClassName()}
        data-select-item
        data-list-item
        role="option"
        aria-selected={isSelected() || undefined}
        aria-disabled={local.disabled || undefined}
        tabIndex={local.disabled ? -1 : 0}
        onClick={handleClick}
      >
        <Show when={context.multiple() && !hasChildren()}>
          <Icon icon={IconCheck} class={getCheckIconClass()} />
        </Show>
        <span class={listItemContentClass}>{local.children}</span>
      </button>
      <Show when={hasChildren()}>
        <Collapse open={true}>
          <div class="flex">
            <div class={listItemIndentGuideClass} />
            <List inset class="flex-1">
              {childrenSlot()!.children}
            </List>
          </div>
        </Collapse>
      </Show>
    </ItemChildrenProvider>
  );
};

const SelectItem = Object.assign(SelectItemInner, {
  Children: SelectItemChildren,
});

//#endregion

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

  /** lazyValidation: Show error only after blur */
  lazyValidation?: boolean;

  /** Search text extraction function (shows search input when set) */
  itemSearchText?: (item: TValue) => string;

  /** Function to determine if item is hidden */
  isItemHidden?: (item: TValue) => boolean;

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
  onValueChange?: (value: TValue | undefined) => void;

  /** Display direction for multiple select (not used in single select) */
  tagDirection?: never;

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
  tagDirection?: "horizontal" | "vertical";

  /** Hide select all button */
  hideSelectAll?: boolean;
}

// items mode
interface SelectWithItemsPropsBase<TValue> {
  items: TValue[];
  itemChildren?: (item: TValue, index: number, depth: number) => TValue[] | undefined;
  renderValue?: (value: TValue) => JSX.Element;
  children?: JSX.Element;
}

// children mode
interface SelectWithChildrenPropsBase<TValue> {
  items?: never;
  itemChildren?: never;
  renderValue: (value: TValue) => JSX.Element;
  children: JSX.Element;
}

export type SelectProps<TValue = unknown> =
  | (SelectSingleBaseProps<TValue> & SelectWithItemsPropsBase<TValue>)
  | (SelectSingleBaseProps<TValue> & SelectWithChildrenPropsBase<TValue>)
  | (SelectMultipleBaseProps<TValue> & SelectWithItemsPropsBase<TValue>)
  | (SelectMultipleBaseProps<TValue> & SelectWithChildrenPropsBase<TValue>);


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
const SelectInnerComponent = <TValue,>(props: SelectProps<TValue>) => {
  const [local, rest] = splitProps(props as SelectProps<TValue> & { children?: JSX.Element }, [
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
    "tagDirection",
    "hideSelectAll",
    "items",
    "itemChildren",
    "renderValue",
    "validate",
    "lazyValidation",
    "itemSearchText",
    "isItemHidden",
  ]);

  const i18n = useI18n();
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
  type ValueType = TValue | TValue[] | undefined;
  const [value, setValue] = createControllableSignal<ValueType>({
    value: () => local.value,
    onChange: () => local.onValueChange as ((v: ValueType) => void) | undefined,
  } as Parameters<typeof createControllableSignal<ValueType>>[0]);

  // Check if value is selected
  const isSelected = (itemValue: TValue): boolean => {
    const current = value();
    if (current === undefined) return false;

    if (local.multiple) {
      return Array.isArray(current) && current.includes(itemValue);
    }
    return current === itemValue;
  };

  // Toggle value
  const toggleValue = (itemValue: TValue) => {
    if (local.multiple) {
      const current = (value() as TValue[] | undefined) ?? [];
      const idx = current.indexOf(itemValue);
      if (idx >= 0) {
        setValue([...current.slice(0, idx), ...current.slice(idx + 1)]);
      } else {
        setValue([...current, itemValue]);
      }
    } else {
      setValue(itemValue as any);
    }
  };

  // Close dropdown
  const closeDropdown = () => {
    setOpen(false);
  };

  // Slot accessors
  const [header, HeaderProvider] = createHeaderSlotAccessor();
  const [action, ActionProvider] = createActionSlotAccessor();
  const [itemTemplate, _setItemTemplate] = createSignal<
    ((...args: unknown[]) => JSX.Element) | undefined
  >();
  const setItemTemplate = (fn: ((...args: unknown[]) => JSX.Element) | undefined) =>
    _setItemTemplate(() => fn);

  // Context value
  const contextValue: SelectContextValue<TValue> = {
    multiple: () => local.multiple ?? false,
    isSelected,
    toggleValue,
    closeDropdown,
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
      return i18n.t("validation.required");
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
  const filteredItems = createMemo((): TValue[] | undefined => {
    if (!local.items) return undefined;
    if (!local.itemSearchText || !searchText()) return local.items;

    const terms = searchText().trim().split(" ").filter(Boolean);
    if (terms.length === 0) return local.items;

    // Include parent when child matches in hierarchical structure
    const matchesSearch = (item: TValue): boolean => {
      const itemText = local.itemSearchText!(item).toLowerCase();
      if (terms.every((t) => itemText.includes(t.toLowerCase()))) return true;

      // Show parent if any child matches
      if (local.itemChildren) {
        const itemChildren = local.itemChildren(item, 0, 0);
        if (itemChildren?.some((child) => matchesSearch(child))) return true;
      }

      return false;
    };

    return local.items.filter((item) => matchesSearch(item));
  });

  // Items with hidden filter applied
  const visibleItems = createMemo((): TValue[] | undefined => {
    const items = filteredItems();
    if (!items || !local.isItemHidden) return items;

    return items.filter((item) => {
      // Show hidden item if selected (with strikethrough)
      if (local.isItemHidden!(item)) {
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
    setValue([] as TValue[]);
  };

  // Inner component: resolve children inside Provider to trigger slot registration
  const SelectInnerRender: ParentComponent = (innerProps) => {
    // Resolve children() to trigger sub-component registration (Header, Action, ItemTemplate return null)
    const resolved = children(() => innerProps.children);

    // Extract itemTemplate function
    const getItemTemplate = ():
      | ((item: TValue, index: number, depth: number) => JSX.Element)
      | undefined => {
      return itemTemplate() as ((item: TValue, index: number, depth: number) => JSX.Element) | undefined;
    };

    // Render items recursively
    const renderItems = (itemList: TValue[], depth: number): JSX.Element => {
      const tpl = getItemTemplate();
      return (
        <For each={itemList}>
          {(item, index) => {
            const hidden = () => local.isItemHidden?.(item) ?? false;
            return (
              <SelectItem value={item} class={hidden() ? "line-through opacity-60" : undefined}>
                {tpl ? tpl(item, index(), depth) : String(item)}
                <Show when={local.itemChildren?.(item, index(), depth)} keyed>
                  {(itemChildren) => {
                    // Apply hidden filter to child list
                    const visibleChildren = () => {
                      if (!local.isItemHidden) return itemChildren;
                      return itemChildren.filter((child) => {
                        if (local.isItemHidden!(child)) return isSelected(child);
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
    const renderValue = (renderVal: TValue): JSX.Element => {
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
        return <span class={text.muted}>{local.placeholder ?? ""}</span>;
      }

      if (local.multiple && Array.isArray(current)) {
        const direction = local.tagDirection ?? "horizontal";
        return (
          <div class={clsx("flex gap-1", direction === "vertical" ? "flex-col" : "flex-wrap")}>
            <For each={current}>{(v) => <span class={clsx("rounded px-1", bg.subtle)}>{renderValue(v)}</span>}</For>
          </div>
        );
      }

      return renderValue(current as TValue);
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
              <div class="flex-1 whitespace-nowrap">{renderSelectedValue()}</div>
              <div class={chevronWrapperClass}>
                <Icon icon={IconChevronDown} size="1em" />
              </div>
            </div>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <Show when={header()}>{header()!.children}</Show>
            {/* Search input */}
            <Show when={local.itemSearchText && local.items}>
              <TextInput
                value={searchText()}
                onValueChange={setSearchText}
                placeholder={i18n.t("select.searchPlaceholder")}
                class={clsx("w-full rounded-none border-0 border-b", border.subtle)}
              />
            </Show>
            {/* Select all/deselect buttons */}
            <Show when={showSelectAllBar()}>
              <div class={clsx("flex gap-2 border-b", border.subtle, pad.default, "text-xs")}>
                <button
                  type="button"
                  data-select-all
                  class={selectAllBtnClass}
                  onClick={handleSelectAll}
                >
                  {i18n.t("select.selectAll")}
                </button>
                <button
                  type="button"
                  data-deselect-all
                  class={selectAllBtnClass}
                  onClick={handleDeselectAll}
                >
                  {i18n.t("select.deselectAll")}
                </button>
              </div>
            </Show>
            <List inset role="listbox">
              <Show when={local.items} fallback={resolved()}>
                {/* Unset item */}
                <Show when={showUnsetItem()}>
                  <SelectItem value={undefined as TValue}>
                    <span class={text.muted}>{i18n.t("select.unset")}</span>
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
            {action()!.children}
          </div>
        </Show>
      </div>
    );
  };

  return (
    <Invalid message={errorMsg()} variant="border" lazyValidation={local.lazyValidation}>
      <SelectCtx.Provider value={contextValue as SelectContextValue}>
        <HeaderProvider>
          <ActionProvider>
            <SelectInnerRender>{local.children}</SelectInnerRender>
          </ActionProvider>
        </HeaderProvider>
      </SelectCtx.Provider>
    </Invalid>
  );
};

//#region Export
export const Select = Object.assign(SelectInnerComponent, {
  Item: SelectItem,
  Header: SelectHeader,
  Action: SelectAction,
  ItemTemplate: SelectItemTemplate,
});
//#endregion
