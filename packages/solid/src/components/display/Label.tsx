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
  primary: "bg-primary-500 dark:bg-primary-600",
  info: "bg-info-500 dark:bg-info-600",
  success: "bg-success-500 dark:bg-success-600",
  warning: "bg-warning-500 dark:bg-warning-600",
  danger: "bg-danger-500 dark:bg-danger-600",
  gray: "bg-gray-600 dark:bg-gray-500",
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
