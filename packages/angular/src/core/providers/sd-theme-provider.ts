import { effect, Injectable, signal } from "@angular/core";

@Injectable({ providedIn: "root" })
export class SdThemeProvider {
  dark = signal<boolean>(false);

  constructor() {
    effect(() => {
      document.body.classList.toggle("sd-theme-dark", this.dark());
    });
  }
}
