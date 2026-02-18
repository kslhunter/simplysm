import { type ParentComponent, children, createEffect, createSignal, onCleanup } from "solid-js";
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
  let hiddenInputEl!: HTMLInputElement;

  const [touched, setTouched] = createSignal(false);

  const resolved = children(() => props.children);

  // message 변경 시 setCustomValidity 반응형 업데이트 (touchMode 무관하게 항상)
  createEffect(() => {
    const msg = props.message ?? "";
    hiddenInputEl.setCustomValidity(msg);
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
      // 기존 dot 제거 후 재삽입 (shouldShow 변경 시 상태 동기화)
      const existingDot = targetEl.querySelector("[data-invalid-dot]");
      if (existingDot) {
        existingDot.remove();
      }

      if (shouldShow) {
        // target position이 static이면 absolute dot이 올바르게 위치하도록 relative로 변경
        const computedPosition = getComputedStyle(targetEl).position;
        if (computedPosition === "static") {
          targetEl.style.position = "relative";
        }

        const dot = document.createElement("span");
        dot.setAttribute("data-invalid-dot", "");
        dot.style.cssText =
          "position:absolute; top:2px; right:2px; width:6px; height:6px; border-radius:50%; background:red; pointer-events:none;";
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

  const handleHiddenInputFocus = (e: FocusEvent) => {
    const hiddenInput = e.currentTarget as HTMLElement;
    const targetEl = resolved.toArray().find((el): el is HTMLElement => el instanceof HTMLElement);

    if (targetEl) {
      const focusable =
        targetEl.findFirstFocusableChild() ?? (targetEl.tabIndex >= 0 ? targetEl : undefined);
      if (focusable && focusable !== hiddenInput) {
        focusable.focus();
      }
    }
  };

  return (
    <>
      {resolved()}
      <input
        ref={hiddenInputEl}
        type="text"
        style={{
          "position": "absolute",
          "bottom": "0",
          "left": "2px",
          "width": "1px",
          "height": "1px",
          "opacity": "0",
          "pointer-events": "none",
          "z-index": "-10",
        }}
        autocomplete="off"
        tabIndex={-1}
        aria-hidden="true"
        onFocus={handleHiddenInputFocus}
      />
    </>
  );
};
