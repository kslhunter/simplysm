import {
  createContext,
  createMemo,
  createSignal,
  For,
  type JSX,
  onCleanup,
  Show,
  splitProps,
  useContext,
  type ParentComponent,
} from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconChevronDown, IconLoader2 } from "@tabler/icons-solidjs";
import { DebounceQueue } from "@simplysm/core-common";
import { Icon } from "../../display/Icon";
import { Dropdown } from "../../disclosure/Dropdown";
import { List } from "../../data/list/List";
import { ripple } from "../../../directives/ripple";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { text } from "../../../styles/base.styles";
import { type ComponentSize, pad } from "../../../styles/control.styles";
import { chevronWrapperClass, getTriggerClass } from "../DropdownTrigger.styles";
import { Invalid } from "../Invalid";
import { useI18n } from "../../../providers/i18n/I18nProvider";
import {
  listItemBaseClass,
  listItemSelectedClass,
  listItemDisabledClass,
  listItemContentClass,
} from "../../data/list/ListItem.styles";

void ripple;

//#region ========== Context ==========

export interface ComboboxContextValue<TValue = unknown> {
  /** Check if value is selected */
  isSelected: (value: TValue) => boolean;

  /** Select value */
  selectValue: (value: TValue) => void;

  /** Close dropdown */
  closeDropdown: () => void;

  /** Register item template */
  setItemTemplate: (fn: ((...args: unknown[]) => JSX.Element) | undefined) => void;
}

export const ComboboxContext = createContext<ComboboxContextValue>();

function useComboboxContext<TValue = unknown>(): ComboboxContextValue<TValue> {
  const context = useContext(ComboboxContext);
  if (!context) {
    throw new Error("useComboboxContext can only be used inside the Combobox component");
  }
  return context as ComboboxContextValue<TValue>;
}

//#endregion

const noResultsClass = clsx(pad.lg, text.muted);

/**
 * Item template sub-component
 */
const ComboboxItemTemplate = <TArgs extends unknown[]>(props: {
  children: (...args: TArgs) => JSX.Element;
}) => {
  const ctx = useComboboxContext();
  ctx.setItemTemplate(props.children as (...args: unknown[]) => JSX.Element);
  onCleanup(() => ctx.setItemTemplate(undefined));
  return null;
};

//#region ========== ComboboxItem ==========

export interface ComboboxItemProps<TValue = unknown> extends Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  "value" | "onClick"
> {
  /** Item value */
  value: TValue;

  /** Disabled */
  disabled?: boolean;
}

/**
 * Selectable item in Combobox dropdown
 */
const ComboboxItem: ParentComponent<ComboboxItemProps> = <T,>(
  props: ComboboxItemProps<T> & { children?: JSX.Element },
) => {
  const [local, rest] = splitProps(props, ["children", "class", "value", "disabled"]);

  const context = useComboboxContext<T>();

  const isSelected = () => context.isSelected(local.value);
  const useRipple = () => !local.disabled;

  const handleClick = () => {
    if (local.disabled) return;
    context.selectValue(local.value);
    context.closeDropdown();
  };

  const getClassName = () =>
    twMerge(
      listItemBaseClass,
      isSelected() && listItemSelectedClass,
      local.disabled && listItemDisabledClass,
      local.class,
    );

  return (
    <button
      {...rest}
      type="button"
      use:ripple={useRipple()}
      class={getClassName()}
      data-combobox-item
      data-list-item
      role="option"
      aria-selected={isSelected() || undefined}
      aria-disabled={local.disabled || undefined}
      tabIndex={local.disabled ? -1 : 0}
      onClick={handleClick}
    >
      <span class={listItemContentClass}>{local.children}</span>
    </button>
  );
};

//#endregion

// Props definition
export interface ComboboxProps<TValue = unknown> {
  /** Currently selected value */
  value?: TValue;

  /** Value change callback */
  onValueChange?: (value: TValue) => void;

  /** Item load function (required) */
  loadItems: (query: string) => TValue[] | Promise<TValue[]>;

  /** Debounce delay (default: 300ms) */
  debounceMs?: number;

  /** Allow custom values */
  allowsCustomValue?: boolean;

