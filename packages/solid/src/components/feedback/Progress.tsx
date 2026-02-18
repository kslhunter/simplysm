import { type JSX, type ParentComponent, Show, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import {
  type ComponentSizeCompact,
  type SemanticTheme,
  themeTokens,
} from "../../styles/tokens.styles";

export type ProgressTheme = SemanticTheme;

export interface ProgressProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** 진행률 (0~1 범위, 0 = 0%, 1 = 100%) */
  value: number;
  theme?: ProgressTheme;
  size?: ComponentSizeCompact;
  inset?: boolean;
}

const baseClass = clsx(
  "relative block w-full",
  "overflow-hidden",
  "rounded",
  "bg-base-200 dark:bg-base-700",
  "border border-base-200 dark:border-base-700",
);

const sizeClasses: Record<"default" | ComponentSizeCompact, string> = {
  default: "py-1 px-2",
  sm: "py-0.5 px-2",
  lg: "py-2 px-3",
};

const insetClass = clsx("rounded-none", "border-0", "bg-transparent");

const barThemeClasses: Record<ProgressTheme, string> = Object.fromEntries(
  Object.entries(themeTokens).map(([theme, t]) => [theme, t.solid]),
) as Record<ProgressTheme, string>;

export const Progress: ParentComponent<ProgressProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "theme", "size", "value", "inset"]);

  const getClassName = () => {
    const size = local.size ?? "default";
    return twMerge(baseClass, sizeClasses[size], local.inset ? insetClass : undefined, local.class);
  };

  const getBarClassName = () => {
    const theme = local.theme ?? "primary";
    return clsx("absolute left-0 top-0 h-full", "z-[1]", "transition-all", barThemeClasses[theme]);
  };

  const getPercentText = () => (Math.max(0, Math.min(1, local.value)) * 100).toFixed(2) + "%";

  return (
    <div data-progress class={getClassName()} {...rest}>
      <div class={getBarClassName()} style={{ width: getPercentText() }} />
      <div class={clsx("relative", "z-[2]", "text-right")}>
        <Show when={local.children} fallback={getPercentText()}>
          {local.children}
        </Show>
      </div>
    </div>
  );
};
