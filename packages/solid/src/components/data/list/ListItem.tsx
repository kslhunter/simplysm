import {
  type Component,
  createContext,
  createSignal,
  type JSX,
  onCleanup,
  type ParentComponent,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { IconChevronDown, type IconProps } from "@tabler/icons-solidjs";
import { Icon } from "../../display/Icon";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { ripple } from "../../../directives/ripple";
import { Collapse } from "../../disclosure/Collapse";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
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
import type { ComponentSize } from "../../../styles/tokens.styles";

void ripple;

type SlotAccessor = (() => JSX.Element) | undefined;

interface ListItemSlotsContextValue {
  setChildren: (content: SlotAccessor) => void;
}

const ListItemSlotsContext = createContext<ListItemSlotsContextValue>();

const chevronClass = clsx("transition-transform duration-200 motion-reduce:transition-none");

/**
 * 중첩 리스트를 담는 서브 컴포넌트
 *
 * ListItem의 하위 아이템을 정의할 때 사용한다.
 * 내부적으로 `<List inset>`으로 감싸서 Context와 키보드 네비게이션이 동작한다.
 * 세로선 가이드가 자동으로 표시된다.
 *
 * @example
 * ```tsx
 * <List.Item>
 *   Folder
 *   <List.Item.Children>
 *     <List.Item>File 1</List.Item>
 *     <List.Item>File 2</List.Item>
 *   </List.Item.Children>
 * </List.Item>
 * ```
 */
const ListItemChildren: ParentComponent = (props) => {
  const ctx = useContext(ListItemSlotsContext)!;
  // eslint-disable-next-line solid/reactivity -- 슬롯 accessor로 저장, JSX tracked scope에서 호출됨
  ctx.setChildren(() => props.children);
  onCleanup(() => ctx.setChildren(undefined));
  return null;
};

export interface ListItemProps extends Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick"
> {
  /**
   * 중첩 리스트의 열림 상태 (controlled 모드)
   */
  open?: boolean;

  /**
   * 열림 상태 변경 콜백 (있으면 controlled 모드)
   */
  onOpenChange?: (open: boolean) => void;

  /**
   * 선택된 상태
   */
  selected?: boolean;

  /**
   * 읽기 전용 (클릭 비활성화, 일반 색상 유지)
   */
  readonly?: boolean;

  /**
   * 비활성화 (클릭 불가, 흐려짐)
   */
  disabled?: boolean;

  /**
   * 선택 표시 아이콘 컴포넌트 (중첩 List가 없을 때만 표시)
   */
  selectedIcon?: Component<IconProps>;

  /**
   * 아이템 크기
   */
  size?: ComponentSize;

  /**
   * 클릭 핸들러 (중첩 List가 없을 때 호출)
   */
  onClick?: (e: MouseEvent) => void;
}

/**
 * 리스트 아이템 컴포넌트
 *
 * `ListItem.Children`으로 중첩 리스트를 포함하면 아코디언 동작을 지원한다.
 * controlled 모드로 사용하려면 open과 onOpenChange를 함께 제공한다.
 *
 * @example
 * ```tsx
 * // 기본 사용
 * <List.Item>Simple item</List.Item>
 *
 * // 선택 상태
 * <List.Item selected>Selected item</List.Item>
 *
 * // 선택 아이콘
 * <List.Item selectedIcon={IconCheck} selected>Icon selection</List.Item>
 *
 * // 중첩 리스트 (아코디언)
 * <List.Item>
 *   Folder
 *   <List.Item.Children>
 *     <List.Item>File</List.Item>
 *   </List.Item.Children>
 * </List.Item>
 * ```
 */
interface ListItemComponent extends ParentComponent<ListItemProps> {
  Children: typeof ListItemChildren;
}

export const ListItem: ListItemComponent = (props) => {
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

  const [childrenSlot, _setChildrenSlot] = createSignal<SlotAccessor>();
  const setChildrenSlot = (content: SlotAccessor) => _setChildrenSlot(() => content);
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
      local.size && listItemSizeClasses[local.size],
      local.selected && listItemSelectedClass,
      local.readonly && listItemReadonlyClass,
      local.disabled && listItemDisabledClass,
      local.class,
    );

  const getChevronClassName = () => twMerge(chevronClass, openState() ? "rotate-0" : "rotate-90");

  const getSelectedIconClassName = () => getListItemSelectedIconClass(local.selected ?? false);

  return (
    <ListItemSlotsContext.Provider value={{ setChildren: setChildrenSlot }}>
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
              {childrenSlot()!()}
            </List>
          </div>
        </Collapse>
      </Show>
    </ListItemSlotsContext.Provider>
  );
};

ListItem.Children = ListItemChildren;
