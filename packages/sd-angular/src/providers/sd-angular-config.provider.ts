import { Injectable } from "@angular/core";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { ISdAppStructureItem } from "../utils/SdAppStructureUtil";

@Injectable({ providedIn: "root" })
export class SdAngularConfigProvider {
  clientName!: string;
  appStructure!: ISdAppStructureItem[];
  defaultTheme!: "compact" | "modern" | "mobile" | "kiosk";
  icons!: ISdAngularIcon;
}

export interface ISdAngularIcon {
  fallback: IconDefinition;

  caretDown: IconDefinition;
  code: IconDefinition;
  eye: IconDefinition;
  eyeSlash: IconDefinition;
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

  refresh: IconDefinition;
  plusCircle: IconDefinition;
  eraser: IconDefinition;
  redo: IconDefinition;
  upload: IconDefinition;
  fileExcel: IconDefinition;

  search: IconDefinition;
  edit: IconDefinition;
  externalLink: IconDefinition;
}
