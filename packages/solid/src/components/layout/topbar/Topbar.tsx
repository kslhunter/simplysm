import { type JSX, type ParentComponent, splitProps, Show } from "solid-js";
import { IconMenu2 } from "@tabler/icons-solidjs";
import clsx from "clsx";
import { Icon } from "../../display/Icon";
import { twMerge } from "tailwind-merge";
import { Button } from "../../form-control/Button";
import { useSidebarContextOptional } from "../sidebar/SidebarContext";
import { TopbarActions } from "./TopbarActions";
import { TopbarContainer } from "./TopbarContainer";
import { TopbarMenu } from "./TopbarMenu";
import { TopbarUser } from "./TopbarUser";

export type { TopbarContainerProps } from "./TopbarContainer";
export type { TopbarMenuItem, TopbarMenuProps } from "./TopbarMenu";
export type { TopbarUserMenu, TopbarUserProps } from "./TopbarUser";

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

const TopbarBase: ParentComponent<TopbarProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);

  // Optional use of SidebarContext (toggle button not shown if Context doesn't exist)
  const sidebarContext = useSidebarContextOptional();

  const handleToggle = () => {
    sidebarContext?.setToggle((v) => !v);
  };

  const getClassName = () => twMerge(baseClass, local.class);

  return (
    <header {...rest} data-topbar class={getClassName()}>
      <Show when={sidebarContext}>
        <Button variant="ghost" onClick={handleToggle} class="p-2" aria-label="Toggle sidebar">
          <Icon icon={IconMenu2} size="1.5em" />
        </Button>
      </Show>
      {local.children}
    </header>
  );
};

export const Topbar = TopbarBase as TopbarComponent;
Topbar.Actions = TopbarActions;
Topbar.Container = TopbarContainer;
Topbar.Menu = TopbarMenu;
Topbar.User = TopbarUser;
