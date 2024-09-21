import { Injectable } from "@angular/core";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";

@Injectable({ providedIn: "root" })
export class SdAngularConfigProvider {
  clientName!: string;
  defaultTheme!: "compact" | "modern" | "mobile" | "kiosk";
  fallbackIcon!: IconDefinition;
  icons!: ISdAngularIcon;
}

export interface ISdAngularIcon {
  caretDown: IconDefinition;
  code: IconDefinition;
  eye: IconDefinition;
  pen: IconDefinition;
  angleDown: IconDefinition;
  question: IconDefinition;
  triangleExclamation: IconDefinition;
  angleDoubleLeft: IconDefinition;
  angleDoubleRight: IconDefinition;
  angleLeft: IconDefinition;
  angleRight: IconDefinition;
  cog: IconDefinition;
  arrowLeft: IconDefinition;
  arrowRight: IconDefinition;
  caretRight: IconDefinition;
  save: IconDefinition;
  star: IconDefinition;
  mountainSun: IconDefinition;
  bars: IconDefinition;
  angleUp: IconDefinition;
  questionCircle: IconDefinition;

  check: IconDefinition;
  minus: IconDefinition;
  plus: IconDefinition;
  xmark: IconDefinition;
  sort: IconDefinition;
  sortDown: IconDefinition;
  sortUp: IconDefinition;

  search: IconDefinition;
  edit: IconDefinition;
  externalLink: IconDefinition;
}
