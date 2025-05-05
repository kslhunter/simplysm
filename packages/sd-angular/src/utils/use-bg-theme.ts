import { $effect } from "./hooks/hooks";

export function useBgTheme(
  theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey",
  lightness?: "lightest" | "lighter"
) {
  $effect([], (onCleanup) => {
    document.body.style.setProperty(
      "--background-color",
      theme ? `var(--theme-${theme}-${lightness ?? 'lightest'})` : "",
    );

    onCleanup(() => {
      document.body.style.setProperty("--background-color", "");
    });
  });
}