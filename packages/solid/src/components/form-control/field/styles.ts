import clsx from "clsx";

export type FieldSize = "sm" | "lg";

// 기본 wrapper 스타일
export const fieldBaseClass = clsx(
  "inline-flex items-center",
  "bg-white dark:bg-zinc-900",
  "text-zinc-900 dark:text-zinc-100",
  "border",
  "border-zinc-300 dark:border-zinc-700",
  "px-2 py-1",
  "rounded",
  "focus-within:border-blue-500",
  "h-field",
);

// 사이즈별 스타일
export const fieldSizeClasses: Record<FieldSize, string> = {
  sm: clsx`h-field-sm px-1.5 py-0.5`,
  lg: clsx`h-field-lg px-3 py-2`,
};

// 에러 스타일
export const fieldErrorClass = clsx`border-red-500`;

// inset 스타일
export const fieldInsetClass = clsx`rounded-none border-none bg-transparent p-0`;

// disabled 스타일
export const fieldDisabledClass = clsx`bg-zinc-100 text-zinc-500 dark:bg-zinc-800`;

// readonly 스타일 (일반 텍스트처럼 보이도록)
export const fieldReadonlyClass = clsx`bg-zinc-100 dark:bg-zinc-800`;

// input 스타일
export const fieldInputClass = clsx(
  "min-w-0 flex-1",
  "bg-transparent",
  "outline-none",
  "placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
);
