import { inject, Injectable } from "@angular/core";
import { $effect, $signal } from "../utils/$hooks";
import { SdLocalStorageProvider } from "./SdLocalStorageProvider";
import { SdAngularConfigProvider } from "./SdAngularConfigProvider";

@Injectable({ providedIn: "root" })
export class SdThemeProvider {
  #sdNgConf = inject(SdAngularConfigProvider);
  #sdLocalStorage = inject(SdLocalStorageProvider);

  theme = $signal<"compact" | "modern" | "mobile" | "kiosk">("modern");

  constructor() {
    $effect([], () => {
      this.theme.set(this.#sdLocalStorage.get("sd-theme") ?? this.#sdNgConf.defaultTheme);
    });

    $effect(() => {
      document.body.className = "sd-theme-" + this.theme();
      this.#sdLocalStorage.set("sd-theme", this.theme());
    });
  }
}
