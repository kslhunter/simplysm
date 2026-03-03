import {
  type JSX,
  type ParentComponent,
  type Component,
  type Accessor,
  type Setter,
  createContext,
  useContext,
  splitProps,
  createMemo,
  createSignal,
  createEffect,
  Show,
  For,
} from "solid-js";
import { useBeforeLeave, useLocation, useNavigate } from "@solidjs/router";
import { createMediaQuery } from "@solid-primitives/media";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import type { IconProps as TablerIconProps } from "@tabler/icons-solidjs";
import { IconUser } from "@tabler/icons-solidjs";
import type { ComponentSize } from "../../../styles/tokens.styles";
import type { AppMenu } from "../../../helpers/createAppStructure";
import { mergeStyles } from "../../../helpers/mergeStyles";
import { ripple } from "../../../directives/ripple";
import { Collapse } from "../../disclosure/Collapse";
import { Icon } from "../../display/Icon";
import { List } from "../../data/list/List";
import { ListItem } from "../../data/list/ListItem";
import { useI18n } from "../../../providers/i18n/I18nContext";

void ripple;

//#region ========== SidebarContext ==========

/**
 * Media query corresponding to Tailwind sm: breakpoint
 * @see tailwind.config.ts screens.sm (640px)
 */
export const SM_MEDIA_QUERY = "(min-width: 640px)";

/**
 * Sidebar toggle state shared Context
 *
 * @remarks
 * toggle semantics:
 * - `toggle=false` (default): open on desktop (640px+), closed on mobile (640px-)
 * - `toggle=true`: closed on desktop (640px+), open on mobile (640px-) as overlay
 */
export interface SidebarContextValue {
  toggle: Accessor<boolean>;
  setToggle: Setter<boolean>;
}

const SidebarContext = createContext<SidebarContextValue>();

export function useSidebarContext(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarContext can only be used inside SidebarContainer");
  }
  return context;
}

/**
 * Optionally use SidebarContext (returns undefined if no Context)
 *
 * @remarks
 * Used in components that can be used outside SidebarContainer (e.g., Topbar)
 */
export function useSidebarContextOptional(): SidebarContextValue | undefined {
  return useContext(SidebarContext);
}

//#endregion

//#region ========== SidebarContainer ==========

const containerBackdropClass = clsx(
  "absolute",
  "top-0",
  "left-0",
  "right-0",
  "bottom-0",
  "z-sidebar-backdrop",
  "bg-black/50",
  "sm:hidden",
);

const containerClass = clsx("relative h-full transition-[padding-left] duration-100");

export interface SidebarContainerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}

/**
 * Sidebar container component
 *
 * @remarks
 * - Acts as container with `position: relative` for Sidebar
 * - Parent element must have height specified (use `h-full`)
 * - Content area's `overflow-auto` must be applied by user
 * - Shares toggle state via SidebarContext.Provider
 * - Toggle state is kept in memory only (reset on page refresh)
 * - On desktop (640px+): uses padding-left + transition to expand/collapse content
 * - On mobile (640px-): renders backdrop and closes on click
 * - Auto closes on mobile when page navigates
 *
 * @example
 * ```tsx
 * <div class="h-screen">
 *   <SidebarContainer>
 *     <Sidebar>
 *       <SidebarUser menus={userMenus}>
 *         <span>User</span>
 *       </SidebarUser>
 *       <SidebarMenu menus={menuItems} />
 *     </Sidebar>
 *     <main class="h-full overflow-auto">Content</main>
 *   </SidebarContainer>
 * </div>
 * ```
 */
