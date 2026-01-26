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
 * @remarks
 * 이 directive는 적용된 요소의 `overflow`를 `hidden`으로 설정한다.
 * 따라서 스크롤이 필요한 요소에 적용하면 스크롤이 동작하지 않을 수 있다.
 *
 * @example
 * ```tsx
 * <button use:ripple={true}>Click me</button>
 * ```
 */
export function ripple(el: HTMLElement, accessor: Accessor<boolean>) {
  let rippleEl: HTMLSpanElement | null = null;
  let styleApplied = false;
  let rafId: number | null = null;

  // ripple 요소 표시 (중첩 ripple 처리용)
  el.setAttribute("data-sd-ripple", "");

  const release = () => {
    if (rippleEl) {
      rippleEl.style.opacity = "0";
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    if (!accessor()) return;

    // 이벤트 대상에서 가장 가까운 ripple 요소가 현재 요소인지 확인
    // (중첩된 ripple 요소에서 버블링으로 인한 중복 트리거 방지)
    const target = e.target as HTMLElement;
    const closestRipple = target.closest("[data-sd-ripple]");
    if (closestRipple !== el) return;

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

    const handleTransitionEnd = (te: TransitionEvent) => {
      if (te.propertyName === "opacity") {
        rippleEl?.removeEventListener("transitionend", handleTransitionEnd);
        rippleEl?.remove();
        rippleEl = null;
      }
    };
    rippleEl.addEventListener("transitionend", handleTransitionEnd);

    el.appendChild(rippleEl);

    // 다음 프레임에서 scale 애니메이션 시작
    rafId = requestAnimationFrame(() => {
      if (rippleEl) {
        rippleEl.style.transform = "scale(1)";
      }
      rafId = null;
    });
  };

  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);
  el.addEventListener("pointerleave", release);

  onCleanup(() => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
    el.removeAttribute("data-sd-ripple");
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointerup", release);
    el.removeEventListener("pointercancel", release);
    el.removeEventListener("pointerleave", release);
    rippleEl?.remove();
    rippleEl = null;
  });
}
