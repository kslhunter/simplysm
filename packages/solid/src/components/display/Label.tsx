import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export type LabelTheme = "primary" | "info" | "success" | "warning" | "danger" | "gray";

export interface LabelProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  theme?: LabelTheme;
}

const baseClass = clsx(
  "inline-block",
  "text-white",
  "px-2",
  "rounded",
);

const themeClasses: Record<LabelTheme, string> = {
  primary: "bg-primary-500 dark:bg-primary-500",
  info: "bg-info-500 dark:bg-info-500",
  success: "bg-success-500 dark:bg-success-500",
  warning: "bg-warning-500 dark:bg-warning-500",
  danger: "bg-danger-500 dark:bg-danger-500",
  gray: "bg-gray-600 dark:bg-slate-600",
};

export const Label: ParentComponent<LabelProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "theme"]);

  const getClassName = () => {
    const theme = local.theme ?? "gray";
    return twMerge(baseClass, themeClasses[theme], local.class);
  };

  return (
    <span class={getClassName()} {...rest}>
      {local.children}
    </span>
  );
};
