import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export type NoteTheme = "primary" | "info" | "success" | "warning" | "danger" | "slate";

export interface NoteProps extends JSX.HTMLAttributes<HTMLDivElement> {
  theme?: NoteTheme;
}

const baseClass = clsx(
  "block",
  "p-3",
  "rounded",
);

const themeClasses: Record<NoteTheme, string> = {
  primary: "bg-primary-100 text-primary-900 dark:bg-primary-900/40 dark:text-primary-100",
  info: "bg-info-100 text-info-900 dark:bg-info-900/40 dark:text-info-100",
  success: "bg-success-100 text-success-900 dark:bg-success-900/40 dark:text-success-100",
  warning: "bg-warning-100 text-warning-900 dark:bg-warning-900/40 dark:text-warning-100",
  danger: "bg-danger-100 text-danger-900 dark:bg-danger-900/40 dark:text-danger-100",
  slate: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
};

export const Note: ParentComponent<NoteProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "theme"]);

  const getClassName = () => {
    const theme = local.theme ?? "slate";
    return twMerge(baseClass, themeClasses[theme], local.class);
  };

  return (
    <div class={getClassName()} {...rest}>
      {local.children}
    </div>
  );
};
