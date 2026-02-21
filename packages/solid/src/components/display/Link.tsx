import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { disabledOpacity, type SemanticTheme, themeTokens } from "../../styles/tokens.styles";

export type LinkTheme = SemanticTheme;

export interface LinkProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
  theme?: LinkTheme;
  disabled?: boolean;
}

const baseClass = clsx("hover:underline", "cursor-pointer");

const themeClasses: Record<LinkTheme, string> = Object.fromEntries(
  Object.entries(themeTokens).map(([theme, t]) => [theme, t.text]),
) as Record<LinkTheme, string>;

export const Link: ParentComponent<LinkProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "theme", "disabled"]);

  const getClassName = () => {
    const theme = local.theme ?? "primary";
    return twMerge(baseClass, themeClasses[theme], local.disabled && disabledOpacity, local.class);
  };

  return (
    <a class={getClassName()} aria-disabled={local.disabled ?? undefined} {...rest}>
      {local.children}
    </a>
  );
};
