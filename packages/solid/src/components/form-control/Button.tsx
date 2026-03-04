import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { ripple } from "../../directives/ripple";
import { type ComponentSize, disabledOpacity, padding } from "../../styles/control.styles";
import { themeTokens, type SemanticTheme } from "../../styles/theme.styles";

// Directive usage declaration (for TypeScript)
void ripple;

type ButtonTheme = SemanticTheme;
type ButtonVariant = "solid" | "outline" | "ghost";
type ButtonSize = ComponentSize;

const baseClass = clsx(
  "inline-flex items-center",
  "font-bold",
  "justify-center",
  "text-center",
  "cursor-pointer",
  "transition",
  "rounded",
  "focus:outline-none",
  "focus-visible:ring-2",
  "border border-transparent",
);

const themeClasses = Object.fromEntries(
  Object.entries(themeTokens).map(([theme, t]) => [
    theme,
    {
      solid: clsx(t.solid, t.solidHover /*, "shadow-md hover:shadow-lg"*/),
      outline: clsx("bg-transparent", t.hoverBg, t.text, t.border),
      ghost: clsx("bg-transparent", `hover:bg-base-100 dark:hover:bg-base-800/30`, t.text),
    },
  ]),
) as Record<ButtonTheme, Record<ButtonVariant, string>>;

const sizeClasses: Record<ButtonSize, string> = {
  default: clsx("min-w-8", padding.default),
  xs: clsx("min-w-4", padding.xs),
  sm: clsx("min-w-6", padding.sm),
  lg: clsx("min-w-9", padding.lg),
  xl: clsx("min-w-10", padding.xl, "text-lg"),
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
      sizeClasses[local.size ?? "default"],
      local.inset && "rounded-none border-none",
      local.disabled && disabledOpacity,
      local.class,
    );
  };

  return (
    <button
      {...rest}
      data-button
      use:ripple={!local.disabled}
      type={local.type ?? "button"}
      class={getClassName()}
      disabled={local.disabled}
    >
      {local.children}
    </button>
  );
};
