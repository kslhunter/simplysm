import {
  createContext,
  useContext,
  type ParentComponent,
  createMemo,
  createEffect,
  onCleanup,
} from "solid-js";
import { createMediaQuery } from "@solid-primitives/media";
import { useSyncConfig } from "../hooks/useSyncConfig";

/**
 * Theme mode.
 * - `light`: Light mode
 * - `dark`: Dark mode
 * - `system`: Follows system setting
 */
export type ThemeMode = "light" | "dark" | "system";

/**
 * Resolved theme (determined by OS setting when mode is system)
 */
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  /** Current theme mode (user selection) */
  mode: () => ThemeMode;
  /** Set theme mode */
  setMode: (mode: ThemeMode) => void;
  /** Resolved theme (follows OS setting when mode is system) */
  resolvedTheme: () => ResolvedTheme;
  /** Cycle to next mode (light -> system -> dark -> light) */
  cycleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue>();

/**
 * Hook to access the theme Context.
 *
 * @throws Throws an error if ThemeProvider is not present
 *
 * @example
 * ```tsx
 * const { mode, setMode, resolvedTheme, cycleMode } = useTheme();
 *
 * // Check current mode
 * console.log(mode()); // "light" | "dark" | "system"
 *
 * // Check resolved theme
 * console.log(resolvedTheme()); // "light" | "dark"
 *
 * // Change mode
 * setMode("dark");
 *
 * // Cycle (for toggle button)
 * cycleMode(); // light -> system -> dark -> light
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme는 ThemeProvider 내부에서만 사용할 수 있습니다");
  }
  return context;
}

/**
 * Theme Provider component.
 *
 * @remarks
 * - Must be used inside ConfigContext.Provider (depends on useSyncConfig)
 * - Persists theme setting to localStorage
 * - Automatically toggles `dark` class on the `<html>` element
 *
 * @example
 * ```tsx
 * <ConfigContext.Provider value={{ clientName: "myApp" }}>
 *   <ThemeProvider>
 *     <App />
 *   </ThemeProvider>
 * </ConfigContext.Provider>
 * ```
 */
export const ThemeProvider: ParentComponent = (props) => {
  const [mode, setMode, ready] = useSyncConfig<ThemeMode>("theme", "system");

  // Detect OS dark mode
  const prefersDark = createMediaQuery("(prefers-color-scheme: dark)");

  // Calculate resolved theme
  const resolvedTheme = createMemo<ResolvedTheme>(() => {
    const currentMode = mode();
    if (currentMode === "system") {
      return prefersDark() ? "dark" : "light";
    }
    return currentMode;
  });

  // Cycle to next mode
  const cycleMode = () => {
    const current = mode();
    const next: ThemeMode =
      current === "light" ? "system" : current === "system" ? "dark" : "light";
    setMode(next);
  };

  // Toggle dark class on <html>
  createEffect(() => {
    if (!ready()) return; // Don't apply theme until storage has been read
    const isDark = resolvedTheme() === "dark";
    document.documentElement.classList.toggle("dark", isDark);
  });

  // Remove dark class on cleanup
  onCleanup(() => {
    document.documentElement.classList.remove("dark");
  });

  const contextValue: ThemeContextValue = {
    mode,
    setMode,
    resolvedTheme,
    cycleMode,
  };

  return <ThemeContext.Provider value={contextValue}>{props.children}</ThemeContext.Provider>;
};
