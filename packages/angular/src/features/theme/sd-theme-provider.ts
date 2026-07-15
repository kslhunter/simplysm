import { effect, inject, Injectable, PLATFORM_ID, signal } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";

@Injectable({ providedIn: "root" })
export class SdThemeProvider {
  // 블루프린트(엔지니어링 도면) 테마
  blueprint = signal<boolean>(false);

  readonly fontSizePresets: readonly number[] = [12, 14, 16, 20, 24, 28];

  fontSize = signal<number>(12);

  constructor() {
    // SSR(프리렌더) 가드: document 반영은 브라우저 전용
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    effect(() => {
      document.body.classList.toggle("sd-theme-blueprint", this.blueprint());
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
