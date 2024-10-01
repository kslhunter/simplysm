import { inject, Injectable } from "@angular/core";
import { $effect } from "../utils/$hooks";
import { SdLocalStorageProvider } from "./SdLocalStorageProvider";
import { $reactive } from "../utils/$reactive";

@Injectable({ providedIn: "root" })
export class SdThemeProvider {
  #sdLocalStorage = inject(SdLocalStorageProvider);

  theme$ = $reactive<"compact" | "modern" | "mobile" | "kiosk">("modern");

  constructor() {
    $effect(() => {
      document.body.className = "sd-theme-" + this.theme$.value;
      this.#sdLocalStorage.set("sd-theme", this.theme$.value);
    });
  }
}
