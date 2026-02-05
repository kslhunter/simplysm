import {
  children,
  type JSX,
  type ParentComponent,
  Show,
  splitProps,
} from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconCheck } from "@tabler/icons-solidjs";
import { Icon } from "../../display/Icon";
import { useSelectContext } from "./SelectContext";
import { ripple } from "../../../directives/ripple";
import { List } from "../../data/list/List";
import { Collapse } from "../../disclosure/Collapse";
import { splitSlots } from "../../../utils/splitSlots";

void ripple;

const baseClass = clsx(
  "flex",
  "items-center",
  "gap-2",
  "py-1",
  "px-1.5",
  "m-px",
  "cursor-pointer",
  "rounded-md",
  "transition-colors",
  "focus:outline-none",
  "focus-visible:bg-gray-200 dark:focus-visible:bg-gray-800",
  "hover:bg-gray-500/10 dark:hover:bg-gray-800",
);

const selectedClass = clsx("bg-primary-100", "dark:bg-primary-900/20", "font-bold");

const disabledClass = clsx("opacity-50", "pointer-events-none", "cursor-auto");

/**
 * 중첩 아이템을 담는 서브 컴포넌트
 */
const SelectItemChildren: ParentComponent = (props) => (
  <div class="flex" data-select-item-children>
    <div class={clsx("w-2", "ml-4", "border-l", "border-gray-300", "dark:border-gray-700")} />
    <List inset class="flex-1">
      {props.children}
    </List>
  </div>
);

export interface SelectItemProps<T = unknown> extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "value" | "onClick"> {
  /** 아이템의 값 */
  value: T;

  /** 비활성화 */
  disabled?: boolean;
}

interface SelectItemComponent<T = unknown> extends ParentComponent<SelectItemProps<T>> {
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
  const [local, rest] = splitProps(props, [
    "children",
    "class",
    "value",
    "disabled",
  ]);

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
      baseClass,
      isSelected() && selectedClass,
      local.disabled && disabledClass,
      local.class,
    );

  const getCheckIconClass = () =>
    clsx(isSelected() ? "text-primary-600 dark:text-primary-400" : "text-black/30 dark:text-white/30");

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
        <span class="flex flex-1 flex-row items-center gap-1 text-left">
          {content()}
        </span>
      </button>
      <Show when={hasChildren()}>
        <Collapse open={true}>
          {slots().selectItemChildren.single()}
        </Collapse>
      </Show>
    </>
  );
};

SelectItem.Children = SelectItemChildren;
