import { twJoin } from "tailwind-merge";

const CTRL_SIZES = {
  xs: twJoin("px-ctrl-xs", "py-ctrl-xxs", "text-xs"),
  sm: twJoin("px-ctrl-sm", "py-ctrl-xs"),
  default: twJoin("px-ctrl", "py-ctrl-sm"),
  lg: twJoin("px-ctrl-lg", "py-ctrl"),
  xl: twJoin("px-ctrl-xl", "py-ctrl-lg", "text-lg"),
} as const;

/**
 * 컨트롤 사이즈 (padding, font-size)
 */
export function ctrlSizes(): typeof CTRL_SIZES;
export function ctrlSizes<T extends string>(
  ...slots: T[]
): Record<keyof typeof CTRL_SIZES, Record<T, string>>;
export function ctrlSizes<T extends string>(...slots: T[]) {
  if (slots.length === 0) {
    return CTRL_SIZES;
  }

  return Object.fromEntries(
    Object.entries(CTRL_SIZES).map(([key, val]) => [
      key,
      Object.fromEntries(slots.map((s) => [s, val])),
    ]),
  ) as Record<keyof typeof CTRL_SIZES, Record<T, string>>;
}

const BG_TRANS = {
  primary: "bg-primary/15",
  secondary: "bg-secondary/15",
  info: "bg-info/15",
  success: "bg-success/15",
  warning: "bg-warning/15",
  danger: "bg-danger/15",
  gray: "bg-gray/15",
  slate: "bg-slate/15",
} as const;

/**
 * 테마별 투명 배경색 (lightest)
 */
export function bgTrans(): typeof BG_TRANS;
export function bgTrans<T extends string>(
  ...slots: T[]
): Record<keyof typeof BG_TRANS, Record<T, string>>;
export function bgTrans<T extends string>(...slots: T[]) {
  if (slots.length === 0) {
    return BG_TRANS;
  }

  return Object.fromEntries(
    Object.entries(BG_TRANS).map(([key, val]) => [
      key,
      Object.fromEntries(slots.map((s) => [s, val])),
    ]),
  ) as Record<keyof typeof BG_TRANS, Record<T, string>>;
}

const BORDER_TRANS = "border border-black/15 dark:border-white/15";

/**
 * 컨트롤 투명 테두리
 */
export function borderTrans(): typeof BORDER_TRANS;
export function borderTrans<T extends string>(...slots: T[]): Record<T, string>;
export function borderTrans<T extends string>(...slots: T[]) {
  if (slots.length === 0) {
    return BORDER_TRANS;
  }

  return Object.fromEntries(slots.map((s) => [s, BORDER_TRANS])) as Record<T, string>;
}