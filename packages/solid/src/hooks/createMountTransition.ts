import { createSignal, createEffect, onCleanup } from "solid-js";

/**
 * 열림/닫힘 애니메이션을 위한 mount transition 훅
 *
 * @remarks
 * - `open`이 true가 되면 즉시 `mounted=true`, double rAF 후 `animating=true`
 * - `open`이 false가 되면 즉시 `animating=false`, transitionend 또는 fallback 타이머(200ms) 후 `mounted=false`
 * - CSS transition과 함께 사용: `mounted()`로 DOM 렌더링, `animating()`으로 CSS 클래스 전환
 */
export function createMountTransition(open: () => boolean): {
  mounted: () => boolean;
  animating: () => boolean;
  unmount: () => void;
} {
  const [mounted, setMounted] = createSignal(false);
  const [animating, setAnimating] = createSignal(false);

  createEffect(() => {
    if (open()) {
      setMounted(true);
      let rafId1: number;
      let rafId2: number;
      rafId1 = requestAnimationFrame(() => {
        rafId2 = requestAnimationFrame(() => {
          setAnimating(true);
        });
      });
      onCleanup(() => {
        cancelAnimationFrame(rafId1);
        cancelAnimationFrame(rafId2);
      });
    } else if (mounted()) {
      setAnimating(false);
      const fallbackTimer = setTimeout(() => {
        if (!open()) setMounted(false);
      }, 200);
      onCleanup(() => clearTimeout(fallbackTimer));
    }
  });

  const unmount = () => setMounted(false);

  return { mounted, animating, unmount };
}
