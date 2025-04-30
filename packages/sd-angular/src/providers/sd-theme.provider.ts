import { inject, Injectable } from "@angular/core";
import { $effect, $signal } from "../utils/hooks";
import { SdLocalStorageProvider } from "./sd-local-storage.provider";

@Injectable({ providedIn: "root" })
export class SdThemeProvider {
  #sdLocalStorage = inject(SdLocalStorageProvider);

  theme = $signal<TSdTheme>("compact");
  dark = $signal<boolean>(false);

  constructor() {
    $effect(() => {
      document.body.className = "sd-theme-" + this.theme() + (this.dark() ? " sd-theme-dark" : "");
      this.#sdLocalStorage.set("sd-theme", this.theme());
      this.#sdLocalStorage.set("sd-theme-dark", this.dark());
    });
  }
}


export type TSdTheme = "compact" | "mobile" | "kiosk";