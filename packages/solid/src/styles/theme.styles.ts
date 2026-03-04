import clsx from "clsx";

export const themeTokens = {
  primary: {
    solid: clsx`bg-primary-500 text-white`,
    solidHover: clsx`hover:bg-primary-600 dark:hover:bg-primary-400`,
    light: clsx`bg-primary-100 text-primary-900 dark:bg-primary-900/40 dark:text-primary-100`,
    text: clsx`text-primary-600 dark:text-primary-400`,
    hoverBg: clsx`hover:bg-primary-100 dark:hover:bg-primary-800/30`,
    border: clsx`border-primary-300 dark:border-primary-600`,
  },
  info: {
    solid: clsx`bg-info-500 text-white`,
    solidHover: clsx`hover:bg-info-600 dark:hover:bg-info-400`,
    light: clsx`bg-info-100 text-info-900 dark:bg-info-900/40 dark:text-info-100`,
    text: clsx`text-info-600 dark:text-info-400`,
    hoverBg: clsx`hover:bg-info-100 dark:hover:bg-info-800/30`,
    border: clsx`border-info-300 dark:border-info-600`,
  },
  success: {
    solid: clsx`bg-success-500 text-white`,
    solidHover: clsx`hover:bg-success-600 dark:hover:bg-success-400`,
    light: clsx`bg-success-100 text-success-900 dark:bg-success-900/40 dark:text-success-100`,
    text: clsx`text-success-600 dark:text-success-400`,
    hoverBg: clsx`hover:bg-success-100 dark:hover:bg-success-800/30`,
    border: clsx`border-success-300 dark:border-success-600`,
  },
  warning: {
    solid: clsx`bg-warning-500 text-white`,
    solidHover: clsx`hover:bg-warning-600 dark:hover:bg-warning-400`,
    light: clsx`bg-warning-100 text-warning-900 dark:bg-warning-900/40 dark:text-warning-100`,
    text: clsx`text-warning-600 dark:text-warning-400`,
    hoverBg: clsx`hover:bg-warning-100 dark:hover:bg-warning-800/30`,
    border: clsx`border-warning-300 dark:border-warning-600`,
  },
  danger: {
    solid: clsx`bg-danger-500 text-white`,
    solidHover: clsx`hover:bg-danger-600 dark:hover:bg-danger-400`,
    light: clsx`bg-danger-100 text-danger-900 dark:bg-danger-900/40 dark:text-danger-100`,
    text: clsx`text-danger-600 dark:text-danger-400`,
    hoverBg: clsx`hover:bg-danger-100 dark:hover:bg-danger-800/30`,
    border: clsx`border-danger-300 dark:border-danger-600`,
  },
  base: {
    solid: clsx`bg-base-500 text-white`,
    solidHover: clsx`hover:bg-base-600 dark:hover:bg-base-400`,
    light: clsx`bg-base-100 text-base-900 dark:bg-base-800 dark:text-base-100`,
    text: clsx`text-base-600 dark:text-base-300`,
    hoverBg: clsx`hover:bg-base-100 dark:hover:bg-base-800/30`,
    border: clsx`border-base-300 dark:border-base-700`,
  },
};

export type SemanticTheme = keyof typeof themeTokens;