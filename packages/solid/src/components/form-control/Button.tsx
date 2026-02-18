import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { ripple } from "../../directives/ripple";
import {
  themeTokens,
  type SemanticTheme,
  type ComponentSize,
  disabledOpacity,
} from "../../styles/tokens.styles";

// Directive 사용 선언 (TypeScript용)
void ripple;

type ButtonTheme = SemanticTheme;
type ButtonVariant = "solid" | "outline" | "ghost";
type ButtonSize = ComponentSize;

const baseClass = clsx(
  "inline-flex items-center",
  "px-2 py-1",
  "font-bold",
  "justify-center",
  "text-center",
  "cursor-pointer",
  "transition",
  "rounded",
  "focus:outline-none",
  "focus-visible:ring-2",
  "border border-transparent",
  "min-w-8",
);

const themeClasses = Object.fromEntries(
  Object.entries(themeTokens).map(([theme, t]) => [
    theme,
    {
      solid: clsx(t.solid, t.solidHover, "shadow-md hover:shadow-lg"),
      outline: clsx("bg-transparent", t.hoverBg, t.text, t.border),
      ghost: clsx("bg-transparent", t.hoverBg, t.text),
    },
  ]),
) as Record<ButtonTheme, Record<ButtonVariant, string>>;

const sizeClasses: Record<ButtonSize, string> = {
  sm: clsx("min-w-6 px-1 py-0"),
  lg: clsx("min-w-9 px-3 py-1.5"),
  xl: clsx("min-w-10 px-4 py-2 text-lg"),
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
