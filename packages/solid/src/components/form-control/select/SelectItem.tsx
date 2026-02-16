import { children, type JSX, type ParentComponent, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import { IconCheck } from "@tabler/icons-solidjs";
import { Icon } from "../../display/Icon";
import { useSelectContext } from "./SelectContext";
import { ripple } from "../../../directives/ripple";
import { List } from "../../data/list/List";
import { Collapse } from "../../disclosure/Collapse";
import { splitSlots } from "../../../helpers/splitSlots";
import {
  listItemBaseClass,
  listItemSelectedClass,
  listItemDisabledClass,
  listItemIndentGuideClass,
  listItemContentClass,
  getListItemSelectedIconClass,
} from "../../data/list/ListItem.styles";

void ripple;

/**
 * 중첩 아이템을 담는 서브 컴포넌트
 */
const SelectItemChildren: ParentComponent = (props) => (
  <div class="flex" data-select-item-children>
    <div class={listItemIndentGuideClass} />
    <List inset class="flex-1">
      {props.children}
    </List>
  </div>
);

export interface SelectItemProps<TValue = unknown> extends Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  "value" | "onClick"
> {
  /** 아이템의 값 */
  value: TValue;

  /** 비활성화 */
  disabled?: boolean;
}

interface SelectItemComponent<TValue = unknown> extends ParentComponent<SelectItemProps<TValue>> {
  Children: typeof SelectItemChildren;
}

/**
 * Select 드롭다운 내의 선택 가능한 아이템
 *
 * @example
 * ```tsx
 * <Select.Item value={item}>{item.name}</Select.Item>
 *
 * // 중첩 아이템
 * <Select.Item value={parent}>
 *   {parent.name}
 *   <Select.Item.Children>
 *     <Select.Item value={child}>{child.name}</Select.Item>
 *   </Select.Item.Children>
 * </Select.Item>
 * ```
 */
export const SelectItem: SelectItemComponent = <T,>(props: SelectItemProps<T> & { children?: JSX.Element }) => {
  const [local, rest] = splitProps(props, ["children", "class", "value", "disabled"]);

  const context = useSelectContext<T>();

  const resolved = children(() => local.children);
  const [slots, content] = splitSlots(resolved, ["selectItemChildren"] as const);

  const hasChildren = () => slots().selectItemChildren.length > 0;
  const isSelected = () => context.isSelected(local.value);
  const useRipple = () => !local.disabled;

  const handleClick = () => {
    if (local.disabled) return;

    context.toggleValue(local.value);

    // 단일 선택 모드에서만 드롭다운 닫기
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
    <>
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
        <span class={listItemContentClass}>{content()}</span>
      </button>
      <Show when={hasChildren()}>
        <Collapse open={true}>{slots().selectItemChildren.single()}</Collapse>
      </Show>
    </>
  );
};

SelectItem.Children = SelectItemChildren;