const SidebarContainer: ParentComponent<SidebarContainerProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "style"]);

  const i18n = useI18n();
  const [toggle, setToggle] = createSignal(false);

  // Detect Tailwind sm: breakpoint
  const isDesktop = createMediaQuery(SM_MEDIA_QUERY);

  // Calculate sidebar open state
  const isOpen = createMemo(() => {
    if (isDesktop()) {
      return !toggle();
    }
    return toggle();
  });

  // Close on backdrop click
  const handleBackdropClick = () => {
    setToggle(false);
  };

  // Auto-close on page navigation on mobile
  useBeforeLeave(() => {
    if (!isDesktop() && toggle()) {
      setToggle(false);
    }
  });

  // Apply padding-left on desktop when sidebar is open (16rem = w-64)
  const getPaddingLeft = () => {
    if (isDesktop() && isOpen()) {
      return "16rem";
    }
    return undefined;
  };

  const getClassName = () => twMerge(containerClass, local.class);

  return (
    <SidebarContext.Provider value={{ toggle, setToggle }}>
      <div
        {...rest}
        data-sidebar-container
        class={getClassName()}
        style={mergeStyles(local.style, { "padding-left": getPaddingLeft() })}
      >
        {local.children}
        <Show when={!isDesktop() && isOpen()}>
          <div
            class={containerBackdropClass}
            onClick={handleBackdropClick}
            onKeyDown={(e) => e.key === "Escape" && handleBackdropClick()}
            role="button"
            aria-label={i18n.t("sidebar.closeSidebar")}
            tabIndex={0}
          />
        </Show>
      </div>
    </SidebarContext.Provider>
  );
};

//#endregion

//#region ========== SidebarMenu ==========

