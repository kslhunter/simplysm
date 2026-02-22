import {
  createContext,
  createSignal,
  type JSX,
  onCleanup,
  type ParentComponent,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { twMerge } from "tailwind-merge";
import { IconCheck } from "@tabler/icons-solidjs";
import { Icon } from "../../display/Icon";
import { useSelectContext } from "./SelectContext";
import { ripple } from "../../../directives/ripple";
import { List } from "../../data/list/List";
import { Collapse } from "../../disclosure/Collapse";
import {
  listItemBaseClass,
  listItemSelectedClass,
  listItemDisabledClass,
  listItemIndentGuideClass,
  listItemContentClass,
  getListItemSelectedIconClass,
} from "../../data/list/ListItem.styles";

void ripple;

type SlotAccessor = (() => JSX.Element) | undefined;

interface SelectItemSlotsContextValue {
  setChildren: (content: SlotAccessor) => void;
}

const SelectItemSlotsContext = createContext<SelectItemSlotsContextValue>();

/**
 * 중첩 아이템을 담는 서브 컴포넌트
 */
const SelectItemChildren: ParentComponent = (props) => {
  const ctx = useContext(SelectItemSlotsContext)!;
  // eslint-disable-next-line solid/reactivity -- slot accessor: children is lazily read at render time
  ctx.setChildren(() => () => props.children);
  onCleanup(() => ctx.setChildren(undefined));
  return null;
};

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
export const SelectItem: SelectItemComponent = <T,>(
  props: SelectItemProps<T> & { children?: JSX.Element },
) => {
  const [local, rest] = splitProps(props, ["children", "class", "value", "disabled"]);

  const context = useSelectContext<T>();

  const [childrenSlot, setChildrenSlot] = createSignal<SlotAccessor>();
  const hasChildren = () => childrenSlot() !== undefined;
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
    <SelectItemSlotsContext.Provider value={{ setChildren: setChildrenSlot }}>
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
        <span class={listItemContentClass}>{local.children}</span>
      </button>
      <Show when={hasChildren()}>
        <Collapse open={true}>
          <div class="flex">
            <div class={listItemIndentGuideClass} />
            <List inset class="flex-1">
              {childrenSlot()!()}
            </List>
          </div>
        </Collapse>
      </Show>
    </SelectItemSlotsContext.Provider>
  );
};

SelectItem.Children = SelectItemChildren;
