import { createMemo, createSignal, For, type JSX, onCleanup, Show, splitProps } from "solid-js";
import clsx from "clsx";
import { IconChevronDown, IconLoader2 } from "@tabler/icons-solidjs";
import { DebounceQueue } from "@simplysm/core-common";
import { Icon } from "../../display/Icon";
import { Dropdown } from "../../disclosure/Dropdown";
import { List } from "../../data/list/List";
import { ComboboxContext, type ComboboxContextValue, useComboboxContext } from "./ComboboxContext";
import { ComboboxItem } from "./ComboboxItem";
import { ripple } from "../../../directives/ripple";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { type ComponentSize, textMuted } from "../../../styles/tokens.styles";
import { chevronWrapperClass, getTriggerClass } from "../DropdownTrigger.styles";
import { Invalid } from "../Invalid";

void ripple;

// Combobox-specific styles
const selectedValueClass = clsx("flex-1", "whitespace-nowrap", "overflow-hidden");
const inputClass = clsx(
  "min-w-0 flex-1",
  "bg-transparent outline-none",
  "placeholder:text-base-400 dark:placeholder:text-base-500",
);

const noResultsClass = clsx("px-3 py-2", textMuted);

/**
 * Item template sub-component
 */
const ComboboxItemTemplate = <TArgs extends unknown[]>(props: {
  children: (...args: TArgs) => JSX.Element;
}) => {
  const ctx = useComboboxContext();
  // eslint-disable-next-line solid/reactivity -- Store render function in signal, called from JSX tracked scope
  ctx.setItemTemplate(props.children as (...args: unknown[]) => JSX.Element);
  onCleanup(() => ctx.setItemTemplate(undefined));
  return null;
};

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
  allowCustomValue?: boolean;

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

  /** touchMode: show errors only after blur */
  touchMode?: boolean;

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

interface ComboboxComponent {
  <TValue = unknown>(props: ComboboxProps<TValue>): JSX.Element;
  Item: typeof ComboboxItem;
  ItemTemplate: typeof ComboboxItemTemplate;
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
export const Combobox: ComboboxComponent = <T,>(props: ComboboxProps<T>) => {
  const [local, rest] = splitProps(props as ComboboxProps<T> & { children?: JSX.Element }, [
    "children",
    "class",
    "style",
    "value",
    "onValueChange",
    "loadItems",
    "debounceMs",
    "allowCustomValue",
    "parseCustomValue",
    "renderValue",
    "disabled",
    "required",
    "placeholder",
    "size",
    "inset",
    "validate",
    "touchMode",
  ]);

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
  // eslint-disable-next-line solid/reactivity -- Debounce queue created once with debounceMs from mount time
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
    setInternalValue(value);
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
    } else if (e.key === "Enter" && local.allowCustomValue && query().trim() !== "") {
      e.preventDefault();
      const customValue = local.parseCustomValue ? local.parseCustomValue(query()) : (query() as T);
      selectValue(customValue);
    }
  };

  // Validation message
  const errorMsg = createMemo(() => {
    const v = getValue();
    if (local.required && (v === undefined || v === null || v === ""))
      return "This field is required";
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
          class={inputClass}
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
      return <div class={noResultsClass}>Searching...</div>;
    }

    // Items empty
    if (items().length === 0) {
      return <div class={noResultsClass}>No results found</div>;
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
    <Invalid message={errorMsg()} variant="border" touchMode={local.touchMode}>
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
                <div class={selectedValueClass}>{renderDisplayContent()}</div>
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

Combobox.Item = ComboboxItem;
Combobox.ItemTemplate = ComboboxItemTemplate;
