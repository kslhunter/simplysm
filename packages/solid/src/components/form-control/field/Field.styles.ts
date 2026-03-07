import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { type ComponentSize, gap, pad } from "../../../styles/control.styles";
import { border, text } from "../../../styles/base.styles";

export type FieldSize = ComponentSize;

// ── Form Field Common Surface (background + text + border + focus) ──
export const fieldSurface = clsx(
  "bg-primary-50 dark:bg-primary-950/30",
  text.default,
  "border",
  border.default,
  "rounded",
  "focus-within:border-primary-500 dark:focus-within:border-primary-400",
);

// Base wrapper styles
export const fieldBaseClass = clsx(
  "inline-flex items-center",
  fieldSurface,
  "[text-decoration:inherit]",
);

// Size-specific styles
export const fieldSizeClasses: Record<FieldSize, string> = {
  md: clsx("h-field", pad.md),
  xs: clsx("h-field-xs", pad.xs),
  sm: clsx("h-field-sm", pad.sm),
  lg: clsx("h-field-lg", pad.lg),
  xl: clsx("h-field-xl", pad.xl),
};

// Inset styles
export const fieldInsetClass = clsx(
  "w-full rounded-none border-none",
  "bg-primary-50 dark:bg-primary-950/30",
  "focus-within:[outline-style:solid]",
  "focus-within:outline-1 focus-within:-outline-offset-1",
  "focus-within:outline-primary-400 dark:focus-within:outline-primary-400",
);

// Inset heights (excluding 2px border)
export const fieldInsetSizeHeightClasses: Record<FieldSize, string> = {
  md: clsx`h-field-inset`,
  xs: clsx`h-field-inset-xs`,
  sm: clsx`h-field-inset-sm`,
  lg: clsx`h-field-inset-lg`,
  xl: clsx`h-field-inset-xl`,
};

// Disabled styles
export const fieldDisabledClass = clsx("bg-base-100 text-base-500 dark:bg-base-800");

// Textarea wrapper styles (h-field removed)
export const textAreaBaseClass = clsx("inline-block w-48", fieldSurface);

// Textarea size-specific styles (h-field-* removed)
export const textAreaSizeClasses: Record<FieldSize, string> = {
  md: pad.md,
  xs: pad.xs,
  sm: pad.sm,
  lg: pad.lg,
  xl: pad.xl,
};

// Input styles
export const fieldInputClass = clsx(
  "min-w-0 flex-1",
  "bg-transparent",
  "outline-none",
  "[text-decoration:inherit]",
  text.placeholder,
);

// Prefix icon gap classes (replaces nested ternary)
export const fieldGapClasses: Record<FieldSize, string> = {
  md: gap.md,
  xs: gap.xs,
  sm: gap.sm,
  lg: gap.lg,
  xl: gap.xl,
};

// Shared wrapper class generation function
export function getFieldWrapperClass(options: {
  size?: FieldSize;
  disabled?: boolean;
  inset?: boolean;
  includeCustomClass?: string | false;
  extra?: string | false;
}): string {
  return twMerge(
    fieldBaseClass,
    options.extra,
    fieldSizeClasses[options.size ?? "default"],
    options.disabled && fieldDisabledClass,
    options.inset && fieldInsetClass,
    options.inset && fieldInsetSizeHeightClasses[options.size ?? "default"],
    options.includeCustomClass,
  );
}

// Textarea-specific wrapper class generation function
export function getTextareaWrapperClass(options: {
  size?: FieldSize;
  disabled?: boolean;
  inset?: boolean;
  includeCustomClass?: string | false;
}): string {
  return twMerge(
    textAreaBaseClass,
    textAreaSizeClasses[options.size ?? "default"],
    options.disabled && fieldDisabledClass,
    options.inset && fieldInsetClass,
    options.includeCustomClass,
  );
}
