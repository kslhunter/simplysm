import {Injectable} from "@angular/core";
import {faQuestionCircle} from "@fortawesome/pro-duotone-svg-icons";

@Injectable({providedIn: "root"})
export class SdAngularOptionsProvider {
  clientName = "unknown";
  defaultTheme: "compact" | "modern" | "mobile" | "kiosk" = "modern";
  fallbackIcon = faQuestionCircle;
}