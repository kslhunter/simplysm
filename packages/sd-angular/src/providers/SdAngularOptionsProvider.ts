import {Injectable} from "@angular/core";
import {IconDefinition, IconProp} from "@fortawesome/fontawesome-svg-core";

@Injectable({providedIn: "root"})
export class SdAngularOptionsProvider {
  clientName!: string;
  defaultTheme!: "compact" | "modern" | "mobile" | "kiosk";
  fallbackIcon!: IconDefinition;
  icons!: ISdAngularIcon;
}

export interface ISdAngularIcon {
  caretDown: IconProp,
  code: IconProp,
  eye: IconProp,
  pen: IconProp,
  angleDown: IconProp,
  question: IconProp,
  triangleExclamation: IconProp,
  angleDoubleLeft: IconProp,
  angleDoubleRight: IconProp,
  angleLeft: IconProp,
  angleRight: IconProp,
  cog: IconProp,
  arrowLeft: IconProp,
  arrowRight: IconProp,
  caretRight: IconProp,
  save: IconProp,
  star: IconProp,
  mountainSun: IconProp,
  bars: IconProp,
  angleUp: IconProp,
  questionCircle: IconProp,

  check: IconProp,
  minus: IconProp,
  plus: IconProp,
  xmark: IconProp,
  sort: IconProp,
  sortDown: IconProp,
  sortUp: IconProp
}