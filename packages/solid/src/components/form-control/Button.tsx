import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { ripple } from "../../directives/ripple";
import { type ComponentSize, state, pad } from "../../styles/control.styles";
import { themeTokens, type SemanticTheme } from "../../styles/theme.styles";

// Directive usage declaration (for TypeScript)
void ripple;

type ButtonTheme = SemanticTheme;
type ButtonVariant = "solid" | "outline" | "ghost";
type ButtonSize = ComponentSize;

const themeClasses = Object.fromEntries(
  Object.entries(themeTokens).map(([theme, t]) => [
    theme,
    {
      solid: clsx(t.solid, t.solidHover /*, "shadow-md hover:shadow-lg"*/),
      outline: clsx("bg-transparent", t.hoverBg, t.text, t.border),
      ghost: clsx("bg-transparent", t.hoverBg, t.text),
    },
  ]),
) as Record<ButtonTheme, Record<ButtonVariant, string>>;

const sizeClasses: Record<ButtonSize, string> = {
  md: clsx("min-w-8", pad.md),
  xs: clsx("min-w-4", pad.xs),
  sm: clsx("min-w-6", pad.sm),
  lg: clsx("min-w-9", pad.lg),
  xl: clsx("min-w-10", pad.xl, "text-lg"),
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
      "inline-flex items-center font-bold justify-center text-center cursor-pointer transition rounded focus:outline-none focus-visible:ring-2 border border-transparent",
      themeClasses[theme][variant],
      sizeClasses[local.size ?? "md"],
      local.inset && "rounded-none border-none",
      local.disabled && state.disabled,
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
