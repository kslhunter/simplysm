import { type Component, type JSX, splitProps, Switch, Match } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-solidjs";
import { useTheme, type ThemeMode } from "../../providers/ThemeContext";
import { Icon } from "../display/Icon";
import { ripple } from "../../directives/ripple";

void ripple;

const baseClass = clsx(
  "inline-flex",
  "items-center",
  "justify-center",
  "cursor-pointer",
  "rounded",
  "transition-colors",
  "text-base-500 dark:text-base-400",
  "hover:bg-base-200 dark:hover:bg-base-700",
  "focus:outline-none",
  "focus-visible:ring-2",
);

const sizeClasses: Record<"sm" | "lg", string> = {
  sm: clsx("p-1"),
  lg: clsx("p-2"),
};

const iconSizes: Record<"sm" | "lg", string> = {
  sm: "1em",
  lg: "1.5em",
};

const modeLabels: Record<ThemeMode, string> = {
  light: "라이트 모드",
  system: "시스템 설정",
  dark: "다크 모드",
};

export interface ThemeToggleProps extends Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  /** 버튼 크기 */
  size?: "sm" | "lg";
}

/**
 * 테마 토글 버튼 컴포넌트
 *
 * @remarks
 * - ThemeProvider 내부에서 사용해야 함
 * - 클릭 시 light → system → dark → light 순환
 * - 현재 모드에 맞는 아이콘 표시 (☀️ / 💻 / 🌙)
 *
 * @example
 * ```tsx
 * // 기본 사용
 * <ThemeToggle />
 *
 * // 크기 조절
 * <ThemeToggle size="sm" />
 * <ThemeToggle size="lg" />
 * ```
 */
export const ThemeToggle: Component<ThemeToggleProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "size"]);

  const { mode, cycleMode } = useTheme();

  const getClassName = () =>
    twMerge(baseClass, "p-1.5", local.size && sizeClasses[local.size], local.class);

  const iconSize = () => (local.size ? iconSizes[local.size] : "1.25em");

  return (
    <button
      {...rest}
      data-theme-toggle
      use:ripple
      type="button"
      class={getClassName()}
      onClick={cycleMode}
      title={modeLabels[mode()]}
      aria-label={modeLabels[mode()]}
    >
      <Switch>
        <Match when={mode() === "light"}>
          <Icon icon={IconSun} size={iconSize()} />
        </Match>
        <Match when={mode() === "system"}>
          <Icon icon={IconDeviceDesktop} size={iconSize()} />
        </Match>
        <Match when={mode() === "dark"}>
          <Icon icon={IconMoon} size={iconSize()} />
        </Match>
      </Switch>
    </button>
  );
};
