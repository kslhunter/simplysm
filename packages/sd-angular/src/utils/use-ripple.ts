import { injectElementRef } from "./dom/element-ref.injector";
import { $effect } from "./hooks/hooks";

export function useRipple(enableFn?: () => boolean) {
  const _elRef = injectElementRef<HTMLElement>();

  $effect([], (onCleanup) => {
    const el = _elRef.nativeElement;

    Object.assign(el.style, {
      position: "relative",
      overflow: "hidden",
    });

    let indicatorEl: HTMLElement | undefined;

    const onPointerDown = (event: PointerEvent) => {
      if (enableFn && !enableFn()) return;

      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (indicatorEl) {
        indicatorEl.remove();
      }

      indicatorEl = document.createElement("div");
      Object.assign(indicatorEl.style, {
        position: "absolute",
        pointerEvents: "none",
        borderRadius: "100%",
        background: "var(--trans-light)",

        width: (size * 2) + "px",
        height: (size * 2) + "px",
        top: y - size + "px",
        left: x - size + "px",

        transition: "var(--animation-duration) linear",
        transitionProperty: "transform, opacity",
        transform: "scale(0.1)",
      });
      el.appendChild(indicatorEl);

      indicatorEl.ontransitionend = () => {
        if (indicatorEl && getComputedStyle(indicatorEl).opacity === "0") {
          indicatorEl.remove();
        }
      };

      requestAnimationFrame(() => {
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
    });
  });
}
