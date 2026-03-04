import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { borderDefault } from "../../styles/base.styles";
import { type ComponentSize, gap, padding } from "../../styles/control.styles";

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

export const triggerInsetClass = clsx(
  "w-full rounded-none border-none",
  "bg-transparent",
  "focus:[outline-style:solid]",
  "focus:outline-1 focus:-outline-offset-1",
  "focus:outline-primary-400 dark:focus:outline-primary-400",
);

export const triggerSizeClasses: Record<ComponentSize, string> = {
  default: clsx(gap.default, padding.default),
  xs: clsx(gap.xs, padding.xs),
  sm: clsx(gap.sm, padding.sm),
  lg: clsx(gap.lg, padding.lg),
  xl: clsx(gap.xl, padding.xl),
};

export const chevronWrapperClass = clsx("opacity-30", "hover:opacity-100");

/** Select/Combobox shared trigger class builder */
export function getTriggerClass(options: {
  size?: ComponentSize;
  disabled?: boolean;
  inset?: boolean;
  class?: string;
}): string {
  return twMerge(
    triggerBaseClass,
    triggerSizeClasses[options.size ?? "default"],
    options.disabled && triggerDisabledClass,
    options.inset && triggerInsetClass,
    options.class,
  );
}
