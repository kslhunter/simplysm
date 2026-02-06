import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export type NoteTheme = "primary" | "info" | "success" | "warning" | "danger" | "base";

export interface NoteProps extends JSX.HTMLAttributes<HTMLDivElement> {
  theme?: NoteTheme;
}

const baseClass = clsx(
  "block",
  "p-3",
  "rounded",
);

const themeClasses: Record<NoteTheme, string> = {
  primary: clsx("bg-primary-100 text-primary-900", "dark:bg-primary-900/40 dark:text-primary-100"),
  info: clsx("bg-info-100 text-info-900", "dark:bg-info-900/40 dark:text-info-100"),
  success: clsx("bg-success-100 text-success-900", "dark:bg-success-900/40 dark:text-success-100"),
  warning: clsx("bg-warning-100 text-warning-900", "dark:bg-warning-900/40 dark:text-warning-100"),
  danger: clsx("bg-danger-100 text-danger-900", "dark:bg-danger-900/40 dark:text-danger-100"),
  base: clsx("bg-base-100 text-base-900", "dark:bg-base-800 dark:text-base-100"),
};

export const Note: ParentComponent<NoteProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "theme"]);

  const getClassName = () => {
    const theme = local.theme ?? "base";
    return twMerge(baseClass, themeClasses[theme], local.class);
  };

  return (
    <div class={getClassName()} {...rest}>
      {local.children}
    </div>
  );
};
