import clsx from "clsx";
import { borderDefault, type ComponentSize } from "../../../styles/tokens.styles";

// 기본 아이템 스타일
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

// 사이즈별 스타일
export const listItemSizeClasses: Record<ComponentSize, string> = {
  sm: clsx("px-1 py-0.5"),
  lg: clsx("px-2 py-1.5"),
};

// 선택된 상태
export const listItemSelectedClass = clsx(
  "bg-primary-100",
  "dark:bg-primary-800/50",
  "font-bold",
  "hover:bg-primary-200",
  "dark:hover:bg-primary-700",
);

// 비활성화 상태
export const listItemDisabledClass = clsx("pointer-events-none cursor-auto opacity-50");

// 읽기 전용 상태
export const listItemReadonlyClass = clsx("cursor-auto select-text hover:bg-transparent");

// 들여쓰기 가이드 (중첩 아이템용)
export const listItemIndentGuideClass = clsx("ml-4 w-2 border-l", borderDefault);

// 아이템 콘텐츠 영역
export const listItemContentClass = clsx("flex flex-1 flex-row", "items-center gap-1", "text-left");

// 선택 아이콘 색상
export const getListItemSelectedIconClass = (selected: boolean) =>
  clsx(selected ? "text-primary-600 dark:text-primary-400" : "text-black/30 dark:text-white/30");
