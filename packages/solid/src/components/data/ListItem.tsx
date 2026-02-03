import { children, createMemo, type Component, type JSX, type ParentComponent, Show, splitProps } from "solid-js";
import { IconChevronDown, type IconProps } from "@tabler/icons-solidjs";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { ripple } from "../../directives/ripple";
import { Collapse } from "../disclosure/Collapse";
import { createPropSignal } from "../../hooks/createPropSignal";
import { useListContext } from "./ListContext";
import { mergeStyles } from "../../utils/mergeStyles";

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

const selectedClass = clsx("bg-primary-100", "dark:bg-primary-900/20", "font-bold");

const readonlyClass = clsx("cursor-auto", "hover:bg-transparent", "select-text");

const disabledClass = clsx("opacity-50", "pointer-events-none", "cursor-auto");

const chevronClass = clsx("w-4", "h-4", "transition-transform", "duration-200", "motion-reduce:transition-none");

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
 * 중첩 리스트를 children으로 포함하면 아코디언 동작을 지원한다.
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
 *   <List>
 *     <ListItem>File</ListItem>
 *   </List>
 * </ListItem>
 * ```
 */
export const ListItem: ParentComponent<ListItemProps> = (props) => {
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

  const slots = createMemo(() => {
    const arr = resolved.toArray();
    let nestedList: HTMLElement | undefined;
    const content: (typeof arr)[number][] = [];

    for (const c of arr) {
      if (c instanceof HTMLElement && c.dataset["list"] !== undefined) {
        nestedList = c;
      } else {
        content.push(c);
      }
    }

    return { nestedList, content };
  });

  const hasChildren = () => slots().nestedList !== undefined;

  const useRipple = () => !(local.readonly || local.disabled);

  const onHeaderClick = (e: MouseEvent) => {
    if (local.readonly || local.disabled) return;

    if (hasChildren()) {
      setOpenState((v) => !v);
    } else {
      local.onClick?.(e);
    }
  };

  const getIndentPadding = () => {
    // level 1 = pl-1.5, level 2 = pl-6, level 3 = pl-10.5, ...
    // 기본 패딩 1.5 + (level - 1) * 4.5
    if (level <= 1) return undefined;
    const padding = 1.5 + (level - 1) * 4.5;
    return `${padding * 0.25}rem`; // 1 = 0.25rem
  };

  const getHeaderClassName = () =>
    twMerge(
      headerBaseClass,
      local.selected && selectedClass,
      local.readonly && readonlyClass,
      local.disabled && disabledClass,
      local.class,
    );

  const getChevronClassName = () => twMerge(chevronClass, openState() ? "rotate-90" : "rotate-0");

  const getSelectedIconClassName = () =>
    clsx("w-4", "h-4", local.selected ? "text-primary-600 dark:text-primary-400" : "text-black/30 dark:text-white/30");

  return (
    <>
      <button
        {...rest}
        type="button"
        use:ripple={useRipple()}
        class={getHeaderClassName()}
        style={mergeStyles(local.style, { "padding-left": getIndentPadding() })}
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
          {local.selectedIcon?.({ class: getSelectedIconClassName() })}
        </Show>
        <span class="flex flex-1 flex-row items-center gap-1 text-left">{slots().content}</span>
        <Show when={hasChildren()}>
          <IconChevronDown class={getChevronClassName()} />
        </Show>
      </button>
      <Show when={hasChildren()}>
        <Collapse open={openState()} data-collapsed={!openState() || undefined}>
          {slots().nestedList}
        </Collapse>
      </Show>
    </>
  );
};
