import clsx from "clsx";

// ── State ──
export const state = {
  disabled: clsx`pointer-events-none cursor-default opacity-30`,
};

// ── Size ──
export type ComponentSize = "xs" | "sm" | "md" | "lg" | "xl";

export const pad = {
  md: clsx`px-2 py-1`,
  xs: clsx`px-1 py-0`,
  sm: clsx`px-1.5 py-0.5`,
  lg: clsx`px-3 py-2`,
  xl: clsx`px-4 py-3`,
};

export const gap = {
  md: clsx`gap-1`,
  xs: clsx`gap-0`,
  sm: clsx`gap-0.5`,
  lg: clsx`gap-1.5`,
  xl: clsx`gap-2`,
};
