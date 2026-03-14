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

/** Common props shared between single and multiple modes */
interface DataSelectButtonCommonProps<
  TItem,
  TKey = string | number,
  TDialogProps extends SelectDialogBaseProps<TKey> = SelectDialogBaseProps<TKey>,
> {
  /** Function to load items by key */
  load: (keys: TKey[]) => TItem[] | Promise<TItem[]>;
  /** Item rendering function */
  renderItem: (item: TItem) => JSX.Element;
  /** Selection dialog component */
  dialog: Component<TDialogProps>;
  /** Dialog options (header, size, etc.) */
  dialogOptions?: DialogShowOptions;
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
}

/** Single select props */
interface DataSelectButtonSingleProps<
  TItem,
  TKey = string | number,
  TDialogProps extends SelectDialogBaseProps<TKey> = SelectDialogBaseProps<TKey>,
> extends DataSelectButtonCommonProps<TItem, TKey, TDialogProps> {
  /** Single select mode */
  multiple?: false;
  /** Currently selected key */
  value?: TKey;
  /** Value change callback */
  onValueChange?: (value: TKey | undefined) => void;
}

/** Multiple select props */
interface DataSelectButtonMultipleProps<
  TItem,
  TKey = string | number,
  TDialogProps extends SelectDialogBaseProps<TKey> = SelectDialogBaseProps<TKey>,
> extends DataSelectButtonCommonProps<TItem, TKey, TDialogProps> {
  /** Multiple select mode */
  multiple: true;
  /** Currently selected keys */
  value?: TKey[];
  /** Value change callback */
  onValueChange?: (value: TKey[]) => void;
}

/** DataSelectButton Props */
export type DataSelectButtonProps<
  TItem,
  TKey = string | number,
  TDialogProps extends SelectDialogBaseProps<TKey> = SelectDialogBaseProps<TKey>,
> =
  | (DataSelectButtonSingleProps<TItem, TKey, TDialogProps> & DialogPropsField<TDialogProps, TKey>)
  | (DataSelectButtonMultipleProps<TItem, TKey, TDialogProps> & DialogPropsField<TDialogProps, TKey>);

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
    triggerSizeClasses[options.size ?? "md"],
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
    value: () => local.value as ValueType,
    onChange: () => local.onValueChange as ((v: ValueType) => void) | undefined,
  });

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

  // Dialog open state for aria-expanded
  const [isDialogOpen, setIsDialogOpen] = createSignal(false);

  // Open dialog
  const handleOpenDialog = async () => {
    if (local.disabled) return;

    setIsDialogOpen(true);
    try {
      const dialogProps =
        (props as { dialogProps?: Record<string, unknown> }).dialogProps ?? {};
      const showProps = {
        ...dialogProps,
        selectionMode: local.multiple ? "multiple" : "single",
        selectedKeys: normalizeKeys(getValue()) as (string | number)[],
      } as Omit<TDialogProps, "close">;
      const result = (await dialog.show(
        local.dialog as Component<SelectDialogBaseProps<TKey>>,
        showProps as Omit<SelectDialogBaseProps<TKey>, "close">,
        local.dialogOptions,
      ));

      if (result) {
        const newKeys = result.selectedKeys;
        if (local.multiple) {
          setValue(newKeys);
        } else {
          setValue(newKeys.length > 0 ? newKeys[0] : undefined);
        }
      }
    } finally {
      setIsDialogOpen(false);
    }
  };

  // Clear selection
  const handleClear = (e: MouseEvent) => {
    e.stopPropagation();
    if (local.multiple) {
      setValue([] as TKey[]);
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
        <button
          type="button"
          data-trigger
          aria-haspopup="dialog"
          aria-expanded={isDialogOpen()}
          aria-required={local.required || undefined}
          disabled={local.disabled || undefined}
          class={twMerge("appearance-none font-inherit text-inherit text-left", triggerClassName())}
          onClick={() => void handleOpenDialog()}
        >
          <div class="flex-1 whitespace-nowrap">{renderSelectedDisplay()}</div>
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
                onClick={(e) => {
                  e.stopPropagation();
                  void handleOpenDialog();
                }}
                tabIndex={-1}
                aria-label={i18n.t("dataSelectButton.search")}
              >
                <Icon icon={IconSearch} size="0.875em" />
              </button>
            </Show>
          </div>
        </button>
      </div>
    </Invalid>
  );
}
