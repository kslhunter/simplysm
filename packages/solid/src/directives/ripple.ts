import type { Accessor } from "solid-js";
import { onCleanup } from "solid-js";

declare module "solid-js" {
  namespace JSX {
    interface Directives {
      ripple: boolean;
    }
  }
}

/**
 * Directive that adds a ripple effect to interactive elements.
 *
 * @remarks
 * - Creates an internal ripple-container div with overflow: hidden (no impact on parent element)
 * - Changes position to `relative` only when the element is `static` (restores original value on cleanup)
 * - Single ripple mode: removes the previous ripple on new click
 * - Disables ripple when `prefers-reduced-motion: reduce` is set
 *
 * @example
 * ```tsx
 * <button use:ripple={!props.disabled}>Click me</button>
 * ```
 */
export function ripple(el: HTMLElement, accessor: Accessor<boolean>): void {
  let containerEl: HTMLDivElement | undefined;
  let indicatorEl: HTMLDivElement | undefined;
  let rafId: number | undefined;
  let originalPosition: string | undefined;
  let positionApplied = false;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Create ripple container (handles overflow: hidden internally)
  const ensureContainer = () => {
    if (containerEl) return containerEl;

    containerEl = document.createElement("div");
    containerEl.style.cssText =
      "position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden; pointer-events: none; border-radius: inherit;";
    el.appendChild(containerEl);

    return containerEl;
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!accessor()) return;
    if (prefersReducedMotion.matches) return;

    // Check and apply position (required for container placement)
    if (getComputedStyle(el).position === "static") {
      if (!positionApplied) originalPosition = el.style.position;
      el.style.position = "relative";
      positionApplied = true;
    }

    const container = ensureContainer();

    if (indicatorEl) {
      indicatorEl.remove();
      indicatorEl = undefined;
    }

    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Use the distance from the click position to the farthest corner as the radius
    const maxDist = Math.max(
      Math.hypot(x, y),
      Math.hypot(rect.width - x, y),
      Math.hypot(x, rect.height - y),
      Math.hypot(rect.width - x, rect.height - y),
    );
    const size = maxDist * 2;

    indicatorEl = document.createElement("div");
    indicatorEl.classList.add(
      "absolute",
      "pointer-events-none",
      "rounded-full",
      "bg-black/20",
      "dark:bg-white/20",
      "transition-[transform,opacity]",
      "duration-500",
      "ease-in-out",
    );
    Object.assign(indicatorEl.style, {
      width: `${size}px`,
      height: `${size}px`,
      top: `${y - size / 2}px`,
      left: `${x - size / 2}px`,
      transform: "scale(0)",
      opacity: "1",
    });

    indicatorEl.addEventListener("transitionend", (e) => {
      if (e.propertyName === "opacity" && indicatorEl && indicatorEl.style.opacity === "0") {
        indicatorEl.remove();
        indicatorEl = undefined;
      }
    });

    container.appendChild(indicatorEl);

    rafId = requestAnimationFrame(() => {
      rafId = undefined;
      if (indicatorEl) {
        indicatorEl.style.transform = "scale(1)";
      }
    });
  };

  const onPointerUp = () => {
    if (indicatorEl) {
      indicatorEl.style.opacity = "0";
    }
  };

  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointerup", onPointerUp);
  el.addEventListener("pointercancel", onPointerUp);
  el.addEventListener("pointerleave", onPointerUp);

  onCleanup(() => {
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointerup", onPointerUp);
    el.removeEventListener("pointercancel", onPointerUp);
    el.removeEventListener("pointerleave", onPointerUp);

    if (rafId !== undefined) {
      cancelAnimationFrame(rafId);
      rafId = undefined;
    }

    if (indicatorEl) {
      indicatorEl.remove();
      indicatorEl = undefined;
    }

    if (containerEl) {
      containerEl.remove();
      containerEl = undefined;
    }

    if (positionApplied && originalPosition !== undefined) {
      el.style.position = originalPosition;
    }
  });
}
