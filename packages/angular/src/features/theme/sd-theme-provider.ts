import { effect, inject, Injectable, PLATFORM_ID, signal } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";

// 내장 테마 단일 정의 — 새 테마 추가 시 여기 항목 1줄 +
// scss/themes 값 맵 + _theme-variables 의 .sd-theme-{value} writeVars 블록만 추가하면 된다.
// light 는 :root 기본값이라 값 맵/블록이 없어도 동작한다(클래스가 붙어도 규칙이 없어 무효).
export const SD_THEMES = [
  { value: "light", label: "라이트" },
  { value: "blueprint", label: "블루프린트" },
  { value: "ide-dark", label: "IDE 다크" },
] as const;

export type SdThemeName = (typeof SD_THEMES)[number]["value"];

@Injectable({ providedIn: "root" })
export class SdThemeProvider {
  readonly themes: readonly { value: SdThemeName; label: string }[] = SD_THEMES;

  // 라이트(기본) / 블루프린트(도면) / IDE 다크
  theme = signal<SdThemeName>("light");

  readonly fontSizePresets: readonly number[] = [12, 14, 16, 20, 24, 28];

  fontSize = signal<number>(12);

  constructor() {
    // SSR(프리렌더) 가드: document 반영은 브라우저 전용
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    effect(() => {
      const theme = this.theme();
      for (const def of this.themes) {
        document.body.classList.toggle(`sd-theme-${def.value}`, def.value === theme);
      }
    });

    effect(() => {
      document.documentElement.style.fontSize = `${this.fontSize()}px`;
    });
  }

  increaseFontSize(): void {
    const next = this.fontSizePresets.find((v) => v > this.fontSize());
    if (next != null) {
      this.fontSize.set(next);
    }
  }

  decreaseFontSize(): void {
    const curr = this.fontSize();
    let prev: number | undefined;
    for (const v of this.fontSizePresets) {
      if (v < curr) {
        prev = v;
      }
    }
    if (prev != null) {
      this.fontSize.set(prev);
    }
  }
}
