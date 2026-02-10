import clsx from "clsx";

// 테이블 기본
export const tableBaseClass = clsx(
  "w-full",
  "border-separate border-spacing-0",
  "text-sm",
);

// 헤더 셀 (th)
export const thClass = clsx(
  "px-2 py-1.5",
  "border-b border-base-300 dark:border-base-600",
  "bg-base-100 dark:bg-base-800",
  "text-left font-semibold",
  "text-base-700 dark:text-base-300",
);

export const thPermClass = clsx(
  "text-center",
  "w-20",
);

// 행 (tr)
export const trBaseClass = clsx(
  "group",
);

// depth별 배경색 (레거시 테마 대응)
export const depthClasses: Record<number, string> = {
  0: clsx("bg-info-500 text-white", "[&_label]:text-white"),
  1: clsx("bg-info-50 dark:bg-info-950"),
  2: clsx("bg-warning-50 dark:bg-warning-950"),
  3: clsx("bg-success-50 dark:bg-success-950"),
};

export const getDepthClass = (depth: number): string => {
  if (depth === 0) return depthClasses[0];
  return depthClasses[((depth - 1) % 3) + 1];
};

// 타이틀 셀 (td)
export const tdTitleClass = clsx(
  "px-2 py-1",
);

// 권한 셀 (td)
export const tdPermClass = clsx(
  "px-1 py-1",
  "text-center",
);

// 접기/펼치기 버튼
export const collapseButtonClass = clsx(
  "inline-flex items-center gap-1",
  "cursor-pointer",
  "hover:text-primary-600 dark:hover:text-primary-400",
);

// 화살표 아이콘 회전
export const chevronClass = clsx(
  "transition-transform duration-150",
);

export const chevronOpenClass = "rotate-90";
