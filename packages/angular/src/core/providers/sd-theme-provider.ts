import { effect, Injectable, signal } from "@angular/core";

@Injectable({ providedIn: "root" })
export class SdThemeProvider {
  dark = signal<boolean>(false);

  readonly fontSizePresets: readonly number[] = [12, 14, 16, 20, 24, 28];

  fontSize = signal<number>(16);

  constructor() {
    effect(() => {
      document.body.classList.toggle("sd-theme-dark", this.dark());
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
