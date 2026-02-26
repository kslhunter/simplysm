import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  type JSX,
  on,
  Show,
  splitProps,
} from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconSearch, IconX } from "@tabler/icons-solidjs";
import { Icon } from "../../display/Icon";
import { Invalid } from "../../form-control/Invalid";
import { useDialog, type DialogShowOptions } from "../../disclosure/DialogContext";
import { useI18nOptional } from "../../../providers/i18n/I18nContext";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { type ComponentSize, textMuted } from "../../../styles/tokens.styles";
import {
  triggerBaseClass,
  triggerDisabledClass,
  triggerInsetClass,
  triggerSizeClasses,
} from "../../form-control/DropdownTrigger.styles";

/** Result interface returned from modal */
export interface DataSelectModalResult<TKey> {
  selectedKeys: TKey[];
}

/** DataSelectButton Props */
export interface DataSelectButtonProps<TItem, TKey = string | number> {
  /** Currently selected key(s) (single or multiple) */
  value?: TKey | TKey[];
  /** Value change callback */
  onValueChange?: (value: TKey | TKey[] | undefined) => void;

  /** Function to load items by key */
  load: (keys: TKey[]) => TItem[] | Promise<TItem[]>;
  /** Selection modal component factory */
  modal: () => JSX.Element;
  /** Item rendering function */
  renderItem: (item: TItem) => JSX.Element;

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

  /** Custom validation function */
  validate?: (value: unknown) => string | undefined;
  /** touchMode: show error only after focus is lost */
  touchMode?: boolean;

  /** Dialog options */
  dialogOptions?: DialogShowOptions;
}

// Styles
const containerClass = clsx("inline-flex items-center", "group");
const selectedValueClass = clsx("flex-1", "whitespace-nowrap", "overflow-hidden", "text-ellipsis");
const actionButtonClass = clsx(
  "flex-shrink-0",
  "p-0.5",
  "rounded",
  "cursor-pointer",
  "transition-colors",
  "hover:bg-base-200 dark:hover:bg-base-700",
  "focus:outline-none",
);

function getTriggerContainerClass(options: {
  size?: ComponentSize;
  disabled?: boolean;
  inset?: boolean;
  class?: string;
}): string {
  return twMerge(
    triggerBaseClass,
    "px-2 py-1",
    options.size && triggerSizeClasses[options.size],
    options.disabled && triggerDisabledClass,
    options.inset && triggerInsetClass,
    options.class,
  );
}

export function DataSelectButton<TItem, TKey = string | number>(
  props: DataSelectButtonProps<TItem, TKey>,
): JSX.Element {
  const [local] = splitProps(props, [
    "value",
    "onValueChange",
    "load",
    "modal",
    "renderItem",
    "multiple",
    "required",
    "disabled",
    "size",
    "inset",
    "validate",
    "touchMode",
    "dialogOptions",
  ]);

  const i18n = useI18nOptional();
  const dialog = useDialog();

  // Always normalize value to array
  const normalizeKeys = (value: TKey | TKey[] | undefined): TKey[] => {
    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) return value;
    return [value];
  };

  // Controlled/uncontrolled pattern
  type ValueType = TKey | TKey[] | undefined;
  const [getValue, setValue] = createControllableSignal<ValueType>({
    value: () => local.value,
    onChange: () => local.onValueChange as ((v: ValueType) => void) | undefined,
  } as Parameters<typeof createControllableSignal<ValueType>>[0]);

  // Track keys for loading
  // eslint-disable-next-line solid/reactivity -- initial value read once at mount time
  const [loadKeys, setLoadKeys] = createSignal<TKey[]>(normalizeKeys(local.value));

  // Update loadKeys when value changes
  createEffect(
    on(
      () => getValue(),
      (value) => {
        setLoadKeys(normalizeKeys(value));
      },
    ),
  );

  // Call load via createResource
  // eslint-disable-next-line solid/reactivity -- createResource fetcher is called when source changes
  const [selectedItems] = createResource(loadKeys, async (keys) => {
    if (keys.length === 0) return [];
    return Promise.resolve(local.load(keys));
  });

  // Check if has value
  const hasValue = createMemo(() => {
    const keys = normalizeKeys(getValue());
    return keys.length > 0;
  });

  // Check if clearable
  const clearable = createMemo(() => !local.required && hasValue() && !local.disabled);

  // Validation
  const errorMsg = createMemo(() => {
    const v = getValue();
    if (local.required) {
      const keys = normalizeKeys(v);
      if (keys.length === 0) return "Required field";
    }
    return local.validate?.(v);
  });

  // Open modal
  const handleOpenModal = async () => {
    if (local.disabled) return;

    const result = await dialog.show<DataSelectModalResult<TKey>>(
      local.modal,
      local.dialogOptions ?? {},
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

  // Clear selection
  const handleClear = (e: MouseEvent) => {
    e.stopPropagation();
    if (local.multiple) {
      setValue([] as unknown as TKey[]);
    } else {
      setValue(undefined);
    }
  };

  // Render selected value display
  const renderSelectedDisplay = (): JSX.Element => {
    const items = selectedItems();
    if (!items || items.length === 0) {
      return <span class={textMuted} />;
    }
    return (
      <span class="flex items-center gap-1">
        <For each={items}>
          {(item, index) => (
            <>
              <Show when={index() > 0}>
                <span class={textMuted}>,</span>
              </Show>
              {local.renderItem(item)}
            </>
          )}
        </For>
      </span>
    );
  };

  // Calculate trigger class
  const triggerClassName = () =>
    getTriggerContainerClass({
      size: local.size,
      disabled: local.disabled,
      inset: local.inset,
    });

  return (
    <Invalid message={errorMsg()} variant="border" touchMode={local.touchMode}>
      <div data-data-select-button class={containerClass}>
        <div
          role="combobox"
          aria-haspopup="dialog"
          aria-expanded={false}
          aria-disabled={local.disabled || undefined}
          aria-required={local.required || undefined}
          tabIndex={local.disabled ? -1 : 0}
          class={triggerClassName()}
          onKeyDown={(e) => {
            if (local.disabled) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              void handleOpenModal();
            }
          }}
        >
          <div class={selectedValueClass}>{renderSelectedDisplay()}</div>
          <div class="flex items-center gap-0.5">
            <Show when={clearable()}>
              <button
                type="button"
                data-clear-button
                class={twMerge(actionButtonClass, "text-base-400 hover:text-danger-500")}
                onClick={handleClear}
                tabIndex={-1}
                aria-label={i18n?.t("dataSelectButton.deselect") ?? "Deselect"}
              >
                <Icon icon={IconX} size="0.875em" />
              </button>
            </Show>
            <Show when={!local.disabled}>
              <button
                type="button"
                data-search-button
                class={twMerge(actionButtonClass, "text-base-400 hover:text-primary-500")}
                onClick={() => void handleOpenModal()}
                tabIndex={-1}
                aria-label={i18n?.t("dataSelectButton.search") ?? "Search"}
              >
                <Icon icon={IconSearch} size="0.875em" />
              </button>
            </Show>
          </div>
        </div>
      </div>
    </Invalid>
  );
}
