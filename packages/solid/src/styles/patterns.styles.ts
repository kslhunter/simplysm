import clsx from "clsx";
import { borderDefault, textDefault, textPlaceholder } from "./tokens.styles";

// ── Icon Button Common ──
export const iconButtonBase = clsx(
  "inline-flex items-center justify-center",
  "cursor-pointer",
  "rounded",
  "transition-colors",
  "text-base-600 dark:text-base-300",
  "hover:bg-base-200 dark:hover:bg-base-700",
  "focus:outline-none",
  "focus-visible:ring-2",
);

// ── Inset Focus Outline (focus-within variant: Field, TextArea) ──
export const insetFocusOutline = clsx(
  "focus-within:[outline-style:solid]",
  "focus-within:outline-1 focus-within:-outline-offset-1",
  "focus-within:outline-primary-400 dark:focus-within:outline-primary-400",
);

// ── Inset Focus Outline (focus variant: Checkbox, Select trigger) ──
export const insetFocusOutlineSelf = clsx(
  "focus:[outline-style:solid]",
  "focus:outline-1 focus:-outline-offset-1",
  "focus:outline-primary-400 dark:focus:outline-primary-400",
);

// ── Inset Base Layout ──
export const insetBase = "w-full rounded-none border-none";

// ── Form Field Common Surface (background + text + border + focus) ──
export const fieldSurface = clsx(
  "bg-primary-50 dark:bg-primary-950/30",
  textDefault,
  "border",
  borderDefault,
  "rounded",
  "focus-within:border-primary-500 dark:focus-within:border-primary-400",
);

// ── Input Element Common ──
export const inputBase = clsx(
  "min-w-0 flex-1",
  "bg-transparent",
  "outline-none",
  "[text-decoration:inherit]",
  textPlaceholder,
);
