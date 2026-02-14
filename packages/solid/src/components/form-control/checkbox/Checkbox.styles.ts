import clsx from "clsx";
import {
  bgSurface,
  borderDefault,
  type ComponentSize,
  disabledOpacity,
  paddingLg,
  paddingSm,
  paddingXl,
} from "../../../styles/tokens.styles";
import { insetBase, insetFocusOutlineSelf } from "../../../styles/patterns.styles";

export type CheckboxTheme = "primary" | "info" | "success" | "warning" | "danger";
export type CheckboxSize = ComponentSize;

// wrapper 기본 스타일
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

// 인디케이터 기본 스타일
export const indicatorBaseClass = clsx(
  "flex shrink-0 items-center justify-center",
  "size-4",
  "border",
  borderDefault,
  bgSurface,
  "transition-colors",
);

// 테마별 체크 상태
export const themeCheckedClasses: Record<CheckboxTheme, string> = {
  primary: clsx("border-primary-500 bg-primary-500", "text-white"),
  info: clsx("border-info-500 bg-info-500", "text-white"),
  success: clsx("border-success-500 bg-success-500", "text-white"),
  warning: clsx("border-warning-500 bg-warning-500", "text-white"),
  danger: clsx("border-danger-500 bg-danger-500", "text-white"),
};

// 사이즈별 스타일
export const checkboxSizeClasses: Record<CheckboxSize, string> = {
  sm: clsx("h-field-sm", paddingSm),
  lg: clsx("h-field-lg", paddingLg),
  xl: clsx("h-field-xl", paddingXl),
};

// inset 스타일
export const checkboxInsetClass = clsx("h-field-inset justify-center bg-transparent", insetBase, insetFocusOutlineSelf);

// inset 사이즈별 높이 (border 2px 제외)
export const checkboxInsetSizeHeightClasses: Record<CheckboxSize, string> = {
  sm: "h-field-inset-sm",
  lg: "h-field-inset-lg",
  xl: "h-field-inset-xl",
};

// inline 스타일
export const checkboxInlineClass = clsx("!h-auto", "!p-0", "gap-1");

// disabled 스타일
export const checkboxDisabledClass = disabledOpacity;
