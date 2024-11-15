import { $effect, $signal } from "../utils/$hooks";
import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class SdBackgroundProvider {
  theme = $signal<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">();

  constructor() {
    $effect([this.theme], (onCleanup) => {
      const theme = this.theme();
      document.body.style.background = theme ? `var(--theme-${theme}-lightest)` : "";

      onCleanup(() => {
        document.body.style.background = "";
      });
    });
  }
}