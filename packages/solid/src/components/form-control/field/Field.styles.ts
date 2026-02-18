import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { type ComponentSize, paddingLg, paddingSm, paddingXl } from "../../../styles/tokens.styles";
import {
  fieldSurface,
  insetBase,
  insetFocusOutline,
  inputBase,
} from "../../../styles/patterns.styles";

export type FieldSize = ComponentSize;

// 기본 wrapper 스타일
export const fieldBaseClass = clsx(
  "inline-flex items-center",
  fieldSurface,
  "px-2 py-1",
  "h-field",
);

// 사이즈별 스타일
export const fieldSizeClasses: Record<FieldSize, string> = {
  sm: clsx("h-field-sm", paddingSm),
  lg: clsx("h-field-lg", paddingLg),
  xl: clsx("h-field-xl", paddingXl),
};

// inset 스타일
export const fieldInsetClass = clsx(
  insetBase,
  "bg-primary-50 dark:bg-primary-950/30",
  insetFocusOutline,
);

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

// prefixIcon gap 클래스 (nested ternary 대체)
export const fieldGapClasses: Record<FieldSize | "default", string> = {
  default: "gap-2",
  sm: "gap-1.5",
  lg: "gap-3",
  xl: "gap-4",
};

// 공유 wrapper 클래스 생성 함수
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

// Textarea 전용 wrapper 클래스 생성 함수
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
