import clsx from "clsx";
import { border } from "../../../styles/base.styles";
import { type ComponentSize, pad } from "../../../styles/control.styles";

// Base item style
export const listItemBaseClass = clsx(
  "flex",
  "items-center",
  "gap-2",
  "m-px",
  "cursor-pointer",
  "rounded-md",
  "transition-colors",
  "focus:outline-none",
  "focus-visible:bg-base-200 dark:focus-visible:bg-base-700",
  "hover:bg-base-500/10 dark:hover:bg-base-700",
);

// Size-based styles
export const listItemSizeClasses: Record<ComponentSize, string> = {
  default: pad.default,
  xs: pad.xs,
  sm: pad.sm,
  lg: pad.lg,
  xl: pad.xl,
};

// Selected state
export const listItemSelectedClass = clsx(
  "bg-primary-100",
  "dark:bg-primary-800/50",
  "font-bold",
  "hover:bg-primary-200",
  "dark:hover:bg-primary-700",
);

// Disabled state
export const listItemDisabledClass = clsx("pointer-events-none cursor-auto opacity-50");

// Readonly state
export const listItemReadonlyClass = clsx("cursor-auto select-text hover:bg-transparent");

// Indent guide (for nested items)
export const listItemIndentGuideClass = clsx("ml-4 w-2 border-l", border.default);

// Item content area
export const listItemContentClass = clsx("flex flex-1 flex-row", "items-center gap-1", "text-left");

// Selection icon color
export const getListItemSelectedIconClass = (selected: boolean) =>
  clsx(selected ? "text-primary-600 dark:text-primary-400" : "text-black/30 dark:text-white/30");
