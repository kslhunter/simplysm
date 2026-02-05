import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { ripple } from "../../directives/ripple";

// Directive 사용 선언 (TypeScript용)
void ripple;

type ButtonTheme = "primary" | "info" | "success" | "warning" | "danger" | "base";
type ButtonVariant = "solid" | "outline" | "ghost";
type ButtonSize = "sm" | "lg";

const baseClass = clsx(
  "inline-flex items-center",
  "px-2 py-1",
  "font-bold",
  "text-center",
  "cursor-pointer",
  "transition-colors",
  "rounded-md",
  "focus:outline-none",
  "focus-visible:ring-2",
);

const themeClasses: Record<ButtonTheme, Record<ButtonVariant, string>> = {
  primary: {
    solid: clsx(
      "bg-primary-500",
      "hover:bg-primary-600 dark:hover:bg-primary-400",
      "text-white",
      "border border-transparent",
    ),
    outline: clsx(
      "bg-transparent",
      "hover:bg-primary-50 dark:hover:bg-primary-800/30",
      "text-primary-600 dark:text-primary-400",
      "border border-primary-300 dark:border-primary-600",
    ),
    ghost: clsx(
      "bg-transparent",
      "hover:bg-primary-50 dark:hover:bg-primary-800/30",
      "text-primary-600 dark:text-primary-400",
    ),
  },
  info: {
    solid: clsx("bg-info-500", "hover:bg-info-600 dark:hover:bg-info-400", "text-white", "border border-transparent"),
    outline: clsx(
      "bg-transparent",
      "hover:bg-info-50 dark:hover:bg-info-800/30",
      "text-info-600 dark:text-info-400",
      "border border-info-300 dark:border-info-600",
    ),
    ghost: clsx`bg-transparent text-info-600 hover:bg-info-50 dark:text-info-400 dark:hover:bg-info-800/30`,
  },
  success: {
    solid: clsx(
      "bg-success-500",
      "hover:bg-success-600 dark:hover:bg-success-400",
      "text-white",
      "border border-transparent",
    ),
    outline: clsx(
      "bg-transparent",
      "hover:bg-success-100 dark:hover:bg-success-800/30",
      "text-success-600 dark:text-success-400",
      "border border-success-300 dark:border-success-600",
    ),
    ghost: clsx(
      "bg-transparent",
      "hover:bg-success-100 dark:hover:bg-success-800/30",
      "text-success-600 dark:text-success-400",
    ),
  },
  warning: {
    solid: clsx(
      "bg-warning-500",
      "hover:bg-warning-600 dark:hover:bg-warning-400",
      "text-white",
      "border border-transparent",
    ),
    outline: clsx(
      "bg-transparent",
      "hover:bg-warning-100 dark:hover:bg-warning-800/30",
      "text-warning-600 dark:text-warning-400",
      "border border-warning-300 dark:border-warning-600",
    ),
    ghost: clsx(
      "bg-transparent",
      "hover:bg-warning-100 dark:hover:bg-warning-800/30",
      "text-warning-600 dark:text-warning-400",
    ),
  },
  danger: {
    solid: clsx(
      "bg-danger-500",
      "hover:bg-danger-600 dark:hover:bg-danger-400",
      "text-white",
      "border border-transparent",
    ),
    outline: clsx(
      "bg-transparent",
      "hover:bg-danger-50 dark:hover:bg-danger-800/30",
      "text-danger-600 dark:text-danger-400",
      "border border-danger-300 dark:border-danger-600",
    ),
    ghost: clsx(
      "bg-transparent",
      "hover:bg-danger-50 dark:hover:bg-danger-800/30",
      "text-danger-600 dark:text-danger-400",
    ),
  },
  base: {
    solid: clsx(
      "bg-white dark:bg-slate-950",
      "hover:bg-zinc-100 dark:hover:bg-slate-800",
      "text-zinc-900 dark:text-zinc-100",
      "border border-transparent",
    ),
    outline: clsx(
      "bg-transparent",
      "hover:bg-zinc-100 dark:hover:bg-slate-700",
      "text-zinc-600 dark:text-zinc-300",
      "border border-zinc-300 dark:border-slate-700",
    ),
    ghost: clsx("bg-transparent", "hover:bg-zinc-100 dark:hover:bg-slate-700", "text-zinc-600 dark:text-zinc-300"),
  },
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: clsx`px-1.5 py-0.5`,
  lg: clsx`px-3 py-1.5`,
};

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  theme?: ButtonTheme;
  variant?: ButtonVariant;
  size?: ButtonSize;
  inset?: boolean;
}

export const Button: ParentComponent<ButtonProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "children",
    "class",
    "type",
    "theme",
    "variant",
    "size",
    "inset",
    "disabled",
  ]);

  const getClassName = () => {
    const theme = local.theme ?? "base";
    const variant = local.variant ?? "outline";

    return twMerge(
      baseClass,
      themeClasses[theme][variant],
      local.size && sizeClasses[local.size],
      local.inset && "rounded-none border-none",
      local.disabled && "cursor-default opacity-50 pointer-events-none",
      local.class,
    );
  };

  return (
    <button
      {...rest}
      use:ripple={!local.disabled}
      type={local.type ?? "button"}
      class={getClassName()}
      disabled={local.disabled}
    >
      {local.children}
    </button>
  );
};
