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
  md: pad.md,
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

// Indent guide (for nested items, absolutely positioned)
export const listItemIndentGuideClass = clsx("absolute inset-y-0 border-l", border.default);

// Base left padding per size (rem) for indent calculation
export const listItemBasePadLeft: Record<ComponentSize, number> = {
  xs: 0.25,
  sm: 0.375,
  md: 0.5,
  lg: 0.75,
  xl: 1,
};

// Indent size per nesting level (rem)
export const LIST_ITEM_INDENT_SIZE = 1.5;

// Item content area
export const listItemContentClass = clsx("flex flex-1 flex-row", "items-center gap-1", "text-left");

// Selection icon color
export const getListItemSelectedIconClass = (selected: boolean) =>
  clsx(selected ? "text-primary-600 dark:text-primary-400" : "text-black/30 dark:text-white/30");
