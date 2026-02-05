import { children, type Component, type JSX, type ParentComponent, Show, splitProps } from "solid-js";
import { IconChevronDown, type IconProps } from "@tabler/icons-solidjs";
import { Icon } from "../../display/Icon";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { ripple } from "../../../directives/ripple";
import { Collapse } from "../../disclosure/Collapse";
import { createPropSignal } from "../../../utils/createPropSignal";
import { useListContext } from "./ListContext";
import { List } from "./List";
import { splitSlots } from "../../../utils/splitSlots";

void ripple;

const headerBaseClass = clsx(
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

const selectedClass = clsx(
  "bg-primary-100",
  "dark:bg-primary-900/20",
  "font-bold",
  "hover:bg-primary-200",
  "dark:hover:bg-primary-900/40",
);

const readonlyClass = clsx("cursor-auto", "hover:bg-transparent", "select-text");

const disabledClass = clsx("opacity-50", "pointer-events-none", "cursor-auto");

const chevronClass = clsx("transition-transform", "duration-200", "motion-reduce:transition-none");

const indentGuideClass = clsx("w-2", "ml-4", "border-l", "border-gray-300", "dark:border-gray-700");

/**
 * 중첩 리스트를 담는 서브 컴포넌트
 *
 * ListItem의 하위 아이템을 정의할 때 사용한다.
 * 내부적으로 `<List inset>`으로 감싸서 Context와 키보드 네비게이션이 동작한다.
 * 세로선 가이드가 자동으로 표시된다.
 *
 * @example
 * ```tsx
 * <ListItem>
 *   Folder
 *   <ListItem.Children>
 *     <ListItem>File 1</ListItem>
 *     <ListItem>File 2</ListItem>
 *   </ListItem.Children>
 * </ListItem>
 * ```
 */
const ListItemChildren: ParentComponent = (props) => (
  <div class="flex" data-list-item-children>
    <div class={indentGuideClass} />
    <List inset class="flex-1">
      {props.children}
    </List>
  </div>
);

export interface ListItemProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
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
 * <ListItem>Simple item</ListItem>
 *
 * // 선택 상태
 * <ListItem selected>Selected item</ListItem>
 *
 * // 선택 아이콘
 * <ListItem selectedIcon={IconCheck} selected>Icon selection</ListItem>
 *
 * // 중첩 리스트 (아코디언)
 * <ListItem>
 *   Folder
 *   <ListItem.Children>
 *     <ListItem>File</ListItem>
 *   </ListItem.Children>
 * </ListItem>
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
    "onClick",
  ]);

  const listContext = useListContext();
  const level = listContext.level;

  const [openState, setOpenState] = createPropSignal({
    value: () => local.open ?? false,
    onChange: () => local.onOpenChange,
  });

  const resolved = children(() => local.children);
  const [slots, content] = splitSlots(resolved, ["listItemChildren"] as const);

  const hasChildren = () => slots().listItemChildren.length > 0;

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
      headerBaseClass,
      local.selected && selectedClass,
      local.readonly && readonlyClass,
      local.disabled && disabledClass,
      local.class,
    );

  const getChevronClassName = () => twMerge(chevronClass, openState() ? "rotate-0" : "rotate-90");

  const getSelectedIconClassName = () =>
    clsx(local.selected ? "text-primary-600 dark:text-primary-400" : "text-black/30 dark:text-white/30");

  return (
    <>
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
        <span class="flex flex-1 flex-row items-center gap-1 text-left">{content()}</span>
        <Show when={hasChildren()}>
          <Icon icon={IconChevronDown} size="1rem" class={getChevronClassName()} />
        </Show>
      </button>
      <Show when={hasChildren()}>
        <Collapse open={openState()} data-collapsed={!openState() || undefined}>
          {slots().listItemChildren.single()}
        </Collapse>
      </Show>
    </>
  );
};

ListItem.Children = ListItemChildren;
