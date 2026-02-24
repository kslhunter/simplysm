// ── Border ──
export const borderDefault = "border-base-200 dark:border-base-700";
export const borderSubtle = "border-base-200 dark:border-base-700";

// ── Surface Background ──
export const bgSurface = "bg-white dark:bg-base-900";

// ── Text ──
export const textDefault = "text-base-900 dark:text-base-100";
export const textMuted = "text-base-400 dark:text-base-500";
export const textPlaceholder = "placeholder:text-base-400 dark:placeholder:text-base-500";

// ── disabled ──
export const disabledOpacity = "cursor-default opacity-30 pointer-events-none";

// ── Size ──
export type ComponentSize = "xs" | "sm" | "lg" | "xl";
export type ComponentSizeCompact = "sm" | "lg";
export const paddingXs = "px-1 py-0";
export const paddingSm = "px-1.5 py-0.5";
export const paddingLg = "px-3 py-2";
export const paddingXl = "px-4 py-3";

// ── Theme ──
export type SemanticTheme = "primary" | "info" | "success" | "warning" | "danger" | "base";

export const themeTokens: Record<
  SemanticTheme,
  {
    solid: string;
    solidHover: string;
    light: string;
    text: string;
    hoverBg: string;
    border: string;
  }
> = {
  primary: {
    solid: "bg-primary-500 text-white",
    solidHover: "hover:bg-primary-600 dark:hover:bg-primary-400",
    light: "bg-primary-100 text-primary-900 dark:bg-primary-900/40 dark:text-primary-100",
    text: "text-primary-600 dark:text-primary-400",
    hoverBg: "hover:bg-primary-100 dark:hover:bg-primary-800/30",
    border: "border-primary-300 dark:border-primary-600",
  },
  info: {
    solid: "bg-info-500 text-white",
    solidHover: "hover:bg-info-600 dark:hover:bg-info-400",
    light: "bg-info-100 text-info-900 dark:bg-info-900/40 dark:text-info-100",
    text: "text-info-600 dark:text-info-400",
    hoverBg: "hover:bg-info-100 dark:hover:bg-info-800/30",
    border: "border-info-300 dark:border-info-600",
  },
  success: {
    solid: "bg-success-500 text-white",
    solidHover: "hover:bg-success-600 dark:hover:bg-success-400",
    light: "bg-success-100 text-success-900 dark:bg-success-900/40 dark:text-success-100",
    text: "text-success-600 dark:text-success-400",
    hoverBg: "hover:bg-success-100 dark:hover:bg-success-800/30",
    border: "border-success-300 dark:border-success-600",
  },
  warning: {
    solid: "bg-warning-500 text-white",
    solidHover: "hover:bg-warning-600 dark:hover:bg-warning-400",
    light: "bg-warning-100 text-warning-900 dark:bg-warning-900/40 dark:text-warning-100",
    text: "text-warning-600 dark:text-warning-400",
    hoverBg: "hover:bg-warning-100 dark:hover:bg-warning-800/30",
    border: "border-warning-300 dark:border-warning-600",
  },
  danger: {
    solid: "bg-danger-500 text-white",
    solidHover: "hover:bg-danger-600 dark:hover:bg-danger-400",
    light: "bg-danger-100 text-danger-900 dark:bg-danger-900/40 dark:text-danger-100",
    text: "text-danger-600 dark:text-danger-400",
    hoverBg: "hover:bg-danger-100 dark:hover:bg-danger-800/30",
    border: "border-danger-300 dark:border-danger-600",
  },
  base: {
    solid: "bg-base-500 text-white",
    solidHover: "hover:bg-base-600 dark:hover:bg-base-400",
    light: "bg-base-100 text-base-900 dark:bg-base-800 dark:text-base-100",
    text: "text-base-600 dark:text-base-300",
    hoverBg: "hover:bg-base-100 dark:hover:bg-base-800/30",
    border: "border-base-300 dark:border-base-700",
  },
};
