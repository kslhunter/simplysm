import {
  type Component,
  type JSX,
  For,
  Show,
  splitProps,
  createSignal,
  createMemo,
  createEffect,
  createContext,
  useContext,
  type Accessor,
} from "solid-js";
import { useLocation, useNavigate } from "@solidjs/router";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import type { IconProps } from "@tabler/icons-solidjs";
import type { ComponentSize } from "../../../styles/tokens.styles";
import { Icon } from "../../display/Icon";
import { List } from "../../data/list/List";
import { ListItem } from "../../data/list/ListItem";

const headerClass = clsx(
  "px-4",
  "py-2",
  "text-xs",
  "font-bold",
  "text-base-500",
  "dark:text-base-400",
  "uppercase",
  "tracking-wider",
);

export interface SidebarMenuItem {
  title: string;
  href?: string;
  icon?: Component<IconProps>;
  children?: SidebarMenuItem[];
}

export interface SidebarMenuProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * 메뉴 아이템 배열
   */
  menus: SidebarMenuItem[];
}

// 내부 Context: 초기 펼침 상태 공유
interface MenuContextValue {
  initialOpenItems: Accessor<Set<SidebarMenuItem>>;
}

const MenuContext = createContext<MenuContextValue>();

/**
 * 사이드바 메뉴 컴포넌트
 *
 * @remarks
 * - "MENU" 헤더 고정 표시
 * - List/ListItem으로 재귀적 메뉴 렌더링
 * - pathname 정확 일치로 선택 상태 판단 (query string 무시)
 * - 선택된 메뉴의 부모들은 초기 렌더링 시 자동 펼침
 * - 외부 링크(://포함)는 새 탭에서 열기
 *
 * @example
 * ```tsx
 * <SidebarMenu menus={[
 *   { title: "대시보드", href: "/dashboard", icon: IconHome },
 *   {
 *     title: "설정",
 *     icon: IconSettings,
 *     children: [
 *       { title: "프로필", href: "/settings/profile" },
 *       { title: "보안", href: "/settings/security" },
 *     ],
 *   },
 * ]} />
 * ```
 */
export const SidebarMenu: Component<SidebarMenuProps> = (props) => {
  const [local, rest] = splitProps(props, ["menus", "class"]);

  const location = useLocation();

  // 현재 pathname과 일치하는 메뉴의 부모들을 찾아 펼침 상태 계산
  const findSelectedPath = (
    menus: SidebarMenuItem[],
    pathname: string,
    path: SidebarMenuItem[] = [],
  ): SidebarMenuItem[] | null => {
    for (const menu of menus) {
      const currentPath = [...path, menu];
      if (menu.href === pathname) {
        return currentPath;
      }
      if (menu.children) {
        const found = findSelectedPath(menu.children, pathname, currentPath);
        if (found) return found;
      }
    }
    return null;
  };

  // pathname 변경에 반응하여 펼침 상태 재계산
  const initialOpenItems = createMemo(() => {
    const selectedPath = findSelectedPath(local.menus, location.pathname);
    return selectedPath
      ? new Set(selectedPath.slice(0, -1)) // 마지막 항목(선택된 메뉴)은 제외하고 부모들만 펼침
      : new Set<SidebarMenuItem>();
  });

  const getClassName = () => twMerge("flex-1 overflow-y-auto", local.class);

  return (
    <MenuContext.Provider value={{ initialOpenItems }}>
      <div {...rest} data-sidebar-menu class={getClassName()}>
        <div class={headerClass}>MENU</div>
        <List inset>
          <For each={local.menus}>{(menu) => <MenuItem menu={menu} size="lg" />}</For>
        </List>
      </div>
    </MenuContext.Provider>
  );
};

interface MenuItemProps {
  menu: SidebarMenuItem;
  size?: ComponentSize;
}

const MenuItem: Component<MenuItemProps> = (props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const menuContext = useContext(MenuContext)!;

  const hasChildren = () => props.menu.children !== undefined && props.menu.children.length > 0;

  // 외부 링크 여부 확인
  const isExternalLink = () => props.menu.href?.includes("://") ?? false;

  // 선택 상태
  const isSelected = () => props.menu.href === location.pathname;

  // 펼침 상태 계산 (object reference로 비교)
  const shouldBeOpen = () => menuContext.initialOpenItems().has(props.menu);

  const [open, setOpen] = createSignal(false);

  // pathname 변경에 반응하여 펼침 상태 업데이트
  createEffect(() => {
    if (shouldBeOpen()) {
      setOpen(true);
    }
  });

  const handleClick = () => {
    if (hasChildren()) {
      setOpen((v) => !v);
    } else if (props.menu.href !== undefined) {
      if (isExternalLink()) {
        window.open(props.menu.href, "_blank", "noopener,noreferrer");
      } else {
        navigate(props.menu.href);
      }
    }
  };

  return (
    <ListItem
      selected={isSelected()}
      open={open()}
      onOpenChange={setOpen}
      onClick={handleClick}
      size={props.size}
    >
      <Show when={props.menu.icon}>
        <Icon icon={props.menu.icon!} />
      </Show>
      <span class="truncate">{props.menu.title}</span>
      <Show when={hasChildren()}>
        <ListItem.Children>
          <For each={props.menu.children}>{(child) => <MenuItem menu={child} />}</For>
        </ListItem.Children>
      </Show>
    </ListItem>
  );
};
