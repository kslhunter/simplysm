import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { themeTokens, type SemanticTheme } from "../../styles/tokens.styles";

export type NoteTheme = SemanticTheme;

export interface NoteProps extends JSX.HTMLAttributes<HTMLDivElement> {
  theme?: NoteTheme;
}

const baseClass = clsx(
  "block",
  "p-3",
  "rounded",
);

const themeClasses = Object.fromEntries(
  Object.entries(themeTokens).map(([theme, t]) => [theme, t.light]),
) as Record<NoteTheme, string>;

export const Note: ParentComponent<NoteProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "theme"]);

  const getClassName = () => {
    const theme = local.theme ?? "base";
    return twMerge(baseClass, themeClasses[theme], local.class);
  };

  return (
    <div data-note class={getClassName()} {...rest}>
      {local.children}
    </div>
  );
};
