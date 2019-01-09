import {SdStyleVariables} from "./SdStyleVariables";

export class SdStyleMixins {
  public constructor(private readonly _vars: SdStyleVariables) {
  }

  public formControlBase(): { [key: string]: string } {
    return {
      "display": "block",
      "width": "100%",
      "font-size": this._vars.fontSize.default,
      "font-family": this._vars.fontFamily,
      "line-height": this._vars.lineHeight,
      "color": this._vars.textColor.default,
      "padding": `${this._vars.gap.sm} ${this._vars.gap.default}`,

      "border": "1px solid transparent",
      "user-select": "none"
    };
  }

  public elevation(depth: number): { [key: string]: string } {
    return {
      "box-shadow": `0 0 ${depth}/2px ${this._vars.transColor.dark}, 0 ${depth}/2px ${depth}px ${this._vars.transColor.darker}`
    };
  }
}
