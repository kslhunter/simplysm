import {
  children as resolveChildren,
  type Component,
  createMemo,
  For,
  type JSX,
  mergeProps,
  splitProps,
} from "solid-js";
import { IconSearch } from "@tabler/icons-solidjs";
import { type SharedDataAccessor } from "../../../providers/shared-data/SharedDataContext";
import { Select, type SelectProps } from "../../form-control/select/Select";
import { Icon } from "../../display/Icon";
import { useDialog } from "../../disclosure/DialogContext";
import { useI18n } from "../../../providers/i18n/I18nContext";
import { type ComponentSize } from "../../../styles/tokens.styles";
import {
  type DataSelectDialogResult,
  type DialogConfig,
} from "../data-select-button/DataSelectButton";

// -- Slot detection --
const ITEM_TEMPLATE_BRAND = Symbol("SharedDataSelect.ItemTemplate");
const ACTION_BRAND = Symbol("SharedDataSelect.Action");

interface ItemTemplateDef {
  __brand: typeof ITEM_TEMPLATE_BRAND;
  children: (item: any, index: number, depth: number) => JSX.Element;
}

interface ActionDef {
  __brand: typeof ACTION_BRAND;
  children: JSX.Element;
  onClick?: (e: MouseEvent) => void;
}

function isItemTemplateDef(v: unknown): v is ItemTemplateDef {
  return v != null && typeof v === "object" && "__brand" in v && (v as any).__brand === ITEM_TEMPLATE_BRAND;
}

function isActionDef(v: unknown): v is ActionDef {
  return v != null && typeof v === "object" && "__brand" in v && (v as any).__brand === ACTION_BRAND;
}

// -- Compound components --
const ItemTemplate: Component<{
  children: (item: any, index: number, depth: number) => JSX.Element;
}> = (props) => {
  // eslint-disable-next-line solid/reactivity -- factory function, not reactive JSX
  return (() => ({
    __brand: ITEM_TEMPLATE_BRAND,
    children: props.children,
  })) as unknown as JSX.Element;
};

const Action: Component<{
  children?: JSX.Element;
  onClick?: (e: MouseEvent) => void;
}> = (props) => {
  // eslint-disable-next-line solid/reactivity -- factory function, not reactive JSX
  return (() => ({
    __brand: ACTION_BRAND,
    children: props.children,
    onClick: props.onClick,
  })) as unknown as JSX.Element;
};

/** SharedDataSelect Props */
export interface SharedDataSelectProps<TItem> {
  /** Shared data accessor */
  data: SharedDataAccessor<TItem>;

  /** Currently selected key value (translated to item internally) */
  value?: unknown;
  /** Value change callback (receives key, not item) */
  onValueChange?: (value: unknown) => void;
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

  /** Item filter function */
  filterFn?: (item: TItem, index: number) => boolean;
  /** Selection dialog configuration */
  dialog?: DialogConfig;

  /** Compound children: ItemTemplate, Action */
  children: JSX.Element;
}

interface SharedDataSelectComponent {
  <TItem>(props: SharedDataSelectProps<TItem>): JSX.Element;
  ItemTemplate: typeof ItemTemplate;
  Action: typeof Action;
}

const SharedDataSelectBase = <TItem,>(props: SharedDataSelectProps<TItem>): JSX.Element => {
  const [local, rest] = splitProps(props, [
    "data", "filterFn", "dialog", "children",
  ]);

  const i18n = useI18n();
  const dialog = useDialog();

  // Resolve compound children
  const resolved = resolveChildren(() => local.children);
  const defs = createMemo(() => {
    const arr = resolved.toArray();
    return {
      itemTemplate: arr.find(isItemTemplateDef) as unknown as ItemTemplateDef | undefined,
      actions: arr.filter(isActionDef) as unknown as ActionDef[],
    };
  });

  // Items with filterFn applied
  const items = createMemo(() => {
    const allItems = local.data.items();
    if (!local.filterFn) return allItems;
    return allItems.filter(local.filterFn);
  });

  // Normalize value to keys array
  const normalizeKeys = (value: unknown): (string | number)[] => {
    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) return value;
    return [value as string | number];
  };

  // Translate key(s) to item(s) for Select's value prop
  const keyToItem = (key: string | number): TItem | undefined => {
    return local.data.get(key);
  };

  const valueAsItem = createMemo((): TItem | TItem[] | undefined => {
    const key = rest.value;
    if (key === undefined || key === null) return undefined;
    if (Array.isArray(key)) {
      return key.map((k) => keyToItem(k as string | number)).filter((v): v is TItem => v !== undefined);
    }
    return keyToItem(key as string | number);
  });

  // Translate item back to key for onValueChange callback
  const itemToKey = (item: TItem | TItem[] | undefined): unknown => {
    if (item === undefined || item === null) return undefined;
    if (Array.isArray(item)) return item.map((i) => local.data.getKey(i));
    return local.data.getKey(item);
  };

  // Open dialog and handle selection result
  const handleOpenDialog = async () => {
    if (!local.dialog) return;

    const dialogConfig = local.dialog;
    const result = await dialog.show(
      (props: { close?: (result?: DataSelectDialogResult<string | number>) => void }) => (
        <dialogConfig.component
          {...(dialogConfig.props ?? {})}
          selectMode={rest.multiple ? "multiple" : "single"}
          selectedKeys={normalizeKeys(rest.value)}
          onSelect={(r: { keys: (string | number)[] }) =>
            props.close?.({ selectedKeys: r.keys })
          }
        />
      ),
      {},
      dialogConfig.option ?? {},
    );

    if (result) {
      const newKeys = result.selectedKeys;
      if (rest.multiple) {
        rest.onValueChange?.(newKeys);
      } else {
        rest.onValueChange?.(newKeys.length > 0 ? newKeys[0] : undefined);
      }
    }
  };

  const selectProps = mergeProps(rest, {
    get value() {
      return valueAsItem();
    },
    get onValueChange() {
      if (!rest.onValueChange) return undefined;
      // eslint-disable-next-line solid/reactivity -- inside getter, tracked scope
      return (item: TItem | TItem[] | undefined) => {
        rest.onValueChange!(itemToKey(item));
      };
    },
    get items() {
      return items();
    },
    get getChildren() {
      if (!local.data.getParentKey) return undefined;
      // eslint-disable-next-line solid/reactivity -- return function is called within Select's internal JSX tracked scope
      return (item: TItem) => {
        const key = local.data.getKey(item);
        return items().filter((child) => local.data.getParentKey!(child) === key);
      };
    },
    get getSearchText() {
      return local.data.getSearchText;
    },
    get getIsHidden() {
      return local.data.getIsHidden;
    },
  }) as unknown as SelectProps;

  return (
    <Select {...selectProps}>
      {defs().itemTemplate && (
        <Select.ItemTemplate>{defs().itemTemplate!.children}</Select.ItemTemplate>
      )}
      {local.dialog && (
        <Select.Action onClick={() => void handleOpenDialog()} aria-label={i18n.t("sharedDataSelect.search")}>
          <Icon icon={IconSearch} />
        </Select.Action>
      )}
      <For each={defs().actions}>
        {(action) => (
          <Select.Action onClick={action.onClick}>
            {action.children}
          </Select.Action>
        )}
      </For>
    </Select>
  );
};

export const SharedDataSelect: SharedDataSelectComponent = SharedDataSelectBase as any;
SharedDataSelect.ItemTemplate = ItemTemplate;
SharedDataSelect.Action = Action;
