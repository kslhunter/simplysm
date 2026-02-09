import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { type SemanticTheme, themeTokens } from "../../styles/tokens.styles";

export type LabelTheme = SemanticTheme;

export interface LabelProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  theme?: LabelTheme;
}

const baseClass = clsx(
  "inline-block",
  "text-white",
  "px-1.5",
  "rounded-md",
);

const themeClasses: Record<LabelTheme, string> = Object.fromEntries(
  Object.entries(themeTokens).map(([theme, t]) => [theme, t.solid]),
) as Record<LabelTheme, string>;

export const Label: ParentComponent<LabelProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "theme"]);

  const getClassName = () => {
    const theme = local.theme ?? "base";
    return twMerge(baseClass, themeClasses[theme], local.class);
  };

  return (
    <span data-label class={getClassName()} {...rest}>
      {local.children}
    </span>
  );
};
