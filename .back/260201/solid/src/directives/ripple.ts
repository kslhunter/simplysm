import { createEventListener } from "@solid-primitives/event-listener";
import { onCleanup } from "solid-js";
import { rippleOut, rippleStyle } from "./ripple.css";

/**
 * 요소가 offset 기준 요소인지 확인 (position: relative/absolute/fixed/sticky)
 */
function isOffsetElement(el: Element): boolean {
  return ["relative", "absolute", "fixed", "sticky"].includes(getComputedStyle(el).position);
}

/**
 * ripple 디렉티브 옵션
 */
export interface RippleOptions {
  /**
   * ripple 효과 활성화 여부 (기본값: true)
   */
  enabled?: boolean;
  /**
   * 이벤트 전파를 중단할지 여부 (기본값: false)
   * true로 설정하면 부모 요소의 ripple 효과를 방지할 수 있다
   */
  stopPropagation?: boolean;
}

declare module "solid-js" {
  namespace JSX {
    interface Directives {
      ripple: boolean | RippleOptions;
    }
  }
}

/**
 * Material Design 스타일의 ripple 효과를 적용하는 디렉티브
 *
 * 클릭 시 클릭 위치에서 원형으로 퍼지는 시각적 피드백을 제공한다.
 * 요소의 position이 static인 경우 relative로 변경하고, overflow를 hidden으로 설정한다.
 *
 * @param el - ripple 효과를 적용할 HTML 요소
 * @param value - ripple 활성화 여부를 반환하는 accessor 또는 옵션 객체
 *
 * @example
 * ```tsx
 * // 기본 사용
 * <button use:ripple>클릭</button>
 *
 * // 조건부 활성화
 * <button use:ripple={!disabled()}>클릭</button>
 *
 * // 옵션 사용 (부모 ripple 방지)
 * <button use:ripple={{ enabled: true, stopPropagation: true }}>클릭</button>
 * ```
 */
export const ripple = (el: HTMLElement, value?: () => boolean | RippleOptions) => {
  // 진행 중인 ripple 효과의 AbortController들을 추적
  const activeControllers = new Set<AbortController>();

  // 컴포넌트 언마운트 시 모든 활성 ripple 정리
  onCleanup(() => {
    for (const ac of activeControllers) {
      ac.abort();
    }
    activeControllers.clear();
    // 모든 활성 ripple 요소도 함께 제거
    el.querySelectorAll(`.${rippleStyle}`).forEach((rippleEl) => rippleEl.remove());
  });

  createEventListener(el, "pointerdown", (e: PointerEvent) => {
    const options = value?.();

    // boolean 또는 RippleOptions 처리
    const enabled =
      options === undefined ||
      options === true ||
      (typeof options === "object" && options.enabled !== false);
    const shouldStopPropagation = typeof options === "object" && options.stopPropagation === true;

    if (!enabled) return;

    // stopPropagation 옵션이 true일 때만 이벤트 전파 중단
    if (shouldStopPropagation) {
      e.stopPropagation();
    }
    // 위치 및 overflow 설정
    if (!isOffsetElement(el)) {
      el.style.position = "relative";
    }
    el.style.overflow = "hidden";

    // ripple 크기 및 위치 계산
    const rect = el.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 클릭 위치에서 4개 모서리까지의 거리 중 최대값
    const radius = Math.max(
      Math.hypot(clickX, clickY),
      Math.hypot(rect.width - clickX, clickY),
      Math.hypot(clickX, rect.height - clickY),
      Math.hypot(rect.width - clickX, rect.height - clickY),
    );
    const size = radius * 2;

    // ripple 요소 생성
    const rippleEl = document.createElement("span");
    rippleEl.classList.add(rippleStyle);
    rippleEl.style.width = rippleEl.style.height = `${size}px`;
    rippleEl.style.left = `${clickX - radius}px`;
    rippleEl.style.top = `${clickY - radius}px`;
    el.appendChild(rippleEl);

    // 상태 관리
    let scaleAnimationEnded = false;
    let pointerReleased = false;

    const tryFadeOut = () => {
      if (scaleAnimationEnded && pointerReleased) {
        rippleEl.classList.add(rippleOut);
      }
    };

    // AbortController로 이벤트 리스너 일괄 관리
    const ac = new AbortController();
    activeControllers.add(ac);

    const cleanup = () => {
      ac.abort();
      activeControllers.delete(ac);
      rippleEl.remove();
    };
    const { signal } = ac;

    // 애니메이션 완료 처리
    rippleEl.addEventListener(
      "animationend",
      () => {
        if (rippleEl.classList.contains(rippleOut)) {
          // fadeout 애니메이션 완료 → 제거
          cleanup();
        } else {
          // scale 애니메이션 완료 → fadeout 시도
          scaleAnimationEnded = true;
          tryFadeOut();
        }
      },
      { signal },
    );

    // pointerup/pointercancel 처리
    const onPointerRelease = () => {
      pointerReleased = true;
      tryFadeOut();
    };

    document.addEventListener("pointerup", onPointerRelease, { signal });
    document.addEventListener("pointercancel", onPointerRelease, { signal });
  });
};
