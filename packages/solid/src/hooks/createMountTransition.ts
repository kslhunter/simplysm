import { createSignal, createEffect, onCleanup } from "solid-js";

/**
 * Mount transition hook for open/close animations.
 *
 * @remarks
 * - When `open` becomes true: immediately sets `mounted=true`, then `animating=true` after double rAF
 * - When `open` becomes false: immediately sets `animating=false`, then `mounted=false` after transitionend or fallback timer (200ms)
 * - Used with CSS transitions: `mounted()` for DOM rendering, `animating()` for CSS class toggling
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
