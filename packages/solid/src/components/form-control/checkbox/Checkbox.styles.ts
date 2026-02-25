import clsx from "clsx";
import {
  borderDefault,
  type ComponentSize,
  disabledOpacity,
  paddingLg,
  paddingSm,
  paddingXl,
  paddingXs,
} from "../../../styles/tokens.styles";
import { insetBase, insetFocusOutlineSelf } from "../../../styles/patterns.styles";

export type CheckboxSize = ComponentSize;

// wrapper base styles
export const checkboxBaseClass = clsx(
  "inline-flex items-center gap-2",
  "whitespace-nowrap",
  "cursor-pointer",
  "px-2 py-1",
  "h-field",
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
  xs: clsx("h-field-xs", paddingXs),
  sm: clsx("h-field-sm", paddingSm),
  lg: clsx("h-field-lg", paddingLg),
  xl: clsx("h-field-xl", paddingXl),
};

// Inset styles
export const checkboxInsetClass = clsx(
  "h-field-inset justify-center bg-transparent",
  insetBase,
  insetFocusOutlineSelf,
);

// Inset size-specific heights (excluding 2px border)
export const checkboxInsetSizeHeightClasses: Record<CheckboxSize, string> = {
  xs: "h-field-inset-xs",
  sm: "h-field-inset-sm",
  lg: "h-field-inset-lg",
  xl: "h-field-inset-xl",
};

// Inline styles
export const checkboxInlineClass = clsx("!h-auto", "!p-0", "gap-1");

// Disabled styles
export const checkboxDisabledClass = disabledOpacity;
