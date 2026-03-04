import clsx from "clsx";
import { borderDefault } from "../../../styles/base.styles";
import { type ComponentSize, disabledOpacity, gap, padding } from "../../../styles/control.styles";

export type CheckboxSize = ComponentSize;

// wrapper base styles
export const checkboxBaseClass = clsx(
  "inline-flex items-center gap-2",
  "whitespace-nowrap",
  "cursor-pointer",
  "border border-transparent",
  "rounded",
  "focus:outline-none",
  "focus-visible:ring-2",
);

// Indicator base styles
export const indicatorBaseClass = clsx(
  "flex shrink-0 items-center justify-center",
  "size-4",
  "border",
  borderDefault,
  // bgSurface,
  "bg-primary-50 dark:bg-primary-950/30",
  "transition-colors",
);

// Checked state styles (primary fixed)
export const checkedClass = clsx("border-primary-500 bg-primary-500", "text-white");

// Size-specific styles
export const checkboxSizeClasses: Record<CheckboxSize, string> = {
  default: clsx("h-field", padding.default),
  xs: clsx("h-field-xs", padding.xs),
  sm: clsx("h-field-sm", padding.sm),
  lg: clsx("h-field-lg", padding.lg),
  xl: clsx("h-field-xl", padding.xl),
};

// Inset styles
export const checkboxInsetClass = clsx(
  "w-full rounded-none border-none",
  "h-field-inset justify-center bg-transparent",
  "focus:[outline-style:solid]",
  "focus:outline-1 focus:-outline-offset-1",
  "focus:outline-primary-400 dark:focus:outline-primary-400",
);

// Inset size-specific heights (excluding 2px border)
export const checkboxInsetSizeHeightClasses: Record<CheckboxSize, string> = {
  default: clsx`h-field-inset`,
  xs: clsx`h-field-inset-xs`,
  sm: clsx`h-field-inset-sm`,
  lg: clsx`h-field-inset-lg`,
  xl: clsx`h-field-inset-xl`,
};

// Inline styles
export const checkboxInlineClass = clsx("!h-auto", "!p-0", gap.default);

// Disabled styles
export const checkboxDisabledClass = clsx(disabledOpacity);
