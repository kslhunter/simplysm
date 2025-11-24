import { $effect } from "../bindings/$effect";

export function setupBgTheme(options?: {
  theme?:
    | "primary"
    | "secondary"
    | "info"
    | "success"
    | "warning"
    | "danger"
    | "gray"
    | "blue-gray";
  lightness?: "lightest" | "lighter";
}): void {
  $effect([], (onCleanup) => {
    document.body.style.setProperty(
      "--background-color",
      options?.theme ? `var(--theme-${options.theme}-${options.lightness ?? "lightest"})` : "",
    );

    onCleanup(() => {
      document.body.style.setProperty("--background-color", "");
    });
  });
}
