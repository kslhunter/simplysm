import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import {
  type ComponentSize,
  paddingLg,
  paddingSm,
  paddingXl,
  paddingXs,
} from "../../../styles/tokens.styles";
import {
  fieldSurface,
  insetBase,
  insetFocusOutline,
  inputBase,
} from "../../../styles/patterns.styles";

export type FieldSize = ComponentSize;

// Base wrapper styles
export const fieldBaseClass = clsx(
  "inline-flex items-center",
  fieldSurface,
  "px-2 py-1",
  "h-field",
  "[text-decoration:inherit]",
);

// Size-specific styles
export const fieldSizeClasses: Record<FieldSize, string> = {
  xs: clsx("h-field-xs", paddingXs),
  sm: clsx("h-field-sm", paddingSm),
  lg: clsx("h-field-lg", paddingLg),
  xl: clsx("h-field-xl", paddingXl),
};

// Inset styles
export const fieldInsetClass = clsx(
  insetBase,
  "bg-primary-50 dark:bg-primary-950/30",
  insetFocusOutline,
);

// Inset heights (excluding 2px border)
export const fieldInsetHeightClass = "h-field-inset";
export const fieldInsetSizeHeightClasses: Record<FieldSize, string> = {
  xs: "h-field-inset-xs",
  sm: "h-field-inset-sm",
  lg: "h-field-inset-lg",
  xl: "h-field-inset-xl",
};

// Disabled styles
export const fieldDisabledClass = clsx("bg-base-100 text-base-500 dark:bg-base-800");

// Textarea wrapper styles (h-field removed)
export const textAreaBaseClass = clsx("inline-block w-48", fieldSurface, "px-2 py-1");

// Textarea size-specific styles (h-field-* removed)
export const textAreaSizeClasses: Record<FieldSize, string> = {
  xs: paddingXs,
  sm: paddingSm,
  lg: paddingLg,
  xl: paddingXl,
};

// Input styles
export const fieldInputClass = inputBase;

// Prefix icon gap classes (replaces nested ternary)
export const fieldGapClasses: Record<FieldSize | "default", string> = {
  xs: "gap-0.5",
  sm: "gap-1.5",
  default: "gap-2",
  lg: "gap-3",
  xl: "gap-4",
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
    options.size && fieldSizeClasses[options.size],
    options.disabled && fieldDisabledClass,
    options.inset && fieldInsetClass,
    options.inset &&
      (options.size ? fieldInsetSizeHeightClasses[options.size] : fieldInsetHeightClass),
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
    options.size && textAreaSizeClasses[options.size],
    options.disabled && fieldDisabledClass,
    options.inset && fieldInsetClass,
    options.includeCustomClass,
  );
}
