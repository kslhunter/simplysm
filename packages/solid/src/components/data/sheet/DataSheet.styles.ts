import clsx from "clsx";
import { border } from "../../../styles/base.styles";
import { pad } from "../../../styles/control.styles";

export const dataSheetContainerClass = clsx(
  "relative",
  // "bg-white dark:bg-base-950",
  "bg-base-100 dark:bg-base-900",
  "overflow-auto",
);

export const tableClass = clsx("border-separate border-spacing-0", "w-max");

export const thClass = clsx(
  "relative",
  "bg-base-100 dark:bg-base-900",
  "border-b border-r border-base-300 dark:border-base-800",
  "overflow-hidden whitespace-nowrap",
  "p-0",
  "text-left font-bold",
  "align-middle",
);

export const thContentClass = clsx(pad.default);

export const tdClass = clsx(
  "bg-white dark:bg-base-950",
  "border-b border-r",
  border.subtle,
  "truncate",
  "p-0",
  "align-top",
);

export const summaryThClass = clsx("bg-warning-50 dark:bg-warning-900/20");

export const insetContainerClass = clsx("border-none", "rounded-none");

export const insetTableClass = clsx(
  "w-full",
  "[&_th:last-child]:border-r-0",
  "[&_td:last-child]:border-r-0",
  "[&_tbody>tr:last-child>td]:border-b-0",
);

export const defaultContainerClass = clsx("border", border.default, "rounded");

// Sortable header — shows clickable indicator
export const sortableThClass = clsx("cursor-pointer", "hover:underline");

// Sort icon area
export const sortIconClass = clsx("bg-base-100 dark:bg-base-900");

// Top toolbar (settings button + pagination)
export const toolbarClass = clsx(
  "flex items-center gap-2",
  pad.default,
  "border-b",
  border.default,
);

// Fixed column base (sticky)
export const fixedClass = clsx`sticky`;

// Visual effect for fixed/unfixed boundary — applied to last cell of fixed column
export const fixedLastClass = clsx("border-r border-r-base-400", "dark:border-r-base-600");

// Resizer handle (right-side drag area of header cell)
export const resizerClass = clsx(
  "absolute inset-y-0 right-0",
  "w-1",
  "cursor-ew-resize",
  "touch-none",
  "hover:bg-primary-300 dark:hover:bg-primary-600",
);

// Vertical dashed indicator while dragging
export const resizeIndicatorClass = clsx(
  "absolute inset-y-0",
  "w-0 border-l-2 border-dashed border-primary-500",
  "pointer-events-none",
  "z-[7]",
);

// Feature column base (expand/select column common)
export const featureThClass = clsx(
  "bg-base-100 dark:bg-base-800",
  "border-b border-r",
  border.default,
  "p-0",
  "align-middle",
);

export const featureTdClass = clsx(
  "bg-base-50 dark:bg-base-900",
  "border-b border-r",
  border.subtle,
  "p-0",
  "align-middle",
  "h-px",
);

// Expand column depth guide — wrapper (same width as toggle icon, vertically centered line)
export const expandIndentGuideClass = clsx("mr-0.5 w-3 self-stretch", "flex justify-end");

// Expand column depth guide — vertical line
export const expandIndentGuideLineClass = clsx("w-0 self-stretch", "border-r", border.default);

// Expand toggle button
export const expandToggleClass = clsx(
  "flex items-center justify-center",
  "size-6",
  "cursor-pointer",
  "rounded",
  "hover:bg-base-200 dark:hover:bg-base-600",
);

// Select column — icon wrapper for single mode
export const selectSingleClass = clsx(
  "flex items-center justify-center",
  "size-6",
  "cursor-pointer",
  "rounded",
);

// Single mode — selected
export const selectSingleSelectedClass = clsx("text-primary-500", "dark:text-primary-400");

// Single mode — unselected
export const selectSingleUnselectedClass = clsx("text-base-300", "dark:text-base-600");

// Drag handle feature column
export const reorderHandleClass = clsx(
  "flex items-center justify-center",
  "size-6",
  "cursor-grab",
  "text-base-400 dark:text-base-500",
  "hover:text-base-600 dark:hover:text-base-400",
);

// Drag indicator (before/after horizontal line)
export const reorderIndicatorClass = clsx(
  "absolute inset-x-0",
  "h-0 border-t-2 border-primary-500",
  "pointer-events-none",
  "z-[7]",
);

// Feature column header inner wrapper (expand/select, etc.)
export const featureCellWrapperClass = clsx("flex items-center", "px-1");

// Feature column body inner wrapper (expand/select/reorder, etc. — full height)
export const featureCellBodyWrapperClass = clsx("flex h-full items-center", "px-1");

// Feature column header clickable wrapper (select all, etc.)
export const featureCellClickableClass = clsx(
  "flex cursor-pointer items-center justify-center",
  "px-1",
);

// Feature column body clickable wrapper (select/reorder, etc. — full height)
export const featureCellBodyClickableClass = clsx(
  "flex h-full cursor-pointer items-center justify-center",
  "px-1",
);

// Reorder handle wrapper (with touch-none added)
export const reorderCellWrapperClass = clsx(
  "flex h-full touch-none items-center justify-center",
  "px-1",
);

// Settings button
export const configButtonClass = clsx(
  "flex items-center justify-center",
  "size-6 rounded",
  "text-base-500 dark:text-base-400",
  "hover:bg-base-200 dark:hover:bg-base-700",
  "cursor-pointer",
);

// Body row — hover/selected/drag overlay via ::after pseudo-element
export const trRowClass = clsx(
  "relative",
  // ::after base positioning (content is set per-state so it only renders when needed)
  "after:absolute after:inset-0 after:pointer-events-none after:z-10",
  // hover overlay
  "hover:after:content-[''] hover:after:bg-black/[0.03]",
  "dark:hover:after:bg-white/[0.04]",
  // selected row overlay
  "[&[data-selected]]:after:content-[''] [&[data-selected]]:after:bg-black/[0.05]",
  "dark:[&[data-selected]]:after:bg-white/[0.06]",
  // dragging row
  "[&[data-dragging]>td]:opacity-50",
  // drop target (inside) overlay
  "[&[data-drag-over=inside]]:after:content-[''] [&[data-drag-over=inside]]:after:bg-blue-500/10",
);
