import clsx from "clsx";
import { borderDefault, borderSubtle } from "../../../styles/tokens.styles";

export const dataSheetContainerClass = clsx(
  "relative",
  "bg-white dark:bg-base-950",
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

export const thContentClass = clsx("px-2 py-1");

export const tdClass = clsx(
  "bg-white dark:bg-base-950",
  "border-b border-r",
  borderSubtle,
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

export const defaultContainerClass = clsx("border", borderDefault, "rounded");

// 정렬 가능 헤더 — 클릭 가능 표시
export const sortableThClass = clsx("cursor-pointer", "hover:underline");

// 정렬 아이콘 영역
export const sortIconClass = clsx("px-1 py-0.5", "bg-base-100 dark:bg-base-900");

// 상단 툴바 (설정 버튼 + 페이지네이션)
export const toolbarClass = clsx(
  "flex items-center gap-2",
  "px-2 py-1",
  "bg-base-50 dark:bg-base-900",
  "border-b",
  borderDefault,
);

// 고정 컬럼 기본 (sticky)
export const fixedClass = "sticky";

// 고정/비고정 경계 시각 효과 — 고정 컬럼의 마지막 셀에 적용
export const fixedLastClass = clsx("border-r-2 border-r-base-300", "dark:border-r-base-700");

// 리사이저 핸들 (헤더 셀 우측 드래그 영역)
export const resizerClass = clsx(
  "absolute inset-y-0 right-0",
  "w-1",
  "cursor-ew-resize",
  "touch-none",
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
  "bg-base-100 dark:bg-base-800",
  "border-b border-r",
  borderDefault,
  "p-0",
  "align-middle",
);

export const featureTdClass = clsx(
  "bg-base-50 dark:bg-base-900",
  "border-b border-r",
  borderSubtle,
  "p-0",
  "align-middle",
  "h-px",
);

// 확장 컬럼 깊이 가이드 — 래퍼 (토글 아이콘과 같은 너비, 세로선 중앙 정렬)
export const expandIndentGuideClass = clsx("mr-0.5 w-3 self-stretch", "flex justify-end");

// 확장 컬럼 깊이 가이드 — 세로선
export const expandIndentGuideLineClass = clsx("w-0 self-stretch", "border-r", borderDefault);

// 확장 토글 버튼
export const expandToggleClass = clsx(
  "flex items-center justify-center",
  "size-6",
  "cursor-pointer",
  "rounded",
  "hover:bg-base-200 dark:hover:bg-base-600",
);

// 선택 컬럼 — single 모드 아이콘 래퍼
export const selectSingleClass = clsx(
  "flex items-center justify-center",
  "size-6",
  "cursor-pointer",
  "rounded",
);

// single 모드 — 선택됨
export const selectSingleSelectedClass = clsx("text-primary-500", "dark:text-primary-400");

// single 모드 — 미선택
export const selectSingleUnselectedClass = clsx("text-base-300", "dark:text-base-600");

// 드래그 핸들 기능 컬럼
export const reorderHandleClass = clsx(
  "flex items-center justify-center",
  "size-6",
  "cursor-grab",
  "text-base-400 dark:text-base-500",
  "hover:text-base-600 dark:hover:text-base-400",
);

// 드래그 인디케이터 (before/after 수평선)
export const reorderIndicatorClass = clsx(
  "absolute inset-x-0",
  "h-0 border-t-2 border-primary-500",
  "pointer-events-none",
  "z-[7]",
);

// 기능 컬럼 헤더 내부 래퍼 (확장/선택 등)
export const featureCellWrapperClass = clsx("flex items-center", "px-1");

// 기능 컬럼 바디 내부 래퍼 (확장/선택/재정렬 등 — 전체 높이)
export const featureCellBodyWrapperClass = clsx("flex h-full items-center", "px-1");

// 기능 컬럼 헤더 클릭 가능 래퍼 (전체 선택 등)
export const featureCellClickableClass = clsx(
  "flex cursor-pointer items-center justify-center",
  "px-1",
);

// 기능 컬럼 바디 클릭 가능 래퍼 (선택/재정렬 등 — 전체 높이)
export const featureCellBodyClickableClass = clsx(
  "flex h-full cursor-pointer items-center justify-center",
  "px-1",
);

// 재정렬 핸들 래퍼 (touch-none 추가)
export const reorderCellWrapperClass = clsx(
  "flex h-full touch-none items-center justify-center",
  "px-1",
);

// 설정 버튼
export const configButtonClass = clsx(
  "flex items-center justify-center",
  "size-6 rounded",
  "text-base-500 dark:text-base-400",
  "hover:bg-base-200 dark:hover:bg-base-700",
  "cursor-pointer",
);
