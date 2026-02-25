import {
  type JSX,
  type ParentComponent,
  Show,
  splitProps,
  createMemo,
  createSignal,
} from "solid-js";
import { useBeforeLeave } from "@solidjs/router";
import { createMediaQuery } from "@solid-primitives/media";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { SidebarContext, SM_MEDIA_QUERY } from "./SidebarContext";
import { mergeStyles } from "../../../helpers/mergeStyles";

const backdropClass = clsx(
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
export const SidebarContainer: ParentComponent<SidebarContainerProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "style"]);

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
            class={backdropClass}
            onClick={handleBackdropClick}
            onKeyDown={(e) => e.key === "Escape" && handleBackdropClick()}
            role="button"
            aria-label="Close sidebar"
            tabIndex={0}
          />
        </Show>
      </div>
    </SidebarContext.Provider>
  );
};
