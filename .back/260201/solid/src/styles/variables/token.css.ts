import { createGlobalTheme } from "@vanilla-extract/css";

export const tokenVars = createGlobalTheme(":root", {
  font: {
    family: {
      sans: "sans-serif",
      mono: "monospace",
    },
    size: {
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      h6: "0.875rem",
      h5: "1rem",
      h4: "1.25rem",
      h3: "1.5rem",
      h2: "1.875rem",
      h1: "2.25rem",
    },
    lineHeight: {
      tight: "1.25",
      normal: "1.5",
      relaxed: "1.75",
    },
  },
  spacing: {
    auto: "auto",
    none: "0",
    xxs: "0.125rem",
    xs: "0.25rem",
    sm: "0.375rem",
    base: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    xxl: "1.25rem",
    xxxl: "1.5rem",
    xxxxl: "2rem",
  },
  radius: {
    none: "0",
    xs: "0.125rem",
    sm: "0.25rem",
    base: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    xxl: "1rem",
    full: "100%",
  },
  shadow: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    base: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    lg: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    xl: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  },
  duration: {
    base: "200ms",
    slow: "300ms",
  },
  overlay: {
    muted: "0.5",
    base: "0.1",
    light: "0.05",
  },
  zIndex: {
    base: "1",
    backdrop: "900",
    dropdown: "1000",
  },
});
