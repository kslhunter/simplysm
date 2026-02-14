import clsx from "clsx";
import { type ComponentSize, paddingLg, paddingSm, paddingXl } from "../../../styles/tokens.styles";
import { fieldSurface, insetBase, insetFocusOutline, inputBase } from "../../../styles/patterns.styles";

export type FieldSize = ComponentSize;

// 기본 wrapper 스타일
export const fieldBaseClass = clsx("inline-flex items-center", fieldSurface, "px-2 py-1", "h-field");

// 사이즈별 스타일
export const fieldSizeClasses: Record<FieldSize, string> = {
  sm: clsx("h-field-sm", paddingSm),
  lg: clsx("h-field-lg", paddingLg),
  xl: clsx("h-field-xl", paddingXl),
};

// inset 스타일
export const fieldInsetClass = clsx(insetBase, "bg-primary-50 dark:bg-primary-950/30", insetFocusOutline);

// inset 높이 (border 2px 제외)
export const fieldInsetHeightClass = "h-field-inset";
export const fieldInsetSizeHeightClasses: Record<FieldSize, string> = {
  sm: "h-field-inset-sm",
  lg: "h-field-inset-lg",
  xl: "h-field-inset-xl",
};

// disabled 스타일
export const fieldDisabledClass = clsx("bg-base-100 text-base-500 dark:bg-base-800");

// textarea wrapper 스타일 (h-field 제거)
export const textAreaBaseClass = clsx("inline-block w-48", fieldSurface, "px-2 py-1");

// textarea 사이즈별 스타일 (h-field-* 제거)
export const textAreaSizeClasses: Record<FieldSize, string> = {
  sm: paddingSm,
  lg: paddingLg,
  xl: paddingXl,
};

// input 스타일
export const fieldInputClass = inputBase;
