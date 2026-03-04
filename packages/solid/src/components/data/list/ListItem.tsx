import {
  type Component,
  type JSX,
  type ParentComponent,
  Show,
  splitProps,
} from "solid-js";
import { IconChevronDown, type IconProps } from "@tabler/icons-solidjs";
import { Icon } from "../../display/Icon";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { ripple } from "../../../directives/ripple";
import { Collapse } from "../../disclosure/Collapse";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { createSlot } from "../../../helpers/createSlot";
import { useListContext } from "./ListContext";
import { List } from "./List";
import {
  listItemBaseClass,
  listItemSizeClasses,
  listItemSelectedClass,
  listItemDisabledClass,
  listItemReadonlyClass,
  listItemIndentGuideClass,
  listItemContentClass,
  getListItemSelectedIconClass,
} from "./ListItem.styles";
import type { ComponentSize } from "../../../styles/control.styles";

void ripple;

const [ListItemChildren, createChildrenSlotAccessor] = createSlot<{ children: JSX.Element }>();

export interface ListItemProps extends Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick"
> {
  /**
   * Open state of the nested list (controlled mode)
   */
  open?: boolean;

  /**
   * Callback for open state change (enables controlled mode)
   */
  onOpenChange?: (open: boolean) => void;

  /**
   * Selected state
   */
  selected?: boolean;

  /**
   * Readonly (click disabled, normal color retained)
   */
  readonly?: boolean;

  /**
   * Disabled (unclickable, dimmed)
   */
  disabled?: boolean;

  /**
   * Selection icon component (shown only when no nested List)
   */
  selectedIcon?: Component<IconProps>;

  /**
   * Item size
   */
  size?: ComponentSize;

  /**
   * Click handler (called when no nested List)
   */
  onClick?: (e: MouseEvent) => void;
}

/**
 * List item component
 *
 * Supports accordion behavior when a nested list is included via `ListItem.Children`.
 * Provide both open and onOpenChange for controlled mode.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <List.Item>Simple item</List.Item>
 *
 * // Selected state
 * <List.Item selected>Selected item</List.Item>
 *
 * // Selection icon
 * <List.Item selectedIcon={IconCheck} selected>Icon selection</List.Item>
 *
 * // Nested list (accordion)
 * <List.Item>
 *   Folder
 *   <List.Item.Children>
 *     <List.Item>File</List.Item>
 *   </List.Item.Children>
 * </List.Item>
 * ```
 */
const ListItemInner: ParentComponent<ListItemProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "children",
    "class",
    "style",
    "open",
    "onOpenChange",
    "selected",
    "readonly",
    "disabled",
    "selectedIcon",
    "size",
    "onClick",
  ]);

  const listContext = useListContext();
  const level = listContext.level;

  const [openState, setOpenState] = createControllableSignal({
    value: () => local.open ?? false,
    onChange: () => local.onOpenChange,
  });

  const [childrenSlot, ChildrenProvider] = createChildrenSlotAccessor();
  const hasChildren = () => childrenSlot() !== undefined;

  const useRipple = () => !(local.readonly || local.disabled);

  const onHeaderClick = (e: MouseEvent) => {
    if (local.readonly || local.disabled) return;

    if (hasChildren()) {
      setOpenState((v: boolean) => !v);
    } else {
      local.onClick?.(e);
    }
  };

  const getHeaderClassName = () =>
    twMerge(
      listItemBaseClass,
      listItemSizeClasses[local.size ?? "default"],
      local.selected && listItemSelectedClass,
      local.readonly && listItemReadonlyClass,
      local.disabled && listItemDisabledClass,
      local.class,
    );

  const getChevronClassName = () => twMerge("transition-transform duration-200 motion-reduce:transition-none", openState() ? "rotate-0" : "rotate-90");

  const getSelectedIconClassName = () => getListItemSelectedIconClass(local.selected ?? false);

  return (
    <ChildrenProvider>
      <button
        {...rest}
        type="button"
        use:ripple={useRipple()}
        class={getHeaderClassName()}
        style={local.style}
        data-list-item
        role="treeitem"
        aria-expanded={hasChildren() ? openState() : undefined}
        aria-disabled={local.disabled || undefined}
        aria-selected={local.selected || undefined}
        aria-level={level}
        tabIndex={local.disabled ? -1 : 0}
        onClick={onHeaderClick}
        onFocus={(e) => {
          const treeRoot = e.currentTarget.closest("[data-list]");
          treeRoot?.querySelectorAll("[data-list-item]").forEach((el) => {
            (el as HTMLElement).tabIndex = -1;
          });
          e.currentTarget.tabIndex = 0;
        }}
      >
        <Show when={local.selectedIcon && !hasChildren()}>
          <Icon icon={local.selectedIcon!} class={getSelectedIconClassName()} />
        </Show>
        <span class={listItemContentClass}>{local.children}</span>
        <Show when={hasChildren()}>
          <Icon icon={IconChevronDown} size="1em" class={getChevronClassName()} />
        </Show>
      </button>
      <Show when={hasChildren()}>
        <Collapse open={openState()} data-collapsed={!openState() || undefined}>
          <div class="flex">
            <div class={listItemIndentGuideClass} />
            <List inset class="flex-1">
              {childrenSlot()!.children}
            </List>
          </div>
        </Collapse>
      </Show>
    </ChildrenProvider>
  );
};

//#region Export
export const ListItem = Object.assign(ListItemInner, {
  Children: ListItemChildren,
});
//#endregion
