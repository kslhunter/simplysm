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
  "border-b border-r border-base-300 dark:border-base-600",
  "overflow-hidden whitespace-nowrap",
  "p-0",
  "text-left font-semibold",
  "align-middle",
);

export const thContentClass = clsx(
  "px-2 py-1",
);

export const tdClass = clsx(
  "bg-white dark:bg-base-800",
  "border-b border-r border-base-200 dark:border-base-700",
  "overflow-hidden whitespace-nowrap",
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

// 정렬 가능 헤더 — 클릭 가능 표시
export const sortableThClass = clsx(
  "cursor-pointer",
  "hover:underline",
);

// 정렬 아이콘 영역
export const sortIconClass = clsx(
  "px-1 py-0.5",
  "bg-base-100 dark:bg-base-700",
);

// 상단 툴바 (설정 버튼 + 페이지네이션)
export const toolbarClass = clsx(
  "flex items-center gap-2",
  "px-2 py-1",
  "bg-base-50 dark:bg-base-800",
  "border-b border-base-300 dark:border-base-600",
);
