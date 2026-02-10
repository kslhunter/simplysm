import clsx from "clsx";
import { borderDefault, type ComponentSize, paddingLg, paddingSm } from "../../styles/tokens.styles";
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
};

export const chevronWrapperClass = clsx("opacity-30", "hover:opacity-100");
