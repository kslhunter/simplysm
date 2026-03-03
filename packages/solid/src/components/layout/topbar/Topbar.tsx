import {
  type JSX,
  type ParentComponent,
  type Component,
  splitProps,
  Show,
  createContext,
  useContext,
  onCleanup,
  type Accessor,
  type Setter,
  createSignal,
  createMemo,
  For,
} from "solid-js";
import { IconMenu2, IconChevronDown, IconDotsVertical, type IconProps } from "@tabler/icons-solidjs";
import clsx from "clsx";
import { Icon } from "../../display/Icon";
import { twMerge } from "tailwind-merge";
import { Button } from "../../form-control/Button";
import { useSidebarContextOptional } from "../sidebar/Sidebar";
import { useI18n } from "../../../providers/i18n/I18nContext";
import { useLocation, useNavigate } from "@solidjs/router";
import { Dropdown } from "../../disclosure/Dropdown";
import { List } from "../../data/list/List";
import { ListItem } from "../../data/list/ListItem";

//#region Context
export interface TopbarContextValue {
  actions: Accessor<JSX.Element | undefined>;
  setActions: Setter<JSX.Element | undefined>;
}

export const TopbarContext = createContext<TopbarContextValue>();

export function useTopbarActionsAccessor(): Accessor<JSX.Element | undefined> {
  const context = useContext(TopbarContext);
  if (!context) {
    throw new Error("useTopbarActionsAccessor can only be used inside Topbar.Container");
  }
  return context.actions;
}

export function createTopbarActions(accessor: () => JSX.Element): void {
  const context = useContext(TopbarContext);
  if (!context) {
    throw new Error("createTopbarActions can only be used inside Topbar.Container");
  }

  context.setActions(() => accessor());

  onCleanup(() => {
    context.setActions(undefined);
  });
}
//#endregion

//#region Types
export interface TopbarContainerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}

export interface TopbarMenuItem {
  title: string;
  href?: string;
  icon?: Component<IconProps>;
  children?: TopbarMenuItem[];
}

export interface TopbarMenuProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children"> {
  /**
   * Menu items array
   */
  menus: TopbarMenuItem[];
}

export interface TopbarUserMenu {
  title: string;
  onClick: () => void;
}

export interface TopbarUserProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onClick"> {
  /**
   * Dropdown menu (dropdown shown only when provided)
   */
  menus?: TopbarUserMenu[];

  /**
   * User information area (customizable)
   */
  children: JSX.Element;
}
//#endregion

//#region Topbar (Base)
const baseClass = clsx(
  // Layout
  "flex",
  "flex-row",
  "gap-2",
  "items-center",
  // Size
  "min-h-12",
  "px-2",
  // Background/border
  "bg-white",
  "dark:bg-base-900",
  "border-b",
  "border-base-200",
  "dark:border-base-700",
  // Scroll
  "overflow-x-auto",
  "overflow-y-hidden",
  // Other
  "select-none",
);

export interface TopbarProps extends JSX.HTMLAttributes<HTMLElement> {
  children: JSX.Element;
}

/**
 * Topbar main component
 *
 * @remarks
 * - Automatically shows sidebar toggle button if SidebarContext exists
 * - Toggle button appears when used inside SidebarContainer
 * - Acts as pure Topbar without toggle button when used standalone
 *
 * @example
 * ```tsx
 * <Topbar>
 *   <h1 class="text-lg font-bold">App Name</h1>
 *   <Topbar.Menu menus={menuItems} />
 *   <div class="flex-1" />
 *   <Topbar.User menus={userMenus}>User</Topbar.User>
 * </Topbar>
 * ```
 */
interface TopbarComponent extends ParentComponent<TopbarProps> {
  Actions: typeof TopbarActions;
  Container: typeof TopbarContainer;
  Menu: typeof TopbarMenu;
  User: typeof TopbarUser;
}

const TopbarInner: ParentComponent<TopbarProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);

  // Optional use of SidebarContext (toggle button not shown if Context doesn't exist)
  const sidebarContext = useSidebarContextOptional();
  const i18n = useI18n();

  const handleToggle = () => {
    sidebarContext?.setToggle((v) => !v);
  };

  const getClassName = () => twMerge(baseClass, local.class);

  return (
    <header {...rest} data-topbar class={getClassName()}>
      <Show when={sidebarContext}>
        <Button variant="ghost" onClick={handleToggle} class="p-2" aria-label={i18n.t("topbar.toggleSidebar")}>
          <Icon icon={IconMenu2} size="1.5em" />
        </Button>
      </Show>
      {local.children}
    </header>
  );
};
//#endregion

//#region TopbarContainer
const containerClass = clsx("flex h-full flex-col");

