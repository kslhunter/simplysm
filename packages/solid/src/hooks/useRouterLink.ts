import { useNavigate } from "@solidjs/router";

export interface RouterLinkOptions {
  /** 이동할 경로 (완성된 URL, 예: "/home/dashboard?tab=1") */
  href: string;

  /** 페이지 이동 시 전달할 데이터 (URL에 노출되지 않음) */
  state?: Record<string, unknown>;

  /** Shift+클릭 시 새 창 크기 */
  window?: {
    width?: number; // 기본값: 800
    height?: number; // 기본값: 800
  };
}

/**
 * 라우터 네비게이션을 처리하는 hook
 *
 * @remarks
 * - 일반 클릭: SPA 라우팅 (useNavigate)
 * - Ctrl/Alt + 클릭: 새 탭
 * - Shift + 클릭: 새 창 (window 옵션 크기 적용)
 *
 * @example
 * ```tsx
 * const navigate = useRouterLink();
 *
 * <ListItem onClick={navigate({ href: "/home/dashboard" })}>
 *   대시보드
 * </ListItem>
 *
 * // state 전달
 * <ListItem onClick={navigate({
 *   href: "/users/123",
 *   state: { from: "list" }
 * })}>
 *   사용자
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
        // Ctrl/Cmd/Alt + 클릭: 새 탭
        window.open(options.href, "_blank");
      } else if (e.shiftKey) {
        // Shift + 클릭: 새 창
        const width = options.window?.width ?? 800;
        const height = options.window?.height ?? 800;
        window.open(options.href, "", `width=${width},height=${height}`);
      } else {
        // 일반 클릭: SPA 라우팅
        navigate(options.href, options.state ? { state: options.state } : undefined);
      }
    };
  };
}
