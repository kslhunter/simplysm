import clsx from "clsx";

// ── Border ──
export const border = {
  default: clsx`border-base-200 dark:border-base-700`,
  subtle: clsx`border-base-200 dark:border-base-700`,
};

// ── Background ──
export const bg = {
  surface: clsx`bg-white dark:bg-base-900`,
  muted: clsx`bg-base-100 dark:bg-base-800`,
  subtle: clsx`bg-base-200 dark:bg-base-700`,
};

// ── Text ──
export const text = {
  default: clsx`text-base-900 dark:text-base-100`,
  muted: clsx`text-base-400 dark:text-base-500`,
  placeholder: clsx`placeholder:text-base-400 dark:placeholder:text-base-500`,
};
