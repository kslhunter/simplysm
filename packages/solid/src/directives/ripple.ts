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
 * 인터랙티브 요소에 ripple 효과를 추가하는 directive.
 *
 * @remarks
 * - 첫 pointerdown 시 스타일 적용 (class 적용 후 시점)
 * - 요소의 position이 `static`일 때만 `relative` 클래스 추가 (cleanup 시 제거)
 * - `overflow-hidden` 클래스 추가 (cleanup 시 제거) - 외부로 넘치는 콘텐츠(툴팁, 배지 등)가 잘릴 수 있음
 * - 단일 ripple 모드: 새 클릭 시 이전 ripple 제거
 * - `prefers-reduced-motion: reduce` 설정 시 ripple 비활성화
 *
 * @example
 * ```tsx
 * <button use:ripple={!props.disabled}>Click me</button>
 * ```
 */
export function ripple(el: HTMLElement, accessor: Accessor<boolean>): void {
  let indicatorEl: HTMLDivElement | undefined;
  let rafId: number | undefined;
  let addedRelative = false;
  let addedOverflowHidden = false;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const onPointerDown = (event: PointerEvent) => {
    if (!accessor()) return;
    if (prefersReducedMotion.matches) return;

    // 첫 ripple 생성 시 스타일 적용 (class가 이미 적용된 후)
    if (!addedOverflowHidden) {
      if (getComputedStyle(el).position === "static") {
        el.classList.add("relative");
        addedRelative = true;
      }
      el.classList.add("overflow-hidden");
      addedOverflowHidden = true;
    }

    if (indicatorEl) {
      indicatorEl.remove();
      indicatorEl = undefined;
    }

    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    indicatorEl = document.createElement("div");
    indicatorEl.classList.add(
      "absolute",
      "pointer-events-none",
      "rounded-full",
      "bg-black/20",
      "dark:bg-white/20",
      "transition-[transform,opacity]",
      "duration-300",
      "ease-out",
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

    el.appendChild(indicatorEl);

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

    if (addedRelative) {
      el.classList.remove("relative");
    }
    if (addedOverflowHidden) {
      el.classList.remove("overflow-hidden");
    }
  });
}
