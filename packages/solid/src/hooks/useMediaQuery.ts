import { type Accessor, createSignal, onCleanup, onMount } from "solid-js";
import { MOBILE_QUERY } from "../constants/breakpoints";

/**
 * 미디어 쿼리 상태를 추적하는 hook
 *
 * @param query - CSS 미디어 쿼리 문자열
 * @returns 미디어 쿼리가 일치하는지 여부
 *
 * @example
 * ```tsx
 * const isMobile = useMediaQuery("(max-width: 520px)");
 * <Show when={isMobile()}>모바일 화면</Show>
 * ```
 */
export function useMediaQuery(query: string): Accessor<boolean> {
  const [matches, setMatches] = createSignal(window.matchMedia(query).matches);

  onMount(() => {
    const mql = window.matchMedia(query);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    onCleanup(() => mql.removeEventListener("change", handler));
  });

  return matches;
}

/**
 * 모바일 화면(520px 이하)인지 감지하는 hook
 *
 * @returns 모바일 화면 여부
 *
 * @example
 * ```tsx
 * const isMobile = useMobile();
 * <Show when={isMobile()}>모바일 화면</Show>
 * ```
 */
export function useMobile(): Accessor<boolean> {
  return useMediaQuery(MOBILE_QUERY);
}
