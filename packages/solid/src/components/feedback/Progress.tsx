import { type JSX, type ParentComponent, Show, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { bg, border } from "../../styles/base.styles";
import { type ComponentSize, pad } from "../../styles/control.styles";
import { type SemanticTheme, themeTokens } from "../../styles/theme.styles";

export type ProgressTheme = SemanticTheme;

export interface ProgressProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Progress value (range 0-1, 0 = 0%, 1 = 100%) */
  value: number;
  theme?: ProgressTheme;
  size?: ComponentSize;
  inset?: boolean;
}

const sizeClasses: Record<ComponentSize, string> = {
  md: pad.md,
  xs: pad.xs,
  sm: pad.sm,
  lg: pad.lg,
  xl: pad.xl,
};

const barThemeClasses: Record<ProgressTheme, string> = Object.fromEntries(
  Object.entries(themeTokens).map(([theme, t]) => [theme, t.solid]),
) as Record<ProgressTheme, string>;

export const Progress: ParentComponent<ProgressProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "theme", "size", "value", "inset"]);

  const getClassName = () => {
    const size = local.size ?? "md";
    return twMerge(
      clsx("relative block w-full overflow-hidden rounded", bg.subtle, "border", border.default),
      sizeClasses[size],
      local.inset ? "rounded-none border-0 bg-transparent" : undefined,
      local.class,
    );
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
