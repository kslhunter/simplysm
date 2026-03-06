import { children, createEffect, createMemo, createSignal, onCleanup, type ParentComponent } from "solid-js";
import clsx from "clsx";
import "@simplysm/core-browser";

export interface InvalidProps {
  /** Validation error message. Non-empty = invalid. */
  message?: string;
  /** Visual indicator variant */
  variant?: "border" | "dot";
  /** When true, visual display only appears after target loses focus */
  lazyValidation?: boolean;
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

  const targetEl = createMemo(() =>
    resolved.toArray().find((el): el is HTMLElement => el instanceof HTMLElement),
  );

  // Reactively update setCustomValidity when message changes (always, regardless of lazyValidation)
  createEffect(() => {
    const msg = props.message ?? "";
    hiddenInputEl.setCustomValidity(msg);
  });

  // Set target to relative + insert hidden input inside target
  createEffect(() => {
    const el = targetEl();
    if (!el) return;

    const computedPosition = getComputedStyle(el).position;
    if (computedPosition === "static") {
      el.style.position = "relative";
    }

    el.appendChild(hiddenInputEl);

    onCleanup(() => {
      if (hiddenInputEl.parentElement === el) {
        el.removeChild(hiddenInputEl);
      }
    });
  });

  // Handle visual indication
  createEffect(() => {
    const variant = props.variant ?? "dot";
    const message = props.message ?? "";
    const lazyValidation = props.lazyValidation ?? false;
    const isTouched = touched();

    const el = targetEl();

    if (!el) return;

    const shouldShow = message !== "" && (!lazyValidation || isTouched);

    if (variant === "border") {
      if (shouldShow) {
        el.classList.add("border-danger-500");
      } else {
        el.classList.remove("border-danger-500");
      }

      onCleanup(() => {
        el.classList.remove("border-danger-500");
      });
    } else {
      // variant === "dot"
      const existingDot = el.querySelector("[data-invalid-dot]");
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
        el.appendChild(dot);
      }

      onCleanup(() => {
        const dot = el.querySelector("[data-invalid-dot]");
        if (dot) {
          dot.remove();
        }
      });
    }
  });

  // lazyValidation: register focusout event on target to track touched state
  createEffect(() => {
    if (!(props.lazyValidation ?? false)) return;

    const el = targetEl();

    if (!el) return;

    const handleFocusOut = () => {
      setTouched(true);
    };

    el.addEventListener("focusout", handleFocusOut);

    onCleanup(() => {
      el.removeEventListener("focusout", handleFocusOut);
    });
  });

  // Redirect hidden input focus to focusable child of target
  hiddenInputEl.addEventListener("focus", () => {
    const el = targetEl();

    if (el) {
      const focusable =
        el.findFirstFocusableChild() ?? (el.tabIndex >= 0 ? el : undefined);
      if (focusable && focusable !== hiddenInputEl) {
        focusable.focus();
      }
    }
  });

  return <>{resolved()}</>;
};
