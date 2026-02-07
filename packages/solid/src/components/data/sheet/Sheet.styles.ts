import clsx from "clsx";

export const sheetContainerClass = clsx(
  "relative",
  "bg-white dark:bg-base-800",
  "overflow-auto",
);

export const tableClass = clsx(
  "border-separate border-spacing-0",
  "table-fixed",
);

export const thClass = clsx(
  "relative",
  "bg-base-100 dark:bg-base-700",
  "border-r border-b border-base-300 dark:border-base-600",
  "whitespace-nowrap overflow-hidden",
  "p-0",
  "text-left font-semibold",
  "align-middle",
);

export const thContentClass = clsx(
  "px-2 py-1",
);

export const tdClass = clsx(
  "bg-white dark:bg-base-800",
  "border-r border-b border-base-200 dark:border-base-700",
  "whitespace-nowrap overflow-hidden",
  "p-0",
  "align-top",
);

export const summaryThClass = clsx(
  "bg-warning-50 dark:bg-warning-900/20",
);

export const insetContainerClass = clsx(
  "border-none",
  "rounded-none",
);

export const defaultContainerClass = clsx(
  "border border-base-300 dark:border-base-600",
  "rounded",
);