  /** Custom value parsing function */
  parseCustomValue?: (text: string) => TValue;

  /** Function to render selected value (required) */
  renderValue: (value: TValue) => JSX.Element;

  /** Disable input */
  disabled?: boolean;

  /** Required input */
  required?: boolean;

  /** Custom validation function */
  validate?: (value: TValue | undefined) => string | undefined;

  /** lazyValidation: show errors only after blur */
  lazyValidation?: boolean;

  /** Placeholder text */
  placeholder?: string;

  /** Trigger size */
  size?: ComponentSize;

  /** Borderless style */
  inset?: boolean;

  /** Custom class */
  class?: string;

  /** Custom style */
  style?: JSX.CSSProperties;

  /** Children (Combobox.Item or Combobox.ItemTemplate) */
  children?: JSX.Element;
}

/**
 * Combobox component
 *
 * An autocomplete component supporting async search and item selection.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Combobox
 *   loadItems={async (query) => {
 *     const response = await fetch(`/api/search?q=${query}`);
 *     return response.json();
 *   }}
 *   renderValue={(item) => item.name}
 *   value={selected()}
 *   onValueChange={setSelected}
 * >
 *   <Combobox.ItemTemplate>
 *     {(item) => <>{item.name}</>}
 *   </Combobox.ItemTemplate>
 * </Combobox>
 *
 * // Children approach
 * <Combobox loadItems={loadItems} renderValue={(v) => v.name}>
 *   <For each={items()}>
 *     {(item) => <Combobox.Item value={item}>{item.name}</Combobox.Item>}
 *   </For>
 * </Combobox>
 * ```
 */