const menuHeaderClass = clsx(
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
   * Menu items array
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
 *   { title: "Dashboard", href: "/dashboard", icon: IconHome },
 *   {
 *     title: "Settings",
 *     icon: IconSettings,
 *     children: [
 *       { title: "Profile", href: "/settings/profile" },
 *       { title: "Security", href: "/settings/security" },
 *     ],
 *   },
 * ]} />
 * ```
 */
const SidebarMenu: Component<SidebarMenuProps> = (props) => {
  const [local, rest] = splitProps(props, ["menus", "class"]);
  const i18n = useI18n();

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
        <div class={menuHeaderClass}>{i18n.t("sidebarMenu.menu")}</div>
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

//#endregion

//#region ========== SidebarUser ==========

const userContainerClass = clsx("m-2 flex flex-col overflow-hidden rounded bg-white dark:bg-base-900");

const userHeaderClass = clsx(
  "flex",
  "items-center",
  "p-2",
  "m-1",
  "rounded-md",
  "text-left",
  "cursor-pointer",
  "transition-colors",
  "hover:bg-base-500/10",
  "dark:hover:bg-base-800",
);

const userHeaderReadonlyClass = clsx("cursor-default hover:bg-transparent dark:hover:bg-transparent");

const userAvatarClass = clsx(
  "flex size-10 items-center justify-center rounded-full",
  "bg-primary-500 text-white",
);

export interface SidebarUserMenu {
  title: string;
  onClick: () => void;
}

export interface SidebarUserProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onClick"> {
  /**
   * User name (required)
   */
  name: string;

  /**
   * Avatar icon (defaults to user icon if not provided)
   */
  icon?: Component<TablerIconProps>;

  /**
   * Additional information (email, etc.; shows name only if not provided)
   */
  description?: string;

  /**
   * Dropdown menu (clickable only when provided)
   */
  menus?: SidebarUserMenu[];
}

/**
 * Sidebar user information component
 *
 * @remarks
 * - Displays user info via name, icon, description props
 * - Shows default user icon if icon not provided
 * - Shows name only with vertical centering if description not provided
 * - Clickable and ripple effect apply only when menus provided
 * - Click toggles dropdown menu
 *
 * @example
 * ```tsx
 * <SidebarUser
 *   name="John Doe"
 *   description="john@example.com"
 *   menus={[
 *     { title: "Profile", onClick: () => navigate("/profile") },
 *     { title: "Logout", onClick: handleLogout },
 *   ]}
 * />
 * ```
 */
const SidebarUser: Component<SidebarUserProps> = (props) => {
  const [local, rest] = splitProps(props, ["name", "icon", "description", "class", "menus"]);

  const [open, setOpen] = createSignal(false);

  const hasMenus = () => local.menus !== undefined && local.menus.length > 0;

  const handleClick = () => {
    if (hasMenus()) {
      setOpen((v) => !v);
    }
  };

  const handleMenuClick = (menu: SidebarUserMenu) => {
    setOpen(false);
    menu.onClick();
  };

  const getHeaderClassName = () => twMerge(userHeaderClass, !hasMenus() && userHeaderReadonlyClass);

  const getContainerClassName = () => twMerge(userContainerClass, local.class);

  return (
    <div {...rest} data-sidebar-user class={getContainerClassName()}>
      <button
        type="button"
        use:ripple={hasMenus()}
        class={getHeaderClassName()}
        onClick={handleClick}
        aria-expanded={hasMenus() ? open() : undefined}
      >
        <div class="relative flex flex-1 items-center gap-3">
          <div class={userAvatarClass}>
            <Icon icon={local.icon ?? IconUser} class="size-6" />
          </div>
          <Show when={local.description} fallback={<span class="font-bold">{local.name}</span>}>
            <div class="flex flex-col">
              <span class="font-bold">{local.name}</span>
              <span class={clsx("text-sm", "text-base-500 dark:text-base-400")}>
                {local.description}
              </span>
            </div>
          </Show>
        </div>
      </button>
      <Show when={hasMenus()}>
        <Collapse open={open()}>
          <hr class={clsx("border-base-100 dark:border-base-800")} />
          <List inset>
            <For each={local.menus}>
              {(menu) => <ListItem onClick={() => handleMenuClick(menu)}>{menu.title}</ListItem>}
            </For>
          </List>
        </Collapse>
      </Show>
    </div>
  );
};

//#endregion

export type { SidebarContainerProps };
export type { SidebarMenuProps };
export type { SidebarUserMenu, SidebarUserProps };

//#region ========== Sidebar ==========

const baseClass = clsx(
  "absolute",
  "top-0",
  "left-0",
  "bottom-0",
  "w-64",
  "z-sidebar",
  "flex",
  "flex-col",
  "bg-base-100",
  "dark:bg-base-800",
  "border-r",
  "border-base-200",
  "dark:border-base-700",
  "transition-transform",
  "duration-300",
  "sm:duration-100",
);

const mobileOpenClass = clsx("shadow-xl");

export interface SidebarProps extends JSX.HTMLAttributes<HTMLElement> {
  children: JSX.Element;
}

/**
 * Sidebar body component
 *
 * @remarks
 * - Must be used inside SidebarContainer (`position: absolute` dependency)
 * - Reads toggle state from Context to apply open/close animation
 * - Does not include toggle button - controlled externally via useSidebarContext().setToggle
 *
 * @example
 * ```tsx
 * <Sidebar>
 *   <Sidebar.User menus={userMenus}>
 *     <span>User</span>
 *   </Sidebar.User>
 *   <Sidebar.Menu menus={menuItems} />
 * </Sidebar>
 * ```
 */
interface SidebarComponent extends ParentComponent<SidebarProps> {
  Container: typeof SidebarContainer;
  Menu: typeof SidebarMenu;
  User: typeof SidebarUser;
}

const SidebarInner: ParentComponent<SidebarProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "style"]);

  const { toggle } = useSidebarContext();

  // Detect Tailwind sm: breakpoint
  const isDesktop = createMediaQuery(SM_MEDIA_QUERY);

  // Calculate sidebar open state
  const isOpen = createMemo(() => {
    if (isDesktop()) {
      return !toggle();
    }
    return toggle();
  });

  // Calculate transform: hide left when closed
  const getTransform = () => {
    return isOpen() ? "translateX(0)" : "translateX(-100%)";
  };

  const getClassName = () =>
    twMerge(baseClass, !isDesktop() && isOpen() && mobileOpenClass, local.class);

  return (
    <aside
      {...rest}
      data-sidebar
      class={getClassName()}
      style={mergeStyles(local.style, { transform: getTransform() })}
      aria-hidden={!isOpen()}
      inert={!isOpen() || undefined}
    >
      {local.children}
    </aside>
  );
};

//#endregion

//#region ========== Export ==========

export const Sidebar = Object.assign(SidebarInner, {
  Container: SidebarContainer,
  Menu: SidebarMenu,
  User: SidebarUser,
}) as unknown as SidebarComponent;

//#endregion
