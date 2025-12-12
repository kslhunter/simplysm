import { Injectable } from "@angular/core";
import { TSdTheme } from "../sd-theme-provider";

@Injectable({ providedIn: "root" })
export class SdAngularConfigProvider {
  clientName!: string;
  defaultTheme!: TSdTheme;
  defaultDark!: boolean;
  // icons!: ISdAngularIcon;
}

/*
export interface ISdAngularIcon {
  fallback: IconDefinition;

  caretDown: IconDefinition;
  eye: IconDefinition;
  eyeSlash: IconDefinition;
  angleDown: IconDefinition;
  triangleExclamation: IconDefinition;
  angleDoubleLeft: IconDefinition;
  angleDoubleRight: IconDefinition;
  angleLeft: IconDefinition;
  angleRight: IconDefinition;
  cog: IconDefinition;
  arrowLeft: IconDefinition;
  caretRight: IconDefinition;
  save: IconDefinition;
  star: IconDefinition;
  mountainSun: IconDefinition;
  bars: IconDefinition;
  angleUp: IconDefinition;

  check: IconDefinition;
  xmark: IconDefinition;
  sort: IconDefinition;
  sortDown: IconDefinition;
  sortUp: IconDefinition;

  eraser: IconDefinition;
  arrowLeftLong: IconDefinition;

  search: IconDefinition;
  edit: IconDefinition;
  externalLink: IconDefinition;

  refresh: IconDefinition;
  add: IconDefinition;
  redo: IconDefinition;
  upload: IconDefinition;
  fileExcel: IconDefinition;

  arrowRight: IconDefinition;
}
*/
