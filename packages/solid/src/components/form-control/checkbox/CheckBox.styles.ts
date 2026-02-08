import clsx from "clsx";

export type CheckBoxTheme = "primary" | "info" | "success" | "warning" | "danger";
export type CheckBoxSize = "sm" | "lg";

// wrapper 기본 스타일
export const checkBoxBaseClass = clsx(
  "inline-flex items-center gap-2",
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
  "border border-base-400 dark:border-base-500",
  "bg-white dark:bg-base-900",
  "transition-colors",
);

// 테마별 체크 상태
export const themeCheckedClasses: Record<CheckBoxTheme, string> = {
  primary: clsx("border-primary-500 bg-primary-500", "text-white"),
  info: clsx("border-info-500 bg-info-500", "text-white"),
  success: clsx("border-success-500 bg-success-500", "text-white"),
  warning: clsx("border-warning-500 bg-warning-500", "text-white"),
  danger: clsx("border-danger-500 bg-danger-500", "text-white"),
};

// 사이즈별 스타일
export const checkBoxSizeClasses: Record<CheckBoxSize, string> = {
  sm: clsx`h-field-sm px-1.5 py-0.5`,
  lg: clsx`h-field-lg px-3 py-2`,
};

// inset 스타일
export const checkBoxInsetClass = clsx(
  clsx`h-field-inset w-full justify-center rounded-none border-none bg-transparent`,
  "focus:[outline-style:solid]",
  clsx`focus:outline-1 focus:-outline-offset-1`,
  clsx`focus:outline-primary-400 dark:focus:outline-primary-400`,
);

// inset 사이즈별 높이 (border 2px 제외)
export const checkBoxInsetSizeHeightClasses: Record<CheckBoxSize, string> = {
  sm: "h-field-inset-sm",
  lg: "h-field-inset-lg",
};

// inline 스타일
export const checkBoxInlineClass = clsx("h-auto", "p-0", "gap-1");

// disabled 스타일
export const checkBoxDisabledClass = clsx`pointer-events-none cursor-default opacity-50`;
