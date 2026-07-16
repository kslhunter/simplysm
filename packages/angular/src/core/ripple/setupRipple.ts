import { effect, ElementRef, inject, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";

export function setupRipple(enableFn?: () => boolean): void {
  // SSR(프리렌더) 가드: 포인터 인터랙션은 브라우저 전용
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

  const elRef = inject<ElementRef<HTMLElement>>(ElementRef);

  effect((onCleanup) => {
    const el = elRef.nativeElement;

    Object.assign(el.style, {
      position: "relative",
      overflow: "hidden",
    });

    let indicatorEl: HTMLElement | undefined;

    const onPointerDown = (event: PointerEvent): void => {
      if (enableFn != null && !enableFn()) return;

      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (indicatorEl != null) {
        indicatorEl.remove();
      }

      indicatorEl = document.createElement("div");
      Object.assign(indicatorEl.style, {
        position: "absolute",
        pointerEvents: "none",
        borderRadius: "100%",
        backgroundColor: "var(--sd-bg-state-active)",

        width: size * 2 + "px",
        height: size * 2 + "px",
        top: y - size + "px",
        left: x - size + "px",

        transition: "calc(2 * var(--sd-animation-duration)) linear",
        transitionProperty: "transform, opacity",
        transform: "scale(0.1)",
      });
      el.appendChild(indicatorEl);

      indicatorEl.ontransitionend = (ev: TransitionEvent) => {
        if (ev.propertyName === "opacity" && indicatorEl != null) {
          indicatorEl.remove();
          indicatorEl = undefined;
        }
      };

      requestAnimationFrame(() => {
        if (indicatorEl != null) {
          indicatorEl.style.transform = "scale(1)";
        }
      });
    };

    const onPointerUp = (): void => {
      if (indicatorEl != null) {
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
