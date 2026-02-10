import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { type SemanticTheme, themeTokens } from "../../styles/tokens.styles";

export type TagTheme = SemanticTheme;

export interface TagProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  theme?: TagTheme;
}

const baseClass = clsx("inline-block", "text-white", "px-1.5", "rounded-md");

const themeClasses: Record<TagTheme, string> = Object.fromEntries(
  Object.entries(themeTokens).map(([theme, t]) => [theme, t.solid]),
) as Record<TagTheme, string>;

export const Tag: ParentComponent<TagProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "theme"]);

  const getClassName = () => {
    const theme = local.theme ?? "base";
    return twMerge(baseClass, themeClasses[theme], local.class);
  };

  return (
    <span data-tag class={getClassName()} {...rest}>
      {local.children}
    </span>
  );
};
