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

// 고정 컬럼 기본 (sticky)
export const fixedClass = "sticky";

// 고정/비고정 경계 시각 효과 — 고정 컬럼의 마지막 셀에 적용
export const fixedLastClass = clsx(
  "border-r-2 border-r-base-400",
  "dark:border-r-base-500",
);

// 리사이저 핸들 (헤더 셀 우측 드래그 영역)
export const resizerClass = clsx(
  "absolute inset-y-0 right-0",
  "w-1",
  "cursor-ew-resize",
  "hover:bg-primary-300 dark:hover:bg-primary-600",
);

// 드래그 중 세로 점선 인디케이터
export const resizeIndicatorClass = clsx(
  "absolute inset-y-0",
  "w-0 border-l-2 border-dashed border-primary-500",
  "pointer-events-none",
  "z-[7]",
);
