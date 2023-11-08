import {Injectable} from "@angular/core";

@Injectable({providedIn: "root"})
export class SdThemeProvider {
  set theme(val: "compact" | "modern" | "mobile" | "kiosk") {
    document.body.className = "sd-theme-" + val;
  }
}