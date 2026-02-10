import { inject, Injectable } from "@angular/core";
import { $effect } from "../utils/bindings/$effect";
import { $signal } from "../utils/bindings/$signal";

import { SdLocalStorageProvider } from "./storage/sd-local-storage.provider";

@Injectable({ providedIn: "root" })
export class SdThemeProvider {
  private readonly _sdLocalStorage = inject(SdLocalStorageProvider);

  theme = $signal<TSdTheme>("compact");
  dark = $signal<boolean>(false);

  constructor() {
    $effect(() => {
      document.body.className = "sd-theme-" + this.theme() + (this.dark() ? " sd-theme-dark" : "");
      this._sdLocalStorage.set("sd-theme", this.theme());
      this._sdLocalStorage.set("sd-theme-dark", this.dark());
    });
  }
}

export type TSdTheme = "compact" | "mobile" | "kiosk";
