import { type JSX, type ParentComponent, splitProps, createMemo } from "solid-js";
import { createMediaQuery } from "@solid-primitives/media";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { useSidebarContext, SM_MEDIA_QUERY } from "./SidebarContext";
import { mergeStyles } from "../../../helpers/mergeStyles";
import { SidebarContainer } from "./SidebarContainer";
import { SidebarMenu } from "./SidebarMenu";
import { SidebarUser } from "./SidebarUser";

export type { SidebarContainerProps } from "./SidebarContainer";
export type { SidebarMenuProps } from "./SidebarMenu";
export type { SidebarUserMenu, SidebarUserProps } from "./SidebarUser";

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

const SidebarBase: ParentComponent<SidebarProps> = (props) => {
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

export const Sidebar = SidebarBase as SidebarComponent;
Sidebar.Container = SidebarContainer;
Sidebar.Menu = SidebarMenu;
Sidebar.User = SidebarUser;
