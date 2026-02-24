import { useNavigate } from "@solidjs/router";

export interface RouterLinkOptions {
  /** Navigation path (complete URL, e.g., "/home/dashboard?tab=1") */
  href: string;

  /** Data to pass during navigation (not exposed in the URL) */
  state?: Record<string, unknown>;

  /** New window size on Shift+click */
  window?: {
    width?: number; // Default: 800
    height?: number; // Default: 800
  };
}

/**
 * Hook that handles router navigation.
 *
 * @remarks
 * - Normal click: SPA routing (useNavigate)
 * - Ctrl/Alt + click: new tab
 * - Shift + click: new window (with window option size applied)
 *
 * @example
 * ```tsx
 * const navigate = useRouterLink();
 *
 * <ListItem onClick={navigate({ href: "/home/dashboard" })}>
 *   Dashboard
 * </ListItem>
 *
 * // Passing state
 * <ListItem onClick={navigate({
 *   href: "/users/123",
 *   state: { from: "list" }
 * })}>
 *   Users
 * </ListItem>
 * ```
 */
export function useRouterLink(): (
  options: RouterLinkOptions,
) => (e: MouseEvent | KeyboardEvent) => void {
  const navigate = useNavigate();

  return (options: RouterLinkOptions) => {
    return (e: MouseEvent | KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey || e.altKey) {
        // Ctrl/Cmd/Alt + click: new tab
        window.open(options.href, "_blank");
      } else if (e.shiftKey) {
        // Shift + click: new window
        const width = options.window?.width ?? 800;
        const height = options.window?.height ?? 800;
        window.open(options.href, "", `width=${width},height=${height}`);
      } else {
        // Normal click: SPA routing
        navigate(options.href, options.state ? { state: options.state } : undefined);
      }
    };
  };
}
