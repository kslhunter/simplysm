import { type Component, type JSX, splitProps, Switch, Match } from "solid-js";
import { twMerge } from "tailwind-merge";
import { IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-solidjs";
import { useTheme, type ThemeMode } from "../../providers/ThemeContext";
import { Icon } from "../display/Icon";
import { Button } from "./Button";
import { useI18n } from "../../providers/i18n/I18nProvider";
import { type ComponentSize } from "../../styles/control.styles";

const sizeClasses: Record<ComponentSize, string> = {
  default: "p-1.5",
  xs: "p-0.5",
  sm: "p-1",
  lg: "p-2",
  xl: "p-2.5",
};

const iconSizes: Record<ComponentSize, string> = {
  default: "1.25em",
  xs: "0.75em",
  sm: "1em",
  lg: "1.5em",
  xl: "2em",
};

const modeLabelKeys: Record<ThemeMode, string> = {
  light: "themeToggle.light",
  system: "themeToggle.system",
  dark: "themeToggle.dark",
};

export interface ThemeToggleProps extends Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  /** Button size */
  size?: ComponentSize;
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
  const i18n = useI18n();

  const modeLabel = () => i18n.t(modeLabelKeys[mode()]);

  const getClassName = () => twMerge(sizeClasses[local.size ?? "default"], local.class);

  const iconSize = () => iconSizes[local.size ?? "default"];

  return (
    <Button
      {...rest}
      variant="ghost"
      size="xs"
      data-theme-toggle
      class={getClassName()}
      onClick={cycleMode}
      title={modeLabel()}
      aria-label={modeLabel()}
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
    </Button>
  );
};
