import { createContext, useContext, type Accessor, type Setter } from "solid-js";

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

export const SidebarContext = createContext<SidebarContextValue>();

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
