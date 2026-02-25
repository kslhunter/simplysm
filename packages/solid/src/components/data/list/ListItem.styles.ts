import clsx from "clsx";
import { borderDefault, type ComponentSize } from "../../../styles/tokens.styles";

// Base item style
export const listItemBaseClass = clsx(
  "flex",
  "items-center",
  "gap-2",
  "py-1",
  "px-1.5",
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
  xs: clsx("px-0.5 py-0"),
  sm: clsx("px-1 py-0.5"),
  lg: clsx("px-2 py-1.5"),
  xl: clsx("px-3 py-2"),
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
export const listItemIndentGuideClass = clsx("ml-4 w-2 border-l", borderDefault);

// Item content area
export const listItemContentClass = clsx("flex flex-1 flex-row", "items-center gap-1", "text-left");

// Selection icon color
export const getListItemSelectedIconClass = (selected: boolean) =>
  clsx(selected ? "text-primary-600 dark:text-primary-400" : "text-black/30 dark:text-white/30");
