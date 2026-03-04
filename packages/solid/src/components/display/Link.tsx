import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { state } from "../../styles/control.styles";
import { type SemanticTheme, themeTokens } from "../../styles/theme.styles";

export type LinkTheme = SemanticTheme;

export interface LinkProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
  theme?: LinkTheme;
  disabled?: boolean;
}

const themeClasses: Record<LinkTheme, string> = Object.fromEntries(
  Object.entries(themeTokens).map(([theme, t]) => [theme, t.text]),
) as Record<LinkTheme, string>;

export const Link: ParentComponent<LinkProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "theme", "disabled"]);

  const getClassName = () => {
    const theme = local.theme ?? "primary";
    return twMerge("hover:underline cursor-pointer", themeClasses[theme], local.disabled && state.disabled, local.class);
  };

  return (
    <a class={getClassName()} aria-disabled={local.disabled ?? undefined} {...rest}>
      {local.children}
    </a>
  );
};
