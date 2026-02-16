import { type JSX, type ParentComponent, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import { useComboboxContext } from "./ComboboxContext";
import { ripple } from "../../../directives/ripple";
import {
  listItemBaseClass,
  listItemSelectedClass,
  listItemDisabledClass,
  listItemContentClass,
} from "../../data/list/ListItem.styles";

void ripple;

export interface ComboboxItemProps<TValue = unknown> extends Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  "value" | "onClick"
> {
  /** 아이템의 값 */
  value: TValue;

  /** 비활성화 */
  disabled?: boolean;
}

/**
 * Combobox 드롭다운 내의 선택 가능한 아이템
 */
export const ComboboxItem: ParentComponent<ComboboxItemProps> = <T,>(
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
