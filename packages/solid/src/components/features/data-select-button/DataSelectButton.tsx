import {
  type Component,
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
import { useDialog, type DialogShowOptions } from "../../disclosure/Dialog";
import { useI18n } from "../../../providers/i18n/I18nProvider";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { text } from "../../../styles/base.styles";
import { gap, type ComponentSize } from "../../../styles/control.styles";
import { themeTokens } from "../../../styles/theme.styles";
import {
  triggerBaseClass,
  triggerDisabledClass,
  triggerInsetClass,
  triggerSizeClasses,
} from "../../form-control/DropdownTrigger.styles";

/** Result interface returned from dialog */
export interface DataSelectDialogResult<TKey> {
  selectedKeys: TKey[];
}

/** Base props for select dialog components (injected by DataSelectButton/SharedDataSelect + DialogProvider) */
export interface SelectDialogBaseProps<TKey = string | number> {
  close?: (result?: DataSelectDialogResult<TKey>) => void;
  selectionMode: "single" | "multiple";
  selectedKeys: TKey[];
}

/** Extract user-specific props from dialog component (exclude injected base props) */
type UserDialogProps<P, TKey = string | number> = Omit<P, keyof SelectDialogBaseProps<TKey>>;

/** dialogProps: required when user props have required keys, optional otherwise */
export type DialogPropsField<P, TKey = string | number> =
  {} extends UserDialogProps<P, TKey>
    ? { dialogProps?: UserDialogProps<P, TKey> }
    : { dialogProps: UserDialogProps<P, TKey> };

/** DataSelectButton Props */
export type DataSelectButtonProps<
  TItem,
  TKey = string | number,
  TDialogProps extends SelectDialogBaseProps<TKey> = SelectDialogBaseProps<TKey>,
> = {
  /** Currently selected key(s) (single or multiple) */
  value?: TKey | TKey[];
  /** Value change callback */
  onValueChange?: (value: TKey | TKey[] | undefined) => void;
  /** Function to load items by key */
  load: (keys: TKey[]) => TItem[] | Promise<TItem[]>;
  /** Item rendering function */
  renderItem: (item: TItem) => JSX.Element;
  /** Selection dialog component */
  dialog: Component<TDialogProps>;
  /** Dialog options (header, size, etc.) */
  dialogOptions?: DialogShowOptions;
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
  /** lazyValidation: show error only after focus is lost */
  lazyValidation?: boolean;
} & DialogPropsField<TDialogProps, TKey>;

const actionButtonClass = clsx(
  "flex-shrink-0",
  "p-0.5",
  "rounded",
  "cursor-pointer",
  "transition-colors",
  themeTokens.base.hoverBg,
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
    triggerSizeClasses[options.size ?? "default"],
    options.disabled && triggerDisabledClass,
    options.inset && triggerInsetClass,
    options.class,
  );
}

export function DataSelectButton<
  TItem,
  TKey = string | number,
  TDialogProps extends SelectDialogBaseProps<TKey> = SelectDialogBaseProps<TKey>,
>(props: DataSelectButtonProps<TItem, TKey, TDialogProps>): JSX.Element {
  const [local] = splitProps(props, [
    "value",
    "onValueChange",
    "load",
    "dialog",
    "dialogProps",
    "dialogOptions",
    "renderItem",
    "multiple",
    "required",
    "disabled",
    "size",
    "inset",
    "validate",
    "lazyValidation",
  ]);

  const i18n = useI18n();
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
      if (keys.length === 0) return i18n.t("validation.requiredField");
    }
    return local.validate?.(v);
  });

  // Open dialog
  const handleOpenDialog = async () => {
    if (local.disabled) return;

    const result = (await dialog.show(
      local.dialog,
      {
        ...((local as any).dialogProps ?? {}),
        selectionMode: local.multiple ? "multiple" : "single",
        selectedKeys: normalizeKeys(getValue()) as (string | number)[],
      },
      local.dialogOptions,
    )) as DataSelectDialogResult<TKey> | undefined;

    if (result) {
      const newKeys = result.selectedKeys;
      if (local.multiple) {
        setValue(newKeys);
      } else {
        setValue((newKeys.length > 0 ? newKeys[0] : undefined) as any);
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
      return <span class={text.muted} />;
    }
    return (
      <span class="flex items-center gap-1">
        <For each={items}>
          {(item, index) => (
            <>
              <Show when={index() > 0}>
                <span class={text.muted}>,</span>
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
    <Invalid message={errorMsg()} variant="border" lazyValidation={local.lazyValidation}>
      <div data-data-select-button class="group inline-flex items-center">
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
              void handleOpenDialog();
            }
          }}
        >
          <div class="flex-1 truncate">{renderSelectedDisplay()}</div>
          <div class={clsx("flex items-center", gap.sm)}>
            <Show when={clearable()}>
              <button
                type="button"
                data-clear-button
                class={twMerge(actionButtonClass, text.muted, "hover:text-danger-500")}
                onClick={handleClear}
                tabIndex={-1}
                aria-label={i18n.t("dataSelectButton.deselect")}
              >
                <Icon icon={IconX} size="0.875em" />
              </button>
            </Show>
            <Show when={!local.disabled}>
              <button
                type="button"
                data-search-button
                class={twMerge(actionButtonClass, text.muted, "hover:text-primary-500")}
                onClick={() => void handleOpenDialog()}
                tabIndex={-1}
                aria-label={i18n.t("dataSelectButton.search")}
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
