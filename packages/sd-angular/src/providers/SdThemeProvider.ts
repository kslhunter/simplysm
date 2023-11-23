import {inject, Injectable} from "@angular/core";
import {SdLocalStorageProvider} from "./SdLocalStorageProvider";

@Injectable({providedIn: "root"})
export class SdThemeProvider {
  #sdLocalStorage = inject(SdLocalStorageProvider);

  set theme(val: "compact" | "modern" | "mobile" | "kiosk") {
    document.body.className = "sd-theme-" + val;
    this.#sdLocalStorage.set("sd-theme", val);
  }

  get theme() {
    return document.body.className.match(/sd-theme-([a-z]*)/)?.[1] as any;
  }
}