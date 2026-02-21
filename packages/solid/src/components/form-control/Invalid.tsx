import { children, createEffect, createSignal, onCleanup, type ParentComponent } from "solid-js";
import clsx from "clsx";
import "@simplysm/core-browser";

export interface InvalidProps {
  /** Validation error message. Non-empty = invalid. */
  message?: string;
  /** Visual indicator variant */
  variant?: "border" | "dot";
  /** When true, visual display only appears after target loses focus */
  touchMode?: boolean;
}

export const Invalid: ParentComponent<InvalidProps> = (props) => {
  const hiddenInputEl = document.createElement("input");
  hiddenInputEl.type = "text";
  hiddenInputEl.className = clsx(
    "absolute bottom-0 left-1/2",
    "size-px opacity-0",
    "pointer-events-none -z-10",
  );
  hiddenInputEl.autocomplete = "one-time-code";
  hiddenInputEl.tabIndex = -1;
  hiddenInputEl.setAttribute("aria-hidden", "true");

  const [touched, setTouched] = createSignal(false);

  const resolved = children(() => props.children);

  // message 변경 시 setCustomValidity 반응형 업데이트 (touchMode 무관하게 항상)
  createEffect(() => {
    const msg = props.message ?? "";
    hiddenInputEl.setCustomValidity(msg);
  });

  // target에 relative 설정 + hidden input을 target 내부에 삽입
  createEffect(() => {
    const targetEl = resolved.toArray().find((el): el is HTMLElement => el instanceof HTMLElement);
    if (!targetEl) return;

    const computedPosition = getComputedStyle(targetEl).position;
    if (computedPosition === "static") {
      targetEl.style.position = "relative";
    }

    targetEl.appendChild(hiddenInputEl);

    onCleanup(() => {
      if (hiddenInputEl.parentElement === targetEl) {
        targetEl.removeChild(hiddenInputEl);
      }
    });
  });

  // 시각적 표시 처리
  createEffect(() => {
    const variant = props.variant ?? "dot";
    const message = props.message ?? "";
    const touchMode = props.touchMode ?? false;
    const isTouched = touched();

    const targetEl = resolved.toArray().find((el): el is HTMLElement => el instanceof HTMLElement);

    if (!targetEl) return;

    const shouldShow = message !== "" && (!touchMode || isTouched);

    if (variant === "border") {
      if (shouldShow) {
        targetEl.classList.add("border-danger-500");
      } else {
        targetEl.classList.remove("border-danger-500");
      }

      onCleanup(() => {
        targetEl.classList.remove("border-danger-500");
      });
    } else {
      // variant === "dot"
      const existingDot = targetEl.querySelector("[data-invalid-dot]");
      if (existingDot) {
        existingDot.remove();
      }

      if (shouldShow) {
        const dot = document.createElement("span");
        dot.setAttribute("data-invalid-dot", "");
        dot.className = clsx(
          "absolute left-0.5 top-0.5",
          "size-1.5 rounded-full",
          "pointer-events-none bg-danger-500",
        );
        targetEl.appendChild(dot);
      }

      onCleanup(() => {
        const dot = targetEl.querySelector("[data-invalid-dot]");
        if (dot) {
          dot.remove();
        }
      });
    }
  });

  // touchMode: target에 focusout 이벤트 등록하여 touched 상태 추적
  createEffect(() => {
    if (!(props.touchMode ?? false)) return;

    const targetEl = resolved.toArray().find((el): el is HTMLElement => el instanceof HTMLElement);

    if (!targetEl) return;

    const handleFocusOut = () => {
      setTouched(true);
    };

    targetEl.addEventListener("focusout", handleFocusOut);

    onCleanup(() => {
      targetEl.removeEventListener("focusout", handleFocusOut);
    });
  });

  // hidden input 포커스 시 target의 focusable child로 리디렉션
  hiddenInputEl.addEventListener("focus", () => {
    const targetEl = resolved.toArray().find((el): el is HTMLElement => el instanceof HTMLElement);

    if (targetEl) {
      const focusable =
        targetEl.findFirstFocusableChild() ?? (targetEl.tabIndex >= 0 ? targetEl : undefined);
      if (focusable && focusable !== hiddenInputEl) {
        focusable.focus();
      }
    }
  });

  return <>{resolved()}</>;
};
