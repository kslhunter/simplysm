import { effect, ElementRef, inject } from "@angular/core";

export function setupRipple(enableFn?: () => boolean): void {
  const elRef = inject<ElementRef<HTMLElement>>(ElementRef);

  effect((onCleanup) => {
    const el = elRef.nativeElement;

    Object.assign(el.style, {
      position: "relative",
      overflow: "hidden",
    });

    let indicatorEl: HTMLElement | undefined;

    const onPointerDown = (event: PointerEvent): void => {
      if (enableFn !== undefined && !enableFn()) return;

      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (indicatorEl !== undefined) {
        indicatorEl.remove();
      }

      indicatorEl = document.createElement("div");
      Object.assign(indicatorEl.style, {
        position: "absolute",
        pointerEvents: "none",
        borderRadius: "100%",
        background: "var(--trans-light)",

        width: size * 2 + "px",
        height: size * 2 + "px",
        top: y - size + "px",
        left: x - size + "px",

        transition: "var(--animation-duration) linear",
        transitionProperty: "transform, opacity",
        transform: "scale(0.1)",
      });
      el.appendChild(indicatorEl);

      indicatorEl.ontransitionend = (ev: TransitionEvent) => {
        if (ev.propertyName === "opacity" && indicatorEl !== undefined) {
          indicatorEl.remove();
          indicatorEl = undefined;
        }
      };

      requestAnimationFrame(() => {
        if (indicatorEl !== undefined) {
          indicatorEl.style.transform = "scale(1)";
        }
      });
    };

    const onPointerUp = (): void => {
      if (indicatorEl !== undefined) {
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
