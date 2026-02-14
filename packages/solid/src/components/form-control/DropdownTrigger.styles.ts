import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { borderDefault, type ComponentSize, paddingLg, paddingSm, paddingXl } from "../../styles/tokens.styles";
import { insetBase, insetFocusOutlineSelf } from "../../styles/patterns.styles";

export const triggerBaseClass = clsx(
  "inline-flex items-center gap-2",
  "w-40",
  "border",
  borderDefault,
  "rounded",
  "bg-transparent",
  "hover:bg-base-100 dark:hover:bg-base-700",
  "cursor-pointer",
  "focus:outline-none",
  "focus-within:border-primary-400 dark:focus-within:border-primary-400",
);

export const triggerDisabledClass = clsx(
  "cursor-default bg-base-200 text-base-400 dark:bg-base-800 dark:text-base-500",
);

export const triggerInsetClass = clsx(insetBase, "bg-transparent", insetFocusOutlineSelf);

export const triggerSizeClasses: Record<ComponentSize, string> = {
  sm: clsx("gap-1.5", paddingSm),
  lg: clsx("gap-3", paddingLg),
  xl: clsx("gap-3.5", paddingXl),
};

export const chevronWrapperClass = clsx("opacity-30", "hover:opacity-100");

/** Select/Combobox 공유 트리거 클래스 빌더 */
export function getTriggerClass(options: {
  size?: ComponentSize;
  disabled?: boolean;
  inset?: boolean;
  class?: string;
}): string {
  return twMerge(
    triggerBaseClass,
    "px-2 py-1",
    options.size && triggerSizeClasses[options.size],
    options.disabled && triggerDisabledClass,
    options.inset && triggerInsetClass,
    options.class,
  );
}
