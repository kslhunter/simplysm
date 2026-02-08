import clsx from "clsx";

export const sheetContainerClass = clsx(
  "relative",
  "bg-white dark:bg-base-800",
  "overflow-auto",
);

export const tableClass = clsx(
  "border-separate border-spacing-0",
  "w-max",
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
  "truncate",
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

// 기능 컬럼 기본 (확장/선택 컬럼 공통)
export const featureThClass = clsx(
  "bg-base-100 dark:bg-base-700",
  "border-b border-r border-base-300 dark:border-base-600",
  "p-0",
  "align-middle"
);

export const featureTdClass = clsx(
  "bg-base-50 dark:bg-base-800",
  "border-b border-r border-base-200 dark:border-base-700",
  "p-0",
  "align-middle",
  "h-px",
);

// 확장 컬럼 깊이 가이드 — 래퍼 (토글 아이콘과 같은 너비, 세로선 중앙 정렬)
export const expandIndentGuideClass = clsx(
  "mr-0.5 w-3 self-stretch",
  "flex justify-end",
);

// 확장 컬럼 깊이 가이드 — 세로선
export const expandIndentGuideLineClass = clsx(
  "w-0 self-stretch",
  "border-r border-base-300 dark:border-base-600",
);

// 확장 토글 버튼
export const expandToggleClass = clsx(
  "flex items-center justify-center",
  "size-6",
  "cursor-pointer",
  "rounded",
  "hover:bg-base-200 dark:hover:bg-base-600",
);

// 포커스 인디케이터 — 행 하이라이트
export const focusRowIndicatorClass = clsx(
  "pointer-events-none absolute",
  "bg-base-500/10",
  "z-[6]",
);

// 포커스 인디케이터 — 셀 테두리
export const focusCellIndicatorClass = clsx(
  "pointer-events-none absolute",
  "border-2 border-primary-500",
  "rounded",
  "z-[6]",
);
