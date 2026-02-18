import {
  children,
  type Component,
  createMemo,
  type JSX,
  type ParentComponent,
  Show,
  splitProps,
} from "solid-js";
import { IconChevronLeft, type IconProps } from "@tabler/icons-solidjs";
import { Collapse } from "../../navigator/collapse/collapse";
import { CollapseIcon } from "../../navigator/collapse/collapse-icon";
import { listItem, listItemContent, type ListItemContentStyles } from "./list-item.css";
import { list } from "./list.css";
import { ripple } from "../../../directives/ripple";
import { objPick } from "@simplysm/core-common";
import { themeVars } from "../../../styles/variables/theme.css";
import { tokenVars } from "../../../styles/variables/token.css";
import { combineStyle } from "@solid-primitives/props";
import { atoms } from "../../../styles/atoms.css";
import { createFieldSignal } from "../../../hooks/createFieldSignal";

void ripple;

/**
 * ListItem 컴포넌트의 props
 *
 * @property open - 중첩 리스트의 열림 상태 (onOpenChange와 함께 사용 시 controlled, 단독 사용 시 초기값)
 * @property onOpenChange - 열림 상태 변경 콜백 (있으면 controlled 모드)
 * @property selectedIcon - 선택 표시 아이콘 컴포넌트
 * @property icon - 항목 앞에 표시할 아이콘 컴포넌트
 */
export interface ListItemProps extends JSX.HTMLAttributes<HTMLDivElement>, ListItemContentStyles {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  selectedIcon?: Component<IconProps>;
  icon?: Component<IconProps>;
  children?: JSX.Element;
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
 * <ListItem>단순 항목</ListItem>
 *
 * // 선택 상태
 * <ListItem selected>선택된 항목</ListItem>
 *
 * // 선택 아이콘
 * <ListItem selectedIcon={IconCheck} selected>아이콘 선택</ListItem>
 *
 * // 중첩 리스트 (아코디언)
 * <ListItem>
 *   폴더
 *   <List>
 *     <ListItem>파일</ListItem>
 *   </List>
 * </ListItem>
 * ```
 */
export const ListItem: ParentComponent<ListItemProps> = (props) => {
  const [local, styleProps, rest] = splitProps(
    props,
    [...listItemContent.variants(), "open", "onOpenChange", "selectedIcon", "icon", "children"],
    ["class", "style"],
  );

  const wrappedOnChange = () => {
    const fn = local.onOpenChange;
    return fn ? (v: boolean | undefined) => fn(v ?? false) : undefined;
  };

  const [openState, setOpenState] = createFieldSignal<boolean | undefined>({
    value: () => local.open,
    onChange: wrappedOnChange,
  });
  const open = () => openState() ?? false;
  const toggle = () => setOpenState(!open());

  const resolved = children(() => local.children);

  const parsed = createMemo(() => {
    const arr = resolved.toArray();
    let nestedList: Element | undefined;
    const content: JSX.Element[] = [];

    for (const c of arr) {
      if (c instanceof HTMLElement && c.classList.contains(list.classNames.base)) {
        nestedList = c;
      } else {
        content.push(c);
      }
    }

    return { content, nestedList, hasChildren: nestedList !== undefined };
  });
  const content = () => parsed().content;
  const nestedList = () => parsed().nestedList;
  const hasChildren = () => parsed().hasChildren;

  const useRipple = () => !local.disabled && !(local.layout === "flat" && hasChildren());

  // selectedIcon 스타일 메모이제이션
  const selectedIconStyle = createMemo(() => ({
    color: local.selected
      ? `rgb(${themeVars.control.primary.base})`
      : `rgba(${themeVars.text.base}, ${tokenVars.overlay.base})`,
  }));

  const onContentClick = () => {
    if (local.disabled) return;
    toggle();
  };

  return (
    <div class={listItem} {...rest}>
      <div
        use:ripple={useRipple()}
        class={listItemContent({
          ...objPick(local, listItemContent.variants()),
          hasChildren: hasChildren(),
          hasSelectedIcon: !!local.selectedIcon,
        })}
        data-list-item
        role="treeitem"
        aria-expanded={hasChildren() ? open() : undefined}
        aria-disabled={local.disabled || undefined}
        tabIndex={0}
        onClick={onContentClick}
        onFocus={(e) => {
          const treeRoot = e.currentTarget.closest("[role='tree']");
          treeRoot?.querySelectorAll("[data-list-item]").forEach((el) => {
            (el as HTMLElement).tabIndex = -1;
          });
          e.currentTarget.tabIndex = 0;
        }}
      >
        <Show when={local.selectedIcon && !hasChildren()}>
          {local.selectedIcon?.({ style: selectedIconStyle() })}
        </Show>
        <Show when={local.icon}>{local.icon?.({})}</Show>
        <div
          class={[atoms({ display: "flex", alignItems: "center" }), styleProps.class]
            .filter(Boolean)
            .join(" ")}
          style={combineStyle(styleProps.style, { flex: 1 })}
        >
          {content()}
        </div>
        <Show when={hasChildren() && local.layout !== "flat"}>
          <CollapseIcon icon={IconChevronLeft} open={open()} openRotate={-90} />
        </Show>
      </div>
      <Show when={hasChildren()}>
        <Collapse open={local.layout === "flat" || open()} class={atoms({ py: "xs" })}>
          {nestedList()}
        </Collapse>
      </Show>
    </div>
  );
};