/**
 * Layout container wrapping Topbar and content area
 *
 * @remarks
 * - Uses `flex flex-col h-full` structure to vertically layout Topbar and content
 * - Shares actions state via TopbarContext.Provider
 * - Parent element must have height specified
 *
 * @example
 * ```tsx
 * <TopbarContainer>
 *   <Topbar>
 *     <h1>App Name</h1>
 *     <TopbarMenu menus={menuItems} />
 *   </Topbar>
 *   <main class="flex-1 overflow-auto">Content</main>
 * </TopbarContainer>
 * ```
 */
const TopbarContainer: ParentComponent<TopbarContainerProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);
  const [actions, setActions] = createSignal<JSX.Element | undefined>(undefined);

  const getClassName = () => twMerge(containerClass, local.class);

  return (
    <TopbarContext.Provider value={{ actions, setActions }}>
      <div {...rest} data-topbar-container class={getClassName()}>
        {local.children}
      </div>
    </TopbarContext.Provider>
  );
};
//#endregion

//#region TopbarMenu
const desktopNavBaseClass = clsx("hidden sm:flex", "flex-row gap-1", "items-center");
const mobileWrapperClass = clsx("flex sm:hidden");
const menuButtonContentClass = clsx("flex items-center", "gap-1");

/**
 * Topbar dropdown menu component
 *
 * @remarks
 * - Items with children: show dropdown on click
 * - Items without children: navigate directly on click
 * - External links (containing ://): open in new tab
 * - Selection determined by exact pathname match
 * - Submenus rendered with List/ListItem (all levels expanded)
 *
 * @example
 * ```tsx
 * <TopbarMenu menus={[
 *   { title: "Dashboard", href: "/dashboard", icon: IconHome },
 *   {
 *     title: "Menu 1",
 *     icon: IconFolder,
 *     children: [
 *       { title: "Submenu 1", href: "/menu1/sub1" },
 *       { title: "Submenu 2", href: "/menu1/sub2" },
 *     ],
 *   },
 * ]} />
 * ```
 */
const TopbarMenu: Component<TopbarMenuProps> = (props) => {
  const [local, rest] = splitProps(props, ["menus", "class"]);
  const [mobileMenuOpen, setMobileMenuOpen] = createSignal(false);
  const i18n = useI18n();

  return (
    <>
      {/* Desktop menu (shown only on 640px and above) */}
      <nav {...rest} data-topbar-menu class={twMerge(desktopNavBaseClass, local.class)}>
        <For each={local.menus}>{(menu) => <TopbarMenuButton menu={menu} />}</For>
      </nav>

      {/* Mobile hamburger (shown only below 640px) */}
      <div class={mobileWrapperClass}>
        <Dropdown open={mobileMenuOpen()} onOpenChange={setMobileMenuOpen}>
          <Dropdown.Trigger>
            <Button
              variant="ghost"
              aria-label={i18n.t("topbarMenu.menu")}
              aria-haspopup="menu"
              aria-expanded={mobileMenuOpen()}
            >
              <Icon icon={IconDotsVertical} size="1.25em" />
            </Button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <List inset>
              <For each={local.menus}>
                {(menu) => (
                  <TopbarMenuDropdownItem menu={menu} onClose={() => setMobileMenuOpen(false)} />
                )}
              </For>
            </List>
          </Dropdown.Content>
        </Dropdown>
      </div>
    </>
  );
};

interface TopbarMenuButtonProps {
  menu: TopbarMenuItem;
}

const TopbarMenuButton: Component<TopbarMenuButtonProps> = (props) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = createSignal(false);

  const hasChildren = () => props.menu.children !== undefined && props.menu.children.length > 0;
  const isExternalLink = () => props.menu.href?.includes("://") ?? false;

  const isAnyChildSelected = (items: TopbarMenuItem[]): boolean => {
    for (const item of items) {
      if (item.href === location.pathname) return true;
      if (item.children && isAnyChildSelected(item.children)) return true;
    }
    return false;
  };

  // Check if current menu or submenu is selected (cached with createMemo)
  const isSelected = createMemo(() => {
    if (props.menu.href === location.pathname) return true;
    if (props.menu.children) {
      return isAnyChildSelected(props.menu.children);
    }
    return false;
  });

  const handleNavigate = () => {
    if (props.menu.href !== undefined) {
      if (isExternalLink()) {
        window.open(props.menu.href, "_blank", "noopener,noreferrer");
      } else {
        navigate(props.menu.href);
      }
    }
  };

  const buttonContent = () => (
    <Button
      variant={isSelected() ? "solid" : "ghost"}
      theme={isSelected() ? "primary" : "base"}
      class={menuButtonContentClass}
      aria-haspopup={hasChildren() ? "menu" : undefined}
      aria-expanded={hasChildren() ? open() : undefined}
      onClick={hasChildren() ? undefined : handleNavigate}
    >
      <Show when={props.menu.icon}>
        <Icon icon={props.menu.icon!} />
      </Show>
      <span>{props.menu.title}</span>
      <Show when={hasChildren()}>
        <Icon
          icon={IconChevronDown}
          size="1em"
          class={clsx("transition-transform", open() && "rotate-180")}
        />
      </Show>
    </Button>
  );

  return (
    <Show when={hasChildren()} fallback={buttonContent()}>
      <Dropdown open={open()} onOpenChange={setOpen}>
        <Dropdown.Trigger>{buttonContent()}</Dropdown.Trigger>
        <Dropdown.Content>
          <List inset>
            <For each={props.menu.children}>
              {(child) => <TopbarMenuDropdownItem menu={child} onClose={() => setOpen(false)} />}
            </For>
          </List>
        </Dropdown.Content>
      </Dropdown>
    </Show>
  );
};

