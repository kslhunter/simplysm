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
import type { ComponentSize } from "../../../styles/tokens.styles";
import type { AppMenu } from "../../../helpers/createAppStructure";
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

export interface SidebarMenuProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * 메뉴 아이템 배열
   */
  menus: AppMenu[];
}

// Internal Context: share initial open state
interface MenuContextValue {
  initialOpenItems: Accessor<Set<AppMenu>>;
}

const MenuContext = createContext<MenuContextValue>();

/**
 * Sidebar menu component
 *
 * @remarks
 * - "MENU" header always shown
 * - Recursive menu rendering with List/ListItem
 * - Selection state determined by exact pathname match (ignores query string)
 * - Parent items of selected menu automatically open on initial render
 * - External links (containing ://) open in new tab
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

  // Find parents of menu matching current pathname and calculate open state
  const findSelectedPath = (
    menus: AppMenu[],
    pathname: string,
    path: AppMenu[] = [],
  ): AppMenu[] | null => {
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

  // Recalculate open state in response to pathname change
  const initialOpenItems = createMemo(() => {
    const selectedPath = findSelectedPath(local.menus, location.pathname);
    return selectedPath
      ? new Set(selectedPath.slice(0, -1)) // Open parents only, exclude last item (selected menu)
      : new Set<AppMenu>();
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
  menu: AppMenu;
  size?: ComponentSize;
}

const MenuItem: Component<MenuItemProps> = (props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const menuContext = useContext(MenuContext)!;

  const hasChildren = () => props.menu.children !== undefined && props.menu.children.length > 0;

  // Check if external link
  const isExternalLink = () => props.menu.href?.includes("://") ?? false;

  // Selection state
  const isSelected = () => props.menu.href === location.pathname;

  // Calculate open state (compare by object reference)
  const shouldBeOpen = () => menuContext.initialOpenItems().has(props.menu);

  const [open, setOpen] = createSignal(false);

  // Update open state in response to pathname change
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
