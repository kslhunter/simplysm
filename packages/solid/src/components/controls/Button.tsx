import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

type ButtonTheme = "primary" | "info" | "success" | "warning" | "danger" | "gray";
type ButtonVariant = "solid" | "outline" | "ghost";
type ButtonSize = "sm" | "lg";

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  theme?: ButtonTheme;
  variant?: ButtonVariant;
  size?: ButtonSize;
  inset?: boolean;
}

const themeStyles: Record<ButtonTheme, Record<ButtonVariant, string>> = {
  primary: {
    solid: clsx(
      "bg-primary-500 dark:bg-primary-600",
      "hover:bg-primary-600 dark:hover:bg-primary-500",
      "text-white",
      "border border-transparent",
      // "focus:ring-primary-500",
    ),
    outline: clsx(
      "bg-transparent",
      "hover:bg-primary-50 dark:hover:bg-primary-900/20",
      "text-primary-600 dark:text-primary-400",
      "border border-primary-300 dark:border-primary-700",
      // "focus:ring-primary-500",
    ),
    ghost: clsx(
      "bg-transparent",
      "hover:bg-primary-50 dark:hover:bg-primary-900/20",
      "text-primary-600 dark:text-primary-400",
      // "focus:ring-primary-500",
    ),
  },
  info: {
    solid: clsx(
      "bg-info-500 dark:bg-info-600",
      "hover:bg-info-600 dark:hover:bg-info-500",
      "text-white",
      "border border-transparent",
      // "focus:ring-info-500",
    ),
    outline: clsx(
      "bg-transparent",
      "hover:bg-info-50 dark:hover:bg-info-900/20",
      "text-info-600 dark:text-info-400",
      "border border-info-300 dark:border-info-700",
      // "focus:ring-info-500",
    ),
    ghost: clsx(
      "bg-transparent",
      "hover:bg-info-50 dark:hover:bg-info-900/20",
      "text-info-600 dark:text-info-400",
      // "focus:ring-info-500",
    ),
  },
  success: {
    solid: clsx(
      "bg-success-500 dark:bg-success-600",
      "hover:bg-success-600 dark:hover:bg-success-500",
      "text-white",
      "border border-transparent",
      // "focus:ring-success-500",
    ),
    outline: clsx(
      "bg-transparent",
      "hover:bg-success-50 dark:hover:bg-success-900/20",
      "text-success-600 dark:text-success-400",
      "border border-success-300 dark:border-success-700",
      // "focus:ring-success-500",
    ),
    ghost: clsx(
      "bg-transparent",
      "hover:bg-success-50 dark:hover:bg-success-900/20",
      "text-success-600 dark:text-success-400",
      // "focus:ring-success-500",
    ),
  },
  warning: {
    solid: clsx(
      "bg-warning-500 dark:bg-warning-600",
      "hover:bg-warning-600 dark:hover:bg-warning-500",
      "text-white",
      "border border-transparent",
      // "focus:ring-warning-500",
    ),
    outline: clsx(
      "bg-transparent",
      "hover:bg-warning-50 dark:hover:bg-warning-900/20",
      "text-warning-600 dark:text-warning-400",
      "border border-warning-300 dark:border-warning-700",
      // "focus:ring-warning-500",
    ),
    ghost: clsx(
      "bg-transparent",
      "hover:bg-warning-50 dark:hover:bg-warning-900/20",
      "text-warning-600 dark:text-warning-400",
      // "focus:ring-warning-500",
    ),
  },
  danger: {
    solid: clsx([
      "bg-danger-500 dark:bg-danger-600",
      "hover:bg-danger-600 dark:hover:bg-danger-500",
      "text-white",
      "border border-transparent",
      // "focus:ring-danger-500",
    ]),
    outline: clsx([
      "bg-transparent",
      "hover:bg-danger-50 dark:hover:bg-danger-900/20",
      "text-danger-600 dark:text-danger-400",
      "border border-danger-300 dark:border-danger-700",
      // "focus:ring-danger-500",
    ]),
    ghost: clsx([
      "bg-transparent",
      "hover:bg-danger-50 dark:hover:bg-danger-900/20",
      "text-danger-600 dark:text-danger-400",
      // "focus:ring-danger-500",
    ]),
  },
  gray: {
    solid: clsx([
      "bg-gray-600 dark:bg-gray-500",
      "hover:bg-gray-700 dark:hover:bg-gray-400",
      "text-white",
      "border border-transparent",
      // "focus:ring-gray-500",
    ]),
    outline: clsx([
      "bg-transparent",
      "hover:bg-gray-50 dark:hover:bg-gray-900/20",
      "text-gray-600 dark:text-gray-400",
      "border border-gray-300 dark:border-gray-700",
      // "focus:ring-gray-500",
    ]),
    ghost: clsx([
      "bg-transparent",
      "hover:bg-gray-50 dark:hover:bg-gray-900/20",
      "text-gray-600 dark:text-gray-400",
      // "focus:ring-gray-500",
    ]),
  },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: clsx("py-0.5", "px-1.5"),
  lg: "py-1.5 px-3",
};

const baseStyles = clsx(
  "py-1",
  "px-1.5",
  "font-bold",
  "text-center",
  "cursor-pointer",
  "transition-colors",
  "rounded",
  "focus:outline-none focus:ring-2 focus:ring-offset-2",
  "dark:ring-offset-gray-900",
);

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
    const theme = local.theme ?? "gray";
    const variant = local.variant ?? "outline";

    return twMerge(
      baseStyles,
      themeStyles[theme][variant],
      local.size && sizeStyles[local.size],
      local.inset && "rounded-none border-none",
      local.disabled && "cursor-default opacity-50 pointer-events-none",
      local.class,
    );
  };

  return (
    <button {...rest} type={local.type ?? "button"} class={getClassName()} disabled={local.disabled}>
      {local.children}
    </button>
  );
};
