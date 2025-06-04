import { Injectable } from "@angular/core";
import { TSdTheme } from "./sd-theme.provider";

@Injectable({ providedIn: "root" })
export class SdAngularConfigProvider {
  clientName!: string;
  defaultTheme!: TSdTheme;
  defaultDark!: boolean;
}
