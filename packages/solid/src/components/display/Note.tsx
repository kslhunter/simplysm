import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export type NoteTheme = "primary" | "info" | "success" | "warning" | "danger" | "gray";

export interface NoteProps extends JSX.HTMLAttributes<HTMLDivElement> {
  theme?: NoteTheme;
}

const baseClass = clsx(
  "block",
  "p-3",
  "rounded",
);

const themeClasses: Record<NoteTheme, string> = {
  primary: "bg-primary-100 dark:bg-primary-900/30",
  info: "bg-info-100 dark:bg-info-900/30",
  success: "bg-success-100 dark:bg-success-900/30",
  warning: "bg-warning-100 dark:bg-warning-900/30",
  danger: "bg-danger-100 dark:bg-danger-900/30",
  gray: "bg-gray-100 dark:bg-gray-800",
};

export const Note: ParentComponent<NoteProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "theme"]);

  const getClassName = () => {
    const theme = local.theme ?? "gray";
    return twMerge(baseClass, themeClasses[theme], local.class);
  };

  return (
    <div class={getClassName()} {...rest}>
      {local.children}
    </div>
  );
};
