import { type Component, type JSX, splitProps, Switch, Match } from "solid-js";
import { twMerge } from "tailwind-merge";
import { IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-solidjs";
import { useTheme, type ThemeMode } from "../../providers/ThemeContext";
import { Icon } from "../display/Icon";
import { ripple } from "../../directives/ripple";
import { iconButtonBase } from "../../styles/patterns.styles";

void ripple;

const sizeClasses: Record<"sm" | "lg", string> = {
  sm: "p-1",
  lg: "p-2",
};

const iconSizes: Record<"sm" | "lg", string> = {
  sm: "1em",
  lg: "1.5em",
};

const modeLabels: Record<ThemeMode, string> = {
  light: "Light mode",
  system: "System settings",
  dark: "Dark mode",
};

export interface ThemeToggleProps extends Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  /** Button size */
  size?: "sm" | "lg";
}

/**
 * Theme toggle button component
 *
 * @remarks
 * - Must be used inside ThemeProvider
 * - Cycles through light → system → dark → light on click
 * - Shows appropriate icon for current mode (☀️ / 💻 / 🌙)
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ThemeToggle />
 *
 * // Adjust size
 * <ThemeToggle size="sm" />
 * <ThemeToggle size="lg" />
 * ```
 */
export const ThemeToggle: Component<ThemeToggleProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "size"]);

  const { mode, cycleMode } = useTheme();

  const getClassName = () =>
    twMerge(iconButtonBase, "p-1.5", local.size && sizeClasses[local.size], local.class);

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
