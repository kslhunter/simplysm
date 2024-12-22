import { $effect } from "./hooks";

export function useBgTheme(theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey") {
  $effect([], (onCleanup) => {
    document.body.style.setProperty(
      "--background-color",
      theme ? `var(--theme-${theme}-lightest)` : "",
    );

    onCleanup(() => {
      document.body.style.setProperty("--background-color", "");
    });
  });
}