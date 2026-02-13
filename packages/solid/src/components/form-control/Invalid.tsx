import { type ParentComponent, createEffect, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import "@simplysm/core-browser";

export interface InvalidProps {
  /** Validation error message. Non-empty = invalid. */
  message?: string;
  /** Custom class */
  class?: string;
}

const indicatorClass = clsx(
  "absolute left-0.5 top-0.5",
  "size-1.5 rounded-full",
  "bg-danger-500",
  "pointer-events-none select-none",
);

const hiddenInputClass = clsx(
  "absolute bottom-0 left-0.5",
  "size-px opacity-0",
  "pointer-events-none -z-10",
  "select-none",
);

export const Invalid: ParentComponent<InvalidProps> = (props) => {
  const [local, rest] = splitProps(props, ["message", "class", "children"]);

  let hiddenInputEl!: HTMLInputElement;

  // message 변경 시 setCustomValidity 반응형 업데이트
  createEffect(() => {
    const msg = local.message ?? "";
    hiddenInputEl.setCustomValidity(msg);
  });

  const handleHiddenInputFocus = (e: FocusEvent) => {
    const container = (e.currentTarget as HTMLElement).parentElement;
    if (!container) return;
    const focusable = container.findFirstFocusableChild();
    if (focusable && focusable !== e.currentTarget) {
      focusable.focus();
    }
  };

  return (
    <div {...rest} class={twMerge("relative inline-block", local.class)}>
      {local.children}
      <div class={indicatorClass} style={{ display: (local.message ?? "") !== "" ? "block" : "none" }} />
      <input
        ref={hiddenInputEl}
        type="text"
        class={hiddenInputClass}
        tabIndex={-1}
        aria-hidden="true"
        onFocus={handleHiddenInputFocus}
      />
    </div>
  );
};