interface TopbarMenuDropdownItemProps {
  menu: TopbarMenuItem;
  onClose: () => void;
}

const TopbarMenuDropdownItem: Component<TopbarMenuDropdownItemProps> = (props) => {
  const location = useLocation();
  const navigate = useNavigate();

  const hasChildren = () => props.menu.children !== undefined && props.menu.children.length > 0;
  const isExternalLink = () => props.menu.href?.includes("://") ?? false;
  const isSelected = () => props.menu.href === location.pathname;

  const handleClick = () => {
    if (props.menu.href !== undefined) {
      if (isExternalLink()) {
        window.open(props.menu.href, "_blank", "noopener,noreferrer");
      } else {
        navigate(props.menu.href);
      }
      props.onClose();
    }
    // if no href but has children, clicking doesn't close the menu
  };

  return (
    <ListItem
      selected={isSelected()}
      readonly={props.menu.href === undefined && hasChildren()}
      onClick={handleClick}
    >
      <Show when={props.menu.icon}>
        <Icon icon={props.menu.icon!} />
      </Show>
      <span class="truncate">{props.menu.title}</span>
      <Show when={hasChildren()}>
        <ListItem.Children>
          <For each={props.menu.children}>
            {(child) => <TopbarMenuDropdownItem menu={child} onClose={props.onClose} />}
          </For>
        </ListItem.Children>
      </Show>
    </ListItem>
  );
};
//#endregion

//#region TopbarUser
const wrapperBaseClass = clsx("flex items-center");
const userButtonContentClass = clsx("flex items-center", "gap-1");

/**
 * Topbar user information component
 *
 * @remarks
 * - Customize user info display with children
 * - When menus provided, click shows Dropdown menu
 * - Uses Button's ghost style
 *
 * @example
 * ```tsx
 * <TopbarUser menus={[
 *   { title: "Profile", onClick: () => navigate("/profile") },
 *   { title: "Logout", onClick: handleLogout },
 * ]}>
 *   <span>Username</span>
 * </TopbarUser>
 * ```
 */
const TopbarUser: ParentComponent<TopbarUserProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "menus"]);

  const [open, setOpen] = createSignal(false);

  const hasMenus = () => local.menus !== undefined && local.menus.length > 0;

  const handleMenuClick = (menu: TopbarUserMenu) => {
    setOpen(false);
    menu.onClick();
  };

  const getClassName = () => twMerge(wrapperBaseClass, local.class);

  const buttonContent = () => (
    <Button
      variant="ghost"
      class={userButtonContentClass}
      aria-haspopup={hasMenus() ? "menu" : undefined}
      aria-expanded={hasMenus() ? open() : undefined}
    >
      {local.children}
      <Show when={hasMenus()}>
        <Icon
          icon={IconChevronDown}
          size="1em"
          class={clsx("transition-transform", open() && "rotate-180")}
        />
      </Show>
    </Button>
  );

  return (
    <div {...rest} data-topbar-user class={getClassName()}>
      <Show when={hasMenus()} fallback={buttonContent()}>
        <Dropdown open={open()} onOpenChange={setOpen}>
          <Dropdown.Trigger>{buttonContent()}</Dropdown.Trigger>
          <Dropdown.Content>
            <List inset>
              <For each={local.menus}>
                {(menu) => <ListItem onClick={() => handleMenuClick(menu)}>{menu.title}</ListItem>}
              </For>
            </List>
          </Dropdown.Content>
        </Dropdown>
      </Show>
    </div>
  );
};
//#endregion

//#region TopbarActions
/**
 * Topbar actions display component
 *
 * @remarks
 * - Used inside TopbarContainer
 * - Displays actions set by createTopbarActions()
 */
const TopbarActions: Component = () => {
  const context = useContext(TopbarContext);

  return <span data-topbar-actions>{context?.actions()}</span>;
};
//#endregion

//#region Export
export const Topbar = Object.assign(TopbarInner, {
  Container: TopbarContainer,
  Menu: TopbarMenu,
  User: TopbarUser,
  Actions: TopbarActions,
});
//#endregion