const ComboboxInner = <T,>(props: ComboboxProps<T>) => {
  const [local, rest] = splitProps(props as ComboboxProps<T> & { children?: JSX.Element }, [
    "children",
    "class",
    "style",
    "value",
    "onValueChange",
    "loadItems",
    "debounceMs",
    "allowsCustomValue",
    "parseCustomValue",
    "renderValue",
    "disabled",
    "required",
    "placeholder",
    "size",
    "inset",
    "validate",
    "lazyValidation",
  ]);

  const i18n = useI18n();

  // State
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal("");
  const [items, setItems] = createSignal<T[]>([]);
  const [busyCount, setBusyCount] = createSignal(0);

  // Selected value management (controlled/uncontrolled pattern)
  const [getValue, setInternalValue] = createControllableSignal<T | undefined>({
    value: () => local.value,
    onChange: () => local.onValueChange,
  } as Parameters<typeof createControllableSignal<T | undefined>>[0]);

  // Debounce queue (created once on mount, debounceMs only used as initial value)
  const debounceQueue = new DebounceQueue(local.debounceMs ?? 300);

  onCleanup(() => {
    debounceQueue.dispose();
  });

  // Check if value is selected
  const isSelected = (value: T): boolean => {
    const current = getValue();
    return current === value;
  };

  // Select value
  const selectValue = (value: T) => {
    setInternalValue(value as any);
    setQuery("");
    setOpen(false);
  };

  // Close dropdown
  const closeDropdown = () => {
    setOpen(false);
  };

  // Item template signal
  const [itemTemplate, _setItemTemplate] = createSignal<
    ((...args: unknown[]) => JSX.Element) | undefined
  >();
  const setItemTemplate = (fn: ((...args: unknown[]) => JSX.Element) | undefined) =>
    _setItemTemplate(() => fn);

  // Context value
  const contextValue: ComboboxContextValue<T> = {
    isSelected,
    selectValue,
    closeDropdown,
    setItemTemplate,
  };

  // Perform search
  const performSearch = (searchQuery: string) => {
    // Capture loadItems function reference for use
    const loadItemsFn = local.loadItems;
    debounceQueue.run(async () => {
      setBusyCount((c) => c + 1);
      try {
        const result = await Promise.resolve(loadItemsFn(searchQuery));
        setItems(result);
      } finally {
        setBusyCount((c) => c - 1);
      }
    });
  };

  // Input handler
  const handleInput = (e: InputEvent) => {
    const target = e.currentTarget as HTMLInputElement;
    const newQuery = target.value;
    setQuery(newQuery);
    performSearch(newQuery);

    if (!open()) {
      setOpen(true);
    }
  };

  // Dropdown open/close change handler
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      performSearch(query());
    }
  };

  // Trigger keyboard handling
  const handleTriggerKeyDown = (e: KeyboardEvent) => {
    if (local.disabled) return;

    if (e.key === "ArrowDown" && !open()) {
      e.preventDefault();
      setOpen(true);
      performSearch(query());
    } else if (e.key === "Escape" && open()) {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Enter" && local.allowsCustomValue && query().trim() !== "") {
      e.preventDefault();
      const customValue = local.parseCustomValue ? local.parseCustomValue(query()) : (query() as T);
      selectValue(customValue);
    }
  };

  // Validation message
  const errorMsg = createMemo(() => {
    const v = getValue();
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
      class: clsx(!local.inset && "bg-primary-50 dark:bg-primary-950/30", local.class),
    });

  // Note: Initial search performed in handleTriggerClick
  // Input triggers performSearch in handleInput

  // Render selected value or input
  const renderDisplayContent = (): JSX.Element => {
    const currentValue = getValue();

    // Show input field if dropdown is open or no value selected
    if (open() || currentValue === undefined) {
      return (
        <input
          ref={(el) => {
            // Focus input when dropdown opens
            if (open()) {
              requestAnimationFrame(() => el.focus());
            }
          }}
          type="text"
          class={clsx("min-w-0 flex-1 bg-transparent outline-none", text.placeholder)}
          value={query()}
          placeholder={currentValue === undefined ? local.placeholder : undefined}
          disabled={local.disabled}
          autocomplete="one-time-code"
          onInput={handleInput}
        />
      );
    }

    // Show value if selected and dropdown is closed
    return <div class="truncate">{local.renderValue(currentValue)}</div>;
  };

  // Render items
  const renderItems = (): JSX.Element => {
    const template = itemTemplate() as ((item: T, index: number) => JSX.Element) | undefined;

    // Loading
    if (busyCount() > 0) {
      return <div class={noResultsClass}>{i18n.t("combobox.searching")}</div>;
    }

    // Items empty
    if (items().length === 0) {
      return <div class={noResultsClass}>{i18n.t("combobox.noResults")}</div>;
    }

    // ItemTemplate approach
    if (template) {
      return (
        <For each={items()}>
          {(item, index) => <ComboboxItem value={item}>{template(item, index())}</ComboboxItem>}
        </For>
      );
    }

    // Default rendering
    return (
      <For each={items()}>{(item) => <ComboboxItem value={item}>{String(item)}</ComboboxItem>}</For>
    );
  };

  return (
    <Invalid message={errorMsg()} variant="border" lazyValidation={local.lazyValidation}>
      <ComboboxContext.Provider value={contextValue as ComboboxContextValue}>
        <div {...rest} data-combobox class={local.inset ? "flex" : "inline-flex"}>
          <Dropdown
            disabled={local.disabled}
            open={open()}
            onOpenChange={handleOpenChange}
            keyboardNav
          >
            <Dropdown.Trigger>
              <div
                use:ripple={!local.disabled}
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={open()}
                aria-disabled={local.disabled || undefined}
                aria-required={local.required || undefined}
                tabIndex={local.disabled ? -1 : 0}
                class={getTriggerClassName()}
                style={local.style}
                onKeyDown={handleTriggerKeyDown}
              >
                <div class="flex-1 overflow-hidden whitespace-nowrap">{renderDisplayContent()}</div>
                <div class={chevronWrapperClass}>
                  <Show
                    when={busyCount() > 0}
                    fallback={<Icon icon={IconChevronDown} size="1em" />}
                  >
                    <Icon icon={IconLoader2} size="1em" class="animate-spin" />
                  </Show>
                </div>
              </div>
            </Dropdown.Trigger>
            <Dropdown.Content>
              <List inset role="listbox">
                {local.children}
                {renderItems()}
              </List>
            </Dropdown.Content>
          </Dropdown>
        </div>
      </ComboboxContext.Provider>
    </Invalid>
  );
};

//#region Export
export const Combobox = Object.assign(ComboboxInner, {
  Item: ComboboxItem,
  ItemTemplate: ComboboxItemTemplate,
});
//#endregion
