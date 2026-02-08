import clsx from "clsx";

export type FieldSize = "sm" | "lg";

// 기본 wrapper 스타일
export const fieldBaseClass = clsx(
  "inline-flex items-center",
  "bg-white dark:bg-base-900",
  "text-base-900 dark:text-base-100",
  "border",
  "border-base-300 dark:border-base-700",
  "px-2 py-1",
  "rounded",
  "focus-within:border-primary-500",
  "h-field",
);

// 사이즈별 스타일
export const fieldSizeClasses: Record<FieldSize, string> = {
  sm: clsx`h-field-sm px-1.5 py-0.5`,
  lg: clsx`h-field-lg px-3 py-2`,
};

// 에러 스타일
export const fieldErrorClass = clsx`border-danger-500`;

// inset 스타일
export const fieldInsetClass = clsx(
  clsx`w-full rounded-none border-none bg-primary-50 dark:bg-primary-950/30`,
  "focus-within:[outline-style:solid]",
  clsx`focus-within:outline-1 focus-within:-outline-offset-1`,
  clsx`focus-within:outline-primary-400 dark:focus-within:outline-primary-400`,
);

// inset 높이 (border 2px 제외)
export const fieldInsetHeightClass = "h-field-inset";
export const fieldInsetSizeHeightClasses: Record<FieldSize, string> = {
  sm: "h-field-inset-sm",
  lg: "h-field-inset-lg",
};

// disabled 스타일
export const fieldDisabledClass = clsx`bg-base-100 text-base-500 dark:bg-base-800`;

// textarea wrapper 스타일 (h-field 제거)
export const textAreaBaseClass = clsx(
  "inline-block w-48",
  "bg-white dark:bg-base-900",
  "text-base-900 dark:text-base-100",
  "border",
  "border-base-300 dark:border-base-700",
  "px-2 py-1",
  "rounded",
  "focus-within:border-primary-500",
);

// textarea 사이즈별 스타일 (h-field-* 제거)
export const textAreaSizeClasses: Record<FieldSize, string> = {
  sm: clsx`px-1.5 py-0.5`,
  lg: clsx`px-3 py-2`,
};

// input 스타일
export const fieldInputClass = clsx(
  "min-w-0 flex-1",
  "bg-transparent",
  "outline-none",
  "placeholder:text-base-400 dark:placeholder:text-base-500",
);
