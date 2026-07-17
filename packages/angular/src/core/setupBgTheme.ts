import { effect, inject, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";

export function setupBgTheme(options?: {
  theme?: "primary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray";
}): void {
  // SSR(프리렌더) 가드: document 반영은 브라우저 전용
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

  effect((onCleanup) => {
    // 앱 배경(body 가 소비하는 --sd-bg-canvas)을 시맨틱 subtle 면으로 덮는다.
    document.body.style.setProperty(
      "--sd-bg-canvas",
      options?.theme ? `var(--sd-bg-${options.theme}-subtle)` : "",
    );

    onCleanup(() => {
      document.body.style.setProperty("--sd-bg-canvas", "");
    });
  });
}
