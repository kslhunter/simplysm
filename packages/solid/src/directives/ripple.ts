import { type Accessor, onCleanup } from "solid-js";

declare module "solid-js" {
  namespace JSX {
    interface Directives {
      ripple: boolean;
    }
  }
}

/**
 * Ripple 효과를 추가하는 directive.
 * 요소 클릭 시 물결 애니메이션을 표시한다.
 *
 * @param el - ripple 효과를 적용할 요소
 * @param accessor - ripple 활성화 여부를 반환하는 accessor
 *
 * @example
 * ```tsx
 * <button use:ripple={true}>Click me</button>
 * ```
 */
export function ripple(el: HTMLElement, accessor: Accessor<boolean>) {
  let rippleEl: HTMLSpanElement | null = null;
  let styleApplied = false;

  const release = () => {
    if (rippleEl) {
      rippleEl.style.opacity = "0";
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    if (!accessor()) return;

    // 첫 pointerdown에서 스타일 확인 및 적용 (DOM 연결 후 getComputedStyle 사용)
    if (!styleApplied) {
      const computed = getComputedStyle(el);
      if (computed.position === "static") {
        el.style.position = "relative";
      }
      if (computed.overflow !== "hidden") {
        el.style.overflow = "hidden";
      }
      styleApplied = true;
    }

    // 기존 ripple 정리
    rippleEl?.remove();

    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    rippleEl = document.createElement("span");
    Object.assign(rippleEl.style, {
      position: "absolute",
      width: `${size}px`,
      height: `${size}px`,
      left: `${x}px`,
      top: `${y}px`,
      borderRadius: "50%",
      background: "var(--color-ripple)",
      pointerEvents: "none",
      transform: "scale(0)",
      opacity: "1",
      transition: "transform 300ms ease-out, opacity 200ms ease-out",
      willChange: "transform",
    });

    rippleEl.addEventListener("transitionend", (te) => {
      if (te.propertyName === "opacity") {
        rippleEl?.remove();
        rippleEl = null;
      }
    });

    el.appendChild(rippleEl);

    // 다음 프레임에서 scale 애니메이션 시작
    requestAnimationFrame(() => {
      if (rippleEl) {
        rippleEl.style.transform = "scale(1)";
      }
    });
  };

  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);
  el.addEventListener("pointerleave", release);

  onCleanup(() => {
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointerup", release);
    el.removeEventListener("pointercancel", release);
    el.removeEventListener("pointerleave", release);
    rippleEl?.remove();
  });
}
