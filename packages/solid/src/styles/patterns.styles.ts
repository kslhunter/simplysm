import clsx from "clsx";
import { borderDefault, textDefault, textPlaceholder } from "./tokens.styles";

// ── 아이콘 버튼 공통 ──
export const iconButtonBase = clsx(
  "inline-flex items-center justify-center",
  "cursor-pointer",
  "rounded",
  "transition-colors",
  "text-base-600 dark:text-base-300",
  "hover:bg-base-200 dark:hover:bg-base-700",
  "focus:outline-none",
  "focus-visible:ring-2",
);

// ── inset 포커스 아웃라인 (focus-within 버전: Field, TextArea) ──
export const insetFocusOutline = clsx(
  "focus-within:[outline-style:solid]",
  "focus-within:outline-1 focus-within:-outline-offset-1",
  "focus-within:outline-primary-400 dark:focus-within:outline-primary-400",
);

// ── inset 포커스 아웃라인 (focus 버전: Checkbox, Select trigger) ──
export const insetFocusOutlineSelf = clsx(
  "focus:[outline-style:solid]",
  "focus:outline-1 focus:-outline-offset-1",
  "focus:outline-primary-400 dark:focus:outline-primary-400",
);

// ── inset 기본 레이아웃 ──
export const insetBase = "w-full rounded-none border-none";

// ── 폼 필드 공통 표면 (배경 + 텍스트 + 테두리 + 포커스) ──
export const fieldSurface = clsx(
  "bg-primary-50 dark:bg-primary-950/30",
  textDefault,
  "border",
  borderDefault,
  "rounded",
  "focus-within:border-primary-500 dark:focus-within:border-primary-400",
);

// ── 입력 요소 공통 ──
export const inputBase = clsx("min-w-0 flex-1", "bg-transparent", "outline-none", textPlaceholder);
