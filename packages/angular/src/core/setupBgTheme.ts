import { effect, inject, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";

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
  // SSR(프리렌더) 가드: document 반영은 브라우저 전용
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

  effect((onCleanup) => {
    document.body.style.setProperty(
      "--background-color",
      options?.theme
        ? `var(--theme-${options.theme}-${options.lightness ?? "lightest"})`
        : "",
    );

    onCleanup(() => {
      document.body.style.setProperty("--background-color", "");
    });
  });
}
