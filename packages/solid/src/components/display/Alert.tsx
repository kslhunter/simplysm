import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { themeTokens, type SemanticTheme } from "../../styles/tokens.styles";

export type AlertTheme = SemanticTheme;

export interface AlertProps extends JSX.HTMLAttributes<HTMLDivElement> {
  theme?: AlertTheme;
}

const baseClass = clsx("block", "p-3", "rounded");

const themeClasses = Object.fromEntries(
  Object.entries(themeTokens).map(([theme, t]) => [theme, t.light]),
) as Record<AlertTheme, string>;

export const Alert: ParentComponent<AlertProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "theme"]);

  const getClassName = () => {
    const theme = local.theme ?? "base";
    return twMerge(baseClass, themeClasses[theme], local.class);
  };

  return (
    <div data-alert class={getClassName()} {...rest}>
      {local.children}
    </div>
  );
};
